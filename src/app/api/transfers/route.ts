import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const transferSchema = z.object({
  recipientIdentifier: z.string().min(3, "Enter recipient email or User ID"),
  amount: z.number().positive("Amount must be greater than 0"),
  note: z.string().max(100).optional(),
});

// GET /api/transfers - List transfers for current user or all if admin
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const userEmail = (session.user as any).email;
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all && userRole === "ADMIN" && isAdminEmail(userEmail)) {
      const transfers = await prisma.walletTransfer.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { name: true, email: true, userCode: true } },
          receiver: { select: { name: true, email: true, userCode: true } },
        },
        take: 100,
      });
      return NextResponse.json({ transfers });
    }

    // User's own sent and received transfers
    const transfers = await prisma.walletTransfer.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { name: true, email: true, userCode: true } },
        receiver: { select: { name: true, email: true, userCode: true } },
      },
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    console.error("GET /api/transfers error:", error);
    return NextResponse.json(
      { error: "Failed to load transfers" },
      { status: 500 }
    );
  }
}

// POST /api/transfers - Execute ₹0 internal wallet transfer
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const senderId = (session.user as any).id;
    const body = await req.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { recipientIdentifier, amount, note } = parsed.data;
    const cleanId = recipientIdentifier.trim();

    if (amount < 1) {
      return NextResponse.json(
        { error: "Minimum transfer amount is ₹1" },
        { status: 400 }
      );
    }

    // 1. Lookup Recipient by Email or UserCode (case-insensitive)
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanId.toLowerCase() },
          { userCode: cleanId.toUpperCase() },
        ],
      },
    });

    if (!recipient) {
      return NextResponse.json(
        {
          error: `No user found matching "${cleanId}". Please check the User ID (e.g. USR-12345) or Email.`,
        },
        { status: 404 }
      );
    }

    // 2. Prevent self-transfers
    if (recipient.id === senderId) {
      return NextResponse.json(
        { error: "Cannot transfer money to yourself!" },
        { status: 400 }
      );
    }

    // 3. Execute Atomic Transaction with strict balance check
    const result = await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({
        where: { id: senderId },
      });

      if (!sender) {
        throw new Error("Sender not found");
      }

      if (sender.walletBalance < amount) {
        throw new Error(
          `Insufficient balance! You have ₹${sender.walletBalance.toFixed(
            2
          )}, but tried to transfer ₹${amount.toFixed(2)}.`
        );
      }

      // Deduct from sender
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: {
          walletBalance: { decrement: amount },
        },
        select: { walletBalance: true },
      });

      // Add to receiver
      await tx.user.update({
        where: { id: recipient.id },
        data: {
          walletBalance: { increment: amount },
        },
      });

      // Create audit log
      const transfer = await tx.walletTransfer.create({
        data: {
          senderId,
          receiverId: recipient.id,
          amountInr: amount,
          note: note?.trim() || null,
        },
        include: {
          receiver: { select: { name: true, email: true, userCode: true } },
        },
      });

      return {
        transfer,
        newBalance: updatedSender.walletBalance,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully transferred ₹${amount} to ${
          recipient.name || recipient.email
        } (${recipient.userCode})!`,
        transfer: result.transfer,
        newBalance: result.newBalance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/transfers error:", error.message);
    return NextResponse.json(
      { error: error.message || "Transfer failed" },
      { status: 400 }
    );
  }
}

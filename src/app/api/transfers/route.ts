import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions, { isAdminEmail } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
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

    try {
      const supabase = getSupabaseAdmin();
      if (all && userRole === "ADMIN" && isAdminEmail(userEmail)) {
        const { data: supaTransfers, error: tErr } = await supabase
          .from("WalletTransfer")
          .select("*, sender:User!senderId(name, email, userCode), receiver:User!receiverId(name, email, userCode)")
          .order("createdAt", { ascending: false })
          .limit(100);

        if (!tErr && supaTransfers) {
          return NextResponse.json({ transfers: supaTransfers });
        }
      } else {
        const { data: supaTransfers, error: tErr } = await supabase
          .from("WalletTransfer")
          .select("*, sender:User!senderId(name, email, userCode), receiver:User!receiverId(name, email, userCode)")
          .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
          .order("createdAt", { ascending: false });

        if (!tErr && supaTransfers) {
          return NextResponse.json({ transfers: supaTransfers });
        }
      }
    } catch (supaErr) {
      console.warn("Supabase transfers GET fallback to prisma:", supaErr);
    }

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

// POST /api/transfers - Execute internal wallet transfer
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

    const supabase = getSupabaseAdmin();

    // 1. Lookup Recipient via Supabase
    let recipient: any = null;
    const { data: recByEmail } = await supabase
      .from("User")
      .select("id, name, email, userCode, walletBalance")
      .ilike("email", cleanId.toLowerCase())
      .maybeSingle();

    if (recByEmail) {
      recipient = recByEmail;
    } else {
      const { data: recByCode } = await supabase
        .from("User")
        .select("id, name, email, userCode, walletBalance")
        .ilike("userCode", cleanId.toUpperCase())
        .maybeSingle();
      if (recByCode) recipient = recByCode;
    }

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

    // 3. Check Sender Balance
    const { data: sender } = await supabase
      .from("User")
      .select("id, walletBalance")
      .eq("id", senderId)
      .single();

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    if (sender.walletBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance! You have ₹${Number(sender.walletBalance).toFixed(2)}, but tried to transfer ₹${amount.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    const newSenderBalance = Number((sender.walletBalance - amount).toFixed(2));
    const newRecipientBalance = Number(((recipient.walletBalance || 0) + amount).toFixed(2));

    // Deduct from sender
    await supabase
      .from("User")
      .update({ walletBalance: newSenderBalance, updatedAt: new Date().toISOString() })
      .eq("id", senderId);

    // Add to recipient
    await supabase
      .from("User")
      .update({ walletBalance: newRecipientBalance, updatedAt: new Date().toISOString() })
      .eq("id", recipient.id);

    // Create Transfer Record
    const transferId = `tf_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    const { data: transferRecord } = await supabase
      .from("WalletTransfer")
      .insert({
        id: transferId,
        senderId,
        receiverId: recipient.id,
        amountInr: amount,
        note: note?.trim() || null,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json(
      {
        success: true,
        message: `Successfully transferred ₹${amount} to ${
          recipient.name || recipient.email
        } (${recipient.userCode})!`,
        transfer: transferRecord,
        newBalance: newSenderBalance,
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

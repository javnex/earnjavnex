import { NextResponse } from "next/server";
import { z } from "zod";

const grievanceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Valid email is required"),
  category: z.enum([
    "DATA_CORRECTION",
    "DATA_ERASURE",
    "CONSENT_WITHDRAWAL",
    "ACCESS_INFO",
    "NOMINATION",
    "GENERAL_GRIEVANCE",
  ]),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
});

// POST /api/privacy/grievance
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = grievanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid submission" },
        { status: 400 }
      );
    }

    // Generate unique DPDP reference ticket ID
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestampPart = Date.now().toString().slice(-4);
    const ticketId = `GRV-DPDP-${timestampPart}-${randomHex}`;

    console.log(`[DPDP GRIEVANCE REGISTERED] Ticket: ${ticketId} | Category: ${parsed.data.category} | Email: ${parsed.data.email}`);

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Grievance successfully registered with the Data Protection Officer.",
      statutoryWindowHours: 48,
    });
  } catch (error: any) {
    console.error("Grievance submission error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing grievance" },
      { status: 500 }
    );
  }
}

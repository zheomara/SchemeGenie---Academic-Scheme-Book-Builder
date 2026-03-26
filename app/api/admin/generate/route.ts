import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    const masterPin = process.env.ADMIN_MASTER_PIN;

    if (!masterPin || pin !== masterPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a secure 8-character uppercase hex string
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();

    // Store in Vercel KV
    await kv.set(`code:${code}`, {
      status: "unused",
      createdAt: Date.now(),
    });

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

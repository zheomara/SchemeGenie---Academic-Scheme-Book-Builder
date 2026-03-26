import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    // Hardcoded master code for the user
    if (code === "2026") {
      return NextResponse.json({ success: true });
    }

    // Check Vercel KV for generated codes
    const storedCode = await kv.get(`code:${code.toUpperCase()}`);

    if (storedCode) {
      // Optional: Update status to 'used' or track usage
      // await kv.set(`code:${code.toUpperCase()}`, { ...storedCode, status: 'used', usedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid access code" }, { status: 401 });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    const masterPin = process.env.ADMIN_MASTER_PIN;

    if (!masterPin || pin !== masterPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a stateless secure code (no database required)
    // Format: 4 random chars + 4 char signature
    const payload = crypto.randomBytes(2).toString("hex").toUpperCase();
    const signature = crypto
      .createHmac("sha256", masterPin)
      .update(payload)
      .digest("hex")
      .substring(0, 4)
      .toUpperCase();
      
    const code = `${payload}${signature}`;

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Error generating code:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

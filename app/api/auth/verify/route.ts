import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const upperCode = code.toUpperCase();

    // Hardcoded master code for the user
    if (upperCode === "2026") {
      return NextResponse.json({ success: true });
    }

    const masterPin = process.env.ADMIN_MASTER_PIN || "default";

    // Verify stateless code (no database required)
    if (upperCode.length === 8) {
      const payload = upperCode.substring(0, 4);
      const signature = upperCode.substring(4, 8);
      
      const expectedSignature = crypto
        .createHmac("sha256", masterPin)
        .update(payload)
        .digest("hex")
        .substring(0, 4)
        .toUpperCase();
        
      if (signature === expectedSignature) {
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid access code" }, { status: 401 });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// app/api/test-email/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    await sendEmail({
      to: "wiembenaraar82@gmail.com", // Remplacez par votre email
      subject: "Test Email from BIM Platform",
      text: "This is a test email from BIM Platform.",
      html: "<h1>Test Email</h1><p>This is a test email from BIM Platform.</p>",
    });

    return NextResponse.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json({ message: "Failed to send test email", error: String(error) }, { status: 500 });
  }
}
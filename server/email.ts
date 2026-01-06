import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.REPLIT_DEPLOYMENT === "1" && process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(",");
    return `https://${domains[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
}

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured. Password reset email not sent.");
    console.log(`[DEV] Password reset link for ${toEmail}: /reset-password?token=${resetToken}`);
    return true;
  }

  const resetUrl = `${getAppUrl()}/reset-password?token=${resetToken}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Reset Your Password - Western Sky Maintenance",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Password Reset Request</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password for your Western Sky Maintenance account.</p>
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Western Sky Maintenance Company
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return false;
    }

    console.log(`Password reset email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

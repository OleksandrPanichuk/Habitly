export interface PasswordResetTemplateData {
  email: string;
  resetUrl: string;
  userName?: string;
}

export function getPasswordResetHtml({
  email,
  resetUrl,
  userName,
}: PasswordResetTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Habitly Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Habitly</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Build better habits, one day at a time</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Reset Your Password</h2>

              ${userName ? `<p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${userName},</p>` : ""}

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your Habitly account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 24px; padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all;">
                <a href="${resetUrl}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${resetUrl}</a>
              </p>

              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
                </p>
              </div>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                The Habitly Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                This email was sent to ${email}. If you have any questions, please contact our support team.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Habitly. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function getPasswordResetText({
  resetUrl,
  userName,
}: PasswordResetTemplateData): string {
  return `
Reset Your Habitly Password

${userName ? `Hi ${userName},` : "Hello,"}

We received a request to reset your password for your Habitly account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
The Habitly Team
  `.trim();
}

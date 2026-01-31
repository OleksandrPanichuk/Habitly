export interface WelcomeTemplateData {
  email: string;
  userName: string;
  dashboardUrl?: string;
}

export function getWelcomeHtml({
  email,
  userName,
  dashboardUrl = "http://localhost:3000/dashboard",
}: WelcomeTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Habitly</title>
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
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">Welcome to Habitly! 🎉</h2>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${userName},</p>

              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We're thrilled to have you join our community! You've taken the first step towards building better habits and achieving your goals.
              </p>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                With Habitly, you can track your daily habits, build streaks, and stay motivated on your journey to self-improvement.
              </p>

              <!-- Features Section -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 18px; font-weight: 600;">Get Started</h3>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        ✅ <strong>Create your first habit</strong> - Start tracking what matters to you
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        📊 <strong>Track your progress</strong> - See your streaks and stay motivated
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                        🎯 <strong>Achieve your goals</strong> - Build consistency over time
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions or need help getting started, don't hesitate to reach out to our support team.
              </p>

              <p style="margin: 16px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Happy habit building!<br>
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

export function getWelcomeText({
  userName,
  loginUrl = "https://habitly.app/sign-in",
}: WelcomeTemplateData): string {
  return `
Welcome to Habitly! 🎉

Hi ${userName},

We're thrilled to have you join our community! You've taken the first step towards building better habits and achieving your goals.

With Habitly, you can track your daily habits, build streaks, and stay motivated on your journey to self-improvement.

Get Started:
✅ Create your first habit - Start tracking what matters to you
📊 Track your progress - See your streaks and stay motivated
🎯 Achieve your goals - Build consistency over time

Go to your dashboard:
${loginUrl}

If you have any questions or need help getting started, don't hesitate to reach out to our support team.

Happy habit building!
The Habitly Team
  `.trim();
}

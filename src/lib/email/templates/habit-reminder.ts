export interface HabitReminderTemplateData {
    userName: string;
    dashboardUrl: string;
    preferredCheckInTime: string;
    habits: Array<{
        name: string;
        icon?: string | null;
        targetLabel?: string | null;
    }>;
}

export function getHabitReminderHtml({
    userName,
    dashboardUrl,
    preferredCheckInTime,
    habits,
}: HabitReminderTemplateData): string {
    const habitItems = habits
        .map(
            (habit) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 600;">
              ${habit.icon ?? "✅"} ${habit.name}
            </p>
            ${habit.targetLabel ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Target: ${habit.targetLabel}</p>` : ""}
          </td>
        </tr>
      `,
        )
        .join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Habitly Check-in</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 20px; background-color: #f3f4f6;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 32px 36px; background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%);">
              <p style="margin: 0; color: rgba(255,255,255,0.72); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Habitly check-in</p>
              <h1 style="margin: 10px 0 0; color: #ffffff; font-size: 28px;">Your ${preferredCheckInTime} habit window is open.</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.7;">Hi ${userName}, these are still waiting for today. Keep it small and close the loop before the day slips.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 28px;">
                ${habitItems}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 600;">Open today\'s checklist</a>
                  </td>
                </tr>
              </table>
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

export function getHabitReminderText({
    userName,
    dashboardUrl,
    preferredCheckInTime,
    habits,
}: HabitReminderTemplateData): string {
    const habitLines = habits
        .map(
            (habit) =>
                `- ${habit.icon ?? "✅"} ${habit.name}${habit.targetLabel ? ` (${habit.targetLabel})` : ""}`,
        )
        .join("\n");

    return `Hi ${userName},\n\nYour ${preferredCheckInTime} Habitly check-in window is open. These habits are still waiting for today:\n\n${habitLines}\n\nOpen your dashboard: ${dashboardUrl}`;
}

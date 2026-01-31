import formData from "form-data";
import Mailgun from "mailgun.js";
import {
  getPasswordResetHtml,
  getPasswordResetText,
  type PasswordResetTemplateData,
} from "./email/templates/password-reset";
import {
  getWelcomeHtml,
  getWelcomeText,
  type WelcomeTemplateData,
} from "./email/templates/welcome";

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || "noreply@habitly.app";
const FROM_NAME = process.env.MAILGUN_FROM_NAME || "Habitly";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error("Mailgun credentials not configured");

    if (process.env.NODE_ENV === "development") {
      console.log("===== EMAIL (DEV MODE) =====");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text: ${text || "No text version"}`);
      console.log("============================");
      return { id: "dev-mode", message: "Email logged to console" };
    }
    throw new Error("Email service not configured");
  }

  try {
    const result = await mg.messages.create(MAILGUN_DOMAIN, {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text: text || undefined,
    });

    console.log("Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName?: string,
) {
  const templateData: PasswordResetTemplateData = {
    email,
    resetUrl,
    userName,
  };

  return sendEmail({
    to: email,
    subject: "Reset Your Habitly Password",
    html: getPasswordResetHtml(templateData),
    text: getPasswordResetText(templateData),
  });
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  dashboardUrl?: string,
) {
  const templateData: WelcomeTemplateData = {
    email,
    userName,
    dashboardUrl,
  };

  return sendEmail({
    to: email,
    subject: "Welcome to Habitly! 🎉",
    html: getWelcomeHtml(templateData),
    text: getWelcomeText(templateData),
  });
}

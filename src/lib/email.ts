import { createTransport } from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a transactional email using the SMTP credentials already configured
 * for Auth.js magic links. Falls back to logging the message when no SMTP
 * host is configured, so local development does not error.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM ?? "Body Debt <noreply@bodydebt.ai>";

  if (!host) {
    console.log(`[email] SMTP not configured. Would send to ${to}:\n  Subject: ${subject}\n  ${text}`);
    return;
  }

  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transport.sendMail({
    to,
    from,
    subject,
    text,
    html,
  });
}

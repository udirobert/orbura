import { config } from "dotenv";
import { createTransport } from "nodemailer";

// Load .env.local so this script uses the same environment as the Next.js app.
config({ path: ".env.local" });

const host = process.env.EMAIL_SERVER_HOST;
const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
const user = process.env.EMAIL_SERVER_USER;
const pass = process.env.EMAIL_SERVER_PASSWORD;
const from = process.env.EMAIL_FROM ?? "Body Debt <noreply@bodydebt.ai>";
const testRecipient = process.env.TEST_EMAIL;

async function main() {
  if (!host) {
    console.error("EMAIL_SERVER_HOST is not set. Add SMTP credentials to .env.local");
    process.exit(1);
  }
  if (!pass) {
    console.error("EMAIL_SERVER_PASSWORD is not set.");
    process.exit(1);
  }

  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  console.log(`Verifying SMTP connection to ${host}:${port} (secure=${port === 465})…`);
  try {
    await transport.verify();
    console.log("SMTP connection OK");
  } catch (err) {
    console.error("SMTP verification failed:", err);
    process.exit(1);
  }

  if (testRecipient) {
    try {
      const info = await transport.sendMail({
        to: testRecipient,
        from,
        subject: "Body Debt SMTP test",
        text: "If you received this, Body Debt SMTP is wired correctly.",
      });
      console.log("Test email sent:", info.messageId ?? info);
    } catch (err) {
      console.error("Test email failed:", err);
      process.exit(1);
    }
  } else {
    console.log("Set TEST_EMAIL=<address> to send a real test message.");
  }
}

main();

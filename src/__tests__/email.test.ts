import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTransport } from "nodemailer";
import { sendEmail } from "@/lib/email";

vi.mock("nodemailer", () => ({
  createTransport: vi.fn(),
}));

describe("sendEmail", () => {
  const mockedSendMail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createTransport as ReturnType<typeof vi.fn>).mockReturnValue({ sendMail: mockedSendMail });
    delete process.env.EMAIL_SERVER_HOST;
    delete process.env.EMAIL_SERVER_USER;
    delete process.env.EMAIL_SERVER_PASSWORD;
  });

  it("logs the message when SMTP is not configured", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await sendEmail({ to: "care@example.com", subject: "Test", text: "Hello" });
    expect(createTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("care@example.com"));
  });

  it("sends an email when SMTP is configured", async () => {
    process.env.EMAIL_SERVER_HOST = "smtp.example.com";
    process.env.EMAIL_SERVER_PORT = "587";
    process.env.EMAIL_SERVER_USER = "user";
    process.env.EMAIL_SERVER_PASSWORD = "pass";
    process.env.EMAIL_FROM = "Body Debt <noreply@bodydebt.ai>";

    await sendEmail({ to: "care@example.com", subject: "Test", text: "Hello" });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "user", pass: "pass" },
    });
    expect(mockedSendMail).toHaveBeenCalledWith({
      to: "care@example.com",
      from: "Body Debt <noreply@bodydebt.ai>",
      subject: "Test",
      text: "Hello",
      html: undefined,
    });
  });

  it("uses secure=true for port 465", async () => {
    process.env.EMAIL_SERVER_HOST = "smtp.example.com";
    process.env.EMAIL_SERVER_PORT = "465";
    process.env.EMAIL_SERVER_USER = "user";
    process.env.EMAIL_SERVER_PASSWORD = "pass";

    await sendEmail({ to: "care@example.com", subject: "Test", text: "Hello" });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });
});

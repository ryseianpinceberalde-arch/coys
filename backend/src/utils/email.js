import nodemailer from "nodemailer";

let transporter;

const createStatusError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const cleanEnvValue = (value) =>
  String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

const getEmailUser = () => cleanEnvValue(process.env.EMAIL_USER);

const getEmailPassword = () => cleanEnvValue(process.env.EMAIL_PASS).replace(/\s+/g, "");

const isEmailConfigured = () => Boolean(getEmailUser()) && Boolean(getEmailPassword());

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw createStatusError("Email OTP is not configured on the server", 503);
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: getEmailUser(),
        pass: getEmailPassword()
      }
    });
  }

  return transporter;
};

export const sendRegistrationOtpEmail = async ({ to, otp, expiresInMinutes }) => {
  const storeName = process.env.EMAIL_FROM_NAME || "Coy's Corner";
  const from = `"${storeName}" <${getEmailUser()}>`;

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: `${storeName} registration OTP`,
      text: [
        `Your ${storeName} registration OTP is ${otp}.`,
        `This code expires in ${expiresInMinutes} minutes.`,
        "If you did not request this, you can ignore this email."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>${storeName} registration OTP</h2>
          <p>Use this code to finish creating your account:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${otp}</p>
          <p>This code expires in ${expiresInMinutes} minutes.</p>
          <p style="color:#6b7280">If you did not request this, you can ignore this email.</p>
        </div>
      `
    });
  } catch (error) {
    const isAuthError =
      error?.code === "EAUTH"
      || /username and password not accepted/i.test(error?.message || "");

    if (isAuthError) {
      throw createStatusError("Gmail OTP login failed. Check EMAIL_USER and EMAIL_PASS app password.", 503);
    }

    throw createStatusError("Unable to send registration OTP email", 503);
  }
};

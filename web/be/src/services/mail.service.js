const nodemailer = require("nodemailer");

let transporter = null;

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || process.env.CLIENT_URL || "http://localhost:3000";
}

function createTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const mailer = createTransporter();

  return mailer.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
}

async function sendVerificationEmail({ email, name, verificationToken }) {
  const appBaseUrl = getAppBaseUrl();
  const verifyUrl = `${appBaseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const displayName = name || email;

  const subject = "Xac thuc tai khoan Weather Station";
  const text = `Xin chao ${displayName}, vui long xac thuc tai khoan bang link sau: ${verifyUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Xac thuc tai khoan Weather Station</h2>
      <p>Xin chao <strong>${displayName}</strong>,</p>
      <p>Vui long bam vao link ben duoi de xac thuc tai khoan cua ban:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Link nay se het han sau 24 gio.</p>
    </div>
  `;

  return sendMail({
    to: email,
    subject,
    text,
    html
  });
}

async function sendThresholdAlertEmail({ email, name, deviceId, triggeredAlerts, reading }) {
  const displayName = name || email;
  const subject = `Canh bao Weather Station - ${deviceId}`;
  const alertLines = triggeredAlerts.map(
    (alert) => `- ${alert.label}: ${alert.value} (${alert.rule})`
  );

  const text = [
    `Xin chao ${displayName},`,
    `Thiet bi ${deviceId} vua vuot nguong canh bao:`,
    ...alertLines,
    "",
    `Reading hien tai:`,
    `Nhiet do: ${reading.temperature.toFixed(1)} °C`,
    `Do am: ${reading.humidity.toFixed(1)} %`,
    `Ap suat: ${reading.pressure.toFixed(1)} hPa`,
    `Toc do gio: ${reading.windSpeed.toFixed(1)} m/s`,
    `Muc uot cam bien mua: ${reading.rain.toFixed(0)} %`,
    `Luong mua tich luy: ${(reading.rainfallMm || 0).toFixed(1)} mm`,
    `Toc do mua: ${(reading.rainRateMmPerHour || 0).toFixed(1)} mm/h`
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Canh bao Weather Station</h2>
      <p>Xin chao <strong>${displayName}</strong>,</p>
      <p>Thiet bi <strong>${deviceId}</strong> vua vuot nguong canh bao:</p>
      <ul>
        ${triggeredAlerts
          .map(
            (alert) =>
              `<li><strong>${alert.label}</strong>: ${alert.value} <span style="color:#64748b;">(${alert.rule})</span></li>`
          )
          .join("")}
      </ul>
      <p><strong>Reading hien tai</strong></p>
      <ul>
        <li>Nhiet do: ${reading.temperature.toFixed(1)} °C</li>
        <li>Do am: ${reading.humidity.toFixed(1)} %</li>
        <li>Ap suat: ${reading.pressure.toFixed(1)} hPa</li>
        <li>Toc do gio: ${reading.windSpeed.toFixed(1)} m/s</li>
        <li>Muc uot cam bien mua: ${reading.rain.toFixed(0)} %</li>
        <li>Luong mua tich luy: ${(reading.rainfallMm || 0).toFixed(1)} mm</li>
        <li>Toc do mua: ${(reading.rainRateMmPerHour || 0).toFixed(1)} mm/h</li>
      </ul>
    </div>
  `;

  return sendMail({
    to: email,
    subject,
    text,
    html
  });
}

async function sendResetPasswordEmail({ email, name, resetToken }) {
  const appBaseUrl = getAppBaseUrl();
  const resetUrl = `${appBaseUrl}/login?resetToken=${encodeURIComponent(resetToken)}`;
  const displayName = name || email;

  return sendMail({
    to: email,
    subject: "Reset your Weather Station password",
    text: `Hello ${displayName}, reset your password using this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your Weather Station password</h2>
        <p>Hello <strong>${displayName}</strong>,</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendThresholdAlertEmail,
  sendResetPasswordEmail
};

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.host) return null; // dev mode: no SMTP configured
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
  });
  return transporter;
}

/**
 * Sends an email. In dev (no SMTP_HOST) it logs content to the console so
 * verification/reset flows are fully testable without an email provider.
 */
async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.log('\n========== [DEV EMAIL] ==========');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text || html}`);
    console.log('=================================\n');
    return { dev: true };
  }
  return tx.sendMail({ from: config.email.from, to, subject, html, text });
}

module.exports = sendEmail;

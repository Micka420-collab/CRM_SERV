const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

/**
 * Send license key to user after purchase
 */
async function sendLicenseEmail(email, licenseKey, planName) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email] SMTP not configured. License ${licenseKey} for ${email}`);
    return;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #3b82f6; margin: 0;">ITStock CRM</h1>
        <p style="color: #94a3b8; font-size: 14px;">by Nextendo</p>
      </div>

      <h2 style="color: #f8fafc; font-size: 20px;">Votre licence est prete !</h2>

      <p style="color: #94a3b8; line-height: 1.6;">
        Merci pour votre achat du plan <strong style="color: #3b82f6;">${planName}</strong>.
        Voici votre cle de licence :
      </p>

      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <code style="font-size: 18px; color: #3b82f6; letter-spacing: 2px; font-weight: bold;">${licenseKey}</code>
      </div>

      <h3 style="color: #f8fafc; font-size: 16px;">Comment activer :</h3>
      <ol style="color: #94a3b8; line-height: 2;">
        <li>Lancez ITStock CRM sur votre machine</li>
        <li>Entrez la cle de licence ci-dessus</li>
        <li>Cliquez sur "Activer"</li>
      </ol>

      <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        Gerez vos licences sur <a href="${process.env.WEBSITE_URL}/dashboard" style="color: #3b82f6;">votre espace client</a>.
      </p>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        &copy; 2026 Nextendo. Tous droits reserves.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'ITStock <noreply@nextendo.com>',
    to: email,
    subject: `Votre licence ITStock CRM - Plan ${planName}`,
    html
  });
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email] SMTP not configured. Reset token for ${email}: ${resetToken}`);
    return;
  }

  const resetUrl = `${process.env.WEBSITE_URL}/auth/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #3b82f6; margin: 0;">ITStock CRM</h1>
        <p style="color: #94a3b8; font-size: 14px;">by Nextendo</p>
      </div>

      <h2 style="color: #f8fafc; font-size: 20px;">Reinitialisation du mot de passe</h2>

      <p style="color: #94a3b8; line-height: 1.6;">
        Vous avez demande la reinitialisation de votre mot de passe.
        Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600;">
          Reinitialiser mon mot de passe
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px;">
        Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        &copy; 2026 Nextendo. Tous droits reserves.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'ITStock <noreply@nextendo.com>',
    to: email,
    subject: 'Reinitialisation de votre mot de passe ITStock',
    html
  });
}

module.exports = {
  sendLicenseEmail,
  sendPasswordResetEmail
};

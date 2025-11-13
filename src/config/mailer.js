import env from './env.js';
import logger from './logger.js';

const MAILGUN_USER = 'api';

function isMailgunConfigured() {
  return Boolean(env.mailgun.apiKey && env.mailgun.domain);
}

function getMailgunEndpoint() {
  const base = env.mailgun.baseUrl.replace(/\/$/, '');
  return `${base}/${env.mailgun.domain}/messages`;
}

async function sendMailgunMessage({ to, subject, text, html }) {
  if (!isMailgunConfigured()) {
    if (env.isProd) {
      throw new Error("Mailgun n'est pas configuré. Impossible d'envoyer l'email.");
    }
    logger.warn('Mailgun non configuré - email ignoré', { to, subject });
    return;
  }

  const endpoint = getMailgunEndpoint();
  const body = new URLSearchParams();
  body.append('from', env.mail.from);
  body.append('to', Array.isArray(to) ? to.join(',') : to);
  body.append('subject', subject);
  if (text) {
    body.append('text', text);
  }
  if (html) {
    body.append('html', html);
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${MAILGUN_USER}:${env.mailgun.apiKey}`).toString('base64')}`
      },
      body
    });
  } catch (error) {
    logger.error('Mailgun requête échouée', {
      to,
      subject,
      error: error.message
    });
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('Mailgun API error', {
      to,
      subject,
      status: response.status,
      body: errorBody
    });
    throw new Error(`Mailgun API error ${response.status}: ${errorBody}`);
  }
}

export async function sendResetPasswordEmail(to, token) {
  const resetUrl = `${env.resetBaseUrl}?token=${encodeURIComponent(token)}`;
  const text = `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valide 30 minutes) :

${resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

– L'équipe MapMarket`;
  const html = `<!doctype html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
  <p>Bonjour,</p>
  <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous (valide 30 minutes) :</p>
  <p style="margin:24px 0">
    <a href="${resetUrl}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Réinitialiser mon mot de passe</a>
  </p>
  <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
  <p>– L'équipe MapMarket</p>
</body>
</html>`;

  await sendMailgunMessage({ to, subject: 'Réinitialisation de votre mot de passe', text, html });
}

export async function sendEmailVerificationEmail(to, token, name = '') {
  const verifyUrl = `${env.verifyEmailBaseUrl}?token=${encodeURIComponent(token)}`;
  const text = `Bonjour ${name || ''},

Bienvenue sur MapMarket ! Pour activer votre compte, cliquez sur le lien ci-dessous :

${verifyUrl}

Ce lien est valable 24 heures.

À très vite,
L'équipe MapMarket`;

  const html = `<!doctype html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
  <p>Bonjour ${name || ''},</p>
  <p>Bienvenue sur <strong>MapMarket</strong> ! Validez votre adresse email pour activer votre compte :</p>
  <p style="margin:24px 0">
    <a href="${verifyUrl}" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Activer mon compte</a>
  </p>
  <p style="font-size:14px;color:#555">Le lien est valable 24 heures.</p>
  <p>À très vite,<br/>L'équipe MapMarket</p>
</body>
</html>`;

  await sendMailgunMessage({ to, subject: 'Activez votre compte MapMarket', text, html });
}

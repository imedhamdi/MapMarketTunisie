import nodemailer from 'nodemailer';

import env from './env.js';

const hasCredentials = Boolean(env.mail.user && env.mail.pass);
const auth = hasCredentials ? { user: env.mail.user, pass: env.mail.pass } : undefined;

const transportOptions = {
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.port === 465,
  auth
};

const transporter = nodemailer.createTransport(transportOptions);

export async function sendResetPasswordEmail(to, token) {
  const resetUrl = `${env.resetBaseUrl}?token=${encodeURIComponent(token)}`;
  const message = {
    from: env.mail.from,
    to,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous (valide 30 minutes) :

${resetUrl}

Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.

– L’équipe MapMarket`
  };

  await transporter.sendMail(message);
}

export default transporter;

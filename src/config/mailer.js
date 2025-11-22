import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './env.js';
import logger from './logger.js';

const MAILGUN_USER = 'api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brandLogoSvgPath = path.resolve(__dirname, '../../public/icons/logo-email.svg');
let brandLogoBase64 = '';

try {
  const svgBuffer = fs.readFileSync(brandLogoSvgPath, 'utf8');
  brandLogoBase64 = `data:image/svg+xml;base64,${Buffer.from(svgBuffer).toString('base64')}`;
} catch (error) {
  logger.error('Impossible de charger le logo email', { error: error.message });
}

function buildUrlWithToken(baseUrl, token) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch (_error) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}

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

export async function sendTemporaryPasswordEmail(to, password, name = '') {
  const logoSrc = brandLogoBase64 || '';

  const text = `Bonjour ${name || ''},

Voici votre nouveau mot de passe temporaire :

${password}

Connectez-vous avec ce mot de passe, puis changez-le immédiatement depuis l'onglet « Mon profil » > Sécurité.

Si vous n'êtes pas à l'origine de cette demande, mettez à jour votre mot de passe sans attendre.

L'équipe MapMarket Tunisie`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden">
          <!-- Header blanc avec logo -->
          <tr>
            <td style="background-color:#ffffff;padding:30px 40px;text-align:center;border-bottom:1px solid #f0f0f0">
              <img src="${logoSrc}" alt="MapMarket" width="180" style="display:block;margin:0 auto" />
            </td>
          </tr>
          
          <!-- Zone rose pâle avec titre -->
          <tr>
            <td style="background-color:#fff5f7;padding:30px 40px;text-align:center">
              <h1 style="margin:0;font-size:24px;font-weight:600;color:#1a1a1a">Réinitialisation de mot de passe</h1>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding:40px;background-color:#ffffff">
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#666">Bonjour <strong style="color:#1a1a1a">${name || ''}</strong>,</p>
              
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#666">Voici votre nouveau mot de passe temporaire pour <strong style="color:#1a1a1a">MapMarket</strong> :</p>
              
              <!-- Mot de passe dans une boîte -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
                <tr>
                  <td style="background-color:#ffffff;border:2px solid #ff4d6d;border-radius:8px;padding:20px;text-align:center">
                    <div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#1a1a1a;font-family:'Courier New',Courier,monospace">${password}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#666">Connectez-vous avec ce mot de passe, puis <strong style="color:#1a1a1a">changez-le immédiatement</strong> depuis l'onglet <strong style="color:#1a1a1a">« Mon profil »</strong> > Sécurité.</p>
              
              <!-- Avertissement de sécurité -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0">
                <tr>
                  <td style="background-color:#fff9f0;border-left:4px solid #ff4d6d;padding:16px 20px;border-radius:4px">
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#d32f2f">
                      <strong>⚠️ Sécurité :</strong> Si vous n'êtes pas à l'origine de cette demande, mettez à jour votre mot de passe depuis « Mon profil » sans attendre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0">
              <p style="margin:0 0 8px 0;font-size:14px;color:#9e9e9e">À bientôt sur MapMarket</p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#bdbdbd">L'équipe MapMarket Tunisie</p>
              <p style="margin:0;font-size:12px;color:#bdbdbd">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMailgunMessage({
    to,
    subject: 'Réinitialisation de mot de passe - MapMarket',
    text,
    html
  });
}

export async function sendEmailVerificationEmail(to, token, name = '') {
  const logoSrc = brandLogoBase64 || '';

  const verifyUrl = buildUrlWithToken(env.verifyEmailBaseUrl, token);
  const text = `Bonjour ${name || ''},

Bienvenue ! Pour activer votre compte, cliquez sur le lien ci-dessous :

${verifyUrl}

Ce lien est valable 24 heures.

À très vite,
L'équipe MapMarket Tunisie`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden">
          <!-- Header blanc avec logo -->
          <tr>
            <td style="background-color:#ffffff;padding:30px 40px;text-align:center;border-bottom:1px solid #f0f0f0">
              <img src="${logoSrc}" alt="MapMarket" width="180" style="display:block;margin:0 auto" />
            </td>
          </tr>
          
          <!-- Zone rose pâle avec titre -->
          <tr>
            <td style="background-color:#fff5f7;padding:30px 40px;text-align:center">
              <h1 style="margin:0;font-size:24px;font-weight:600;color:#1a1a1a">Activation de compte</h1>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding:40px;background-color:#ffffff">
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#666">Bonjour <strong style="color:#1a1a1a">${name || ''}</strong>,</p>
              
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#666">Bienvenue ! Pour finaliser votre inscription et accéder à toutes les fonctionnalités, veuillez activer votre compte en cliquant sur le bouton ci-dessous :</p>
              
              <!-- Bouton CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px">Activer mon compte</a>
                  </td>
                </tr>
              </table>

              <!-- Info délai -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0">
                <tr>
                  <td style="background-color:#f0fdf4;border-left:4px solid:#10b981;padding:16px 20px;border-radius:4px">
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#166534">
                      <strong>💡 À savoir :</strong> Ce lien d'activation est valable pendant <strong>24 heures</strong>. Passé ce délai, vous devrez demander un nouveau lien.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#9e9e9e">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#bdbdbd;word-break:break-all;background-color:#fafafa;padding:12px;border-radius:4px">${verifyUrl}</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0">
              <p style="margin:0 0 8px 0;font-size:14px;color:#9e9e9e">À très vite !</p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#bdbdbd">L'équipe MapMarket Tunisie</p>
              <p style="margin:0;font-size:12px;color:#bdbdbd">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendMailgunMessage({ to, subject: 'Activez votre compte - MapMarket', text, html });
}

const API_BASE = window.API_BASE || window.location.origin;
const statusIcon = document.getElementById('verifyStatusIcon');
const titleEl = document.getElementById('verifyTitle');
const messageEl = document.getElementById('verifyMessage');
const primaryAction = document.getElementById('verifyPrimaryAction');
const secondaryAction = document.getElementById('verifySecondaryAction');
const card = document.querySelector('.verify-card');

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

function buildApiUrl(path) {
  if (/^https?:/i.test(path)) {
    return path;
  }
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function setView({
  variant = 'loading',
  icon = '⏳',
  title = 'Vérification en cours…',
  message = 'Nous validons votre lien, un instant.',
  primaryLabel = "Retour à l'accueil",
  primaryHref = '/',
  secondaryLabel = '',
  secondaryHandler = null
} = {}) {
  if (card) {
    card.dataset.variant = variant;
  }
  if (statusIcon) {
    statusIcon.textContent = icon;
  }
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (messageEl) {
    messageEl.textContent = message;
  }
  if (primaryAction) {
    primaryAction.textContent = primaryLabel;
    primaryAction.href = primaryHref;
    primaryAction.hidden = !primaryLabel;
  }
  if (secondaryAction) {
    secondaryAction.textContent = secondaryLabel || '';
    secondaryAction.hidden = !secondaryLabel;
    secondaryAction.onclick = null;
    if (secondaryLabel && typeof secondaryHandler === 'function') {
      secondaryAction.onclick = (event) => {
        event.preventDefault();
        secondaryHandler();
      };
    }
  }
}

async function requestVerification(currentToken) {
  let response;
  try {
    response = await fetch(buildApiUrl('/api/auth/verify-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ token: currentToken })
    });
  } catch (error) {
    const networkError = new Error('Impossible de contacter le serveur.');
    networkError.code = 'NETWORK_ERROR';
    networkError.cause = error;
    throw networkError;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const err = new Error(payload?.message || 'Lien invalide ou expiré.');
    err.code = payload?.code || 'HTTP_ERROR';
    err.status = response.status;
    throw err;
  }

  return payload;
}

function handleSuccess(payload) {
  const userName = payload?.data?.user?.name?.split?.(' ')?.[0] || '';
  const message = userName
    ? `${userName}, votre adresse email est confirmée. Vous êtes maintenant connecté(e).`
    : 'Votre adresse email est confirmée. Vous êtes maintenant connecté(e).';
  setView({
    variant: 'success',
    icon: '✅',
    title: 'Email confirmé 🎉',
    message,
    primaryLabel: 'Accéder à MapMarket',
    primaryHref: '/',
    secondaryLabel: 'Voir mes favoris',
    secondaryHandler: () => {
      window.location.href = '/?tab=favs';
    }
  });
}

function handleError(error) {
  let title = 'Lien invalide';
  let message =
    "Ce lien n'est plus valide ou a déjà été utilisé. Demandez un nouveau mail de confirmation.";

  if (error?.code === 'NETWORK_ERROR') {
    title = 'Service indisponible';
    message = 'Nous ne parvenons pas à joindre le serveur. Vérifiez votre connexion et réessayez.';
  } else if (error?.code === 'VERIFICATION_TOKEN_INVALID') {
    title = 'Lien expiré';
    message =
      'Ce lien a expiré. Redemandez un email de confirmation depuis la fenêtre de connexion.';
  }

  setView({
    variant: 'error',
    icon: '⚠️',
    title,
    message,
    primaryLabel: "Retour à l'accueil",
    primaryHref: '/',
    secondaryLabel: 'Demander un nouveau lien',
    secondaryHandler: () => {
      window.location.href = '/?auth=login';
    }
  });
}

async function run() {
  if (!token) {
    setView({
      variant: 'error',
      icon: '❓',
      title: 'Lien incomplet',
      message: "Il manque le jeton de vérification dans l'URL.",
      primaryLabel: 'Revenir sur MapMarket',
      primaryHref: '/',
      secondaryLabel: 'Demander un nouveau lien',
      secondaryHandler: () => {
        window.location.href = '/?auth=signup';
      }
    });
    return;
  }

  setView({ primaryLabel: '', secondaryLabel: '' });
  try {
    const payload = await requestVerification(token);
    handleSuccess(payload);
  } catch (error) {
    handleError(error);
  }
}

run();

const API_BASE = window.API_BASE || window.location.origin;
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const form = document.getElementById('resetForm');
const passwordInput = document.getElementById('resetPassword');
const confirmInput = document.getElementById('resetPasswordConfirm');
const submitButton = document.getElementById('resetSubmit');
const feedback = document.getElementById('resetFeedback');
const openAuthBtn = document.getElementById('openAuthBtn');

function buildApiUrl(path) {
  if (/^https?:/i.test(path)) {
    return path;
  }
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function setFeedback(message, type = 'info') {
  if (!feedback) {
    return;
  }
  feedback.textContent = message;
  feedback.classList.remove('success', 'error', 'is-visible');
  feedback.dataset.type = type;
  feedback.classList.add(type === 'error' ? 'error' : 'success', 'is-visible');
}

function clearFeedback() {
  if (!feedback) {
    return;
  }
  feedback.textContent = '';
  feedback.classList.remove('success', 'error', 'is-visible');
}

function setLoading(isLoading) {
  if (!submitButton) {
    return;
  }
  submitButton.classList.toggle('loading', isLoading);
  submitButton.disabled = isLoading;
}

function validateForm() {
  const password = passwordInput?.value?.trim() || '';
  const confirmation = confirmInput?.value?.trim() || '';
  if (password.length < 8) {
    setFeedback('Le mot de passe doit contenir au moins 8 caractères.', 'error');
    return false;
  }
  if (password !== confirmation) {
    setFeedback('Les deux mots de passe ne correspondent pas.', 'error');
    return false;
  }
  return true;
}

async function submitReset(event) {
  event.preventDefault();
  clearFeedback();
  if (!token) {
    setFeedback('Lien invalide. Demandez un nouveau mail de réinitialisation.', 'error');
    return;
  }
  if (!validateForm()) {
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(buildApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ token, password: passwordInput.value.trim() })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.message || 'Impossible de réinitialiser le mot de passe.';
      throw new Error(message);
    }

    setFeedback(payload?.message || 'Mot de passe mis à jour. Vous êtes connecté 🎉', 'success');
    passwordInput.value = '';
    confirmInput.value = '';
  } catch (error) {
    setFeedback(error.message || 'Une erreur est survenue.', 'error');
  } finally {
    setLoading(false);
  }
}

if (form) {
  form.addEventListener('submit', submitReset);
}

if (openAuthBtn) {
  openAuthBtn.addEventListener('click', () => {
    window.location.href = '/?auth=login';
  });
}

if (!token) {
  setFeedback('Lien invalide. Demandez un nouveau mail de réinitialisation.', 'error');
  submitButton.disabled = true;
}

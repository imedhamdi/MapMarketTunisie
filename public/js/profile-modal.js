// ========================================
// PROFILE DRAWER - Module ES
// ========================================

const noopLogger = () => {};
const logger = window.__APP_LOGGER__ || {
  info: noopLogger,
  warn: noopLogger,
  error: (...args) => {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[ProfileModal]', ...args);
    }
  }
};

const API_BASE = resolveApiBase();

function appendCacheBuster(url) {
  if (!url) {
    return url;
  }
  const normalized = String(url);
  const separator = normalized.includes('?') ? '&' : '?';
  return `${normalized}${separator}t=${Date.now()}`;
}

function resolveApiBase() {
  const candidates = [window.__API_BASE__, window.API_BASE];
  for (const candidate of candidates) {
    const normalized = normalizeApiBase(candidate);
    if (normalized) {
      return normalized;
    }
  }
  const origin = window.location?.origin || '';
  const fallback = origin ? `${origin}/api/v1` : '/api/v1';
  return normalizeApiBase(fallback);
}

function normalizeApiBase(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  const hasProtocol = /^https?:\/\//i.test(withoutTrailingSlash);
  const isRelative = withoutTrailingSlash.startsWith('/');
  let base = withoutTrailingSlash;
  if (!hasProtocol && !isRelative) {
    base = `https://${base}`;
  }
  if (/\/api(\/v\d+)?$/i.test(base)) {
    return base;
  }
  return `${base}/api/v1`;
}

function buildApiUrl(path = '') {
  if (typeof path === 'string' && /^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  if (!path) {
    return normalizedBase;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const url = buildApiUrl(path);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = isFormData
    ? headers
    : {
        'Content-Type': 'application/json',
        ...headers
      };

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: requestHeaders,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
    });
  } catch (networkError) {
    const error = new Error('Serveur injoignable. Vérifiez votre connexion.');
    error.code = 'NETWORK_ERROR';
    error.cause = networkError;
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok || payload?.status === 'error') {
    const message = payload?.message || `Erreur HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return unwrapApiPayload(payload);
}

function unwrapApiPayload(payload) {
  if (!payload) {
    return null;
  }
  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload;
}

// === Utils ===
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

function buildUserFromStore(authUser) {
  if (!authUser) {
    return null;
  }
  return {
    id: authUser._id || authUser.id || '',
    name: authUser.name || authUser.username || 'Utilisateur',
    email: authUser.email || '',
    role: authUser.role || 'user',
    isActive: authUser.isActive !== false,
    memberSince: authUser.createdAt || authUser.memberSince || new Date().toISOString(),
    avatarUrl: authUser.avatar || authUser.avatarUrl || '',
    location: {
      city: authUser.location?.city || authUser.city || '',
      radiusKm: authUser.location?.radiusKm || authUser.radiusKm || 0
    }
  };
}

// === State ===
const drawerState = {
  isOpen: false,
  activeTab: 'overview',
  data: null,
  previousFocus: null
};

const deleteConfirmState = {
  isOpen: false,
  isLoading: false
};

function getCurrentUserId() {
  const storeUser = window.authStore?.get?.();
  if (storeUser && (storeUser._id || storeUser.id)) {
    return storeUser._id || storeUser.id;
  }
  if (drawerState.data?.user?.id) {
    return drawerState.data.user.id;
  }
  return null;
}

function getScopedCacheKey(baseKey) {
  const userId = getCurrentUserId();
  if (!userId) return null;
  return `${baseKey}_${userId}`;
}

// === DOM Elements ===
const drawer = document.getElementById('profileDrawer');
const overlay = drawer?.querySelector('.profile-overlay');
const closeBtn = drawer?.querySelector('.profile-close');
const tabs = drawer?.querySelectorAll('[role="tab"]');
const panels = {
  overview: document.getElementById('profilePanelOverview'),
  listings: document.getElementById('profilePanelListings'),
  analytics: document.getElementById('profilePanelAnalytics')
};

// Avatar
const avatarBtn = document.getElementById('profileAvatarBtn');
const avatarImg = document.getElementById('profileAvatarImg');
const avatarInput = document.getElementById('profileAvatarInput');

// Header identity
const nameEl = document.getElementById('profileTitle');
const emailEl = document.getElementById('profileEmail');
const memberSinceEl = document.getElementById('profileMemberSince');

// Overview panel
const locationChip = document.getElementById('profileLocationChip');
const adsCountChip = document.getElementById('profileAdsCountChip');

// Analytics panel
const kpisEls = {
  totalViews: document.getElementById('kpiTotalViews'),
  totalFavorites: document.getElementById('kpiTotalFavorites'),
  averageViews: document.getElementById('kpiAverageViews'),
  inventoryValue: document.getElementById('kpiInventoryValue')
};
const categoryChart = document.getElementById('analyticsCategoryChart');
const topAds = document.getElementById('analyticsTopAds');
const geoList = document.getElementById('analyticsGeoList');
const listingsGrid = document.getElementById('profileListingsGrid');

// Editable forms (Overview tab)
const infoForm = document.getElementById('profileInfoForm');
const infoFeedback = document.getElementById('profileInfoFeedback');
const infoSubmit = document.getElementById('profileInfoSubmit');
const nameInput = document.getElementById('profileNameInput');
const cancelBtn = document.getElementById('profileCancelBtn');
const nameEditBtn = document.getElementById('profileNameEditBtn');

const passwordForm = document.getElementById('profilePasswordForm');
const passwordFeedback = document.getElementById('profilePasswordFeedback');
const passwordEditBtn = document.getElementById('profilePasswordEditBtn');
const passwordCancelBtn = document.getElementById('profilePasswordCancelBtn');
const currentPasswordInput = document.getElementById('profileCurrentPassword');
const newPasswordInput = document.getElementById('profileNewPassword');
const confirmPasswordInput = document.getElementById('profileConfirmPassword');
const currentPasswordError = document.getElementById('currentPasswordError');
const newPasswordError = document.getElementById('newPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

const deleteBtn = document.getElementById('profileDeleteBtn');
const deleteConfirmModal = document.getElementById('profileDeleteConfirm');
const deleteConfirmInput = document.getElementById('profileDeleteConfirmInput');
const deleteConfirmBtn = document.getElementById('profileDeleteConfirmBtn');
const deleteCancelBtn = document.getElementById('profileDeleteCancelBtn');
const deleteConfirmFeedback = document.getElementById('profileDeleteConfirmFeedback');
const deleteConfirmDialog = deleteConfirmModal?.querySelector('.mm-confirm__dialog') || null;
const deleteConfirmBtnDefaultText = deleteConfirmBtn?.textContent || 'Supprimer définitivement';

// === Formatters ===
const numberFormatter = new Intl.NumberFormat('fr-FR');
const currencyFormatter = new Intl.NumberFormat('fr-TN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: 'long'
});

const DEFAULT_AVATAR = '/uploads/avatars/default.jpg';
const DEFAULT_AD_THUMBNAIL = '/icons/placeholder.svg';
const AD_STATUS_LABELS = Object.freeze({
  active: 'En ligne',
  published: 'En ligne',
  draft: 'Brouillon',
  pending: 'En attente',
  paused: 'En pause',
  archived: 'Archivée',
  inactive: 'Inactive'
});

// === UX/Behavior ===
let initialFormValues = null;
let hasUnsavedChanges = false;
let isNameEditing = false;
let isPasswordEditing = false;

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEYS = {
  STATS: 'profile_stats_cache',
  ANALYTICS: 'profile_analytics_cache'
};

const ANALYTICS_OVERVIEW_DEFAULTS = Object.freeze({
  totalViews: 0,
  totalFavorites: 0,
  averageViews: 0,
  inventoryValue: 0
});

const STATS_SUMMARY_DEFAULTS = Object.freeze({
  totalAds: 0,
  activeAds: 0,
  draftAds: 0,
  archivedAds: 0,
  totalViews: 0,
  totalFavorites: 0,
  inventoryValue: 0,
  averagePrice: 0,
  averageViews: 0
});

const STATS_PRICE_DEFAULTS = Object.freeze({
  min: 0,
  max: 0,
  average: 0,
  total: 0
});

const STATS_ENGAGEMENT_DEFAULTS = Object.freeze({
  totalViews: 0,
  totalFavorites: 0,
  averageViews: 0,
  averageFavorites: 0,
  activeRate: 0
});

function createEmptyStats() {
  return {
    summary: { ...STATS_SUMMARY_DEFAULTS },
    engagement: { ...STATS_ENGAGEMENT_DEFAULTS },
    price: { ...STATS_PRICE_DEFAULTS },
    recentActivity: []
  };
}

function normalizeStatsData(rawStats) {
  if (!rawStats) {
    return createEmptyStats();
  }
  const base = unwrapApiPayload(rawStats) || {};
  const summary = {
    ...STATS_SUMMARY_DEFAULTS,
    ...(typeof base.summary === 'object' ? base.summary : {})
  };
  const engagementInput = typeof base.engagement === 'object' ? base.engagement : {};
  const priceInput = typeof base.price === 'object' ? base.price : {};

  return {
    ...base,
    summary,
    engagement: {
      ...STATS_ENGAGEMENT_DEFAULTS,
      ...engagementInput,
      totalViews: Number(engagementInput.totalViews ?? summary.totalViews) || 0,
      totalFavorites: Number(engagementInput.totalFavorites ?? summary.totalFavorites) || 0,
      averageViews: Number(engagementInput.averageViews ?? summary.averageViews) || 0,
      averageFavorites: Number(engagementInput.averageFavorites) || 0,
      activeRate: Number(engagementInput.activeRate) || 0
    },
    price: {
      ...STATS_PRICE_DEFAULTS,
      ...priceInput,
      min: Number(priceInput.min) || 0,
      max: Number(priceInput.max) || 0,
      average: Number(priceInput.average) || 0,
      total: Number(priceInput.total) || 0
    },
    recentActivity: Array.isArray(base.recentActivity) ? base.recentActivity : []
  };
}

function shouldCacheStats(stats) {
  if (!stats || !stats.summary) {
    return false;
  }
  const summary = stats.summary;
  return (
    (Number(summary.totalAds) || 0) > 0 ||
    (Number(summary.totalViews) || 0) > 0 ||
    (Number(summary.totalFavorites) || 0) > 0
  );
}

function createEmptyAnalytics() {
  return {
    overview: { ...ANALYTICS_OVERVIEW_DEFAULTS },
    categoryPerformance: [],
    statusBreakdown: [],
    priceDistribution: [],
    topPerformingAds: [],
    locationDistribution: []
  };
}

// Ensures analytics payloads always expose the expected structure.
function normalizeAnalyticsData(rawAnalytics) {
  const base = rawAnalytics && typeof rawAnalytics === 'object' ? rawAnalytics : {};
  const empty = createEmptyAnalytics();

  return {
    ...empty,
    ...base,
    overview: {
      ...empty.overview,
      ...(typeof base.overview === 'object' ? base.overview : {})
    },
    categoryPerformance: Array.isArray(base.categoryPerformance)
      ? base.categoryPerformance
      : empty.categoryPerformance,
    statusBreakdown: Array.isArray(base.statusBreakdown)
      ? base.statusBreakdown
      : empty.statusBreakdown,
    priceDistribution: Array.isArray(base.priceDistribution)
      ? base.priceDistribution
      : empty.priceDistribution,
    topPerformingAds: Array.isArray(base.topPerformingAds)
      ? base.topPerformingAds
      : empty.topPerformingAds,
    locationDistribution: Array.isArray(base.locationDistribution)
      ? base.locationDistribution
      : empty.locationDistribution
  };
}

function shouldCacheAnalytics(analytics) {
  if (!analytics) return false;
  const overview = analytics.overview || {};
  const hasOverviewData =
    (overview.totalViews || 0) > 0 ||
    (overview.totalFavorites || 0) > 0 ||
    (overview.averageViews || 0) > 0 ||
    (overview.inventoryValue || 0) > 0;
  const hasCategoryData =
    Array.isArray(analytics.categoryPerformance) && analytics.categoryPerformance.length > 0;

  return hasOverviewData || hasCategoryData;
}

// === Helpers ===
function escapeHtml(value = '') {
  if (typeof value !== 'string') {
    return '';
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return value.replace(/[&<>"']/g, (char) => map[char] || char);
}

function resolveAvatarSrc(rawValue) {
  if (typeof window.getAvatarUrl === 'function') {
    return window.getAvatarUrl(rawValue);
  }
  if (!rawValue) return DEFAULT_AVATAR;
  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) return rawValue;
  if (rawValue.startsWith('/')) return rawValue;
  return `/uploads/avatars/${rawValue}`;
}

function resolveAdThumbnail(rawValue) {
  if (!rawValue) return DEFAULT_AD_THUMBNAIL;
  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) return rawValue;
  if (rawValue.startsWith('/')) return rawValue;
  return `/uploads/${rawValue}`;
}

function formatCurrencyDisplay(value) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return `${currencyFormatter.format(safeValue)} DT`;
}

function formatAdPrice(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return formatCurrencyDisplay(value);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.replace(/€/g, 'DT').trim();
  }
  return '—';
}

function getAdStatusLabel(status) {
  if (!status) return '—';
  const normalized = status.toLowerCase();
  if (AD_STATUS_LABELS[normalized]) {
    return AD_STATUS_LABELS[normalized];
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// === Cache Helpers ===
function saveCacheData(key, data) {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
    logger.info(`✓ Cache saved: ${key}`);
  } catch (err) {
    logger.error(`❌ Error saving cache ${key}:`, err);
  }
}

function getCacheData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheItem = JSON.parse(cached);
    const age = Date.now() - cacheItem.timestamp;

    // Check if cache is still valid (within TTL)
    if (age < CACHE_TTL) {
      logger.info(`✓ Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
      return cacheItem.data;
    }

    // Cache expired, remove it
    logger.info(`⏱ Cache expired: ${key}`);
    localStorage.removeItem(key);
    return null;
  } catch (err) {
    logger.error(`❌ Error reading cache ${key}:`, err);
    return null;
  }
}

function clearProfileCache() {
  try {
    const statsKey = getScopedCacheKey(CACHE_KEYS.STATS);
    const analyticsKey = getScopedCacheKey(CACHE_KEYS.ANALYTICS);

    if (statsKey) localStorage.removeItem(statsKey);
    if (analyticsKey) localStorage.removeItem(analyticsKey);

    // Cleanup legacy keys without user scope
    localStorage.removeItem(CACHE_KEYS.STATS);
    localStorage.removeItem(CACHE_KEYS.ANALYTICS);

    logger.info('✓ Profile cache cleared');
  } catch (err) {
    logger.error('❌ Error clearing cache:', err);
  }
}

function showFeedback(el, message, type) {
  if (!el) return;

  // Clear previous feedback
  el.textContent = '';
  el.className = 'profile-form-feedback';

  // Force reflow to restart animation
  void el.offsetWidth;

  // Set new feedback with aria-live support
  el.textContent = message;
  el.className = `profile-form-feedback ${type}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    el.className = 'profile-form-feedback';
    el.textContent = '';
  }, 5000);
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function clearErrors() {
  [currentPasswordError, newPasswordError, confirmPasswordError].forEach((el) => {
    if (el) {
      el.textContent = '';
      el.classList.remove('visible');
    }
  });
}

function isDeleteConfirmOpen() {
  return Boolean(deleteConfirmModal && !deleteConfirmModal.hidden && deleteConfirmState.isOpen);
}

function resetDeleteConfirmFeedback() {
  if (deleteConfirmFeedback) {
    deleteConfirmFeedback.className = 'profile-form-feedback mm-confirm__feedback';
    deleteConfirmFeedback.textContent = '';
  }
}

function showDeleteConfirmFeedback(message, type) {
  if (!deleteConfirmFeedback) return;
  showFeedback(deleteConfirmFeedback, message, type);
  deleteConfirmFeedback.classList.add('mm-confirm__feedback');
}

function deleteKeywordMatch(value) {
  return value.trim().toUpperCase() === 'SUPPRIMER';
}

function openDeleteConfirm() {
  if (!deleteConfirmModal) return;
  if (isDeleteConfirmOpen()) return;

  deleteConfirmModal.hidden = false;
  deleteConfirmModal.removeAttribute('hidden');
  deleteConfirmModal.classList.add('is-open');
  deleteConfirmState.isOpen = true;
  deleteConfirmState.isLoading = false;

  if (deleteConfirmInput) {
    deleteConfirmInput.value = '';
    deleteConfirmInput.disabled = false;
    deleteConfirmInput.removeAttribute('aria-invalid');
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = deleteConfirmBtnDefaultText;
  }

  deleteCancelBtn && (deleteCancelBtn.disabled = false);
  resetDeleteConfirmFeedback();

  requestAnimationFrame(() => {
    setTimeout(() => deleteConfirmInput?.focus(), 40);
  });
}

function closeDeleteConfirm(force = false) {
  if (!deleteConfirmModal) return;
  if (!isDeleteConfirmOpen()) return;
  if (deleteConfirmState.isLoading && !force) return;

  deleteConfirmModal.classList.remove('is-open');
  deleteConfirmState.isOpen = false;

  const finalize = () => {
    deleteConfirmModal.hidden = true;
    deleteConfirmState.isLoading = false;

    if (deleteConfirmInput) {
      deleteConfirmInput.value = '';
      deleteConfirmInput.disabled = false;
      deleteConfirmInput.removeAttribute('aria-invalid');
    }

    if (deleteConfirmBtn) {
      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.textContent = deleteConfirmBtnDefaultText;
    }

    if (deleteCancelBtn) {
      deleteCancelBtn.disabled = false;
    }

    resetDeleteConfirmFeedback();
  };

  if (force) {
    finalize();
  } else {
    setTimeout(finalize, 200);
  }
}

function setDeleteConfirmLoading(isLoading) {
  deleteConfirmState.isLoading = isLoading;

  if (deleteConfirmBtn) {
    deleteConfirmBtn.disabled =
      isLoading || !deleteConfirmInput || !deleteKeywordMatch(deleteConfirmInput.value);
    deleteConfirmBtn.textContent = isLoading
      ? 'Suppression en cours…'
      : deleteConfirmBtnDefaultText;
  }

  if (deleteConfirmInput) {
    deleteConfirmInput.disabled = isLoading;
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.disabled = isLoading;
  }
}

function handleDeleteConfirmInput(e) {
  const value = e.target.value;
  const match = deleteKeywordMatch(value);

  if (!value.trim()) {
    e.target.removeAttribute('aria-invalid');
  } else {
    e.target.setAttribute('aria-invalid', match ? 'false' : 'true');
  }

  if (deleteConfirmBtn && !deleteConfirmState.isLoading) {
    deleteConfirmBtn.disabled = !match;
  }
}

async function confirmDeleteAccount() {
  if (!deleteConfirmModal) return;

  setDeleteConfirmLoading(true);
  showDeleteConfirmFeedback('⏳ Suppression en cours…', 'info');

  try {
    await apiRequest('/users/me', { method: 'DELETE' });

    showDeleteConfirmFeedback('✓ Compte supprimé. Déconnexion…', 'success');

    setTimeout(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }, 1200);
  } catch (err) {
    logger.error('Error deleting account:', err);
    showDeleteConfirmFeedback(`❌ ${err.message || 'Erreur réseau'}`, 'error');
    setDeleteConfirmLoading(false);
  }
}

function showEmptyAnalytics() {
  const analyticsPanel = panels.analytics;
  if (!analyticsPanel) return;

  const emptyHTML = `
    <div class="profile-empty-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <h3>Aucune donnée analytique</h3>
      <p>Créez votre première annonce pour commencer à suivre vos statistiques et performances.</p>
    </div>
  `;

  // Replace KPI section
  const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
  if (kpisContainer) {
    kpisContainer.innerHTML = emptyHTML;
  }
}

function restoreAnalyticsKpis() {
  const analyticsPanel = panels.analytics;
  if (!analyticsPanel) return;

  const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
  if (kpisContainer) {
    kpisContainer.innerHTML = `
      <div class="profile-kpi">
        <span class="profile-kpi-label">Vues totales</span>
        <span class="profile-kpi-value" id="kpiTotalViews">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Favoris totaux</span>
        <span class="profile-kpi-value" id="kpiTotalFavorites">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Vues moy./annonce</span>
        <span class="profile-kpi-value" id="kpiAverageViews">0</span>
      </div>
      <div class="profile-kpi">
        <span class="profile-kpi-label">Valeur catalogue</span>
        <span class="profile-kpi-value" id="kpiInventoryValue">0 €</span>
      </div>
    `;

    // Re-cache DOM elements after restoration
    kpisEls.totalViews = document.getElementById('kpiTotalViews');
    kpisEls.totalFavorites = document.getElementById('kpiTotalFavorites');
    kpisEls.averageViews = document.getElementById('kpiAverageViews');
    kpisEls.inventoryValue = document.getElementById('kpiInventoryValue');
  }
}

function showLoadingSkeletons() {
  // Show skeletons in analytics panel only
  const analyticsPanel = panels.analytics;
  if (analyticsPanel) {
    const kpisContainer = analyticsPanel.querySelector('.profile-kpis');
    if (kpisContainer) {
      kpisContainer.innerHTML = `
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
        <div class="profile-skeleton profile-skeleton-kpi"></div>
      `;
    }
  }
}

// === Focus Management ===
const focusableSelectors =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isFocusableElement(el) {
  if (!el) return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  if (el.tabIndex === -1) return false;
  if (el.closest('[hidden]')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFocusScope() {
  if (isDeleteConfirmOpen() && deleteConfirmDialog) {
    return deleteConfirmDialog;
  }
  return drawer;
}

function trapFocus(e) {
  if (!drawerState.isOpen || e.key !== 'Tab') return;

  const scope = getFocusScope();
  if (!scope) return;

  const focusables = Array.from(scope.querySelectorAll(focusableSelectors)).filter(
    isFocusableElement
  );
  if (!focusables.length) return;

  const firstFocusable = focusables[0];
  const lastFocusable = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === firstFocusable) {
    e.preventDefault();
    lastFocusable?.focus();
  } else if (!e.shiftKey && document.activeElement === lastFocusable) {
    e.preventDefault();
    firstFocusable?.focus();
  }
}

function handleEscape(e) {
  if (e.key !== 'Escape') return;

  if (isDeleteConfirmOpen()) {
    closeDeleteConfirm();
    return;
  }

  if (drawerState.isOpen) {
    closeProfileDrawer();
  }
}

// === Tab Management ===
function setActiveTab(tabName) {
  drawerState.activeTab = tabName;
  localStorage.setItem('profileActiveTab', tabName);

  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.setAttribute('aria-selected', isActive);
  });

  Object.entries(panels).forEach(([key, panel]) => {
    if (panel) {
      const isActive = key === tabName;
      panel.hidden = !isActive;
      panel.classList.toggle('profile-panel--active', isActive);
    }
  });
}

function onTabClick(e) {
  const tab = e.currentTarget;
  const tabName = tab.dataset.tab;
  if (tabName) {
    setActiveTab(tabName);
  }
}

function onTabKeydown(e) {
  const currentTab = e.currentTarget;
  const tabsArray = Array.from(tabs);
  const currentIndex = tabsArray.indexOf(currentTab);

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % tabsArray.length;
    tabsArray[nextIndex].focus();
    setActiveTab(tabsArray[nextIndex].dataset.tab);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + tabsArray.length) % tabsArray.length;
    tabsArray[prevIndex].focus();
    setActiveTab(tabsArray[prevIndex].dataset.tab);
  }
}

// === Render Functions ===
function renderHeader(user) {
  if (!user) return;

  if (avatarImg) avatarImg.src = resolveAvatarSrc(user.avatarUrl);
  if (nameEl) nameEl.textContent = user.name || 'Utilisateur';
  if (emailEl) emailEl.textContent = user.email || '';
  if (memberSinceEl && user.memberSince) {
    const date = new Date(user.memberSince);
    memberSinceEl.textContent = `Membre depuis ${dateFormatter.format(date)}`;
  }
}

function renderOverview(data) {
  const { user, stats } = data;

  // DEBUG: Log pour vérifier les données reçues
  logger.info('renderOverview - stats:', stats);
  logger.info('renderOverview - stats.summary:', stats?.summary);
  logger.info('renderOverview - activeAds:', stats?.summary?.activeAds);

  // Location chip
  if (locationChip) {
    locationChip.textContent = user.location?.city ? `📍 ${user.location.city}` : '📍 —';
  }

  // Ads count chip
  if (adsCountChip && stats?.summary) {
    const activeAds = stats.summary.activeAds || 0;
    adsCountChip.textContent = `📋 ${activeAds} annonce${activeAds > 1 ? 's' : ''}`;
  }

  renderListings(stats);
}

function renderListings(stats) {
  if (!listingsGrid) return;

  const listings = Array.isArray(stats?.recentActivity) ? stats.recentActivity : [];
  if (!listings.length) {
    listingsGrid.innerHTML = `
      <div class="profile-empty-state">
        <p>Aucune annonce publiée pour le moment.</p>
      </div>
    `;
    return;
  }

  listingsGrid.innerHTML = listings
    .map((ad) => {
      const rawTitle =
        typeof ad.title === 'string' && ad.title.trim() ? ad.title.trim() : 'Annonce sans titre';
      const safeTitle = escapeHtml(rawTitle);
      const status = (ad.status || '').toLowerCase();
      const statusLabel = escapeHtml(getAdStatusLabel(status));
      const price = escapeHtml(formatAdPrice(ad.price));
      const views = numberFormatter.format(Number(ad.views) || 0);
      const favorites = numberFormatter.format(Number(ad.favorites) || 0);
      const thumbnail = resolveAdThumbnail(ad.thumbnail);
      const statusAttr = status || 'active';

      const isArchived = status === 'archived' || status === 'inactive';
      const actionsMarkup = isArchived
        ? `
            <button type="button" class="profile-listing-restore">
              ↺ Remettre en ligne
            </button>
          `
        : `
            <div class="profile-listing-actions" role="group" aria-label="Actions sur l'annonce">
              <button type="button" class="profile-listing-action" aria-label="Voir l'annonce" title="Voir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button type="button" class="profile-listing-action" aria-label="Modifier l'annonce" title="Modifier">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" class="profile-listing-action profile-listing-action--danger" aria-label="Supprimer l'annonce" title="Supprimer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          `;

      return `
        <article class="profile-listing-card" role="listitem" data-status="${statusAttr}">
          <div class="profile-listing-thumb">
            <img src="${thumbnail}" alt="Miniature de ${safeTitle}" loading="lazy" decoding="async" />
          </div>
          <div class="profile-listing-body">
            <div class="profile-listing-meta">
              <span class="profile-listing-status" data-status="${statusAttr}">${statusLabel}</span>
              <span class="profile-listing-price">${price}</span>
            </div>
            <p class="profile-listing-title" title="${safeTitle}">${safeTitle}</p>
            <div class="profile-listing-bottom">
              <div class="profile-listing-stats">
                <span aria-label="Vues">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  ${views}
                </span>
                <span aria-label="Favoris">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  ${favorites}
                </span>
              </div>
              ${actionsMarkup}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderAnalytics(analytics) {
  if (!analytics) {
    showEmptyAnalytics();
    return;
  }

  // Check if analytics has any meaningful data
  const overview = analytics.overview || {};
  const hasData =
    overview.totalViews > 0 ||
    overview.totalFavorites > 0 ||
    (analytics.categoryPerformance && analytics.categoryPerformance.length > 0);

  if (!hasData) {
    showEmptyAnalytics();
    return;
  }

  // Restore KPIs structure (in case skeletons were shown)
  restoreAnalyticsKpis();

  // KPIs
  if (kpisEls.totalViews) {
    kpisEls.totalViews.textContent = numberFormatter.format(overview.totalViews || 0);
  }
  if (kpisEls.totalFavorites) {
    kpisEls.totalFavorites.textContent = numberFormatter.format(overview.totalFavorites || 0);
  }
  if (kpisEls.averageViews) {
    kpisEls.averageViews.textContent = numberFormatter.format(overview.averageViews || 0);
  }
  if (kpisEls.inventoryValue) {
    kpisEls.inventoryValue.textContent = formatCurrencyDisplay(overview.inventoryValue || 0);
  }

  // Category performance
  if (categoryChart && analytics.categoryPerformance) {
    if (analytics.categoryPerformance.length === 0) {
      categoryChart.innerHTML =
        '<div class="profile-empty-state"><p>Aucune donnée de catégorie disponible</p></div>';
    } else {
      const maxValue = Math.max(
        ...analytics.categoryPerformance.map((c) => c.views || c.value || 0),
        1
      );
      categoryChart.innerHTML = analytics.categoryPerformance
        .map((item) => {
          const value = item.views || item.value || 0;
          const percent = (value / maxValue) * 100;
          return `
        <div class="profile-chart-bar">
          <div class="profile-chart-label">${item.category}</div>
          <div class="profile-chart-track">
            <div class="profile-chart-fill" style="width: ${percent}%">
              <span class="profile-chart-value">${numberFormatter.format(value)}</span>
            </div>
          </div>
        </div>
      `;
        })
        .join('');
    }
  }

  // Top ads
  if (topAds && analytics.topPerformingAds) {
    if (analytics.topPerformingAds.length === 0) {
      topAds.innerHTML = '<li>Aucune donnée</li>';
    } else {
      topAds.innerHTML = analytics.topPerformingAds
        .map(
          (ad) => `
        <li>
          <span class="profile-top-ad-title">${ad.title}</span>
          <div class="profile-top-ad-stats">
            <span>👁️ ${numberFormatter.format(ad.views)}</span>
            <span>❤️ ${numberFormatter.format(ad.favorites)}</span>
          </div>
        </li>
      `
        )
        .join('');
    }
  }

  // Geo distribution
  if (geoList && analytics.locationDistribution) {
    if (analytics.locationDistribution.length === 0) {
      geoList.innerHTML = '<li>Aucune donnée</li>';
    } else {
      geoList.innerHTML = analytics.locationDistribution
        .map((loc) => `<li>${loc.city}</li>`)
        .join('');
    }
  }
}

function renderSettings(user) {
  if (!user) return;
  if (nameInput) nameInput.value = user.name || '';
  // capture initial values for dirty-checking
  initialFormValues = {
    name: nameInput?.value || ''
  };
  hasUnsavedChanges = false;
}

// === Name Edit Toggle ===
function toggleNameEdit() {
  if (!nameInput || !nameEditBtn) return;

  const editIcon = nameEditBtn.querySelector('.profile-input-icon--edit');
  const saveIcon = nameEditBtn.querySelector('.profile-input-icon--save');

  if (isNameEditing) {
    // Save mode - trigger save
    saveNameInline();
  } else {
    // Enable edit mode
    isNameEditing = true;
    nameInput.removeAttribute('readonly');
    nameInput.focus();

    // Switch icons
    if (editIcon) editIcon.style.display = 'none';
    if (saveIcon) saveIcon.style.display = 'block';

    // Update button attributes
    nameEditBtn.setAttribute('aria-label', 'Enregistrer le nom');
    nameEditBtn.setAttribute('title', 'Enregistrer');
  }
}

async function saveNameInline() {
  if (!nameInput || !nameEditBtn) return;

  const newName = nameInput.value.trim();

  // Validation
  if (newName.length < 2) {
    showFeedback(infoFeedback, 'Le nom doit contenir au moins 2 caractères', 'error');
    return;
  }

  // Check if changed
  if (newName === initialFormValues?.name) {
    // No change, just exit edit mode
    exitNameEditMode();
    return;
  }

  // Disable button during save
  nameEditBtn.disabled = true;
  showFeedback(infoFeedback, '⏳ Enregistrement...', 'info');

  try {
    const payload = await apiRequest('/users/me', {
      method: 'PATCH',
      body: { name: newName }
    });

    showFeedback(infoFeedback, '✓ Nom mis à jour avec succès', 'success');
    clearProfileCache();

    if (drawerState.data?.user) {
      const updatedUser = payload?.user || {};
      drawerState.data.user.name = updatedUser.name || newName;
      renderHeader(drawerState.data.user);
    }

    // Update initial values
    initialFormValues = { name: newName };
    hasUnsavedChanges = false;

    // Exit edit mode after showing success message
    setTimeout(() => {
      exitNameEditMode();

      // Clear success message after additional delay
      setTimeout(() => {
        if (infoFeedback && infoFeedback.classList.contains('success')) {
          showFeedback(infoFeedback, '', 'info');
        }
      }, 2000);
    }, 2000);
  } catch (err) {
    logger.error('Error saving name:', err);
    showFeedback(infoFeedback, `❌ ${err.message || 'Erreur réseau'}`, 'error');
  } finally {
    nameEditBtn.disabled = false;
  }
}

function exitNameEditMode() {
  if (!nameInput || !nameEditBtn) return;

  const editIcon = nameEditBtn.querySelector('.profile-input-icon--edit');
  const saveIcon = nameEditBtn.querySelector('.profile-input-icon--save');

  isNameEditing = false;
  nameInput.setAttribute('readonly', 'readonly');

  // Switch icons back
  if (editIcon) editIcon.style.display = 'block';
  if (saveIcon) saveIcon.style.display = 'none';

  // Update button attributes
  nameEditBtn.setAttribute('aria-label', 'Modifier le nom');
  nameEditBtn.setAttribute('title', 'Modifier');

  // Only clear feedback if it's not a success message
  if (infoFeedback && !infoFeedback.classList.contains('success')) {
    showFeedback(infoFeedback, '', 'info');
  }
}

// === Password Edit Toggle ===
function togglePasswordEdit() {
  if (!currentPasswordInput || !passwordEditBtn) return;

  const editIcon = passwordEditBtn.querySelector('.profile-input-icon--edit');
  const saveIcon = passwordEditBtn.querySelector('.profile-input-icon--save');
  const newPasswordGroup = newPasswordInput?.closest('.profile-form-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.profile-form-group');

  if (isPasswordEditing) {
    // Save mode - trigger change password
    savePasswordInline();
  } else {
    // Enable edit mode
    isPasswordEditing = true;
    currentPasswordInput.removeAttribute('readonly');
    currentPasswordInput.focus();

    // Show new password and confirm fields
    if (newPasswordGroup) newPasswordGroup.style.display = 'flex';
    if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'flex';

    // Show cancel button
    if (passwordCancelBtn) passwordCancelBtn.style.display = 'flex';

    // Switch icons
    if (editIcon) editIcon.style.display = 'none';
    if (saveIcon) saveIcon.style.display = 'block';

    // Update button attributes
    passwordEditBtn.setAttribute('aria-label', 'Enregistrer le mot de passe');
    passwordEditBtn.setAttribute('title', 'Enregistrer');
  }
}

async function savePasswordInline() {
  if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !passwordEditBtn) {
    return;
  }

  clearErrors();

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Client-side validation
  if (!currentPassword) {
    showError(currentPasswordError, 'Champ requis');
    return;
  }
  if (!newPassword || newPassword.length < 8) {
    showError(newPasswordError, 'Minimum 8 caractères');
    return;
  }
  if (newPassword !== confirmPassword) {
    showError(confirmPasswordError, 'Les mots de passe ne correspondent pas');
    return;
  }

  // Disable button during save
  passwordEditBtn.disabled = true;
  showFeedback(passwordFeedback, '⏳ Changement en cours...', 'info');

  try {
    await apiRequest('/users/me/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });

    showFeedback(passwordFeedback, '✓ Mot de passe changé avec succès', 'success');
    clearProfileCache();

    // Reset form and exit edit mode after showing success message
    passwordForm.reset();

    // Delay exit to show success message
    setTimeout(() => {
      exitPasswordEditMode();

      // Clear success message after additional delay
      setTimeout(() => {
        if (passwordFeedback && passwordFeedback.classList.contains('success')) {
          showFeedback(passwordFeedback, '', 'info');
        }
      }, 2000);
    }, 2000);
  } catch (err) {
    logger.error('Error changing password:', err);
    const message = err?.message || 'Erreur réseau';
    if (message.includes('actuel')) {
      showError(currentPasswordError, message);
    } else {
      showFeedback(passwordFeedback, `❌ ${message}`, 'error');
    }
  } finally {
    passwordEditBtn.disabled = false;
  }
}

function exitPasswordEditMode() {
  if (!currentPasswordInput || !passwordEditBtn) return;

  const editIcon = passwordEditBtn.querySelector('.profile-input-icon--edit');
  const saveIcon = passwordEditBtn.querySelector('.profile-input-icon--save');
  const newPasswordGroup = newPasswordInput?.closest('.profile-form-group');
  const confirmPasswordGroup = confirmPasswordInput?.closest('.profile-form-group');

  isPasswordEditing = false;
  currentPasswordInput.setAttribute('readonly', 'readonly');

  // Hide new password and confirm fields
  if (newPasswordGroup) newPasswordGroup.style.display = 'none';
  if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';

  // Hide cancel button
  if (passwordCancelBtn) passwordCancelBtn.style.display = 'none';

  // Switch icons back
  if (editIcon) editIcon.style.display = 'block';
  if (saveIcon) saveIcon.style.display = 'none';

  // Update button attributes
  passwordEditBtn.setAttribute('aria-label', 'Modifier le mot de passe');
  passwordEditBtn.setAttribute('title', 'Modifier');

  // Clear errors only (keep success feedback if present)
  clearErrors();

  // Only clear feedback if it's not a success message
  if (passwordFeedback && !passwordFeedback.classList.contains('success')) {
    showFeedback(passwordFeedback, '', 'info');
  }
}

function cancelPasswordEdit() {
  if (!passwordForm) return;

  // Reset form
  passwordForm.reset();

  // Clear any errors
  clearErrors();

  // Exit edit mode
  exitPasswordEditMode();
}

// === Form Handlers ===
async function onSaveInfo(e) {
  e.preventDefault();
  if (!infoSubmit) return;

  infoSubmit.disabled = true;
  infoSubmit.textContent = 'Enregistrement...';

  try {
    const formData = new FormData(infoForm);
    // sanitize/normalize
    const name = String(formData.get('name') || '')
      .trim()
      .replace(/\s{2,}/g, ' ');
    const payload = await apiRequest('/users/me', {
      method: 'PATCH',
      body: {
        name
      }
    });

    showFeedback(infoFeedback, 'Informations mises à jour', 'success');
    clearProfileCache();
    if (drawerState.data?.user) {
      const updatedUser = payload?.user || {};
      drawerState.data.user.name = updatedUser.name || name;
      renderHeader(drawerState.data.user);
    }
    // reset dirty state
    initialFormValues = { name: nameInput?.value || '' };
    hasUnsavedChanges = false;
  } catch (err) {
    logger.error('Error saving info:', err);
    showFeedback(infoFeedback, err.message || 'Erreur réseau', 'error');
  } finally {
    infoSubmit.disabled = false;
    infoSubmit.textContent = 'Enregistrer';
  }
}

async function onUploadAvatar(file) {
  if (!file || !file.type.startsWith('image/')) {
    showFeedback(
      infoFeedback,
      '⚠️ Format de fichier invalide. Utilisez JPG, PNG ou WEBP.',
      'error'
    );
    logger.warn('Invalid file type');
    return;
  }

  // Validate file size (2MB max)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    showFeedback(infoFeedback, '⚠️ Fichier trop volumineux. Maximum 2 MB.', 'error');
    return;
  }

  try {
    // 1. Optimistic UI - Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    if (avatarImg) {
      avatarImg.src = previewUrl;
    }

    // Disable upload button during upload
    if (avatarBtn) {
      avatarBtn.disabled = true;
      avatarBtn.style.opacity = '0.6';
      avatarBtn.style.cursor = 'wait';
    }

    // Show uploading feedback
    if (infoFeedback) {
      showFeedback(infoFeedback, '⏳ Upload en cours...', 'info');
    }

    // 2. Upload to server
    const formData = new FormData();
    formData.append('avatar', file);

    const result = await apiRequest('/users/me/avatar', {
      method: 'POST',
      body: formData
    });

    const avatarUrl = result?.avatarUrl;

    if (!avatarUrl) {
      throw new Error("URL d'avatar manquante dans la réponse");
    }

    // 3. Cache-busting - Update all avatar images with timestamp
    const cacheBustedUrl = appendCacheBuster(avatarUrl);

    if (avatarImg) {
      // Clean up blob URL
      URL.revokeObjectURL(previewUrl);
      avatarImg.src = cacheBustedUrl;
    }

    // Update state
    if (drawerState.data?.user) {
      drawerState.data.user.avatarUrl = avatarUrl;
    }

    // 4. Update authStore if available
    if (window.authStore?.get) {
      const currentUser = window.authStore.get();
      if (currentUser) {
        window.authStore.set({ ...currentUser, avatarUrl, avatar: avatarUrl });
      }
    }

    // 5. Propagate to global header via CustomEvent
    const event = new CustomEvent('user:avatar-updated', {
      detail: { avatarUrl: cacheBustedUrl }
    });
    document.dispatchEvent(event);

    // 6. Clear cache to force refresh on next load
    clearProfileCache();

    // 7. Success feedback with aria-live
    showFeedback(infoFeedback, '✓ Avatar mis à jour avec succès', 'success');
    logger.info('Avatar uploaded successfully:', avatarUrl);
  } catch (err) {
    logger.error('Error uploading avatar:', err);

    // Revert optimistic update on error
    if (avatarImg && drawerState.data?.user?.avatarUrl) {
      avatarImg.src = resolveAvatarSrc(drawerState.data.user.avatarUrl);
    }

    // Error feedback
    const errorMsg = err.message || "Échec de l'upload de l'avatar";
    showFeedback(infoFeedback, `❌ ${errorMsg}`, 'error');
  } finally {
    // Re-enable upload button
    if (avatarBtn) {
      avatarBtn.disabled = false;
      avatarBtn.style.opacity = '1';
      avatarBtn.style.cursor = 'pointer';
    }
  }
}

function onDeleteAccount() {
  openDeleteConfirm();
}

// === Unsaved changes helpers ===
function computeUnsavedChanges() {
  if (!initialFormValues) return false;
  const current = {
    name: nameInput?.value || ''
  };
  return current.name !== initialFormValues.name;
}

function canCloseDrawer() {
  hasUnsavedChanges = computeUnsavedChanges();
  if (hasUnsavedChanges) {
    return window.confirm('Vous avez des modifications non enregistrées. Fermer quand même ?');
  }
  return true;
}

// === Fetch Profile Data ===
async function fetchProfileData() {
  try {
    const authUser = window.authStore?.get();
    const statsCacheKey = getScopedCacheKey(CACHE_KEYS.STATS);
    const analyticsCacheKey = getScopedCacheKey(CACHE_KEYS.ANALYTICS);
    const cachedStats = statsCacheKey ? getCacheData(statsCacheKey) : null;
    const cachedAnalytics = analyticsCacheKey ? getCacheData(analyticsCacheKey) : null;
    let stats = cachedStats ? normalizeStatsData(cachedStats) : null;
    let analytics = cachedAnalytics ? normalizeAnalyticsData(cachedAnalytics) : null;

    if (authUser) {
      logger.info('Using authStore user data');
      const user = buildUserFromStore(authUser);

      if (!stats || !analytics) {
        const [statsRes, analyticsRes] = await Promise.allSettled([
          !stats ? apiRequest('/users/me/stats') : Promise.resolve(stats),
          !analytics ? apiRequest('/users/me/analytics') : Promise.resolve(analytics)
        ]);

        if (!stats) {
          const statsSource = statsRes.status === 'fulfilled' ? statsRes.value : null;
          stats = statsSource ? normalizeStatsData(statsSource) : createEmptyStats();
          if (shouldCacheStats(stats) && statsCacheKey) {
            saveCacheData(statsCacheKey, stats);
          }
        }

        if (!analytics) {
          const analyticsPayload = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;
          analytics = normalizeAnalyticsData(analyticsPayload);
          if (shouldCacheAnalytics(analytics) && analyticsCacheKey) {
            saveCacheData(analyticsCacheKey, analytics);
          }
        }
      }

      return {
        user,
        stats: stats || createEmptyStats(),
        analytics: analytics || createEmptyAnalytics()
      };
    }

    logger.warn('No authStore data, trying API');
    const [userRes, statsRes, analyticsRes] = await Promise.allSettled([
      apiRequest('/users/me'),
      !stats ? apiRequest('/users/me/stats') : Promise.resolve(stats),
      !analytics ? apiRequest('/users/me/analytics') : Promise.resolve(analytics)
    ]);

    const apiUserPayload = userRes.status === 'fulfilled' ? userRes.value : null;
    const apiUser = apiUserPayload?.user || apiUserPayload;

    if (!apiUser) {
      throw new Error('Utilisateur introuvable');
    }

    if (!stats) {
      const statsSource = statsRes.status === 'fulfilled' ? statsRes.value : null;
      stats = statsSource ? normalizeStatsData(statsSource) : createEmptyStats();
      if (shouldCacheStats(stats) && statsCacheKey) {
        saveCacheData(statsCacheKey, stats);
      }
    }

    if (!analytics) {
      const analyticsPayload = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;
      analytics = normalizeAnalyticsData(analyticsPayload);
      if (shouldCacheAnalytics(analytics) && analyticsCacheKey) {
        saveCacheData(analyticsCacheKey, analytics);
      }
    }

    return {
      user: apiUser,
      stats: stats || createEmptyStats(),
      analytics: analytics || createEmptyAnalytics()
    };
  } catch (error) {
    logger.error('[ProfileModal] Error fetching profile data:', error);
    return null;
  }
}

// === Open/Close ===
async function openProfileDrawer(data) {
  logger.info('🚀 openProfileDrawer called');

  if (!drawer) {
    logger.error('❌ Profile drawer not found in DOM');
    return;
  }

  logger.info('✓ Drawer found, fetching data...');

  drawerState.previousFocus = document.activeElement;
  drawerState.isOpen = true;

  // If no data provided, show skeletons and fetch it
  let profileData = data;
  if (!profileData) {
    // Show loading skeletons
    showLoadingSkeletons();

    profileData = await fetchProfileData();
    if (!profileData) {
      logger.error('❌ Could not fetch profile data');
      // Show error state
      showEmptyAnalytics();
      return;
    }
    logger.info('✓ Data fetched:', profileData);
  }

  logger.info('✓ Opening drawer with data:', profileData.user?.name);

  drawerState.data = profileData;

  // Render
  renderHeader(profileData.user);
  renderOverview(profileData);
  renderAnalytics(profileData.analytics);
  renderSettings(profileData.user);

  // Restore last active tab
  const savedTab = localStorage.getItem('profileActiveTab') || 'overview';
  setActiveTab(savedTab);

  // Show drawer
  logger.info('✓ Showing drawer...');
  drawer.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    logger.info('✓ Drawer is now visible with class is-open');
  });

  // Focus management - focus the close button or first tab
  setTimeout(() => {
    const closeButton = drawer.querySelector('.profile-close');
    const firstTab = drawer.querySelector('[role="tab"]');
    const focusTarget = closeButton || firstTab;

    if (focusTarget) {
      focusTarget.focus();
      logger.info('✓ Focus set to:', focusTarget.getAttribute('aria-label') || 'first element');
    }
  }, 100);

  // Add listeners
  document.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', handleEscape);

  logger.info('🎉 Profile drawer opened successfully!');
}

function closeProfileDrawer() {
  if (!drawer || !drawerState.isOpen) return;
  // Prevent closing if there are unsaved changes unless confirmed
  if (computeUnsavedChanges && !canCloseDrawer()) return;

  closeDeleteConfirm(true);
  drawer.classList.remove('is-open');

  setTimeout(() => {
    drawer.hidden = true;
    drawerState.isOpen = false;

    // Restore focus
    if (drawerState.previousFocus) {
      drawerState.previousFocus.focus();
      drawerState.previousFocus = null;
    }

    // Remove listeners
    document.removeEventListener('keydown', trapFocus);
    document.removeEventListener('keydown', handleEscape);
  }, 250);
}

// === Event Listeners ===
function init() {
  if (!drawer) {
    logger.warn('Profile drawer not found, skipping init');
    return;
  }

  // Close handlers
  closeBtn?.addEventListener('click', closeProfileDrawer);
  overlay?.addEventListener('click', closeProfileDrawer);
  drawer.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', closeProfileDrawer);
  });

  // Tabs
  tabs.forEach((tab) => {
    tab.addEventListener('click', onTabClick);
    tab.addEventListener('keydown', onTabKeydown);
  });

  // Avatar upload
  avatarBtn?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadAvatar(file);
  });

  // Drag & drop avatar
  avatarBtn?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  avatarBtn?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) onUploadAvatar(file);
  });

  // Forms
  infoForm?.addEventListener('submit', onSaveInfo);

  // Name edit button (inline editing)
  nameEditBtn?.addEventListener('click', toggleNameEdit);

  // Allow Enter key to save when editing name
  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isNameEditing) {
      e.preventDefault();
      saveNameInline();
    }
    // Escape to cancel edit
    if (e.key === 'Escape' && isNameEditing) {
      e.preventDefault();
      nameInput.value = initialFormValues?.name || '';
      exitNameEditMode();
    }
  });

  // realtime validation for name
  nameInput?.addEventListener('input', () => {
    const v = nameInput.value.trim();
    if (v.length > 0 && v.length < 2) {
      showFeedback(infoFeedback, 'Le nom doit contenir au moins 2 caractères', 'info');
    } else {
      showFeedback(infoFeedback, '', 'info');
    }
    hasUnsavedChanges = computeUnsavedChanges();
  });
  // track dirty state
  infoForm?.addEventListener('input', () => {
    hasUnsavedChanges = computeUnsavedChanges();
  });
  // autosave draft (localStorage) with debounce
  const saveDraft = debounce(() => {
    if (!infoForm) return;
    const data = { name: nameInput?.value || '' };
    try {
      localStorage.setItem('profile_info_draft', JSON.stringify(data));
    } catch {}
  }, 800);
  infoForm?.addEventListener('input', saveDraft);
  // restore draft on init if present and not readonly
  try {
    const draftRaw = localStorage.getItem('profile_info_draft');
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      if (draft && typeof draft.name === 'string' && nameInput && !nameInput.value) {
        nameInput.value = draft.name;
      }
    }
  } catch {}
  cancelBtn?.addEventListener('click', closeProfileDrawer);

  // Password edit button (inline editing)
  passwordEditBtn?.addEventListener('click', togglePasswordEdit);

  // Password cancel button
  passwordCancelBtn?.addEventListener('click', cancelPasswordEdit);

  // Allow Enter key in password fields
  currentPasswordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isPasswordEditing) {
      e.preventDefault();
      if (newPasswordInput && confirmPasswordInput) {
        newPasswordInput.focus();
      }
    }
    // Escape to cancel edit
    if (e.key === 'Escape' && isPasswordEditing) {
      e.preventDefault();
      cancelPasswordEdit();
    }
  });

  newPasswordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isPasswordEditing) {
      e.preventDefault();
      confirmPasswordInput?.focus();
    }
  });

  confirmPasswordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && isPasswordEditing) {
      e.preventDefault();
      savePasswordInline();
    }
  });

  // realtime password validation
  const pwNew = document.getElementById('profileNewPassword');
  const pwConfirm = document.getElementById('profileConfirmPassword');
  pwNew?.addEventListener('input', () => {
    const v = pwNew.value;
    if (v && v.length < 8) {
      showError(newPasswordError, 'Minimum 8 caractères');
    } else {
      newPasswordError?.classList.remove('visible');
      newPasswordError.textContent = '';
    }
  });
  pwConfirm?.addEventListener('input', () => {
    if (pwConfirm.value && pwNew && pwConfirm.value !== pwNew.value) {
      showError(confirmPasswordError, 'Les mots de passe ne correspondent pas');
    } else {
      confirmPasswordError?.classList.remove('visible');
      confirmPasswordError.textContent = '';
    }
  });
  deleteBtn?.addEventListener('click', onDeleteAccount);

  deleteConfirmInput?.addEventListener('input', handleDeleteConfirmInput);
  deleteConfirmInput?.addEventListener('keydown', (e) => {
    if (
      e.key === 'Enter' &&
      deleteConfirmBtn &&
      !deleteConfirmBtn.disabled &&
      !deleteConfirmState.isLoading
    ) {
      e.preventDefault();
      confirmDeleteAccount();
    }
  });

  deleteConfirmBtn?.addEventListener('click', confirmDeleteAccount);
  if (deleteConfirmModal) {
    deleteConfirmModal.querySelectorAll('[data-confirm-close]').forEach((el) => {
      el.addEventListener('click', () => closeDeleteConfirm());
    });
  }

  logger.info('Profile drawer initialized');
}

// Expose globally IMMEDIATELY (before init)
window.openProfileDrawer = openProfileDrawer;
window.closeProfileDrawer = closeProfileDrawer;

// Alias pour compatibilité avec l'ancien code
window.openProfileModal = openProfileDrawer;
window.closeProfileModal = closeProfileDrawer;

logger.info('Profile drawer functions exposed globally');

// Auto-init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

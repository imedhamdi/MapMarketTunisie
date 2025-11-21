(() => {
  const appLogger = (() => {
    if (window.__APP_LOGGER__) {
      return window.__APP_LOGGER__;
    }
    const noopLogger = () => {};
    const fallback = {
      error: (...args) => {
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[AppError]', ...args);
        }
      },
      warn: noopLogger,
      info: noopLogger
    };
    window.__APP_LOGGER__ = fallback;
    return fallback;
  })();

  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function (tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    if (typeof tagName === 'string' && tagName.toLowerCase() === 'img') {
      if (!element.hasAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }
      if (!element.hasAttribute('decoding')) {
        element.setAttribute('decoding', 'async');
      }
    }
    return element;
  };

  const applyLazyLoadingToExistingImages = () => {
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLazyLoadingToExistingImages, {
      once: true
    });
  } else {
    applyLazyLoadingToExistingImages();
  }

  const PROFILE_MODAL_ASSET =
    (window.__ASSETS__ && window.__ASSETS__.profileModal) || '/dist/profile-modal.min.js';
  let profileModalLoader = null;

  function ensureProfileModal() {
    if (typeof window.openProfileModal === 'function') {
      return Promise.resolve();
    }
    if (!profileModalLoader) {
      profileModalLoader = new Promise((resolve, reject) => {
        const script = originalCreateElement.call(document, 'script');
        script.src = PROFILE_MODAL_ASSET;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (error) => {
          profileModalLoader = null;
          reject(error);
        };
        document.head.appendChild(script);
      });
    }

    return profileModalLoader.catch((error) => {
      appLogger.error('Impossible de charger le module profil', error);
      throw error;
    });
  }

  // ---------- DATA (mock + géoloc) ----------
  const cityPos = {
    Montpellier: [43.611, 3.877],
    Paris: [48.8566, 2.3522],
    Lyon: [45.764, 4.8357],
    Marseille: [43.2965, 5.3698],
    Toulouse: [43.6045, 1.444],
    Lille: [50.6292, 3.0573]
  };

  const cssVar = (name, fallback = '') => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    return raw ? raw.trim() : fallback;
  };

  const THEME = {
    favorite: cssVar('--color-favorite', '#ef4444')
  };

  const CATEGORY_CONFIG = [
    {
      slug: 'immobilier',
      label: 'Immobilier',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
    },
    {
      slug: 'auto',
      label: 'Auto',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>'
    },
    {
      slug: 'mode',
      label: 'Mode',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>'
    },
    {
      slug: 'electroniques',
      label: 'High-Tech',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>'
    },
    {
      slug: 'pieces',
      label: 'Pièces',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path><path d="m15.14 8.86 4.24-4.24m-6.36 6.36 4.24-4.24M23 12h-6m-6 0H5"></path><path d="m15.14 15.14 4.24 4.24m-6.36-6.36 4.24 4.24M12 23v-6"></path></svg>'
    },
    {
      slug: 'loisirs',
      label: 'Loisirs',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>'
    }
  ];
  const CATEGORY_ICONS = CATEGORY_CONFIG.reduce((acc, item) => {
    acc[item.slug] = item.icon;
    return acc;
  }, {});

  const CONDITION_LABELS = {
    new: 'Neuf',
    very_good: 'Très bon état',
    good: 'Bon état',
    fair: 'Correct'
  };

  function mapConditionToSlug(label) {
    if (!label) {
      return '';
    }
    const normalized = label.toString().toLowerCase();
    if (normalized.includes('neuf')) {
      return 'new';
    }
    if (normalized.includes('très bon')) {
      return 'very_good';
    }
    if (normalized.includes('bon')) {
      return 'good';
    }
    if (normalized.includes('correct')) {
      return 'fair';
    }
    return normalized;
  }

  const DEFAULT_IMAGE = 'https://via.placeholder.com/640x480?text=MapMarket';
  const DEFAULT_AVATAR = '/uploads/avatars/default.jpg';

  function capitalize(text = '') {
    if (!text) {
      return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function getCategoryConfig(value) {
    if (!value) {
      return null;
    }
    const normalized = normalize(value);
    return (
      CATEGORY_CONFIG.find(
        (cat) => normalize(cat.slug) === normalized || normalize(cat.label) === normalized
      ) || null
    );
  }

  function normalizeLabel(value, fallback) {
    if (!value) {
      return fallback;
    }
    const match = getCategoryConfig(value);
    if (match) {
      return match.label;
    }
    return fallback || capitalize(value.toString());
  }

  function mapCategoryLabelToSlug(label) {
    if (!label) {
      return '';
    }
    const match = getCategoryConfig(label);
    if (match) {
      return match.slug;
    }
    return normalize(label);
  }

  function populateCategorySelect(
    selectEl,
    { placeholderLabel = null, placeholderValue = '' } = {}
  ) {
    if (!selectEl) {
      return;
    }
    const previousValue = selectEl.value;
    const fragment = document.createDocumentFragment();
    if (typeof placeholderLabel === 'string') {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = placeholderValue;
      placeholderOption.textContent = placeholderLabel;
      fragment.appendChild(placeholderOption);
    }
    CATEGORY_CONFIG.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.slug;
      option.textContent = item.label;
      fragment.appendChild(option);
    });
    selectEl.innerHTML = '';
    selectEl.appendChild(fragment);
    if (previousValue && selectEl.querySelector(`option[value="${previousValue}"]`)) {
      selectEl.value = previousValue;
    } else if (typeof placeholderLabel === 'string') {
      selectEl.value = placeholderValue;
    }
  }

  function buildChipsFromAttributes(category, attributes = {}) {
    const chips = [];
    const attr = attributes || {};
    switch (category) {
      case 'auto': {
        if (attr.year) {
          chips.push(String(attr.year));
        }
        if (attr.mileage != null) {
          chips.push(`${Number(attr.mileage).toLocaleString('fr-FR')} km`);
        }
        if (attr.fuel) {
          chips.push(capitalize(attr.fuel));
        }
        if (attr.gearbox) {
          chips.push(capitalize(attr.gearbox));
        }
        break;
      }
      case 'immobilier': {
        if (attr.surface) {
          chips.push(`${attr.surface} m²`);
        }
        if (attr.rooms) {
          chips.push(`${attr.rooms} pièce${attr.rooms > 1 ? 's' : ''}`);
        }
        if (attr.dpe) {
          chips.push(`DPE ${attr.dpe}`);
        }
        if (attr.furnished != null) {
          chips.push(attr.furnished ? 'Meublé' : 'Non meublé');
        }
        break;
      }
      case 'electroniques': {
        if (attr.brand) {
          chips.push(capitalize(attr.brand));
        }
        if (attr.storage) {
          chips.push(`${attr.storage} Go`);
        }
        if (attr.grade) {
          chips.push(capitalize(attr.grade));
        }
        break;
      }
      case 'pieces': {
        if (attr.compatible) {
          chips.push(attr.compatible);
        }
        if (attr.grade) {
          chips.push(capitalize(attr.grade));
        }
        if (attr.reference) {
          chips.push(`Ref ${attr.reference}`);
        }
        break;
      }
      case 'mode': {
        if (attr.brand) {
          chips.push(capitalize(attr.brand));
        }
        if (attr.size) {
          chips.push(String(attr.size).toUpperCase());
        }
        if (attr.gender) {
          chips.push(capitalize(attr.gender));
        }
        break;
      }
      case 'loisirs': {
        if (attr.activity) {
          chips.push(capitalize(attr.activity));
        }
        if (attr.brand) {
          chips.push(capitalize(attr.brand));
        }
        if (attr.model) {
          chips.push(attr.model);
        }
        break;
      }
      default:
        break;
    }
    return chips.slice(0, 3);
  }

  function mapAdFromApi(ad) {
    if (!ad) {
      return null;
    }
    const rawCategory = ad.category || '';
    const catSlug = mapCategoryLabelToSlug(rawCategory);
    const category = catSlug || rawCategory;
    const catLabel = normalizeLabel(category, 'Autres');
    const conditionLabel = CONDITION_LABELS[ad.condition] || capitalize(ad.condition || '');
    const locationText = ad.locationText?.trim() || 'Localisation à préciser';
    const coordinates = Array.isArray(ad.location?.coordinates) ? ad.location.coordinates : null;
    const latlng =
      coordinates && coordinates.length === 2
        ? [Number(coordinates[1]), Number(coordinates[0])]
        : null;
    const cityGuess = locationText.split(',')[0].trim() || catLabel;
    const fallbackLatLng = cityPos[cityGuess] || cityPos[catLabel] || [36.8065, 10.1815];
    const images = Array.isArray(ad.images) && ad.images.length ? ad.images : [];
    const owner = ad.owner || {};
    let sellerAvatar = null;
    if (owner.avatarUrl) {
      sellerAvatar = owner.avatarUrl;
    } else if (owner.avatar && !String(owner.avatar).startsWith('data:')) {
      const rawAvatar = String(owner.avatar).trim();
      if (/^https?:\/\//i.test(rawAvatar)) {
        sellerAvatar = rawAvatar;
      } else if (rawAvatar.startsWith('/uploads/')) {
        sellerAvatar = rawAvatar;
      } else if (rawAvatar.startsWith('uploads/')) {
        sellerAvatar = `/${rawAvatar}`;
      } else {
        const cleaned = rawAvatar
          .replace(/^\/?uploads\/avatars\//i, '')
          .replace(/^\/?avatars\//i, '');
        sellerAvatar = `/uploads/avatars/${cleaned}`;
      }
    }
    const sellerMemberSince = owner.memberSince || owner.createdAt || ad.createdAt;
    let chips = buildChipsFromAttributes(category, ad.attributes);
    if (!chips.length) {
      chips = [catLabel, conditionLabel, fmtPrice(ad.price)];
    }

    return {
      id: String(ad._id),
      category,
      catSlug: category,
      cat: catLabel,
      condition: ad.condition,
      state: conditionLabel || '—',
      title: ad.title || 'Annonce MapMarket',
      desc: ad.description || '',
      price: Number(ad.price) || 0,
      city: cityGuess,
      locationText,
      latlng: latlng || fallbackLatLng,
      views: ad.views ?? 0,
      likes: ad.favoritesCount ?? 0,
      favorites: ad.favoritesCount ?? 0,
      date: ad.createdAt || ad.updatedAt || new Date().toISOString(),
      img: images[0] || DEFAULT_IMAGE,
      gallery: images.length ? images : [DEFAULT_IMAGE],
      attributes: ad.attributes || {},
      transactionType: ad.transactionType || null,
      chips,
      sellerName: owner.name || owner.email || `Vendeur ${cityGuess}`,
      sellerEmail: owner.email || '',
      sellerAvatar,
      sellerMemberSince,
      sellerAnnouncements: owner.activeAds ?? null,
      ownerId: owner._id ? String(owner._id) : null
    };
  }

  function upsertAd(ad) {
    if (!ad) {
      return;
    }
    const id = String(ad.id);
    const index = allItems.findIndex((item) => String(item.id) === id);
    if (index === -1) {
      allItems.push(ad);
    } else {
      allItems[index] = ad;
    }
    filteredCache = filteredCache.map((item) => (String(item.id) === id ? ad : item));
    rebuildAllItemsIndex();
    syncAdStats(ad);
  }

  function replaceAdInCollection(collection, ad) {
    if (!Array.isArray(collection)) {
      return false;
    }
    const targetId = normalizeAdId(ad?.id);
    if (!targetId) {
      return false;
    }
    let updated = false;
    for (let index = 0; index < collection.length; index += 1) {
      const current = collection[index];
      if (normalizeAdId(current?.id) === targetId) {
        collection[index] = { ...ad };
        updated = true;
      }
    }
    return updated;
  }

  function syncPagingCollectionsWithAd(ad) {
    const updatedCurrentPage = replaceAdInCollection(paging.items, ad);
    if (updatedCurrentPage) {
      filteredCache = paging.items;
    }
    if (paging.cache && paging.cache.size) {
      paging.cache.forEach((entry, pageNumber) => {
        if (!entry || !Array.isArray(entry.items)) {
          return;
        }
        if (replaceAdInCollection(entry.items, ad)) {
          paging.cache.set(pageNumber, {
            ...entry,
            items: entry.items.map((item) => ({ ...item }))
          });
        }
      });
    }
    return updatedCurrentPage;
  }

  function updateMarkerWithAd(ad) {
    if (!ad) {
      return false;
    }
    const marker = markerIndex.get(String(ad.id));
    if (!marker) {
      return false;
    }
    marker._item = {
      ...(marker._item || {}),
      id: ad.id,
      title: ad.title,
      city: ad.city,
      price: ad.price,
      imageUrl: buildOptimizedImage(ad.img, 480, 70),
      img: ad.img,
      category: ad.cat || ad.category,
      catSlug: ad.catSlug || mapCategoryLabelToSlug(ad.cat || ad.category),
      transactionType: ad.transactionType || null,
      stats: {
        views: ad.views ?? 0,
        likes: ad.likes ?? 0
      }
    };
    marker._itemData = { ...ad };
    if (hoverCard && hoverCard._sourceMarker === marker) {
      hoverCard.setContent(renderMiniCard(marker._item));
      hoverCard.update();
    }
    return true;
  }

  function integrateServerAd(rawAd, { preserveScroll = true } = {}) {
    if (!rawAd) {
      return null;
    }
    const mappedAd = mapAdFromApi(rawAd);
    if (!mappedAd) {
      return null;
    }
    upsertAd(mappedAd);

    const normalizedId = normalizeAdId(mappedAd.id);
    const previousScrollTop = listView ? listView.scrollTop : null;
    const updatedCurrent = syncPagingCollectionsWithAd(mappedAd);

    if (normalizedId && favStore.has(normalizedId)) {
      favDataCache.set(String(mappedAd.id), mappedAd);
    }

    if (updatedCurrent && listView) {
      renderList(true, {
        preserveFocus: true,
        preserveScroll: preserveScroll,
        scrollTop: preserveScroll ? (previousScrollTop ?? 0) : 0
      });
      if (preserveScroll && typeof previousScrollTop === 'number') {
        listView.scrollTop = previousScrollTop;
      }
    }

    if (!updateMarkerWithAd(mappedAd) && typeof renderMap === 'function') {
      renderMap({ force: currentView === 'map', invalidate: currentView === 'map' });
    }

    refreshOpenDetails(mappedAd);
    updateAdCardDisplay(mappedAd);
    syncAllFavoriteButtons();

    return mappedAd;
  }

  function buildAdWithIncrementedViews(ad, increment = 1) {
    if (!ad) {
      return null;
    }
    const currentViews = Number(ad.views) || 0;
    const nextViews = currentViews + Number(increment || 0);
    const baseLikes = Number.isFinite(Number(ad.likes))
      ? Number(ad.likes)
      : Number(ad.favorites ?? 0);
    const updated = {
      ...ad,
      views: nextViews,
      likes: Number.isFinite(baseLikes) ? baseLikes : 0
    };
    if (typeof ad.favorites !== 'undefined') {
      updated.favorites = updated.likes;
    }
    if (Array.isArray(ad.gallery)) {
      updated.gallery = [...ad.gallery];
    }
    return updated;
  }

  function optimisticIncrementAdViews(source) {
    const baseAd = source && typeof source === 'object' ? source : getItemById(source);
    if (!baseAd || !baseAd.id) {
      return null;
    }
    const updated = buildAdWithIncrementedViews(baseAd, 1);
    if (!updated) {
      return null;
    }
    upsertAd(updated);
    return updated;
  }

  function syncAdStats(ad) {
    if (!ad) {
      return;
    }
    const cacheKey = String(ad.id);
    if (favDataCache.has(cacheKey)) {
      const cached = favDataCache.get(cacheKey) || {};
      favDataCache.set(cacheKey, { ...cached, ...ad });
    }
    updateAdCardDisplay(ad);
    updateMarkerStats(ad);
    if (favStore.has(ad.id) && isFavModalOpen()) {
      renderFavSheet();
    }
    const detailsId = normalizeAdId(detailsDialog?.dataset?.itemId);
    if (
      detailsModal &&
      detailsModal.style.display === 'flex' &&
      detailsId &&
      detailsId === normalizeAdId(ad.id)
    ) {
      refreshOpenDetails(ad);
    }
  }

  function updateAdCardDisplay(ad) {
    if (!listView) {
      return;
    }
    const cards = listView.querySelectorAll(`.ad-content[data-id="${CSS.escape(String(ad.id))}"]`);
    cards.forEach((card) => {
      const priceEl = card.querySelector('.price');
      if (priceEl) {
        priceEl.textContent = fmtPrice(ad.price);
      }
      const statsSpans = card.querySelectorAll('.stats .row');
      if (statsSpans[0]) {
        statsSpans[0].innerHTML = `👁️ ${escapeHtml(ad.views ?? 0)}`;
      }
      if (statsSpans[1]) {
        statsSpans[1].innerHTML = `❤ ${escapeHtml(ad.likes ?? ad.favorites ?? 0)}`;
      }
    });
  }

  function updateMarkerStats(ad) {
    const marker = markerIndex.get(String(ad.id));
    if (!marker || !marker._item) {
      return;
    }
    marker._item.stats = {
      views: ad.views ?? 0,
      likes: ad.likes ?? ad.favorites ?? 0
    };
    marker._itemData = {
      ...marker._itemData,
      views: ad.views ?? 0,
      likes: ad.likes ?? ad.favorites ?? 0,
      stats: {
        views: ad.views ?? 0,
        likes: ad.likes ?? ad.favorites ?? 0
      }
    };
    if (hoverCard && hoverCard._sourceMarker === marker) {
      hoverCard.setContent(renderMiniCard(marker._item));
      hoverCard.update();
    }
  }

  const updateFavIcon = (node, isActive) => {
    if (!node) {
      return;
    }
    node.setAttribute('fill', isActive ? THEME.favorite : 'none');
    node.setAttribute('stroke', isActive ? THEME.favorite : 'currentColor');
  };

  let allItems = [];
  const allItemsIndex = new Map();
  function rebuildAllItemsIndex() {
    allItemsIndex.clear();
    allItems.forEach((item) => {
      allItemsIndex.set(String(item.id), item);
    });
  }
  rebuildAllItemsIndex();

  const normalizeAdId = (value) => {
    if (value == null) {
      return null;
    }
    return String(value);
  };

  const favStore = (() => {
    let memory = new Set();
    return {
      values() {
        return Array.from(memory);
      },
      has(id) {
        const key = normalizeAdId(id);
        return key != null ? memory.has(key) : false;
      },
      size() {
        return memory.size;
      },
      add(id) {
        const key = normalizeAdId(id);
        if (key != null) {
          memory.add(key);
        }
      },
      delete(id) {
        const key = normalizeAdId(id);
        if (key != null) {
          memory.delete(key);
        }
      },
      clear() {
        memory.clear();
      },
      load(list = []) {
        memory = new Set(list.map(normalizeAdId).filter(Boolean));
      }
    };
  })();

  try {
    localStorage.removeItem('mm-favs');
  } catch (error) {
    // ignore cleanup errors
  }

  // Cache pour stocker les données complètes des favoris
  const favDataCache = new Map();

  const getItemById = (id) => {
    const key = normalizeAdId(id);
    if (key == null) {
      return null;
    }
    return allItemsIndex.get(key) || allItems.find((item) => String(item.id) === key) || null;
  };
  window.authStore = {
    get() {
      try {
        return JSON.parse(localStorage.getItem('mm-auth') || 'null');
      } catch {
        return null;
      }
    },
    set(value) {
      if (value === null || value === undefined) {
        localStorage.removeItem('mm-auth');
      } else {
        localStorage.setItem('mm-auth', JSON.stringify(value));
      }
      try {
        document.dispatchEvent(new CustomEvent('auth:change', { detail: value }));
      } catch (error) {
        console.warn('[AuthStore] dispatch error', error);
      }
    }
  };

  // ---------- VIEW TRACKING ----------
  const viewTracker = (() => {
    const STORAGE_KEY = 'mm-viewed-ads';
    const VIEW_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures

    function getViewedAds() {
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return data;
      } catch {
        return {};
      }
    }

    function setViewedAds(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        appLogger.warn('Failed to save viewed ads', error);
      }
    }

    function cleanExpiredViews() {
      const viewedAds = getViewedAds();
      const now = Date.now();
      let hasChanges = false;

      for (const [id, timestamp] of Object.entries(viewedAds)) {
        if (now - timestamp > VIEW_EXPIRY) {
          delete viewedAds[id];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setViewedAds(viewedAds);
      }
    }

    return {
      hasViewed(adId) {
        if (!adId) {
          return false;
        }
        const viewedAds = getViewedAds();
        const timestamp = viewedAds[String(adId)];
        if (!timestamp) {
          return false;
        }

        const now = Date.now();
        if (now - timestamp > VIEW_EXPIRY) {
          delete viewedAds[String(adId)];
          setViewedAds(viewedAds);
          return false;
        }

        return true;
      },

      markAsViewed(adId) {
        if (!adId) {
          return;
        }
        const viewedAds = getViewedAds();
        viewedAds[String(adId)] = Date.now();
        setViewedAds(viewedAds);
      },

      cleanup() {
        cleanExpiredViews();
      }
    };
  })();

  // Nettoyage périodique des vues expirées (au chargement)
  viewTracker.cleanup();

  // ---------- UTIL ----------
  function categoryClass(cat) {
    const slug = mapCategoryLabelToSlug(cat);
    switch (slug) {
      case 'immobilier':
        return 'immobilier';
      case 'mode':
        return 'mode';
      case 'electroniques':
        return 'hitech';
      case 'auto':
        return 'auto';
      case 'pieces':
        return 'pieces';
      case 'loisirs':
        return 'loisirs';
      default:
        return 'maison';
    }
  }
  function fmtPrice(n) {
    const value = Number(n);
    if (Number.isNaN(value)) {
      return '0 Dt';
    }
    return fmtDT.format(value);
  }
  function buildOptimizedImage(url, width = 480, quality = 70) {
    if (!url) {
      return '';
    }
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname.includes('images.unsplash.com')) {
        parsed.searchParams.set('auto', 'format');
        parsed.searchParams.set('fit', parsed.searchParams.get('fit') || 'crop');
        if (width) {
          parsed.searchParams.set('w', String(width));
        }
        if (quality) {
          parsed.searchParams.set('q', String(quality));
        }
        if (!parsed.searchParams.has('fm')) {
          parsed.searchParams.set('fm', 'jpg');
        }
        return parsed.toString();
      }
      return url;
    } catch {
      if (typeof url === 'string' && url.includes('images.unsplash.com')) {
        let result = url;
        if (width) {
          if (/w=\d+/.test(result)) {
            result = result.replace(/w=\d+/g, `w=${width}`);
          } else {
            result += (result.includes('?') ? '&' : '?') + `w=${width}`;
          }
        }
        if (quality) {
          if (/q=\d+/.test(result)) {
            result = result.replace(/q=\d+/g, `q=${quality}`);
          } else {
            result += (result.includes('?') ? '&' : '?') + `q=${quality}`;
          }
        }
        if (!/auto=/.test(result)) {
          result += (result.includes('?') ? '&' : '?') + 'auto=format';
        }
        if (!/fit=/.test(result)) {
          result += (result.includes('?') ? '&' : '?') + 'fit=crop';
        }
        if (!/fm=/.test(result)) {
          result += (result.includes('?') ? '&' : '?') + 'fm=jpg';
        }
        return result;
      }
      return url;
    }
  }
  function buildSrcSet(url, widths = [320, 480, 640], quality = 70) {
    return widths.map((w) => `${buildOptimizedImage(url, w, quality)} ${w}w`).join(', ');
  }
  function formatDateLong(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return dateStr;
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function daysAgo(dateStr) {
    const d = new Date(dateStr);
    const diff = Math.max(1, Math.round((Date.now() - d) / 86400000));
    return `il y a ${diff} jour${diff > 1 ? 's' : ''}`;
  }
  function normalize(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  let scrollLockDepth = 0;
  function lockBodyScroll() {
    scrollLockDepth = Math.max(0, scrollLockDepth) + 1;
    document.body.classList.add('no-scroll', 'modal-open');
    document.body.style.overflow = 'hidden';
  }
  function unlockBodyScroll() {
    scrollLockDepth = Math.max(0, scrollLockDepth - 1);
    if (scrollLockDepth === 0) {
      document.body.classList.remove('no-scroll', 'modal-open');
      document.body.style.overflow = '';
    }
  }
  window.lockBodyScroll = lockBodyScroll;
  window.unlockBodyScroll = unlockBodyScroll;
  function isFavModalOpen() {
    const panel = document.getElementById('favModal');
    return !!(panel && panel.classList.contains('mm-open'));
  }

  // ---------- FILTERING ----------
  const search = document.getElementById('search');
  const cat = document.getElementById('cat');
  const etat = document.getElementById('etat');
  const sort = document.getElementById('sort');
  const pmin = document.getElementById('pmin');
  const pmax = document.getElementById('pmax');
  const city = document.getElementById('city');
  const resetBtn = document.getElementById('resetBtn');
  const viewState = { userAdjustedView: false };

  function getFiltered() {
    // Server-side pagination: filters are applied by API
    // Just return current page items
    let list = paging.items.slice();

    // Only apply radius filter if enabled (client-side geo filter)
    if (typeof window !== 'undefined' && typeof window.mmFilterByRadius === 'function') {
      list = window.mmFilterByRadius(list);
    }

    return list;
  }

  let filterReloadTimer = null;
  function scheduleAdsReload({ immediate = false } = {}) {
    if (filterReloadTimer) {
      clearTimeout(filterReloadTimer);
    }
    viewState.userAdjustedView = false;
    if (immediate) {
      loadAds({ filters: getFilterValues() });
      return;
    }
    filterReloadTimer = setTimeout(() => {
      loadAds({ filters: getFilterValues() });
    }, 400);
  }

  if (search) {
    search.addEventListener('input', () => scheduleAdsReload({ immediate: false }));
  }
  [cat, etat, sort, pmin, pmax, city].forEach((el) =>
    el?.addEventListener('change', () => scheduleAdsReload({ immediate: true }))
  );
  [pmin, pmax, city].forEach((el) =>
    el?.addEventListener('input', () => scheduleAdsReload({ immediate: false }))
  );

  resetBtn.addEventListener('click', () => {
    [search, cat, etat, sort, pmin, pmax, city].forEach((el) => {
      if (!el) {
        return;
      }
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
    viewState.userAdjustedView = false;
    loadAds({ filters: getFilterValues() });
  });

  // Empty state buttons
  const btnResetFilters = document.getElementById('btnResetFilters');
  const btnPublishFromEmpty = document.getElementById('btnPublishFromEmpty');

  btnResetFilters?.addEventListener('click', () => {
    [search, cat, etat, sort, pmin, pmax, city].forEach((el) => {
      if (!el) {
        return;
      }
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
    viewState.userAdjustedView = false;
    loadAds({ filters: getFilterValues() });
  });

  btnPublishFromEmpty?.addEventListener('click', () => {
    openPostModal();
  });

  // ---------- LIST RENDER + INFINITE ----------
  const listView = document.getElementById('listView');
  const count = document.getElementById('count');
  const pagerContainer = document.getElementById('pager');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pagerIndicator = document.getElementById('pagerIndicator');
  const favCount = document.getElementById('fav-count');
  const openFavsBtn = document.getElementById('openFavs');
  const navMessages = document.getElementById('navMessages');
  const loading = document.getElementById('loading');
  const favOverlay = document.getElementById('favOverlay');
  const favModal = document.getElementById('favModal');
  const favList = document.getElementById('favList');
  const favEmptyState = document.getElementById('favEmptyState');
  const favSheetCount = document.getElementById('favSheetCount');
  const favSearch = document.getElementById('favSearch');
  // Generic clear button enhancer for search inputs
  function attachClearButtonToSearch(input, { onInputExtra } = {}) {
    if (!input) return;
    // Prefer an existing dedicated clear button if present
    let clearBtn =
      input.parentElement?.querySelector('#' + input.id + 'Clear') ||
      input.parentElement?.querySelector('.mm-search-clear');
    // If the existing button is for another input (favSearch markup already has #favSearchClear) keep it, else create new
    const expectedId = input.id + 'Clear';
    if (!clearBtn || (clearBtn.id && clearBtn.id !== expectedId && input.id === 'search')) {
      // Avoid duplicating for favorites where markup already exists
      if (input.id !== 'favSearch') {
        clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.id = expectedId;
        clearBtn.className = 'mm-search-clear';
        clearBtn.setAttribute('aria-label', 'Effacer la recherche');
        clearBtn.hidden = true;
        clearBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>';
        // Insert after input
        input.parentElement?.appendChild(clearBtn);
      }
    }
    if (!clearBtn) return;
    function updateVisibility() {
      clearBtn.hidden = !input.value.trim();
    }
    input.addEventListener('input', () => {
      updateVisibility();
      if (typeof onInputExtra === 'function') {
        onInputExtra();
      }
    });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
    // Initialize
    updateVisibility();
  }
  const favSortBy = document.getElementById('favSortBy');
  const favByCat = document.getElementById('favByCat');
  const clearAllFavsBtn = document.getElementById('clearAllFavs');
  const closeFavsBtn = document.getElementById('closeFavs');

  function updateFavBadge() {
    if (favCount) {
      favCount.textContent = favStore.size();
    }
  }

  function syncAllFavoriteButtons() {
    if (!listView) {
      return;
    }
    const activeSet = new Set(favStore.values().map(String));

    // Synchroniser les boutons dans la liste
    listView.querySelectorAll('.fav').forEach((btn) => {
      const id = btn.dataset.id;
      const isFav = activeSet.has(String(id));
      btn.setAttribute('aria-pressed', String(isFav));
      updateFavIcon(btn.querySelector('svg'), isFav);
    });

    // Synchroniser le bouton dans le modal de détail
    const detailsSaveBtn = document.getElementById('detailsSave');
    if (detailsSaveBtn && detailsSaveBtn.dataset.id) {
      const isFav = activeSet.has(String(detailsSaveBtn.dataset.id));
      setDetailsSaveState(isFav);
    } else if (detailsCurrentAd) {
      const adIdNormalized = normalizeAdId(detailsCurrentAd.id);
      const isFav = activeSet.has(String(adIdNormalized));
      setDetailsSaveState(isFav);
    }
  }

  function applyFavoritesFromUser(user) {
    const favorites = Array.isArray(user?.favorites) ? user.favorites : [];
    favStore.load(favorites);

    // Nettoyer le cache des favoris pour les IDs qui ne sont plus dans les favoris
    const favoriteIds = new Set(favorites.map(String));
    for (const cachedId of favDataCache.keys()) {
      if (!favoriteIds.has(cachedId)) {
        favDataCache.delete(cachedId);
      }
    }

    updateFavBadge();
    syncAllFavoriteButtons();
    if (isFavModalOpen()) {
      renderFavSheet();
    }
  }

  let initialAdsPromise = null;
  let isLoadingAds = false;
  let pendingFilters = null;
  let currentFilters = {
    search: '',
    category: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    sort: 'recent'
  };

  function getFilterValues() {
    return {
      search: search?.value?.trim() || '',
      category: cat?.value || '',
      condition: etat?.value || '',
      minPrice: pmin?.value || '',
      maxPrice: pmax?.value || '',
      city: city?.value?.trim() || '',
      sort: sort?.value || 'recent'
    };
  }

  // ========== SKELETON LOADER ==========
  function createSkeletonCard() {
    return `
        <div class="skeleton-card">
          <div class="skeleton-card__media"></div>
          <div class="skeleton-card__body">
            <div class="skeleton-chip"></div>
            <div class="skeleton-price"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-meta">
              <div class="skeleton-meta-item"></div>
              <div class="skeleton-meta-item"></div>
            </div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      `;
  }

  function showSkeletons(count = 6) {
    if (!listView) {
      return;
    }
    listView.innerHTML = Array(count).fill(createSkeletonCard()).join('');
  }

  function removeSkeletons(callback) {
    if (!listView) {
      if (callback) {
        callback();
      }
      return;
    }
    const skeletons = listView.querySelectorAll('.skeleton-card');
    if (skeletons.length === 0) {
      if (callback) {
        callback();
      }
      return;
    }
    skeletons.forEach((skeleton) => skeleton.classList.add('fade-out'));
    setTimeout(() => {
      listView.innerHTML = '';
      if (callback) {
        callback();
      }
    }, 300);
  }

  // Update URL with current page without reloading
  function updateURL({ page }) {
    const url = new URL(window.location);
    const params = new URLSearchParams(url.search);

    if (page && page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }

    // Preserve existing filters
    if (currentFilters.search) {
      params.set('search', currentFilters.search);
    } else {
      params.delete('search');
    }

    if (currentFilters.category) {
      params.set('category', mapCategoryLabelToSlug(currentFilters.category));
    } else {
      params.delete('category');
    }

    if (currentFilters.condition) {
      params.set('condition', mapConditionToSlug(currentFilters.condition));
    } else {
      params.delete('condition');
    }

    if (currentFilters.minPrice) {
      params.set('minPrice', currentFilters.minPrice);
    } else {
      params.delete('minPrice');
    }

    if (currentFilters.maxPrice) {
      params.set('maxPrice', currentFilters.maxPrice);
    } else {
      params.delete('maxPrice');
    }

    if (currentFilters.city) {
      params.set('city', currentFilters.city);
    } else {
      params.delete('city');
    }

    if (currentFilters.sort) {
      params.set('sort', currentFilters.sort);
    } else {
      params.delete('sort');
    }

    const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({ page }, '', newUrl);
  }

  async function loadAds({ filters = null, toastOnError = true } = {}) {
    if (isLoadingAds) {
      if (filters) {
        pendingFilters = { ...filters };
      }
      return;
    }
    isLoadingAds = true;

    // Afficher le message de chargement
    count.innerHTML =
      '<span style="display: inline-flex; align-items: center; gap: 8px; color: var(--color-text-secondary);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>Chargement...</span>';

    // Masquer l'empty state pendant le chargement
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.hidden = true;
    }

    try {
      if (loading) {
        loading.hidden = false;
      }

      // Afficher les skeletons pendant le chargement
      showSkeletons(6);

      if (filters) {
        currentFilters = { ...currentFilters, ...filters };
      }
      const params = new URLSearchParams();
      // Pagination: charge 30 items (page 1)
      params.set('limit', String(PAGE_SIZE));
      if (currentFilters.search) {
        params.set('search', currentFilters.search);
      }
      if (currentFilters.category) {
        params.set('category', mapCategoryLabelToSlug(currentFilters.category));
      }
      if (currentFilters.condition) {
        params.set('condition', mapConditionToSlug(currentFilters.condition));
      }
      if (currentFilters.minPrice) {
        params.set('minPrice', currentFilters.minPrice);
      }
      if (currentFilters.maxPrice) {
        params.set('maxPrice', currentFilters.maxPrice);
      }
      if (currentFilters.city) {
        params.set('city', currentFilters.city);
      }
      if (currentFilters.sort) {
        params.set('sort', currentFilters.sort);
      }

      const response = await api.get(`/api/ads?${params.toString()}`);
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      const pagination = response?.data?.pagination || {};

      appLogger.info('Initial page loaded', {
        itemsCount: items.length,
        nextCursor: pagination.nextCursor,
        hasNext: pagination.hasNextPage,
        total: pagination.total
      });

      // Update paging state with API response
      const mappedItems = items.map(mapAdFromApi).filter(Boolean);
      paging.items = mappedItems;
      paging.nextCursor = pagination.nextCursor || null;
      paging.hasNext = pagination.hasNextPage || false;
      paging.page = 1;
      paging.total = typeof pagination.total === 'number' ? pagination.total : null;
      paging.totalPages =
        typeof pagination.total === 'number'
          ? Math.max(1, Math.ceil(pagination.total / PAGE_SIZE))
          : null;
      paging.cache = new Map();
      cachePage(1, {
        items: paging.items,
        nextCursor: paging.nextCursor,
        hasNext: paging.hasNext
      });

      appLogger.info('Paging state updated', {
        page: paging.page,
        itemsCount: paging.items.length,
        nextCursor: paging.nextCursor,
        hasNext: paging.hasNext
      });

      // Keep allItems for backward compatibility (favoris, etc.)
      allItems = paging.items.slice();
      rebuildAllItemsIndex();

      // Mettre à jour le cache des favoris avec les nouvelles données
      paging.items.forEach((item) => {
        if (favStore.has(item.id)) {
          favDataCache.set(String(item.id), item);
        }
      });

      filteredCache = paging.items;

      // Retirer les skeletons avec animation avant d'afficher les vraies annonces
      removeSkeletons(() => {
        applyPage(1, paging.cache.get(1), {
          autoFit: !viewState.userAdjustedView,
          scroll: false
        });
      });
    } catch (error) {
      appLogger.error('loadAds error', error);
      // Retirer les skeletons même en cas d'erreur
      removeSkeletons();
      updatePaginationControls();
      if (toastOnError) {
        window.showToast?.(error?.message || 'Impossible de charger les annonces.');
      }
    } finally {
      if (loading) {
        loading.hidden = true;
      }
      isLoadingAds = false;
      if (pendingFilters) {
        const nextFilters = pendingFilters;
        pendingFilters = null;
        loadAds({ filters: nextFilters, toastOnError });
      }
    }
  }

  let adsStatusRefreshTimer = null;

  function handleExternalAdStatusUpdate(event) {
    const detail = event?.detail || {};
    const payload = detail.ad || null;
    if (payload) {
      try {
        const mapped = mapAdFromApi(payload);
        if (mapped) {
          upsertAd(mapped);
        }
      } catch (error) {
        appLogger.warn('Impossible de mettre à jour la carte suite au statut', error);
      }
    }

    if (adsStatusRefreshTimer) {
      clearTimeout(adsStatusRefreshTimer);
    }
    adsStatusRefreshTimer = setTimeout(() => {
      adsStatusRefreshTimer = null;
      loadAds({ toastOnError: false });
    }, 120);
  }

  document.addEventListener('ads:status-updated', handleExternalAdStatusUpdate);

  const favoriteMutations = new Map();

  async function setFavoriteState(id, shouldAdd, { feedback = true } = {}) {
    const auth = authStore.get();
    const key = normalizeAdId(id);
    if (!key) {
      return false;
    }
    if (!auth) {
      showToast('Connectez-vous pour gérer vos favoris 🔐');
      return false;
    }
    if (favoriteMutations.has(key)) {
      return false;
    }

    const previous = favStore.values();
    if (shouldAdd) {
      favStore.add(key);
      // Ajouter au cache des favoris
      const item = getItemById(key);
      if (item) {
        favDataCache.set(key, item);
      }
    } else {
      favStore.delete(key);
      // Retirer du cache des favoris
      favDataCache.delete(key);
    }
    updateFavBadge();
    syncFavoriteButtons(key, favStore.has(key));
    if (isFavModalOpen()) {
      renderFavSheet();
    }

    favoriteMutations.set(key, true);
    try {
      const response = await api.post('/api/users/me/favorites', {
        adId: key,
        action: shouldAdd ? 'add' : 'remove'
      });
      const favorites = response?.data?.favorites ?? [];
      const updatedFavoritesCount = response?.data?.favoritesCount;

      favStore.load(favorites);
      updateFavBadge();
      syncAllFavoriteButtons();
      if (isFavModalOpen()) {
        renderFavSheet();
      }
      const currentUser = authStore.get();
      if (currentUser) {
        currentUser.favorites = favorites;
        authStore.set(currentUser);
      }

      // Mettre à jour le compteur avec la vraie valeur du serveur
      if (updatedFavoritesCount !== null && updatedFavoritesCount !== undefined) {
        const ad = getItemById(key);
        if (ad) {
          ad.likes = updatedFavoritesCount;
          ad.favorites = updatedFavoritesCount;
          ad.favoritesCount = updatedFavoritesCount;
          upsertAd(ad);

          // Rafraîchir le modal de détail si ouvert pour cette annonce
          if (detailsModal && detailsModal.style.display === 'flex') {
            const currentId = normalizeAdId(detailsDialog?.dataset?.itemId);
            if (currentId === key) {
              updateDetailsStats(ad);
            }
          }
        }
      }

      if (feedback) {
        showToast(shouldAdd ? 'Ajouté aux favoris' : 'Retiré des favoris');
      }
      return true;
    } catch (error) {
      favStore.load(previous);
      updateFavBadge();
      syncAllFavoriteButtons();
      if (isFavModalOpen()) {
        renderFavSheet();
      }
      const currentUser = authStore.get();
      if (currentUser) {
        currentUser.favorites = previous;
        authStore.set(currentUser);
      }
      showToast(extractAuthErrorMessage(error));
      if (error?.status === 401) {
        authStore.set(null);
        updateAuthUI();
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
      }
      return false;
    } finally {
      favoriteMutations.delete(key);
    }
  }

  if (favModal) {
    favModal._stickyOpen = false;
    favModal._favScrollTop = 0;
    favModal._lastSelectedFavId = null;
    favModal._lastSelectedCard = null;
  }
  // Pagination state - replaces old infinite scroll mechanism
  const paging = {
    items: [],
    nextCursor: null,
    hasNext: false,
    page: 1,
    total: null,
    totalPages: null,
    cache: new Map()
  };
  const PAGE_SIZE = 30; // Fixed page size for API requests
  let filteredCache = [];

  function getFavBaseItems() {
    return favStore
      .values()
      .map((id) => {
        // Essayer d'abord le cache, puis allItems
        const cached = favDataCache.get(id);
        if (cached) {
          return cached;
        }
        const item = getItemById(id);
        if (item) {
          // Mettre à jour le cache
          favDataCache.set(id, item);
        }
        return item;
      })
      .filter(Boolean);
  }

  function refreshFavCategories(sourceItems) {
    if (!favByCat) {
      return;
    }
    const previous = favByCat.value;
    const cats = Array.from(
      new Set(sourceItems.map((it) => it.cat || it.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    favByCat.innerHTML =
      '<option value="">Toutes catégories</option>' +
      cats.map((cat) => `<option value="${cat}">${cat}</option>`).join('');
    if (previous && cats.includes(previous)) {
      favByCat.value = previous;
    }
  }

  function applyFavFilters(items) {
    let result = items.slice();
    if (favSearch && favSearch.value.trim()) {
      const q = normalize(favSearch.value);
      result = result.filter((item) =>
        normalize(`${item.title} ${item.city || ''} ${item.cat || item.category || ''}`).includes(q)
      );
    }
    if (favByCat && favByCat.value) {
      const catFilter = favByCat.value;
      result = result.filter((item) => (item.cat || item.category || '') === catFilter);
    }
    if (favSortBy) {
      switch (favSortBy.value) {
        case 'price_asc':
          result.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price_desc':
          result.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'title_asc':
          result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          break;
        default:
          result.sort(
            (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
          );
      }
    }
    return result;
  }

  function updateFavEmptyState(totalCount) {
    const isEmpty = totalCount === 0;
    if (favList) {
      favList.hidden = isEmpty;
    }
    if (favEmptyState) {
      favEmptyState.hidden = !isEmpty;
    }
  }

  function renderFavCard(item) {
    const priceLabel = typeof item.price === 'string' ? item.price : fmtPrice(item.price || 0);
    const imageSource =
      item.img || item.imageUrl || 'https://via.placeholder.com/640x480?text=Favori';
    const favThumb = buildOptimizedImage(imageSource, 480, 70);
    const favSrcSet = buildSrcSet(imageSource, [320, 480, 640], 70);

    // Generate transaction type icon for real estate
    const isRealEstate = (item.catSlug || item.cat) === 'immobilier';
    const transactionIcon =
      isRealEstate && item.transactionType ? getTransactionTypeIcon(item.transactionType) : '';

    return `
  <article class="mm-card" role="listitem" data-id="${String(item.id)}" tabindex="-1">
    <button class="mm-remove" aria-label="Retirer ce favori" data-id="${String(item.id)}" title="Retirer">✕</button>
    <div class="mm-thumb">
      ${transactionIcon}
      <img src="${favThumb}" srcset="${favSrcSet}" sizes="(max-width: 520px) 90vw, 320px" alt="${item.title}" loading="lazy" decoding="async" width="320" height="240" style="aspect-ratio: 4 / 3; width: 100%; height: auto;">
    </div>
    <div class="mm-body">
      <div class="mm-title2">${item.title}</div>
      <div class="mm-meta"><span>${item.city || ''}</span><span class="mm-price">${priceLabel}</span></div>
    </div>
  </article>`;
  }

  function renderFavSheet() {
    if (!favList) {
      return;
    }
    const baseItems = getFavBaseItems();
    refreshFavCategories(baseItems);
    updateFavBadge();
    const items = applyFavFilters(baseItems);
    favList.classList.remove('mm-grid-filter-empty');
    updateFavEmptyState(baseItems.length);
    if (favSheetCount) {
      favSheetCount.textContent = items.length;
    }
    if (!baseItems.length) {
      favList.innerHTML = '';
      return;
    }
    if (!items.length) {
      favList.classList.add('mm-grid-filter-empty');
      favList.innerHTML =
        '<div class="mm-empty mm-empty-filter" role="status"><p>Aucun favori ne correspond aux critères actuels.</p></div>';
      return;
    }
    favList.innerHTML = items.map(renderFavCard).join('');
    if (favModal?._stickyOpen && typeof favModal._favScrollTop === 'number') {
      requestAnimationFrame(() => {
        if (favList) {
          favList.scrollTop = favModal._favScrollTop || 0;
          if (favModal._lastSelectedFavId != null) {
            const candidate = favList.querySelector(
              `.mm-card[data-id="${favModal._lastSelectedFavId}"]`
            );
            if (candidate) {
              favModal._lastSelectedCard = candidate;
            }
          }
        }
      });
    }
  }

  function openFavSheet() {
    if (!favModal || !favOverlay) {
      return;
    }
    if (favModal.classList.contains('mm-open')) {
      renderFavSheet();
      return;
    }
    renderFavSheet();
    favOverlay.hidden = false;
    requestAnimationFrame(() => favOverlay.classList.add('active'));
    favModal.classList.add('mm-open');
    favModal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    if (favSearch) {
      setTimeout(() => favSearch.focus(), 50);
    }
  }

  function closeFavSheet() {
    if (!favModal || !favOverlay) {
      return;
    }
    if (!favModal.classList.contains('mm-open')) {
      return;
    }
    favModal._stickyOpen = false;
    favModal._favScrollTop = 0;
    favModal._lastSelectedFavId = null;
    favModal._lastSelectedCard = null;
    favModal.classList.remove('mm-open');
    favModal.setAttribute('aria-hidden', 'true');
    favOverlay.classList.remove('active');
    setTimeout(() => {
      if (favOverlay && !favModal.classList.contains('mm-open')) {
        favOverlay.hidden = true;
      }
    }, 200);
    unlockBodyScroll();
  }

  openFavsBtn?.addEventListener('click', openFavSheet);
  closeFavsBtn?.addEventListener('click', closeFavSheet);
  favOverlay?.addEventListener('click', (event) => {
    if (event.target === favOverlay) {
      closeFavSheet();
    }
  });
  // Enhance favorites search (already has a clear button in HTML)
  if (favSearch) {
    attachClearButtonToSearch(favSearch, { onInputExtra: renderFavSheet });
  }
  // Enhance global search input
  const globalSearch = document.getElementById('search');
  if (globalSearch) {
    attachClearButtonToSearch(globalSearch);
  }
  // Optionally enhance any other dynamic search inputs later if needed
  document.querySelectorAll('input[type="search"]').forEach((inp) => {
    if (inp === favSearch || inp === globalSearch) return; // already handled
    attachClearButtonToSearch(inp);
  });
  if (favSortBy) {
    favSortBy.addEventListener('change', renderFavSheet);
  }
  if (favByCat) {
    favByCat.addEventListener('change', renderFavSheet);
  }
  const confirmModal = document.getElementById('confirmModal');
  const confirmTitleEl = document.getElementById('confirmTitle');
  const confirmMessageEl = document.getElementById('confirmMessage');
  const confirmCancelBtn = confirmModal?.querySelector('[data-action="cancel"]');
  const confirmConfirmBtn = confirmModal?.querySelector('[data-action="confirm"]');
  const confirmBackdrop = confirmModal?.querySelector('[data-action="dismiss"]');
  let confirmLastFocus = null;
  let confirmActive = false;

  function showConfirmDialog({
    title = 'Confirmation',
    message = 'Êtes-vous sûr ?',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler'
  } = {}) {
    if (
      !confirmModal ||
      !confirmCancelBtn ||
      !confirmConfirmBtn ||
      !confirmTitleEl ||
      !confirmMessageEl
    ) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      confirmActive = true;
      confirmLastFocus = document.activeElement;
      confirmModal.hidden = false;
      confirmModal.classList.add('is-open');
      confirmModal.setAttribute('aria-hidden', 'false');
      confirmTitleEl.textContent = title;
      confirmMessageEl.textContent = message;
      confirmCancelBtn.textContent = cancelLabel;
      confirmConfirmBtn.textContent = confirmLabel;
      lockBodyScroll();

      const focusTarget = confirmConfirmBtn;
      setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 30);

      const cleanup = (result) => {
        if (!confirmActive) {
          return;
        }
        confirmActive = false;
        confirmModal.classList.remove('is-open');
        confirmModal.setAttribute('aria-hidden', 'true');
        confirmCancelBtn.removeEventListener('click', onCancel);
        confirmConfirmBtn.removeEventListener('click', onConfirm);
        confirmBackdrop?.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKeyDown);
        setTimeout(() => {
          if (!confirmActive) {
            confirmModal.hidden = true;
          }
        }, 180);
        unlockBodyScroll();
        if (confirmLastFocus && typeof confirmLastFocus.focus === 'function') {
          confirmLastFocus.focus({ preventScroll: true });
        }
        resolve(result);
      };

      const onCancel = () => cleanup(false);
      const onConfirm = () => cleanup(true);
      const onBackdrop = (event) => {
        if (event?.target?.dataset?.action === 'dismiss') {
          cleanup(false);
        }
      };
      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanup(false);
          return;
        }
        if (event.key === 'Tab') {
          const focusables = [confirmCancelBtn, confirmConfirmBtn].filter(Boolean);
          if (!focusables.length) {
            return;
          }
          const currentIndex = focusables.indexOf(document.activeElement);
          if (event.shiftKey) {
            if (currentIndex <= 0) {
              event.preventDefault();
              focusables[focusables.length - 1]?.focus?.({ preventScroll: true });
            }
          } else {
            if (currentIndex === focusables.length - 1) {
              event.preventDefault();
              focusables[0]?.focus?.({ preventScroll: true });
            }
          }
        }
      };

      confirmCancelBtn.addEventListener('click', onCancel);
      confirmConfirmBtn.addEventListener('click', onConfirm);
      confirmBackdrop?.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKeyDown);
    });
  }
  window.showConfirmDialog = showConfirmDialog;

  clearAllFavsBtn?.addEventListener('click', async () => {
    const auth = authStore.get();
    if (!auth) {
      showToast('Connectez-vous pour gérer vos favoris 🔐');
      return;
    }
    const ids = favStore.values();
    if (!ids.length) {
      showToast('Aucun favori à retirer.');
      return;
    }
    const accepted = await showConfirmDialog({
      title: 'Vider vos favoris ?',
      message:
        'Cette action retirera toutes les annonces de vos favoris. Vous pourrez les ajouter de nouveau plus tard.',
      confirmLabel: 'Tout retirer',
      cancelLabel: 'Annuler'
    });
    if (!accepted) {
      return;
    }
    let removedCount = 0;
    for (const id of ids) {
      const success = await setFavoriteState(id, false, { feedback: false });
      if (success) {
        removedCount += 1;
      }
    }
    updateFavBadge();
    syncAllFavoriteButtons();
    renderFavSheet();
    if (removedCount === ids.length) {
      showToast('Tous les favoris ont été retirés.');
    } else if (removedCount > 0) {
      showToast('Certains favoris n’ont pas pu être retirés.');
    }
  });
  favList?.addEventListener('scroll', () => {
    if (favModal?._stickyOpen) {
      favModal._favScrollTop = favList.scrollTop || 0;
    }
  });

  favList?.addEventListener('click', async (event) => {
    const removeBtn = event.target.closest('.mm-remove');
    if (removeBtn) {
      event.stopPropagation();
      const id = removeBtn.dataset.id;
      const success = await setFavoriteState(id, false, { feedback: false });
      if (success) {
        showToast('Retiré des favoris');
      }
      return;
    }

    const heartBtn = event.target.closest('.mm-heart');
    if (heartBtn) {
      event.stopPropagation();
      const id = heartBtn.dataset.id;
      const success = await setFavoriteState(id, false, { feedback: false });
      if (success) {
        showToast('Retiré des favoris');
      }
      return;
    }
    const card = event.target.closest('.mm-card');
    if (!card) {
      return;
    }
    const id = card.dataset.id;
    // Essayer d'abord le cache des favoris, puis allItems
    const ad = favDataCache.get(String(id)) || getItemById(id);
    if (ad) {
      if (favModal) {
        if (!favModal._stickyOpen) {
          favModal._stickyOpen = true;
        }
        if (favList) {
          favModal._favScrollTop = favList.scrollTop || 0;
        }
        favModal._lastSelectedFavId = normalizeAdId(id);
        favModal._lastSelectedCard = card;
      }
      openDetailsModal(ad);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') {
      return;
    }
    const detailsOpen = detailsModal && detailsModal.classList.contains('active');
    if (favModal && favModal.classList.contains('mm-open') && !detailsOpen) {
      closeFavSheet();
    }
  });

  // Render ads from paging.items (server-side paginated data)
  function renderAdsPage(items) {
    const fragment = document.createDocumentFragment();

    for (const a of items) {
      const thumbSrc = buildOptimizedImage(a.img, 480, 70);
      const thumbSrcSet = buildSrcSet(a.img, [320, 480, 640], 70);
      const idKey = normalizeAdId(a.id);
      const isFav = favStore.has(idKey);

      // Generate transaction type icon for real estate
      const isRealEstate = (a.catSlug || a.cat) === 'immobilier';
      const transactionIcon =
        isRealEstate && a.transactionType ? getTransactionTypeIcon(a.transactionType) : '';

      const art = document.createElement('article');
      art.className = 'ad';
      art.innerHTML = `
          <div class="ad-content" data-id="${String(a.id)}">
          <div class="thumb">
            ${transactionIcon}
            <img width="370" height="278" loading="lazy" decoding="async" alt="${a.title}"
              src="${thumbSrc}"
              srcset="${thumbSrcSet}"
              sizes="(max-width: 480px) 90vw, 370px"
              style="aspect-ratio: 4 / 3; width: 100%; height: auto;" />
            <div class="grad"></div>
            <div class="cat ${categoryClass(a.catSlug || a.cat)}">${categorySymbol(a.catSlug || a.cat)} <span>${a.cat}</span></div>
            <div class="stats"><span class="row">👁️ ${a.views}</span><span class="row">❤ ${a.likes}</span></div>
            <button class="fav" title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${isFav}" data-id="${String(a.id)}">
              <svg viewBox="0 0 24 24" fill="${isFav ? THEME.favorite : 'none'}" stroke="${isFav ? THEME.favorite : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
          </div>
          <div class="body">
            <div class="titleprice"><div class="title">${a.title}</div><div class="price">${fmtPrice(a.price)}</div></div>
            <div class="desc">${a.desc}</div>
            <div class="chips">${a.chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
            <div class="meta">
              <div class="loc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-5.54 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg><span>${a.city}</span></div>
              <span class="state">${a.state}</span>
            </div>
            <div class="time">${daysAgo(a.date)}</div>
          </div>
          </div>`;
      fragment.appendChild(art);
    }

    listView.appendChild(fragment);

    // Bind favorite buttons for newly added items
    listView.querySelectorAll('.fav').forEach((btn) => {
      if (btn._bound) {
        return;
      }
      btn._bound = true;
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const shouldAdd = !favStore.has(id);
        const success = await setFavoriteState(id, shouldAdd, { feedback: false });
        if (success) {
          if (shouldAdd) {
            triggerFavAnimation(btn);
            showToast('Ajouté aux favoris');
          } else {
            showToast('Retiré des favoris');
          }
        }
      });
    });
  }

  function cachePage(pageNumber, pageData) {
    if (!pageData) {
      return;
    }
    const cached = {
      items: pageData.items.map((item) => ({ ...item })),
      nextCursor: pageData.nextCursor || null,
      hasNext: Boolean(pageData.hasNext)
    };
    if (typeof pageData.prevCursor === 'string') {
      cached.prevCursor = pageData.prevCursor;
    }
    paging.cache.set(pageNumber, cached);
  }

  function getCachedPage(pageNumber) {
    return paging.cache.get(pageNumber) || null;
  }

  function applyPage(pageNumber, pageData, { autoFit = false, scroll = true } = {}) {
    if (!pageData) {
      return;
    }
    paging.page = pageNumber;
    paging.items = pageData.items.map((item) => ({ ...item }));
    paging.nextCursor = pageData.nextCursor || null;
    paging.hasNext = Boolean(pageData.hasNext);
    if (!paging.hasNext && paging.cache.has(pageNumber + 1)) {
      paging.hasNext = true;
    }
    allItems = paging.items.slice();
    rebuildAllItemsIndex();
    filteredCache = paging.items;
    renderList(true);
    renderMap({
      force: true,
      invalidate: true,
      autoFit: autoFit && !viewState.userAdjustedView
    });
    syncAllFavoriteButtons();
    if (isFavModalOpen()) {
      renderFavSheet();
    }
    if (scroll && listView) {
      listView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    updateURL({ page: paging.page });
  }

  async function fetchPageData(cursor, direction = 'next') {
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    if (cursor) {
      params.set('cursor', cursor);
      if (direction === 'prev') {
        params.set('before', cursor);
      } else {
        params.set('after', cursor);
      }
    }

    if (currentFilters.search) {
      params.set('search', currentFilters.search);
    }
    if (currentFilters.category) {
      params.set('category', mapCategoryLabelToSlug(currentFilters.category));
    }
    if (currentFilters.condition) {
      params.set('condition', mapConditionToSlug(currentFilters.condition));
    }
    if (currentFilters.minPrice) {
      params.set('minPrice', currentFilters.minPrice);
    }
    if (currentFilters.maxPrice) {
      params.set('maxPrice', currentFilters.maxPrice);
    }
    if (currentFilters.city) {
      params.set('city', currentFilters.city);
    }
    if (currentFilters.sort) {
      params.set('sort', currentFilters.sort);
    }

    const response = await api.get(`/api/ads?${params.toString()}`);
    const items = Array.isArray(response?.data?.items) ? response.data.items : [];
    const pagination = response?.data?.pagination || {};

    const mappedItems = items.map(mapAdFromApi).filter(Boolean);
    const pageData = {
      items: mappedItems,
      nextCursor: pagination.nextCursor || null,
      prevCursor: pagination.prevCursor || null,
      hasNext: Boolean(pagination.hasNextPage)
    };

    if (typeof pagination.total === 'number') {
      paging.total = pagination.total;
      paging.totalPages = Math.max(1, Math.ceil(pagination.total / PAGE_SIZE));
    }

    return pageData;
  }

  function updatePaginationControls() {
    if (!pagerContainer) {
      return;
    }

    const hasContent = paging.items.length > 0;
    // Cacher la pagination si pas de contenu OU si une seule page
    const shouldShowPagination = hasContent && (paging.totalPages > 1 || paging.hasNext);
    pagerContainer.hidden = !shouldShowPagination;

    if (pagerIndicator) {
      if (hasContent) {
        if (paging.totalPages && paging.totalPages > 0) {
          pagerIndicator.textContent = `${paging.page} / ${paging.totalPages}`;
        } else if (paging.hasNext || paging.cache.has(paging.page + 1)) {
          pagerIndicator.textContent = `${paging.page} / …`;
        } else {
          pagerIndicator.textContent = `${paging.page}`;
        }
      } else {
        pagerIndicator.textContent = '';
      }
    }

    if (btnPrevPage) {
      const hasPrev = paging.page > 1 && hasContent;
      btnPrevPage.disabled = !hasPrev;
      btnPrevPage.setAttribute('aria-disabled', String(!hasPrev));
      const prevLabel =
        hasPrev && paging.totalPages
          ? `Revenir à la page ${paging.page - 1} sur ${paging.totalPages}`
          : 'Afficher la page précédente';
      btnPrevPage.setAttribute('aria-label', prevLabel);
    }

    if (btnNextPage) {
      const hasCachedNext = paging.cache.has(paging.page + 1);
      const withinTotal = paging.totalPages ? paging.page < paging.totalPages : true;
      const canGoNext = hasContent && withinTotal && (paging.hasNext || hasCachedNext);
      btnNextPage.disabled = !canGoNext;
      btnNextPage.setAttribute('aria-disabled', String(!canGoNext));
      const nextLabel =
        canGoNext && paging.totalPages
          ? `Afficher la page ${Math.min(paging.page + 1, paging.totalPages)} sur ${paging.totalPages}`
          : 'Afficher la page suivante';
      btnNextPage.setAttribute('aria-label', nextLabel);
    }
  }

  function renderList(reset, options = {}) {
    const preserveScroll = Boolean(options?.preserveScroll);
    const preserveFocus = Boolean(options?.preserveFocus);
    const targetScrollTop = options?.scrollTop;
    // Use paging.items instead of client-side filtering
    filteredCache = paging.items;
    updateFavBadge();

    const emptyState = document.getElementById('emptyState');
    const itemCount = paging.items.length;

    if (itemCount === 0) {
      count.textContent = 'Aucune annonce';
      if (emptyState) {
        emptyState.hidden = false;
      }
      listView.innerHTML = '';
      updatePaginationControls();
    } else {
      // Update count display with page info
      const rangeStart = (paging.page - 1) * PAGE_SIZE + 1;
      const rangeEnd = rangeStart + itemCount - 1;
      const totalKnown = typeof paging.total === 'number';
      const clampedRangeEnd = totalKnown ? Math.min(rangeEnd, paging.total) : rangeEnd;
      const totalPagesDisplay =
        paging.totalPages && paging.totalPages > 0
          ? `${paging.page} / ${paging.totalPages}`
          : `Page ${paging.page}`;
      const rangeLabel = totalKnown
        ? `Annonces ${Math.min(rangeStart, paging.total)}-${Math.max(Math.min(clampedRangeEnd, paging.total), 0)} sur ${paging.total}`
        : `${itemCount} ${itemCount > 1 ? 'annonces' : 'annonce'}`;
      count.textContent = `${totalPagesDisplay} · ${rangeLabel}`;

      if (emptyState) {
        emptyState.hidden = true;
      }

      if (reset) {
        listView.innerHTML = '';
      }

      // Apply page transition
      listView.classList.remove('page-transition');
      void listView.offsetWidth; // Force reflow
      listView.classList.add('page-transition');

      renderAdsPage(paging.items);
      updatePaginationControls();

      if (reset && preserveScroll && typeof targetScrollTop === 'number') {
        listView.scrollTop = targetScrollTop;
      }

      // Focus on first ad for keyboard navigation when not preserving focus
      if (reset && !preserveFocus) {
        const firstAd = listView.querySelector('.ad-content');
        if (firstAd) {
          firstAd.setAttribute('tabindex', '-1');
          firstAd.focus({ preventScroll: false });
          setTimeout(() => firstAd.removeAttribute('tabindex'), 100);
        }
      }
    }
  }

  function getCursorForCurrentPage() {
    const cached = getCachedPage(paging.page);
    return cached?.nextCursor || paging.nextCursor;
  }

  async function handleNextPage() {
    if (!btnNextPage) {
      return;
    }

    const targetPage = paging.page + 1;

    if (paging.cache.has(targetPage)) {
      const cached = paging.cache.get(targetPage);
      applyPage(targetPage, cached, { autoFit: false });
      updatePaginationControls();
      return;
    }

    const cursor = getCursorForCurrentPage();

    if (!cursor || (!paging.hasNext && !paging.cache.has(targetPage))) {
      window.showToast?.('Il n’y a plus d’annonces à afficher.');
      updatePaginationControls();
      return;
    }

    appLogger.info('Loading next page', {
      currentPage: paging.page,
      cursor,
      hasNext: paging.hasNext
    });

    const originalContent = btnNextPage.innerHTML;
    btnNextPage.disabled = true;
    if (btnPrevPage) {
      btnPrevPage.disabled = true;
    }
    btnNextPage.innerHTML = `
        <svg class="btn-next-page-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
        </svg>
        <span>Chargement...</span>
      `;

    try {
      const pageData = await fetchPageData(cursor, 'next');
      const nextPageNumber = targetPage;
      if (!pageData.items.length) {
        paging.hasNext = false;
        paging.nextCursor = null;
        window.showToast?.('Il n’y a plus d’annonces à afficher.');
        return;
      }
      cachePage(nextPageNumber, pageData);
      pageData.items.forEach((item) => {
        if (favStore.has(item.id)) {
          favDataCache.set(String(item.id), item);
        }
      });
      applyPage(nextPageNumber, pageData, { autoFit: false });
    } catch (error) {
      appLogger.error('loadNextPage error', error);
      window.showToast?.(error?.message || 'Impossible de charger la page suivante.');
    } finally {
      btnNextPage.innerHTML = originalContent;
      updatePaginationControls();
    }
  }

  btnNextPage?.addEventListener('click', handleNextPage);

  btnPrevPage?.addEventListener('click', () => {
    const targetPage = paging.page - 1;
    if (targetPage < 1) {
      return;
    }
    const cached = getCachedPage(targetPage);
    if (!cached) {
      window.showToast?.('Page précédente indisponible.');
      return;
    }
    applyPage(targetPage, cached, { autoFit: false });
  });

  // Disable old infinite scroll observer
  // const io = new IntersectionObserver(entries => {
  //   entries.forEach(e => {
  //     if (e.isIntersecting && pagination.index * PAGE_SIZE < filteredCache.length) {
  //       loading.style.display = 'grid';
  //       setTimeout(() => { renderChunk(); loading.style.display = 'none'; }, 250);
  //     }
  //   })
  // });
  // io.observe(sentinel);

  // ---------- MAP (Leaflet + clusters) ----------
  const fmtDT = new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0
  });

  function escapeHtml(value = '') {
    return String(value).replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
  }

  function escapeAttr(value = '') {
    return escapeHtml(value).replace(/\n/g, ' ');
  }

  function renderMiniCard(item) {
    const priceLabel = typeof item.price === 'number' ? fmtDT.format(item.price) : item.price || '';
    const stats = item.stats || {};
    const slug = String(item.catSlug || item.category || '').toLowerCase();
    const isRealEstate = slug === 'immobilier';
    const transactionIcon =
      isRealEstate && item.transactionType
        ? getTransactionTypeIcon(item.transactionType, { extraClass: 'ad-card__transaction' })
        : '';
    const viewLabel = Number.isFinite(stats.views) ? stats.views : null;
    const likeLabel = Number.isFinite(stats.likes) ? stats.likes : null;
    const statsMarkup = [
      viewLabel !== null
        ? `<span class="ad-meta__stat"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>${escapeHtml(viewLabel)}</span>`
        : '',
      likeLabel !== null
        ? `<span class="ad-meta__stat"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>${escapeHtml(likeLabel)}</span>`
        : ''
    ]
      .filter(Boolean)
      .join('');
    const imageSource =
      item.imageUrl || item.img || 'https://via.placeholder.com/640x480?text=Annonce';
    return `
        <article class="ad-card" role="dialog" aria-label="Aperçu ${escapeAttr(item.title)}">
          <div class="ad-card__media-wrapper">
            ${transactionIcon}
            <img class="ad-card__media" src="${escapeAttr(imageSource)}" alt="${escapeAttr(item.title)}" loading="lazy" decoding="async">
            <div class="ad-card__badges">
              <span class="ad-chip">${escapeHtml(item.category || 'Annonce')}</span>
              <span class="ad-price">${escapeHtml(String(priceLabel))}</span>
            </div>
          </div>
          <div class="ad-body">
            <h3 class="ad-title">${escapeHtml(item.title)}</h3>
            <div class="ad-meta">
              <div class="ad-meta__stats">${statsMarkup}</div>
              <span class="ad-meta__location"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 10c0 5-5.54 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.2 4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(item.city || '')}</span>
            </div>
            <button class="ad-cta" type="button" data-action="open-details" data-id="${escapeAttr(item.id)}">Voir les détails</button>
          </div>
        </article>
      `;
  }

  function computeHoverPlacement(marker) {
    if (!marker || !map) {
      return null;
    }
    const latlng = marker.getLatLng();
    if (!latlng) {
      return null;
    }
    const point = map.latLngToContainerPoint(latlng);
    const mapSize = map.getSize();
    if (!point || !mapSize) {
      return null;
    }
    const direction = point.y < mapSize.y * 0.5 ? 'bottom' : 'top';
    const edgeThreshold = 160;
    const pushAmount = 80;
    let offsetX = 0;
    if (point.x < edgeThreshold) {
      offsetX = pushAmount;
    } else if (mapSize.x - point.x < edgeThreshold) {
      offsetX = -pushAmount;
    }
    const offsetY = direction === 'top' ? -12 : 12;
    return { latlng, direction, offset: [offsetX, offsetY] };
  }

  let hoverCard = null;
  let hoverCardCloseTimer = null;
  let hoverMapEventsBound = false;

  function ensureHoverCard(mapInstance) {
    if (!hoverCard && window.L) {
      hoverCard = L.tooltip({
        permanent: false,
        direction: 'top',
        className: 'ad-hovercard ad-enter',
        offset: [0, -12],
        interactive: true
      });
    }
    if (mapInstance && hoverCard && hoverCard._map && hoverCard._map !== mapInstance) {
      hoverCard.remove();
    }
    return hoverCard;
  }

  function setupHoverCardNode() {
    if (!hoverCard) {
      return;
    }
    const el = hoverCard.getElement();
    if (!el || el._hoverBound) {
      return;
    }
    el._hoverBound = true;
    const cancelClose = () => clearTimeout(hoverCardCloseTimer);
    const delayedClose = () => scheduleCloseHover();
    el.addEventListener('mouseenter', cancelClose);
    el.addEventListener('mouseleave', delayedClose);
    el.addEventListener('focusin', cancelClose);
    el.addEventListener('focusout', delayedClose);
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        scheduleCloseHover(0);
        const sourceMarker = hoverCard?._sourceMarker;
        if (sourceMarker && sourceMarker.getElement) {
          sourceMarker.getElement().focus?.();
        }
      }
    });
    el.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action="open-details"]');
      if (!target) {
        return;
      }
      const id = target.getAttribute('data-id');
      scheduleCloseHover(0);
      const sourceMarker = hoverCard?._sourceMarker;
      const data = sourceMarker?._itemData;
      if (data && data.id === id) {
        openDetailsById(id, data);
      } else if (id) {
        openDetailsById(id);
      }
    });
  }

  function scheduleCloseHover(delay = 160) {
    clearTimeout(hoverCardCloseTimer);
    hoverCardCloseTimer = setTimeout(() => {
      if (hoverCard && hoverCard._map) {
        hoverCard._sourceMarker = null;
        hoverCard.remove();
      }
    }, delay);
  }

  function openHoverFor(marker) {
    if (!marker || !map) {
      return;
    }
    const data = marker._item;
    if (!data) {
      return;
    }
    const tooltip = ensureHoverCard(map);
    if (!tooltip) {
      return;
    }
    const placement = computeHoverPlacement(marker);
    if (!placement) {
      return;
    }
    clearTimeout(hoverCardCloseTimer);
    tooltip._sourceMarker = marker;
    tooltip.options.direction = placement.direction;
    tooltip.options.offset = placement.offset;
    tooltip.setLatLng(placement.latlng);
    tooltip.setContent(renderMiniCard(data));
    if (!tooltip._map) {
      tooltip.addTo(map);
    }
    tooltip.update();
    const el = tooltip.getElement();
    if (el) {
      el.classList.remove('ad-enter-active');
      el.classList.remove('ad-enter');
      void el.offsetWidth;
      el.classList.add('ad-enter');
    }
    requestAnimationFrame(() => {
      const node = tooltip.getElement();
      if (!node) {
        return;
      }
      node.classList.remove('ad-enter');
      node.classList.add('ad-enter-active');
      setupHoverCardNode();
    });
  }

  function updateHoverPlacement(marker) {
    if (!hoverCard || !hoverCard._map || !marker || marker !== hoverCard._sourceMarker) {
      return;
    }
    const placement = computeHoverPlacement(marker);
    if (!placement) {
      return;
    }
    hoverCard.options.direction = placement.direction;
    hoverCard.options.offset = placement.offset;
    hoverCard.setLatLng(placement.latlng);
    hoverCard.update();
  }

  function handleMarkerDetails(marker) {
    const data = marker?._itemData;
    if (data && data.id) {
      openDetailsById(data.id, data);
    } else if (marker?._item && marker._item.id) {
      openDetailsById(marker._item.id);
    }
  }

  function bindHoverCard(marker) {
    if (!marker || marker._hoverBound || typeof marker.getAllChildMarkers === 'function') {
      return;
    }
    marker._hoverBound = true;
    marker.options.keyboard = true;
    marker.on('mouseover', () => openHoverFor(marker));
    marker.on('mouseout', () => scheduleCloseHover());
    marker.on('focus', () => openHoverFor(marker));
    marker.on('blur', () => scheduleCloseHover());
    marker.on('remove', () => {
      if (hoverCard && hoverCard._sourceMarker === marker) {
        scheduleCloseHover(0);
      }
    });
    marker.on('click', (event) => {
      const pointerType = event?.originalEvent?.pointerType;
      if (pointerType === 'touch' || pointerType === 'pen') {
        const now = Date.now();
        if (!marker._lastTap || now - marker._lastTap > 500) {
          marker._lastTap = now;
          openHoverFor(marker);
          event.originalEvent?.stopPropagation?.();
          event.originalEvent?.preventDefault?.();
        } else {
          marker._lastTap = 0;
          scheduleCloseHover(0);
          handleMarkerDetails(marker);
        }
        return;
      }
      scheduleCloseHover(0);
      handleMarkerDetails(marker);
    });
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!hoverCard || !hoverCard._map) {
        return;
      }
      const tooltipEl = hoverCard.getElement();
      if (!tooltipEl) {
        return;
      }
      const markerEl = hoverCard._sourceMarker?.getElement?.();
      if (tooltipEl.contains(event.target)) {
        return;
      }
      if (markerEl && markerEl.contains(event.target)) {
        return;
      }
      scheduleCloseHover(0);
    },
    { capture: true }
  );

  const MARKER_CLUSTER_SRC =
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
  let markerClusterScriptPromise = null;
  function loadMarkerClusterScript() {
    if (window.L && window.L.MarkerClusterGroup) {
      return Promise.resolve();
    }
    if (markerClusterScriptPromise) {
      return markerClusterScriptPromise;
    }
    markerClusterScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${MARKER_CLUSTER_SRC}"]`);
      if (existing && existing.hasAttribute('data-loaded')) {
        resolve();
        return;
      }
      const script = existing || document.createElement('script');
      script.src = MARKER_CLUSTER_SRC;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      };
      script.onerror = (err) => {
        markerClusterScriptPromise = null;
        reject(err);
      };
      if (!existing) {
        document.head.appendChild(script);
      }
    });
    return markerClusterScriptPromise;
  }

  function waitForLeaflet() {
    if (window.L) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const check = () => {
        if (window.L) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  let currentView = 'list';
  let map, cluster;
  const markerIndex = new Map();
  async function ensureMap() {
    if (map) {
      return map;
    }
    await waitForLeaflet();
    try {
      await loadMarkerClusterScript();
    } catch (error) {
      return null;
    }
    if (!window.L) {
      return null;
    }
    map = L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView([46.5, 2.3], 6);
    if (typeof window !== 'undefined') {
      window.map = map;
      window.__leafletMap = map;
      window.leafletMap = map;
    }
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM'
    }).addTo(map);
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      chunkedLoading: true,
      animate: false,
      animateAddingMarkers: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function (c) {
        const count = c.getChildCount();
        const size = count < 20 ? 'small' : count < 50 ? 'medium' : 'large';
        return new L.DivIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: new L.Point(40, 40)
        });
      }
    });
    map.addLayer(cluster);
    map.on('zoomstart movestart', () => {
      viewState.userAdjustedView = true;
    });
    if (!hoverMapEventsBound) {
      hoverMapEventsBound = true;
      const refreshHover = () => {
        if (hoverCard && hoverCard._map && hoverCard._sourceMarker) {
          updateHoverPlacement(hoverCard._sourceMarker);
        }
      };
      map.on('zoomstart', refreshHover);
      map.on('movestart', refreshHover);
      map.on('move', refreshHover);
      map.on('zoom', refreshHover);
      map.on('moveend', refreshHover);
      map.on('zoomend', refreshHover);
      map.on('resize', refreshHover);
      map.on('click', () => scheduleCloseHover(0));
    }
    requestAnimationFrame(() => map.invalidateSize());
    return map;
  }

  async function renderMap(options = {}) {
    const { force = false, invalidate = false, autoFit = false } = options;
    if (!map && !force && currentView !== 'map') {
      return;
    }
    const instance = await ensureMap();
    if (!instance || !cluster) {
      return;
    }
    cluster.clearLayers();
    markerIndex.clear();
    const list = getFiltered();
    list.forEach((a) => {
      if (
        !Array.isArray(a.latlng) ||
        a.latlng.length !== 2 ||
        a.latlng.some((v) => Number.isNaN(Number(v)))
      ) {
        return;
      }
      const marker = L.marker(a.latlng, { title: a.title, keyboard: true });
      const hoverData = {
        id: a.id,
        title: a.title,
        city: a.city,
        price: a.price,
        imageUrl: buildOptimizedImage(a.img, 480, 70),
        img: a.img,
        category: a.cat || a.category,
        catSlug: a.catSlug || mapCategoryLabelToSlug(a.cat || a.category),
        transactionType: a.transactionType || null,
        stats: { views: a.views ?? 0, likes: a.likes ?? 0 }
      };
      marker._item = hoverData;
      marker._itemData = a;
      markerIndex.set(String(a.id), marker);
      bindHoverCard(marker);
      cluster.addLayer(marker);
    });
    if (invalidate) {
      instance.invalidateSize();
    }
    if (list.length && (autoFit || !viewState.userAdjustedView)) {
      instance.fitBounds(L.latLngBounds(list.map((x) => x.latlng)).pad(0.2));
    }
  }

  function bounceMarker(marker) {
    if (!marker) {
      return;
    }
    const el = marker.getElement?.();
    if (!el) {
      return;
    }
    if (prefersReducedMotion.matches) {
      return;
    }
    el.classList.remove('mm-bounce');
    void el.offsetWidth;
    el.classList.add('mm-bounce');
    setTimeout(() => el.classList.remove('mm-bounce'), 800);
  }

  function focusMarkerById(id, attempt = 0) {
    const marker = markerIndex.get(String(id));
    if (!marker) {
      if (attempt < 8) {
        setTimeout(() => focusMarkerById(id, attempt + 1), 150);
      }
      return;
    }
    if (!map || !cluster) {
      if (attempt < 8) {
        setTimeout(() => focusMarkerById(id, attempt + 1), 120);
      }
      return;
    }
    if (!marker.__parent && attempt < 8) {
      setTimeout(() => focusMarkerById(id, attempt + 1), 150);
      return;
    }
    const latlng = marker.getLatLng();
    if (!latlng) {
      return;
    }
    const mapHasBounds = typeof map.getBounds === 'function';
    const maxZoom =
      typeof map.getMaxZoom === 'function'
        ? map.getMaxZoom()
        : map.options && typeof map.options.maxZoom === 'number'
          ? map.options.maxZoom
          : 18;
    const preferredZoom = Math.max(map.getZoom(), Math.min(16, maxZoom));
    const targetZoom = Math.min(maxZoom, preferredZoom);

    const revealMarker = () => {
      openHoverFor(marker);
      setTimeout(() => bounceMarker(marker), prefersReducedMotion.matches ? 0 : 120);
    };

    const needsPan = !mapHasBounds || !map.getBounds().pad(0.05).contains(latlng);
    const needsZoom = map.getZoom() < targetZoom;
    if (needsPan || needsZoom) {
      const finish = () => {
        map.off('moveend', finish);
        revealMarker();
      };
      map.once('moveend', finish);
      const animationOptions = { animate: !prefersReducedMotion.matches };
      if (typeof map.flyTo === 'function' && !prefersReducedMotion.matches) {
        map.flyTo(latlng, targetZoom, { duration: 0.6 });
      } else {
        map.setView(latlng, targetZoom, animationOptions);
      }
    } else {
      revealMarker();
    }
  }

  // ---------- VIEW SWITCHER (Liste / Carte) ----------
  const viewWrapper = document.getElementById('viewWrapper');
  const mapView = document.getElementById('mapView');
  const tabList = document.getElementById('tab-list');
  const tabMap = document.getElementById('tab-map');
  const mapEl = document.getElementById('map');
  const prefersReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };
  let isTransitioning = false;

  if (listView) {
    listView.setAttribute('aria-hidden', 'false');
  }
  if (mapView) {
    mapView.setAttribute('aria-hidden', 'true');
  }

  function focusTab(tabEl) {
    if (!tabEl || typeof tabEl.focus !== 'function') {
      return;
    }
    tabEl.focus({ preventScroll: true });
  }

  function updateViewTabs(state) {
    const isMap = state === 'map';
    if (tabList) {
      tabList.classList.toggle('active', !isMap);
      tabList.setAttribute('aria-selected', String(!isMap));
    }
    if (tabMap) {
      tabMap.classList.toggle('active', isMap);
      tabMap.setAttribute('aria-selected', String(isMap));
    }
  }

  function updateAriaState(state) {
    const isMap = state === 'map';
    if (listView) {
      listView.setAttribute('aria-hidden', String(isMap));
    }
    if (mapView) {
      mapView.setAttribute('aria-hidden', String(!isMap));
    }
  }

  function setWrapperTargetHeight(targetEl) {
    if (!viewWrapper || !targetEl) {
      return;
    }
    const rect = targetEl.getBoundingClientRect();
    const scrollHeight = targetEl.scrollHeight || rect.height;
    const height = Math.max(Math.ceil(scrollHeight || 0), Math.ceil(rect.height || 0));
    if (height > 0) {
      viewWrapper.style.setProperty('--vw-target-h', `${height}px`);
    } else {
      viewWrapper.style.removeProperty('--vw-target-h');
    }
  }

  function finalizeTransition() {
    if (!viewWrapper) {
      return;
    }
    viewWrapper.classList.remove('is-animating');
    viewWrapper.style.removeProperty('--vw-target-h');
    isTransitioning = false;
    if (currentView === 'map') {
      renderMap({ force: true, invalidate: true, autoFit: !viewState.userAdjustedView });
      requestAnimationFrame(() => {
        if (map && typeof map.invalidateSize === 'function') {
          map.invalidateSize();
        }
      });
    }
  }

  function animateTo(state, opts = {}) {
    const targetState = state === 'map' ? 'map' : 'list';
    if (!viewWrapper || !listView || !mapView) {
      return;
    }
    if (targetState === currentView) {
      if (!opts.skipSameStateFocus) {
        focusTab(targetState === 'map' ? tabMap : tabList);
      }
      return;
    }
    if (isTransitioning && !prefersReducedMotion.matches) {
      return;
    }
    isTransitioning = !prefersReducedMotion.matches;
    setWrapperTargetHeight(targetState === 'map' ? mapView : listView);
    viewWrapper.classList.add('is-animating');
    viewWrapper.classList.toggle('show-map', targetState === 'map');
    viewWrapper.classList.toggle('show-list', targetState !== 'map');
    currentView = targetState;
    updateViewTabs(targetState);
    updateAriaState(targetState);
    if (targetState === 'map') {
      ensureMap().then((instance) => {
        renderMap({ force: true, invalidate: true, autoFit: !viewState.userAdjustedView });
        requestAnimationFrame(() => {
          if (instance && typeof instance.invalidateSize === 'function') {
            instance.invalidateSize();
          } else if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize();
          }
        });
      });
      if (!opts.skipSameStateFocus) {
        focusTab(tabMap);
      }
    } else {
      if (!opts.skipSameStateFocus) {
        focusTab(tabList);
      }
    }
    if (prefersReducedMotion.matches) {
      requestAnimationFrame(() => finalizeTransition());
    }
  }

  if (viewWrapper) {
    viewWrapper.classList.toggle('show-map', currentView === 'map');
    viewWrapper.classList.toggle('show-list', currentView !== 'map');
    viewWrapper.addEventListener('transitionend', (event) => {
      if (prefersReducedMotion.matches) {
        return;
      }
      if (event.propertyName !== 'transform') {
        return;
      }
      if (!event.target.classList.contains('view')) {
        return;
      }
      finalizeTransition();
    });
    viewWrapper.addEventListener('transitioncancel', () => {
      finalizeTransition();
    });
  }

  if (tabList) {
    tabList.addEventListener('click', () => animateTo('list'));
    tabList.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        animateTo('list');
      }
    });
  }
  if (tabMap) {
    tabMap.addEventListener('click', () => animateTo('map'));
    tabMap.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        animateTo('map');
      }
    });
  }

  updateViewTabs(currentView);
  updateAriaState(currentView);

  let mapObscureCount = 0;
  function obscureMap() {
    if (!mapEl) {
      return;
    }
    mapObscureCount = Math.max(0, mapObscureCount) + 1;
    mapEl.classList.add('is-obscured');
  }
  function restoreMap() {
    if (!mapEl) {
      return;
    }
    mapObscureCount = Math.max(0, mapObscureCount - 1);
    if (mapObscureCount === 0) {
      mapEl.classList.remove('is-obscured');
    }
  }

  (function () {
    const getMap = () => {
      if (typeof map !== 'undefined' && map && typeof map.addLayer === 'function') {
        return map;
      }
      if (typeof window !== 'undefined') {
        const candidates = [window.map, window.__leafletMap, window.leafletMap];
        for (const candidate of candidates) {
          if (candidate && typeof candidate.addLayer === 'function') {
            return candidate;
          }
        }
      }
      return null;
    };

    const geo = {
      active: false,
      lat: null,
      lng: null,
      radiusKm: 10,
      marker: null,
      circle: null,
      radiusEnabled: true
    };
    const panel = document.getElementById('geoPanel');
    const btn = document.getElementById('geoLocateBtn');
    const caret = document.getElementById('geoCaretBtn');
    const dropdown = document.getElementById('geoDropdown');
    const radiusRow = document.getElementById('geoRadiusRow');
    const range = document.getElementById('geoRadius');
    const val = document.getElementById('geoRadiusVal');
    const toggle = document.getElementById('geoRadiusEnabled');
    const toast = document.getElementById('geoToast');
    let toastTimer = null;
    let toastHideTimer = null;

    if (!panel || !btn || !caret || !dropdown || !range || !toggle) {
      return;
    }

    if (typeof window !== 'undefined') {
      if (typeof window.getFiltered !== 'function' && typeof getFiltered === 'function') {
        window.getFiltered = (...args) => getFiltered(...args);
      }
      if (typeof window.renderList !== 'function' && typeof renderList === 'function') {
        window.renderList = (...args) => renderList(...args);
      }
      if (typeof window.renderMap !== 'function' && typeof renderMap === 'function') {
        window.renderMap = (...args) => renderMap(...args);
      }
    }

    function distKm(a, b) {
      const R = 6371;
      const toRad = (x) => (x * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const sa =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(sa));
    }

    async function saveLocationToAPI(lat, lng, radiusKm) {
      try {
        const response = await fetch(buildApiUrl('/api/users/me/location'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ lat, lng, radiusKm })
        });

        if (response.ok) {
          const result = await response.json();
          // Retourner les données de localisation (incluant la ville si disponible)
          return result.data?.location || true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    async function loadSavedLocation() {
      try {
        const response = await fetch(buildApiUrl('/api/auth/me'), {
          credentials: 'include'
        });

        if (!response.ok) {
          return null;
        }

        const result = await response.json();
        const user = result.data?.user;

        if (!user?.location?.coords?.coordinates) {
          return null;
        }

        const [lng, lat] = user.location.coords.coordinates;
        const radiusKm = user.location.radiusKm || 10;
        const lastUpdated = user.location.lastUpdated;

        return { lat, lng, radiusKm, lastUpdated };
      } catch (error) {
        return null;
      }
    }

    async function checkAndUpdateLocation(savedLocation, currentLat, currentLng) {
      if (!savedLocation) {
        return true;
      } // Pas de position sauvegardée, on sauvegarde

      const distance = distKm(
        { lat: savedLocation.lat, lng: savedLocation.lng },
        { lat: currentLat, lng: currentLng }
      );

      // Si la distance est > 10km, on met à jour
      if (distance > 10) {
        return true;
      }

      return false;
    }

    function showGeoToast(message, duration = 1600) {
      if (!toast) {
        return;
      }
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
      }
      toast.textContent = message;
      toast.hidden = false;
      toast.setAttribute('aria-hidden', 'false');
      btn.classList.remove('show-toast');
      // Force reflow to restart transition when message changes quickly
      void btn.offsetWidth;
      btn.classList.add('show-toast');
      toastTimer = window.setTimeout(() => {
        btn.classList.remove('show-toast');
        toastHideTimer = window.setTimeout(() => {
          toast.hidden = true;
          toast.setAttribute('aria-hidden', 'true');
          toastHideTimer = null;
        }, 200);
        toastTimer = null;
      }, duration);
    }

    function updateRadiusLabel() {
      if (val) {
        val.textContent = geo.radiusKm;
      }
      // Update slider progress for modern design
      if (range) {
        range.style.setProperty('--progress', `${geo.radiusKm}%`);
      }
    }

    function syncRangeDisabledState(enabled) {
      range.disabled = !enabled;
      if (radiusRow) {
        radiusRow.classList.toggle('is-disabled', !enabled);
      }
    }

    function removeCircle() {
      if (geo.circle && typeof geo.circle.remove === 'function') {
        geo.circle.remove();
      }
      geo.circle = null;
    }

    function upsertLayers(mapInstance) {
      if (!mapInstance || geo.lat == null || geo.lng == null) {
        return;
      }
      // Vérifier que mapInstance est une vraie instance Leaflet avec les méthodes nécessaires
      if (typeof mapInstance.addLayer !== 'function') {
        return;
      }
      const latlng = [geo.lat, geo.lng];
      if (!geo.marker) {
        geo.marker = L.marker(latlng, {
          icon: L.divIcon({ className: 'geo-user', iconSize: [22, 22], iconAnchor: [11, 11] })
        }).addTo(mapInstance);
      } else {
        geo.marker.setLatLng(latlng);
      }
      if (geo.radiusEnabled) {
        const meters = geo.radiusKm * 1000;
        if (!geo.circle) {
          geo.circle = L.circle(latlng, {
            radius: meters,
            interactive: false,
            className: 'geo-radius'
          });
          geo.circle.addTo(mapInstance);
        } else {
          geo.circle.setLatLng(latlng).setRadius(meters);
          if (typeof mapInstance.hasLayer === 'function' && !mapInstance.hasLayer(geo.circle)) {
            geo.circle.addTo(mapInstance);
          }
        }
      } else {
        removeCircle();
      }
    }

    function fitToRadius(mapInstance) {
      if (!mapInstance || !geo.circle) {
        return;
      }
      mapInstance.flyToBounds(geo.circle.getBounds(), { duration: 0.8, padding: [30, 30] });
      if (typeof viewState === 'object' && viewState) {
        viewState.userAdjustedView = true;
      }
    }

    function focusOnUser(mapInstance) {
      if (!mapInstance || geo.lat == null || geo.lng == null) {
        return;
      }
      const zoom = typeof mapInstance.getZoom === 'function' ? mapInstance.getZoom() : 13;
      mapInstance.flyTo([geo.lat, geo.lng], zoom, { duration: 0.8 });
      if (typeof viewState === 'object' && viewState) {
        viewState.userAdjustedView = true;
      }
    }

    function rerenderAll() {
      if (typeof window.renderList === 'function') {
        window.renderList(true);
      } else if (typeof renderList === 'function') {
        renderList(true);
      }
      if (typeof window.renderMap === 'function') {
        window.renderMap({ autoFit: false });
      } else if (typeof renderMap === 'function') {
        renderMap({ autoFit: false });
      }
    }

    function applyRadius(options = {}) {
      if (!geo.active) {
        return;
      }
      const { reFit = true, mapInstance: providedMap } = options;
      const mapInstance = providedMap || getMap();
      if (!mapInstance) {
        rerenderAll();
        return;
      }
      upsertLayers(mapInstance);
      if (reFit) {
        if (geo.radiusEnabled) {
          fitToRadius(mapInstance);
        } else {
          focusOnUser(mapInstance);
        }
      }
      rerenderAll();
    }

    function setRadius(value, options = {}) {
      const next = Number(value);
      const clamped = Number.isFinite(next) ? Math.min(100, Math.max(1, next)) : geo.radiusKm;
      geo.radiusKm = clamped;
      if (!options.skipInputSync) {
        range.value = String(clamped);
      }
      updateRadiusLabel();
      if (!options.silent) {
        applyRadius({ reFit: options.reFit !== false });
      }
    }

    const setDropdown = (open) => {
      dropdown.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      caret.setAttribute('aria-expanded', String(open));
    };

    const setCaretDisabled = (disabled) => {
      caret.setAttribute('aria-disabled', String(disabled));
      caret.setAttribute('data-disabled', disabled ? 'true' : 'false');
      caret.tabIndex = disabled ? -1 : 0;
    };

    const isCaretDisabled = () => caret.getAttribute('data-disabled') === 'true';

    caret.addEventListener('click', (event) => {
      if (isCaretDisabled()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const willOpen = dropdown.hidden;
      setDropdown(willOpen);
    });

    caret.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        caret.click();
      }
    });

    document.addEventListener('click', (event) => {
      if (dropdown.hidden) {
        return;
      }
      if (!panel.contains(event.target)) {
        setDropdown(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dropdown.hidden) {
        setDropdown(false);
      }
    });

    range.addEventListener('input', () => {
      const value = Number(range.value);
      setRadius(value);
      if (toggle.checked && typeof window.mmSetRadius === 'function') {
        window.mmSetRadius(value);
      }
    });

    toggle.addEventListener('change', () => {
      const enabled = toggle.checked;
      geo.radiusEnabled = enabled;
      syncRangeDisabledState(enabled);

      // Update toggle label text
      const toggleText = document.getElementById('geoToggleText');
      if (toggleText) {
        toggleText.textContent = enabled
          ? 'Recherche par rayon activée'
          : 'Recherche par rayon désactivée';
      }

      applyRadius({ reFit: enabled });
      if (typeof window.mmEnableRadiusFilter === 'function') {
        window.mmEnableRadiusFilter(enabled);
      }
    });

    function resetButtonState() {
      btn.setAttribute('aria-busy', 'false');
      btn.disabled = false;
      setCaretDisabled(false);
    }

    async function startLocate() {
      if (btn.getAttribute('aria-busy') === 'true') {
        return;
      }
      setDropdown(false);
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      setCaretDisabled(true);

      if (!('geolocation' in navigator)) {
        showGeoToast('Géoloc indisponible');
        resetButtonState();
        return;
      }

      let mapInstance = getMap();
      if (!mapInstance && typeof ensureMap === 'function') {
        mapInstance = await ensureMap();
      }
      if (!mapInstance) {
        showGeoToast('Carte indisponible');
        resetButtonState();
        return;
      }

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
          });
        });
        const { latitude, longitude } = position.coords;

        // Vérifier si on doit sauvegarder (nouvelle position ou changement > 10km)
        const savedLocation = await loadSavedLocation();
        const shouldSave = await checkAndUpdateLocation(savedLocation, latitude, longitude);

        geo.active = true;
        geo.lat = latitude;
        geo.lng = longitude;
        geo.radiusEnabled = toggle.checked;
        updateRadiusLabel();
        syncRangeDisabledState(geo.radiusEnabled);
        applyRadius({ reFit: true, mapInstance });

        // Sauvegarder dans la BDD si nécessaire
        let cityName = null;
        if (shouldSave) {
          const locationData = await saveLocationToAPI(latitude, longitude, geo.radiusKm);
          if (locationData && typeof locationData === 'object' && locationData.city) {
            cityName = locationData.city;
          }
        }

        if (typeof window.mmSetRadius === 'function') {
          window.mmSetRadius(geo.radiusKm);
        }
        if (typeof window.mmEnableRadiusFilter === 'function') {
          window.mmEnableRadiusFilter(geo.radiusEnabled);
        }
        if (typeof window.mmOnLocate === 'function') {
          window.mmOnLocate([latitude, longitude]);
        }

        // Afficher le nom de la ville si disponible
        const toastMessage = cityName
          ? `Position détectée: ${cityName} ✅`
          : 'Position détectée ✅';
        showGeoToast(toastMessage);
        requestAnimationFrame(() => mapInstance.invalidateSize?.());
      } catch (error) {
        showGeoToast("Impossible d'obtenir la position");
      } finally {
        resetButtonState();
      }
    }

    btn.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('#geoCaretBtn')) {
        return;
      }
      startLocate();
    });

    // Auto-charger la position sauvegardée au démarrage
    async function autoLoadSavedLocation() {
      const savedLocation = await loadSavedLocation();
      if (savedLocation && savedLocation.lat && savedLocation.lng) {
        geo.active = true;
        geo.lat = savedLocation.lat;
        geo.lng = savedLocation.lng;
        geo.radiusKm = savedLocation.radiusKm || 10;
        geo.radiusEnabled = toggle.checked;

        // Mettre à jour l'UI
        range.value = String(geo.radiusKm);
        updateRadiusLabel();
        syncRangeDisabledState(geo.radiusEnabled);

        // Appliquer le rayon sur la carte si elle est déjà chargée
        const mapInstance = getMap();
        if (mapInstance) {
          applyRadius({ reFit: true, mapInstance });
        }

        if (typeof window.mmSetRadius === 'function') {
          window.mmSetRadius(geo.radiusKm);
        }
        if (typeof window.mmEnableRadiusFilter === 'function') {
          window.mmEnableRadiusFilter(geo.radiusEnabled);
        }
        if (typeof window.mmOnLocate === 'function') {
          window.mmOnLocate([savedLocation.lat, savedLocation.lng]);
        }

        // Optionnel: vérifier si la position actuelle a changé en arrière-plan
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const shouldUpdate = await checkAndUpdateLocation(savedLocation, latitude, longitude);
              if (!shouldUpdate) {
                return;
              }
              await saveLocationToAPI(latitude, longitude, geo.radiusKm);
              geo.lat = latitude;
              geo.lng = longitude;
              const mapInst = getMap();
              if (mapInst) {
                applyRadius({ reFit: false, mapInstance: mapInst });
              }
            },
            () => {},
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
          );
        }
      }
    }

    // Lancer l'auto-chargement après un court délai (pour laisser l'auth se charger)
    setTimeout(autoLoadSavedLocation, 500);

    geo.radiusKm = Number(range.value) || geo.radiusKm;
    geo.radiusEnabled = toggle.checked;
    updateRadiusLabel();
    syncRangeDisabledState(geo.radiusEnabled);
    setDropdown(false);
    resetButtonState();

    window.mmFilterByRadius = function (items) {
      if (!geo.active || !geo.radiusEnabled || geo.lat == null || geo.lng == null) {
        return items;
      }
      const origin = { lat: geo.lat, lng: geo.lng };
      const radius = geo.radiusKm;
      return items.filter((item) => {
        const source =
          item.latlng ||
          item.coords ||
          (item.lat != null && item.lng != null ? { lat: item.lat, lng: item.lng } : null);
        if (!source) {
          return false;
        }
        const point = Array.isArray(source)
          ? { lat: source[0], lng: source[1] }
          : { lat: source.lat, lng: source.lng };
        return distKm(origin, point) <= radius;
      });
    };

    if (typeof window.getFiltered === 'function' && !window.__geoPatched) {
      const base = window.getFiltered;
      window.getFiltered = function (...args) {
        return window.mmFilterByRadius(base(...args));
      };
      window.__geoPatched = true;
    }
  })();

  // ---------- AUTH MODAL ----------
  const authModal = document.getElementById('authModal');
  const authDialog = document.getElementById('authDialog');
  const closeAuth = document.getElementById('closeAuth');
  const postBtn = document.getElementById('postBtn');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const tabIndicator = document.getElementById('tabIndicator');
  const formContainer = document.getElementById('formContainer');
  const authFeedback = document.getElementById('authFeedback');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  const loginEmailInput = document.getElementById('loginEmail');
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const heroIcon = document.getElementById('heroIcon');
  const forgotTrigger = document.getElementById('forgotTrigger');
  let pendingVerificationEmail = '';
  let resendVerificationBtn = null;
  let verificationCooldownTimer = null;
  const VERIFICATION_COOLDOWN_MS = 60000;
  const backToLogin = document.getElementById('backToLogin');
  const passwordToggles = document.querySelectorAll('.password-toggle');

  const API_BASE = window.API_BASE || window.location.origin;

  function withCacheBust(url, bustCache) {
    if (!bustCache) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }

  // Utility function to get avatar URL with proper path and cache busting
  window.getAvatarUrl = function (avatarFilename, bustCache = false) {
    if (!avatarFilename) {
      return withCacheBust('/uploads/avatars/default.jpg', bustCache);
    }

    const normalized = String(avatarFilename).trim();

    // Already a full URL (S3, CDN, etc.)
    if (/^https?:\/\//i.test(normalized)) {
      return withCacheBust(normalized, bustCache);
    }

    // Already served from /uploads
    if (normalized.startsWith('/uploads/avatars/')) {
      return withCacheBust(normalized, bustCache);
    }

    // Otherwise, build the legacy path
    return withCacheBust(`/uploads/avatars/${normalized}`, bustCache);
  };

  // Global function to update all avatar instances
  window.updateAllAvatars = function (avatarFilename, bustCache = true) {
    const avatarUrl = window.getAvatarUrl(avatarFilename, bustCache);

    // 1. Profile modal avatar
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
      profileAvatar.src = avatarUrl;
    }

    // 2. User menu button avatar
    const avatarBtn = document.querySelector('.avatar-btn.is-auth .avatar-img');
    if (avatarBtn) {
      avatarBtn.src = avatarUrl;
    }

    // 3. User menu dropdown avatar
    const userMenuAvatar = document.getElementById('userMenuAvatar');
    if (userMenuAvatar) {
      userMenuAvatar.src = avatarUrl;
    }

    // 4. All other avatar images with class user-menu__avatar
    document.querySelectorAll('.user-menu__avatar').forEach((img) => {
      img.src = avatarUrl;
    });

    // 5. Seller card in ad details if it's the current user
    const detailsSeller = document.getElementById('detailsSeller');
    if (detailsSeller) {
      const sellerImg = detailsSeller.querySelector('img');
      if (sellerImg) {
        sellerImg.src = avatarUrl;
      }
    }
  };

  // Backward compatible alias used by legacy scripts
  window.updateUserAvatar = function (avatarFilename, bustCache = true) {
    window.updateAllAvatars(avatarFilename, bustCache);
  };

  function buildApiUrl(path) {
    if (!path) {
      return API_BASE;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
    const isFormData = body instanceof FormData;
    let response;
    try {
      let requestHeaders = headers;
      if (!isFormData) {
        requestHeaders = {
          'Content-Type': 'application/json',
          ...headers
        };
      }
      response = await fetch(buildApiUrl(path), {
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
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = payload?.message || `Erreur HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = payload?.code || 'HTTP_ERROR';
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  const api = {
    get: (path, options) => apiRequest(path, { ...(options || {}), method: 'GET' }),
    post: (path, body, options) => apiRequest(path, { ...(options || {}), method: 'POST', body }),
    patch: (path, body, options) => apiRequest(path, { ...(options || {}), method: 'PATCH', body }),
    del: (path, options) => apiRequest(path, { ...(options || {}), method: 'DELETE' })
  };

  function setAuthFeedback(message = '', type = 'info', options = {}) {
    if (!authFeedback) {
      return;
    }
    stopVerificationCooldown();
    authFeedback.textContent = '';
    authFeedback.removeAttribute('data-type');
    authFeedback.classList.remove('is-visible');
    resendVerificationBtn = null;
    if (!message) {
      scheduleAuthMeasure();
      return;
    }
    const icon = document.createElement('span');
    icon.className = 'auth-feedback-icon';
    icon.setAttribute('aria-hidden', 'true');
    const iconMap = {
      success: '✓',
      error: '⚠',
      info: 'ℹ'
    };
    icon.textContent = iconMap[type] || iconMap.info;
    const text = document.createElement('span');
    text.className = 'auth-feedback-message';
    text.textContent = message;
    authFeedback.append(icon, text);

    const action = options?.action;
    if (action?.label) {
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'auth-feedback-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'auth-feedback-action';
      button.textContent = action.label;
      button.dataset.label = action.label;
      if (action.id) {
        button.id = action.id;
      }
      if (action.disabled) {
        button.disabled = true;
      }
      if (typeof action.onClick === 'function') {
        button.addEventListener('click', (event) => {
          action.onClick(event);
        });
      }
      actionsWrapper.appendChild(button);
      authFeedback.append(actionsWrapper);
      if (action.id === 'resendVerificationBtn') {
        resendVerificationBtn = button;
      }
    }
    authFeedback.dataset.type = type;
    authFeedback.classList.add('is-visible');
    authFeedback.classList.remove('auth-feedback-pop');
    void authFeedback.offsetWidth;
    authFeedback.classList.add('auth-feedback-pop');
    authFeedback.addEventListener(
      'animationend',
      () => authFeedback.classList.remove('auth-feedback-pop'),
      { once: true }
    );
    scheduleAuthMeasure();
  }

  function clearAuthFeedback() {
    if (!authFeedback) {
      return;
    }
    authFeedback.textContent = '';
    authFeedback.removeAttribute('data-type');
    authFeedback.classList.remove('is-visible');
    scheduleAuthMeasure();
  }

  function extractAuthErrorMessage(error) {
    if (!error) {
      return 'Une erreur est survenue.';
    }
    if (error.payload?.message) {
      return error.payload.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Une erreur est survenue.';
  }

  const AUTH_FOCUSABLE_SELECTOR =
    'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  let authLastFocus = null;
  let authTrapActive = false;

  function getAuthFocusableElements() {
    if (!authDialog) {
      return [];
    }
    const candidates = Array.from(authDialog.querySelectorAll(AUTH_FOCUSABLE_SELECTOR));
    return candidates.filter((el) => {
      if (el.closest('[aria-hidden="true"]')) {
        return false;
      }
      if (el.hasAttribute('disabled')) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    });
  }

  function handleAuthKeydown(event) {
    if (!authTrapActive || event.key !== 'Tab') {
      return;
    }
    const focusables = getAuthFocusableElements();
    if (!focusables.length) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !authDialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleAuthFocusIn(event) {
    if (!authTrapActive || !authDialog || !authModal?.classList.contains('active')) {
      return;
    }
    if (!authDialog.contains(event.target)) {
      const focusables = getAuthFocusableElements();
      if (focusables.length) {
        focusables[0].focus();
      }
    }
  }

  function activateAuthFocusTrap() {
    if (authTrapActive || !authDialog) {
      return;
    }
    authTrapActive = true;
    document.addEventListener('keydown', handleAuthKeydown, true);
    document.addEventListener('focusin', handleAuthFocusIn);
  }

  function deactivateAuthFocusTrap() {
    if (!authTrapActive) {
      return;
    }
    document.removeEventListener('keydown', handleAuthKeydown, true);
    document.removeEventListener('focusin', handleAuthFocusIn);
    authTrapActive = false;
  }

  const forms = { login: loginForm, signup: signupForm, forgot: forgotForm };
  let currentTab = 'login';

  const heroCopy = {
    login: {
      title: 'Bienvenue !',
      subtitle: 'Accédez à vos messages, favoris et alertes personnalisées',
      icon: '📍'
    },
    signup: {
      title: 'Rejoignez-nous !',
      subtitle: 'Créez votre compte et découvrez toutes les fonctionnalités',
      icon: '🚀'
    },
    forgot: {
      title: 'Mot de passe oublié ?',
      subtitle: 'Recevez un mot de passe temporaire pour récupérer votre accès',
      icon: '🔑'
    }
  };

  const avatarIcons = {
    auth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>',
    profile:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  };

  function updateUserMenuIdentity(auth) {
    const nameEl = document.getElementById('userMenuName');
    const emailEl = document.getElementById('userMenuEmail');
    if (nameEl) {
      nameEl.textContent = auth?.name || 'Utilisateur';
    }
    if (emailEl) {
      emailEl.textContent = auth?.email || '';
    }

    // Use the global function to update all avatars
    if (auth?.avatar) {
      window.updateAllAvatars(auth.avatar, false);
    }
  }

  function initUserMenu(auth) {
    const button = document.getElementById('userMenuButton');
    const menu = document.getElementById('userMenu');
    if (!button || !menu) {
      return;
    }

    menu.dataset.open = 'false';
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');

    if (auth) {
      updateUserMenuIdentity(auth);
    }

    let isOpen = false;

    const handleDocumentClick = (event) => {
      if (menu.contains(event.target) || button.contains(event.target)) {
        return;
      }
      closeMenu();
    };

    const handleKeydown = (event) => {
      if (!isOpen) {
        return;
      }
      const activeElement = document.activeElement;
      const items = getMenuItems();
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeMenu({ restoreFocus: true });
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusNextItem(activeElement, 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusNextItem(activeElement, -1);
          break;
        case 'Home':
          event.preventDefault();
          focusFirstItem();
          break;
        case 'End':
          event.preventDefault();
          focusLastItem();
          break;
        case 'Enter':
        case ' ':
          if (items.includes(activeElement)) {
            event.preventDefault();
            handleMenuAction(activeElement.dataset.action);
          }
          break;
        default:
          break;
      }
    };

    function openMenu() {
      if (isOpen) {
        return;
      }
      isOpen = true;
      menu.hidden = false;
      requestAnimationFrame(() => {
        menu.dataset.open = 'true';
      });
      button.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', handleDocumentClick, { capture: true });
      document.addEventListener('keydown', handleKeydown);
      focusFirstItem();
    }

    function closeMenu({ restoreFocus = false } = {}) {
      if (!isOpen) {
        return;
      }
      isOpen = false;
      menu.dataset.open = 'false';
      button.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        if (!isOpen) {
          menu.hidden = true;
        }
      }, 180);
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      document.removeEventListener('keydown', handleKeydown);
      if (restoreFocus) {
        button.focus();
      }
    }

    function getMenuItems() {
      return Array.from(menu.querySelectorAll('[role="menuitem"]'));
    }

    function focusFirstItem() {
      const items = getMenuItems();
      if (items.length) {
        items[0].focus({ preventScroll: true });
      }
    }

    function focusLastItem() {
      const items = getMenuItems();
      if (items.length) {
        items[items.length - 1].focus({ preventScroll: true });
      }
    }

    function focusNextItem(current, direction = 1) {
      const items = getMenuItems();
      if (!items.length) {
        return;
      }
      const currentIndex = items.indexOf(current);
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + direction + items.length) % items.length;
      items[nextIndex].focus({ preventScroll: true });
    }

    async function performLogout() {
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        appLogger.error('Logout error', error);
      } finally {
        authStore.set(null);
        updateAuthUI();
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
        setAuthFeedback('Déconnecté', 'info');
        if (typeof showToast === 'function') {
          showToast('Déconnecté');
        }
      }
      closeMenu({ restoreFocus: true });
    }

    function handleMenuAction(action) {
      if (!action) {
        return;
      }
      switch (action) {
        case 'logout':
          performLogout();
          break;
        case 'profile':
          closeMenu({ restoreFocus: true });
          ensureProfileModal()
            .then(() => {
              if (typeof window.openProfileModal === 'function') {
                window.openProfileModal();
              } else if (typeof showToast === 'function') {
                showToast('Section profil en préparation ✨');
              }
            })
            .catch(() => {
              if (typeof showToast === 'function') {
                showToast('Section profil en préparation ✨');
              }
            });
          break;
        default:
          break;
      }
    }

    function toggleMenu(event) {
      if (event) {
        event.preventDefault();
      }
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    if (button.__menuToggleHandler) {
      button.removeEventListener('click', button.__menuToggleHandler);
    }
    button.__menuToggleHandler = toggleMenu;
    button.addEventListener('click', button.__menuToggleHandler);

    if (button.__menuKeyHandler) {
      button.removeEventListener('keydown', button.__menuKeyHandler);
    }
    button.__menuKeyHandler = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMenu();
      }
    };
    button.addEventListener('keydown', button.__menuKeyHandler);

    if (menu.__handlerClick) {
      menu.removeEventListener('click', menu.__handlerClick);
    }
    menu.__handlerClick = (event) => {
      const item = event.target.closest('[data-action]');
      if (!item) {
        return;
      }
      handleMenuAction(item.dataset.action);
    };
    menu.addEventListener('click', menu.__handlerClick);

    button.__closeUserMenu = closeMenu;
  }

  function renderAvatar(auth) {
    const avatar = document.getElementById('avatar');
    const userMenu = document.getElementById('userMenu');
    if (!avatar) {
      return;
    }
    avatar.innerHTML = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avatar-btn';

    if (auth) {
      button.id = 'userMenuButton';
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', 'userMenu');
      button.classList.add('is-auth');
      button.setAttribute('title', auth.name || auth.email || 'Profil connecté');
      button.setAttribute(
        'aria-label',
        auth.name ? `Menu de ${auth.name}` : 'Menu utilisateur connecté'
      );
      const avatarSrc = window.getAvatarUrl(auth.avatar);
      if (avatarSrc && auth.avatar) {
        const img = document.createElement('img');
        img.className = 'avatar-img';
        img.src = avatarSrc;
        img.alt = auth.name || auth.email || 'Avatar';
        button.appendChild(img);
      } else {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        icon.classList.add('avatar-icon');
        icon.innerHTML =
          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
        button.appendChild(icon);
      }
      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.classList.add('chevron');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M7 10l5 5 5-5');
      chevron.appendChild(path);
      button.appendChild(chevron);
      avatar.title = auth.name || auth.email || 'Compte connecté';
      avatar.appendChild(button);
      initUserMenu(auth);
    } else {
      button.classList.add('needs-auth');
      button.setAttribute('aria-label', 'Se connecter ou créer un compte');
      button.innerHTML = avatarIcons.auth;
      avatar.title = 'Se connecter ou créer un compte';
      button.addEventListener('click', () => openAuth());
      avatar.appendChild(button);
      if (userMenu) {
        userMenu.dataset.open = 'false';
        userMenu.hidden = true;
      }
    }
  }

  let authMeasureRaf = null;

  function scheduleAuthMeasure() {
    if (authMeasureRaf) {
      cancelAnimationFrame(authMeasureRaf);
    }
    authMeasureRaf = requestAnimationFrame(() => {
      authMeasureRaf = null;
      measureAuthHeight();
    });
  }

  function measureAuthHeight() {
    if (!formContainer) {
      return;
    }
    const formsList = Array.from(formContainer.querySelectorAll('.auth-form'));
    if (!formsList.length) {
      return;
    }
    const previousHeight = formContainer.style.height;
    formContainer.style.height = 'auto';
    let maxHeight = formContainer.scrollHeight;
    formsList.forEach((form) => {
      const wasActive = form.classList.contains('active');
      const prevStyles = {
        visibility: form.style.visibility,
        display: form.style.display,
        position: form.style.position,
        transform: form.style.transform
      };
      if (!wasActive) {
        form.style.visibility = 'hidden';
        form.style.display = 'flex';
        form.style.position = 'static';
        form.style.transform = 'none';
      }
      const formHeight = form.scrollHeight;
      if (formHeight > maxHeight) {
        maxHeight = formHeight;
      }
      if (!wasActive) {
        form.style.visibility = prevStyles.visibility;
        form.style.display = prevStyles.display;
        form.style.position = prevStyles.position;
        form.style.transform = prevStyles.transform;
      }
    });
    if (maxHeight) {
      formContainer.style.height = `${Math.ceil(maxHeight)}px`;
    } else {
      formContainer.style.height = previousHeight;
    }
  }

  scheduleAuthMeasure();
  window.addEventListener('resize', scheduleAuthMeasure);

  function openAuth(focusId = 'loginEmail', initialTab = 'login') {
    switchTab(initialTab, { instant: true, force: true, resetSuccess: true });
    clearFeedback();
    if (!authModal) {
      return;
    }
    authLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    obscureMap();
    activateAuthFocusTrap();
    setTimeout(() => {
      const target = document.getElementById(focusId) || getAuthFocusableElements()[0] || null;
      if (target) {
        target.focus();
      }
    }, 220);
  }

  function closeAuthFn() {
    if (!authModal) {
      return;
    }
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
    deactivateAuthFocusTrap();
    restoreMap();
    unlockBodyScroll();
    if (
      authLastFocus &&
      typeof authLastFocus.focus === 'function' &&
      authLastFocus.isConnected !== false
    ) {
      setTimeout(() => {
        authLastFocus.focus();
        authLastFocus = null;
      }, 0);
    } else {
      authLastFocus = null;
    }
    setTimeout(() => {
      resetAuthForms();
    }, 360);
  }

  function resetAuthForms() {
    [loginForm, signupForm, forgotForm].forEach((form) => form && form.reset());
    clearFeedback();
    Object.values(forms).forEach((form) =>
      form.classList.remove(
        'active',
        'slide-in-left',
        'slide-in-right',
        'slide-out-left',
        'slide-out-right'
      )
    );
    loginForm.classList.add('active');
    currentTab = 'login';
    updateTabUI('login');
    updateHeroContent('login');
    scheduleAuthMeasure();
  }

  function clearFieldErrors() {
    formContainer.querySelectorAll('.form-error').forEach((el) => el.remove());
    formContainer.querySelectorAll('.auth-input').forEach((inp) => inp.classList.remove('error'));
    scheduleAuthMeasure();
  }

  function clearSuccessMessage() {
    clearAuthFeedback();
  }

  function clearFeedback() {
    clearFieldErrors();
    clearSuccessMessage();
  }

  function buildVerificationMessage(reason = 'signup') {
    const label = pendingVerificationEmail || 'votre adresse email';
    if (reason === 'login') {
      return `Votre adresse ${label} n'est pas encore confirmée. Vérifiez votre boîte mail ou demandez un nouveau lien.`;
    }
    return `Nous avons envoyé un lien de confirmation à ${label}. Il expire dans 24h.`;
  }

  function startVerificationCooldown() {
    if (!resendVerificationBtn) {
      return;
    }
    stopVerificationCooldown();
    let remaining = Math.round(VERIFICATION_COOLDOWN_MS / 1000);
    const baseLabel =
      resendVerificationBtn.dataset.label || resendVerificationBtn.textContent.trim();
    resendVerificationBtn.disabled = true;
    const updateLabel = () => {
      resendVerificationBtn.textContent = `Renvoyer dans ${remaining}s`;
    };
    updateLabel();
    verificationCooldownTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopVerificationCooldown(baseLabel);
      } else {
        updateLabel();
      }
    }, 1000);
  }

  function stopVerificationCooldown(labelOverride) {
    if (verificationCooldownTimer) {
      clearInterval(verificationCooldownTimer);
      verificationCooldownTimer = null;
    }
    if (!resendVerificationBtn) {
      return;
    }
    resendVerificationBtn.disabled = false;
    const baseLabel = labelOverride || resendVerificationBtn.dataset.label || 'Renvoyer le lien';
    if (!resendVerificationBtn.classList.contains('loading')) {
      resendVerificationBtn.textContent = baseLabel;
    }
  }

  function handlePendingVerification(email, { reason = 'signup', message } = {}) {
    pendingVerificationEmail = (email || pendingVerificationEmail || '').trim();
    if (loginEmailInput && pendingVerificationEmail) {
      loginEmailInput.value = pendingVerificationEmail;
    }
    const feedbackType = reason === 'login' ? 'error' : 'success';
    const resolvedMessage = message || buildVerificationMessage(reason);
    setAuthFeedback(resolvedMessage, feedbackType, {
      action: {
        id: 'resendVerificationBtn',
        label: 'Renvoyer le lien',
        onClick: handleResendVerificationClick
      }
    });
    if (reason === 'signup') {
      showToast('Vérifiez votre boîte mail pour activer votre compte');
    }
    switchTab('login', { force: true, resetSuccess: false, instant: true });
  }

  async function handleResendVerificationClick() {
    if (!resendVerificationBtn) {
      return;
    }
    const targetEmail = (pendingVerificationEmail || loginEmailInput?.value || '').trim();
    if (!targetEmail) {
      setAuthFeedback('Renseignez votre email pour recevoir un nouveau lien.', 'info');
      return;
    }
    pendingVerificationEmail = targetEmail;
    setLoading(resendVerificationBtn, true);
    let succeeded = false;
    try {
      await api.post('/api/auth/resend-verification', { email: pendingVerificationEmail });
      setAuthFeedback('Un nouveau lien vient de vous être envoyé ✉️', 'success');
      succeeded = true;
    } catch (error) {
      setAuthFeedback(extractAuthErrorMessage(error), 'error');
      stopVerificationCooldown();
    } finally {
      setLoading(resendVerificationBtn, false);
      if (succeeded) {
        startVerificationCooldown();
      }
    }
  }

  function switchTab(tab, options = {}) {
    const targetForm = forms[tab];
    if (!targetForm) {
      return;
    }
    if (!options.force && tab === currentTab) {
      return;
    }

    const prevForm = forms[currentTab];
    clearFieldErrors();
    if (options.resetSuccess) {
      clearSuccessMessage();
    }

    updateTabUI(tab);
    updateHeroContent(tab);

    if (options.instant || !prevForm || prevForm === targetForm) {
      Object.values(forms).forEach((form) =>
        form.classList.remove(
          'active',
          'slide-in-left',
          'slide-in-right',
          'slide-out-left',
          'slide-out-right'
        )
      );
      targetForm.classList.add('active');
      currentTab = tab;
      scheduleAuthMeasure();
      return;
    }

    const { out: outClass, in: inClass } = getSlideDirection(currentTab, tab);
    prevForm.classList.remove(
      'slide-in-left',
      'slide-in-right',
      'slide-out-left',
      'slide-out-right'
    );
    targetForm.classList.remove(
      'slide-in-left',
      'slide-in-right',
      'slide-out-left',
      'slide-out-right'
    );

    prevForm.classList.add(outClass);
    setTimeout(() => {
      prevForm.classList.remove('active', outClass);
      targetForm.classList.add('active', inClass);
      requestAnimationFrame(() => targetForm.classList.remove(inClass));
      scheduleAuthMeasure();
    }, 200);

    currentTab = tab;
    scheduleAuthMeasure();
  }

  function updateTabUI(tab) {
    const showTabs = true;
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) {
      tabs.classList.toggle('hidden', !showTabs);
    }
    loginTab.classList.toggle('active', tab === 'login');
    signupTab.classList.toggle('active', tab === 'signup');
    if (!showTabs) {
      tabIndicator.classList.add('hidden');
      tabIndicator.classList.remove('signup');
      return;
    }
    if (tab === 'signup') {
      tabIndicator.classList.add('signup');
      tabIndicator.classList.remove('hidden');
    } else if (tab === 'login') {
      tabIndicator.classList.remove('signup', 'hidden');
    } else {
      tabIndicator.classList.add('hidden');
      tabIndicator.classList.remove('signup');
    }
  }

  function updateHeroContent(tab) {
    const copy = heroCopy[tab] || heroCopy.login;
    heroTitle.textContent = copy.title;
    heroSubtitle.textContent = copy.subtitle;
    heroIcon.textContent = copy.icon;
  }

  function getSlideDirection(from, to) {
    const order = ['login', 'signup', 'forgot'];
    const fromIndex = order.indexOf(from);
    const toIndex = order.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) {
      return { out: 'slide-out-left', in: 'slide-in-right' };
    }
    return toIndex > fromIndex
      ? { out: 'slide-out-left', in: 'slide-in-right' }
      : { out: 'slide-out-right', in: 'slide-in-left' };
  }

  function validateForm(form) {
    let valid = true;
    form.querySelectorAll('.auth-input').forEach((input) => {
      const value = input.value.trim();
      if (input.hasAttribute('required') && !value) {
        showFieldError(input, 'Ce champ est requis');
        valid = false;
        return;
      }
      if (input.type === 'email' && value && !isValidEmail(value)) {
        showFieldError(input, 'Adresse email invalide');
        valid = false;
        return;
      }
      if (input.id === 'signupPassword' && value && value.length < 8) {
        showFieldError(input, 'Minimum 8 caractères');
        valid = false;
      }
    });
    return valid;
  }

  function showFieldError(input, message) {
    const wrapper = input.closest('.auth-input-wrapper');
    if (!wrapper) {
      return;
    }
    const error = document.createElement('div');
    error.className = 'form-error';
    error.textContent = message;
    input.classList.add('error');
    wrapper.appendChild(error);
    scheduleAuthMeasure();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setLoading(button, isLoading) {
    if (!button) {
      return;
    }
    if (!button.dataset.label) {
      button.dataset.label = button.textContent.trim();
    }
    if (isLoading) {
      button.classList.add('loading');
      button.textContent = '';
    } else {
      button.classList.remove('loading');
      button.textContent = button.dataset.label || 'Continuer';
    }
  }

  function togglePassword(id) {
    const input = document.getElementById(id);
    if (!input) {
      return;
    }
    input.type = input.type === 'password' ? 'text' : 'password';
    const toggle = Array.from(passwordToggles).find((btn) => btn.dataset.target === id);
    if (toggle) {
      toggle.textContent = input.type === 'password' ? '👁' : '🙈';
    }
  }

  loginTab.addEventListener('click', () => switchTab('login', { force: true, resetSuccess: true }));
  signupTab.addEventListener('click', () =>
    switchTab('signup', { force: true, resetSuccess: true })
  );

  if (forgotTrigger) {
    forgotTrigger.addEventListener('click', () => {
      switchTab('forgot', { force: true, resetSuccess: true });
      setTimeout(() => {
        const forgotInput = document.getElementById('forgotEmail');
        if (forgotInput) {
          forgotInput.focus();
        }
      }, 220);
    });
  }

  if (backToLogin) {
    backToLogin.addEventListener('click', () => {
      switchTab('login', { force: true, resetSuccess: true });
      setTimeout(() => {
        const loginInput = document.getElementById('loginEmail');
        if (loginInput) {
          loginInput.focus();
        }
      }, 220);
    });
  }

  passwordToggles.forEach((btn) =>
    btn.addEventListener('click', () => togglePassword(btn.dataset.target))
  );

  closeAuth.addEventListener('click', closeAuthFn);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
      closeAuthFn();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
      closeAuthFn();
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();
    clearAuthFeedback();
    if (!validateForm(loginForm)) {
      return;
    }
    const button = document.getElementById('loginSubmit');
    setLoading(button, true);
    try {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const response = await api.post('/api/auth/login', { email, password });
      const user = response?.data?.user || null;
      if (user) {
        authStore.set(user);
        applyFavoritesFromUser(user);
      } else {
        authStore.set(null);
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
      }
      updateAuthUI();
      const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';
      const successMessage = firstName
        ? `Bienvenue ${firstName} ! Vous êtes maintenant connecté.`
        : 'Connexion réussie ! Vous êtes maintenant connecté.';
      setAuthFeedback(successMessage, 'success');
      showToast('Connexion réussie');
      setTimeout(() => closeAuthFn(), 1200);
    } catch (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        handlePendingVerification(loginEmailInput?.value || '', {
          reason: 'login',
          message: extractAuthErrorMessage(error)
        });
      } else {
        setAuthFeedback(extractAuthErrorMessage(error), 'error');
      }
    } finally {
      setLoading(button, false);
    }
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();
    clearAuthFeedback();
    if (!validateForm(signupForm)) {
      return;
    }
    const button = document.getElementById('signupSubmit');
    setLoading(button, true);
    try {
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const response = await api.post('/api/auth/signup', { name, email, password });
      const user = response?.data?.user || null;
      const requiresVerification = Boolean(response?.data?.requiresVerification);

      if (requiresVerification) {
        authStore.set(null);
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
        updateAuthUI();
        const verificationMessage =
          response?.message || 'Compte créé ! Vérifiez votre email pour activer votre accès.';
        handlePendingVerification(email, {
          reason: 'signup',
          message: verificationMessage
        });
        return;
      }

      if (user) {
        authStore.set(user);
        applyFavoritesFromUser(user);
      } else {
        authStore.set(null);
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
      }
      updateAuthUI();
      setAuthFeedback(response?.message || 'Compte créé. Bienvenue 👋', 'success');
      showToast('Compte créé et connecté');
      switchTab('login', { force: true, resetSuccess: false, instant: true });
      setTimeout(() => {
        const loginInput = document.getElementById('loginEmail');
        if (loginInput) {
          loginInput.focus();
        }
      }, 220);
      setTimeout(() => closeAuthFn(), 1400);
    } catch (error) {
      setAuthFeedback(extractAuthErrorMessage(error), 'error');
    } finally {
      setLoading(button, false);
    }
  });

  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();
    clearAuthFeedback();
    if (!validateForm(forgotForm)) {
      return;
    }
    const button = document.getElementById('forgotSubmit');
    setLoading(button, true);
    try {
      const email = document.getElementById('forgotEmail').value.trim();
      const response = await api.post('/api/auth/forgot-password', { email });
      setAuthFeedback(
        response?.message || 'Si un compte existe, un mot de passe temporaire a été envoyé.',
        'success'
      );
      showToast('Mot de passe temporaire envoyé');
      switchTab('login', { force: true, resetSuccess: false, instant: false });
      setTimeout(() => {
        const loginInput = document.getElementById('loginEmail');
        if (loginInput) {
          loginInput.focus();
        }
      }, 360);
    } catch (error) {
      setAuthFeedback(extractAuthErrorMessage(error), 'error');
    } finally {
      setLoading(button, false);
    }
  });

  function updateAuthUI() {
    const auth = authStore.get();
    renderAvatar(auth);
  }
  window.updateAuthUI = updateAuthUI;

  document.addEventListener('auth:change', () => {
    updateAuthUI();
  });

  async function hydrateAuthFromSession() {
    try {
      const response = await api.get('/api/auth/me');
      const user = response?.data?.user || null;
      if (user) {
        authStore.set(user);
        applyFavoritesFromUser(user);
      } else {
        authStore.set(null);
        favStore.clear();
        updateFavBadge();
        syncAllFavoriteButtons();
        if (isFavModalOpen()) {
          renderFavSheet();
        }
      }
    } catch (error) {
      authStore.set(null);
      favStore.clear();
      updateFavBadge();
      syncAllFavoriteButtons();
      if (isFavModalOpen()) {
        renderFavSheet();
      }
      if (error?.status && error.status !== 401) {
      }
    } finally {
      updateAuthUI();
    }
  }

  // ---------- POST MODAL ----------
  const postModal = document.getElementById('postModal');
  const postDialog = document.getElementById('postDialog');
  const postForm = document.getElementById('postForm');
  const postTitleInput = document.getElementById('postTitleInput');
  const postCategory = document.getElementById('postCategory');
  const postCondition = document.getElementById('postCondition');
  const postPrice = document.getElementById('postPrice');
  const postPhotosInput = document.getElementById('postPhotos');
  const postPhotosList = document.getElementById('postPhotosList');
  const postAttributes = document.getElementById('postAttributes');
  const postAddress = document.getElementById('postAddress');
  const postLat = document.getElementById('postLat');
  const postLng = document.getElementById('postLng');
  const postDescription = document.getElementById('postDescription');
  const postDescriptionCount = document.getElementById('postDescriptionCount');
  const postUseLocation = document.getElementById('postUseLocation');
  const postStatus = document.getElementById('postStatus');
  const postCancel = document.getElementById('postCancel');
  const postSubmit = document.getElementById('postSubmit');
  const postPreview = document.getElementById('postPreview');
  const postSaveDraft = document.getElementById('postSaveDraft');
  const postDraftBanner = document.getElementById('postDraftBanner');
  const postDraftResume = document.getElementById('postDraftResume');
  const postDraftDiscard = document.getElementById('postDraftDiscard');
  const closePostBtn = document.getElementById('closePost');

  let postTransactionType = null; // Dynamic field for real estate transaction type

  populateCategorySelect(cat, { placeholderLabel: 'Toutes catégories', placeholderValue: '' });
  populateCategorySelect(postCategory, { placeholderLabel: 'Sélectionnez', placeholderValue: '' });

  const DRAFT_STORAGE_KEY = 'mm-new-ad-draft-v1';
  const MAX_IMAGES = 10;
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

  const categoryDefinitions = {
    auto: {
      fields: [
        {
          id: 'year',
          label: 'Année',
          type: 'number',
          min: 1980,
          max: new Date().getFullYear(),
          required: true
        },
        {
          id: 'mileage',
          label: 'Kilométrage',
          type: 'number',
          min: 0,
          max: 500000,
          required: true
        },
        {
          id: 'fuel',
          label: 'Carburant',
          type: 'select',
          options: ['essence', 'diesel', 'hybride', 'electrique', 'gpl'],
          required: true
        },
        {
          id: 'gearbox',
          label: 'Boîte de vitesses',
          type: 'select',
          options: ['manuelle', 'automatique'],
          required: true
        }
      ]
    },
    immobilier: {
      fields: [
        { id: 'surface', label: 'Surface (m²)', type: 'number', min: 5, max: 1000, required: true },
        { id: 'rooms', label: 'Nombre de pièces', type: 'number', min: 1, max: 20, required: true },
        {
          id: 'dpe',
          label: 'DPE',
          type: 'select',
          options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          required: true
        },
        { id: 'furnished', label: 'Meublé', type: 'boolean', required: false },
        { id: 'floor', label: 'Étage', type: 'number', min: 0, max: 50, required: false }
      ]
    },
    electroniques: {
      fields: [
        {
          id: 'storage',
          label: 'Stockage (Go)',
          type: 'number',
          min: 1,
          max: 4096,
          required: true
        },
        { id: 'brand', label: 'Marque', type: 'text', required: true },
        {
          id: 'grade',
          label: 'Grade',
          type: 'select',
          options: ['neuf', 'comme neuf', 'très bon', 'bon', 'correct'],
          required: true
        }
      ]
    },
    pieces: {
      fields: [
        { id: 'compatible', label: 'Compatible avec', type: 'text', required: true },
        {
          id: 'grade',
          label: 'État',
          type: 'select',
          options: ['neuf', 'comme neuf', 'très bon', 'bon', 'correct'],
          required: true
        },
        { id: 'reference', label: 'Référence', type: 'text', required: false }
      ]
    },
    mode: {
      fields: [
        {
          id: 'gender',
          label: 'Genre',
          type: 'select',
          options: ['femme', 'homme', 'enfant', 'mixte'],
          required: true
        },
        {
          id: 'size',
          label: 'Taille',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          required: false
        },
        { id: 'brand', label: 'Marque', type: 'text', required: false }
      ]
    },
    loisirs: {
      fields: [
        {
          id: 'activity',
          label: 'Activité',
          type: 'select',
          options: ['vélo', 'trottinette', 'plein air', 'sport', 'autre'],
          required: false
        },
        { id: 'brand', label: 'Marque', type: 'text', required: false },
        { id: 'model', label: 'Modèle', type: 'text', required: false }
      ]
    }
  };

  let postPhotos = [];
  let postMapInstance = null;
  let postMapMarker = null;
  let postDraftTimer = null;
  let postIsSubmitting = false;
  let reverseGeocodeTimer = null;
  let editingAdId = null; // Track which ad is being edited
  let editMode = false; // Track if we're in edit mode

  function setPostModalHidden(hidden) {
    if (!postModal) {
      return;
    }
    postModal.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    // Disable pointer events when hidden to prevent click-through when in preview mode
    postModal.style.pointerEvents = hidden ? 'none' : 'auto';
    if (hidden) {
      unlockBodyScroll();
    } else {
      lockBodyScroll();
    }
  }

  function openPostModal(options = {}) {
    const auth = authStore.get();
    if (!auth) {
      showToast('Connectez-vous pour déposer une annonce 🔐');
      openAuth();
      return;
    }

    const { adId, adData } = options;
    editMode = !!adId;
    editingAdId = adId || null;

    rebuildAllItemsIndex();
    setPostModalHidden(false);
    postForm.reset();
    clearAllFieldErrors(postForm);

    // Change modal title based on mode
    const postTitle = document.getElementById('postTitle');
    if (postTitle) {
      postTitle.textContent = editMode ? "Modifier l'annonce" : 'Déposer une annonce';
    }

    // Change submit button text
    const submitLabel = postSubmit.querySelector('.btn-label');
    if (submitLabel) {
      submitLabel.textContent = editMode ? 'Mettre à jour' : "Publier l'annonce";
    }

    if (!editMode) {
      // New ad mode
      postPhotos = [];
      renderPhotoList();
      postStatus.textContent = '';
      postDraftBanner.hidden = true;
      initPostMap();
      buildAttributesForm(postCategory.value);
      const draft = loadDraft();
      if (draft) {
        postDraftBanner.hidden = false;
      }
    } else {
      // Edit mode
      postDraftBanner.hidden = true;
      if (adData) {
        populateFormWithAdData(adData);
      } else {
        // Load ad data from API
        loadAdDataForEdit(adId);
      }
    }

    postTitleInput.focus({ preventScroll: true });
    updateDescriptionCount();
  }

  function closePostModal({ reset = false } = {}) {
    setPostModalHidden(true);
    if (reset) {
      postForm.reset();
      postPhotos = [];
      renderPhotoList();
      postStatus.textContent = '';
    }
  }

  function clearAllFieldErrors(scope) {
    scope.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
    scope
      .querySelectorAll('[aria-invalid="true"]')
      .forEach((el) => el.removeAttribute('aria-invalid'));
  }

  function setFieldError(id, message) {
    const field = typeof id === 'string' ? document.getElementById(id) : id;
    if (!field) {
      return;
    }
    const errorEl = postForm.querySelector(`.field-error[data-error-for="${field.id}"]`);
    if (errorEl) {
      errorEl.textContent = message || '';
    }
    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  function renderPhotoList() {
    if (!postPhotosList) {
      return;
    }
    postPhotosList.innerHTML = '';
    if (!postPhotos.length) {
      return;
    }
    postPhotos.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'uploader-item';
      item.draggable = true;
      item.dataset.index = String(index);
      item.innerHTML = `
          <img src="${entry.preview}" alt="Photo ${index + 1}">
          <button type="button" class="uploader-remove" data-index="${index}" aria-label="Supprimer la photo">✕</button>
        `;
      item.addEventListener('dragstart', handlePhotoDragStart);
      item.addEventListener('dragover', handlePhotoDragOver);
      item.addEventListener('drop', handlePhotoDrop);
      postPhotosList.appendChild(item);
    });
  }

  let dragPhotoIndex = null;
  function handlePhotoDragStart(event) {
    dragPhotoIndex = Number(event.currentTarget.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handlePhotoDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handlePhotoDrop(event) {
    event.preventDefault();
    const targetIndex = Number(event.currentTarget.dataset.index);
    if (
      Number.isNaN(dragPhotoIndex) ||
      Number.isNaN(targetIndex) ||
      dragPhotoIndex === targetIndex
    ) {
      return;
    }
    const reordered = [...postPhotos];
    const [moved] = reordered.splice(dragPhotoIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    postPhotos = reordered;
    renderPhotoList();
    queueDraftSave();
  }

  function buildAttributesForm(category) {
    if (!postAttributes) {
      return;
    }
    postAttributes.innerHTML = '';

    // Handle transaction type field for immobilier category
    postTransactionType = null;
    if (category === 'immobilier') {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.dataset.attribute = 'transactionType';

      const label = document.createElement('label');
      label.setAttribute('for', 'postTransactionType');
      label.textContent = 'Type de transaction *';
      wrapper.appendChild(label);

      const select = document.createElement('select');
      select.id = 'postTransactionType';
      select.name = 'transactionType';
      select.required = true;
      select.innerHTML =
        '<option value="">Sélectionnez</option>' +
        '<option value="vente">Vente</option>' +
        '<option value="location">Location</option>';
      wrapper.appendChild(select);

      const error = document.createElement('p');
      error.className = 'field-error';
      error.dataset.errorFor = 'postTransactionType';
      wrapper.appendChild(error);

      postAttributes.appendChild(wrapper);
      select.addEventListener('input', queueDraftSave);
      postTransactionType = select;
    }

    const def = categoryDefinitions[category];
    if (!def) {
      return;
    }
    def.fields.forEach((field) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.dataset.attribute = field.id;
      const label = document.createElement('label');
      label.setAttribute('for', `attr-${field.id}`);
      label.textContent = `${field.label}${field.required ? ' *' : ''}`;
      wrapper.appendChild(label);
      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.id = `attr-${field.id}`;
        input.name = `attr_${field.id}`;
        input.innerHTML =
          '<option value="">Sélectionnez</option>' +
          field.options
            .map(
              (opt) =>
                `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
            )
            .join('');
      } else if (field.type === 'boolean') {
        input = document.createElement('select');
        input.id = `attr-${field.id}`;
        input.name = `attr_${field.id}`;
        input.innerHTML =
          '<option value="">Sélectionnez</option><option value="true">Oui</option><option value="false">Non</option>';
      } else {
        input = document.createElement('input');
        input.id = `attr-${field.id}`;
        input.name = `attr_${field.id}`;
        input.type = field.type === 'number' ? 'number' : 'text';
        if (field.min != null) {
          input.min = field.min;
        }
        if (field.max != null) {
          input.max = field.max;
        }
      }
      if (field.required) {
        input.required = true;
      }
      wrapper.appendChild(input);
      const error = document.createElement('p');
      error.className = 'field-error';
      error.dataset.errorFor = input.id;
      wrapper.appendChild(error);
      postAttributes.appendChild(wrapper);
      input.addEventListener('input', queueDraftSave);
    });
  }

  function updateDescriptionCount() {
    if (!postDescription || !postDescriptionCount) {
      return;
    }
    postDescriptionCount.textContent = `${postDescription.value.length} / 2000`;
  }

  function validatePostForm() {
    clearAllFieldErrors(postForm);
    let valid = true;
    const title = postTitleInput.value.trim();
    if (title.length < 10 || title.length > 80) {
      setFieldError('postTitleInput', 'Le titre doit contenir entre 10 et 80 caractères.');
      valid = false;
    }
    if (!postCategory.value) {
      setFieldError('postCategory', 'Sélectionnez une catégorie.');
      valid = false;
    }
    if (!postCondition.value) {
      setFieldError('postCondition', 'Sélectionnez l’état de l’article.');
      valid = false;
    }
    const priceValue = Number(postPrice.value);
    if (!postPrice.value || Number.isNaN(priceValue) || priceValue < 0.1 || priceValue > 9999999) {
      setFieldError('postPrice', 'Indiquez un prix valide (0.1 à 9 999 999).');
      valid = false;
    }
    if (!postPhotos.length) {
      setFieldError('postPhotos', 'Ajoutez au moins une photo.');
      valid = false;
    }

    // Validate transaction type for immobilier category
    if (postCategory.value === 'immobilier' && postTransactionType) {
      if (!postTransactionType.value) {
        setFieldError('postTransactionType', 'Sélectionnez un type de transaction.');
        valid = false;
      }
    }

    const def = categoryDefinitions[postCategory.value];
    if (def) {
      def.fields.forEach((field) => {
        const input = document.getElementById(`attr-${field.id}`);
        if (!input) {
          return;
        }
        let error = '';
        const value = input.value.trim();
        if (field.required && !value) {
          error = 'Champ requis';
        } else if (field.type === 'number' && value) {
          const num = Number(value);
          if (Number.isNaN(num)) {
            error = 'Valeur numérique invalide';
          }
          if (field.min != null && num < field.min) {
            error = `Minimum ${field.min}`;
          }
          if (field.max != null && num > field.max) {
            error = `Maximum ${field.max}`;
          }
        }
        if (error) {
          setFieldError(input.id, error);
          valid = false;
        }
      });
    }
    if (!postAddress.value.trim()) {
      setFieldError('postAddress', 'Indiquez une adresse.');
      valid = false;
    }
    const lat = Number(postLat.value);
    const lng = Number(postLng.value);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFieldError('postLat', 'Latitude invalide.');
      valid = false;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFieldError('postLng', 'Longitude invalide.');
      valid = false;
    }
    if (postDescription.value.trim().length < 30) {
      setFieldError('postDescription', 'La description doit contenir au moins 30 caractères.');
      valid = false;
    }
    if (!valid) {
      const firstError = postForm.querySelector('[aria-invalid="true"]');
      if (firstError) {
        firstError.focus({ preventScroll: false });
      }
    }
    return valid;
  }

  function collectPostPayload() {
    const attributes = {};
    const def = categoryDefinitions[postCategory.value];
    if (def) {
      def.fields.forEach((field) => {
        const input = document.getElementById(`attr-${field.id}`);
        if (!input) {
          return;
        }
        if (field.type === 'number') {
          attributes[field.id] = input.value ? Number(input.value) : null;
        } else if (field.type === 'boolean') {
          attributes[field.id] = input.value === '' ? null : input.value === 'true';
        } else {
          attributes[field.id] = input.value.trim() || null;
        }
      });
    }

    const payload = {
      title: postTitleInput.value.trim(),
      category: postCategory.value,
      condition: postCondition.value,
      price: Number(postPrice.value),
      description: postDescription.value.trim(),
      locationText: postAddress.value.trim(),
      latitude: Number(postLat.value),
      longitude: Number(postLng.value),
      attributes,
      images: postPhotos.map((file) => file.preview)
    };

    // Add transactionType for immobilier category
    if (postCategory.value === 'immobilier' && postTransactionType) {
      payload.transactionType = postTransactionType.value || null;
    }

    return payload;
  }

  function saveDraft(data) {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch (error) {}
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {}
  }

  function restoreDraft(draft) {
    if (!draft) {
      return;
    }
    if (draft.title) {
      postTitleInput.value = draft.title;
    }
    if (draft.category) {
      postCategory.value = draft.category;
      buildAttributesForm(draft.category);
    }
    if (draft.condition) {
      postCondition.value = draft.condition;
    }

    // Restore transaction type for immobilier category
    if (draft.category === 'immobilier' && draft.transactionType && postTransactionType) {
      postTransactionType.value = draft.transactionType;
    }

    if (draft.price) {
      postPrice.value = draft.price;
    }
    if (draft.description) {
      postDescription.value = draft.description;
    }
    if (draft.locationText) {
      postAddress.value = draft.locationText;
    }
    if (draft.latitude) {
      postLat.value = draft.latitude;
    }
    if (draft.longitude) {
      postLng.value = draft.longitude;
    }
    if (draft.attributes && typeof draft.attributes === 'object') {
      Object.entries(draft.attributes).forEach(([key, value]) => {
        const input = document.getElementById(`attr-${key}`);
        if (input) {
          input.value = value ?? '';
        }
      });
    }
    if (Array.isArray(draft.photos)) {
      postPhotos = draft.photos.map((photo) => ({ preview: photo, file: null }));
      renderPhotoList();
    }
    if (draft.latitude && draft.longitude) {
      updatePostMapMarker(draft.latitude, draft.longitude);
    }
    updateDescriptionCount();
  }

  function queueDraftSave() {
    if (postDraftTimer) {
      clearTimeout(postDraftTimer);
    }
    postDraftTimer = setTimeout(() => {
      if (postIsSubmitting) {
        return;
      }
      const payload = collectPostPayload();
      saveDraft({ ...payload, photos: postPhotos.map((p) => p.preview) });
    }, 1500);
  }

  function initPostMap() {
    const container = document.getElementById('postMap');
    if (!container) {
      return;
    }
    if (!postMapInstance) {
      postMapInstance = L.map('postMap', {
        center: [36.8065, 10.1815],
        zoom: 12,
        scrollWheelZoom: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(postMapInstance);
      const center = postMapInstance.getCenter();
      postMapMarker = L.marker(center, { draggable: true }).addTo(postMapInstance);
      // Initialiser l'affichage des coordonnées
      const initLat = center.lat.toFixed(6);
      const initLng = center.lng.toFixed(6);
      postLat.value = initLat;
      postLng.value = initLng;
      document.getElementById('coordsLat').textContent = initLat;
      document.getElementById('coordsLng').textContent = initLng;
      // Remplir la ville par défaut
      updateCityFromCoords(initLat, initLng);
      postMapMarker.on('move', ({ latlng }) => {
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        postLat.value = lat;
        postLng.value = lng;
        document.getElementById('coordsLat').textContent = lat;
        document.getElementById('coordsLng').textContent = lng;
        updateCityFromCoords(lat, lng);
        queueDraftSave();
      });
      postMapInstance.on('click', ({ latlng }) => {
        postMapMarker.setLatLng(latlng);
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        postLat.value = lat;
        postLng.value = lng;
        document.getElementById('coordsLat').textContent = lat;
        document.getElementById('coordsLng').textContent = lng;
        updateCityFromCoords(lat, lng);
        queueDraftSave();
      });
    }
    setTimeout(() => {
      postMapInstance.invalidateSize();
    }, 200);
  }

  function updatePostMapMarker(lat, lng) {
    if (!postMapInstance || !postMapMarker) {
      return;
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return;
    }
    postMapMarker.setLatLng([latNum, lngNum]);
    postMapInstance.setView([latNum, lngNum], Math.max(postMapInstance.getZoom(), 12));
    // Mettre à jour l'affichage des coordonnées
    const latStr = latNum.toFixed(6);
    const lngStr = lngNum.toFixed(6);
    postLat.value = latStr;
    postLng.value = lngStr;
    document.getElementById('coordsLat').textContent = latStr;
    document.getElementById('coordsLng').textContent = lngStr;
  }

  async function reverseGeocode(lat, lng) {
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);

      if (!response.ok) {
        return null;
      }

      const result = await response.json();

      if (result.status === 'success' && result.data && result.data.city) {
        return result.data.city;
      }

      return null;
    } catch (error) {
      appLogger.error('Erreur reverse geocoding:', error);
      return null;
    }
  }

  async function updateCityFromCoords(lat, lng) {
    const postAddress = document.getElementById('postAddress');
    if (!postAddress) {
      return;
    }

    // Debounce pour éviter trop d'appels API
    if (reverseGeocodeTimer) {
      clearTimeout(reverseGeocodeTimer);
    }

    reverseGeocodeTimer = setTimeout(async () => {
      const city = await reverseGeocode(lat, lng);
      if (city) {
        postAddress.value = city;
      }
    }, 1000); // Attendre 1 seconde après le dernier mouvement
  }

  async function requestUserLocation() {
    if (!navigator.geolocation) {
      showToast('Géolocalisation non supportée');
      return;
    }
    postUseLocation.disabled = true;
    postUseLocation.textContent = 'Recherche…';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      const { latitude, longitude } = position.coords;
      postLat.value = latitude.toFixed(6);
      postLng.value = longitude.toFixed(6);
      updatePostMapMarker(latitude, longitude);
      updateCityFromCoords(latitude.toFixed(6), longitude.toFixed(6));
      showToast('Position détectée ✅');
      queueDraftSave();
    } catch (error) {
      showToast('Impossible d’obtenir la position');
    } finally {
      postUseLocation.disabled = false;
      postUseLocation.textContent = '📍 Utiliser ma position';
    }
  }

  async function uploadImages(files) {
    const results = [];
    for (const file of files) {
      results.push({ url: file.preview, name: file.file?.name || 'image' });
    }
    return results;
  }

  // Load ad data for editing
  async function loadAdDataForEdit(adId) {
    try {
      // Ne pas incrémenter les vues lors du chargement pour édition
      const response = await api.get(`/api/ads/${adId}?skipView=true`);
      const adData = response?.data?.ad || response?.data || response;
      if (adData) {
        populateFormWithAdData(adData);
      }
    } catch (error) {
      appLogger.error('Error loading ad for edit:', error);
      showToast("Erreur lors du chargement de l'annonce");
      closePostModal({ reset: true });
    }
  }

  // Populate form with ad data
  function populateFormWithAdData(ad) {
    if (!ad) {
      return;
    }

    // Basic fields
    if (ad.title) {
      postTitleInput.value = ad.title;
    }
    if (ad.category) {
      postCategory.value = ad.category;
      buildAttributesForm(ad.category);
    }
    if (ad.condition) {
      postCondition.value = ad.condition;
    }

    // Restore transaction type for immobilier category
    if (ad.category === 'immobilier' && ad.transactionType && postTransactionType) {
      postTransactionType.value = ad.transactionType;
    }

    if (ad.price != null) {
      postPrice.value = ad.price;
    }
    if (ad.description) {
      postDescription.value = ad.description;
    }

    // Location - accept both raw API shape (locationText/location) and mapped shape (city/latlng/coords)
    const addressValue = ad.locationText || ad.city || '';
    if (addressValue) {
      postAddress.value = addressValue;
    }
    let lat = null;
    let lng = null;
    if (ad.location?.coordinates && Array.isArray(ad.location.coordinates)) {
      // Raw API shape
      [lng, lat] = ad.location.coordinates;
    } else if (ad.coords?.coordinates && Array.isArray(ad.coords.coordinates)) {
      // Older/mapped variant
      [lng, lat] = ad.coords.coordinates;
    } else if (Array.isArray(ad.latlng) && ad.latlng.length === 2) {
      // Mapped mini shape from mapAdFromApi()
      [lat, lng] = ad.latlng;
    }
    if (lat != null && lng != null) {
      postLat.value = lat;
      postLng.value = lng;
      initPostMap();
      if (postMapMarker && postMapInstance) {
        postMapMarker.setLatLng([lat, lng]);
        postMapInstance.setView([lat, lng], 13);
      }
    }

    // Attributes
    if (ad.attributes) {
      Object.keys(ad.attributes).forEach((key) => {
        const input = document.getElementById(`attr-${key}`);
        if (input) {
          const value = ad.attributes[key];
          if (input.type === 'checkbox') {
            input.checked = value === true || value === 'true';
          } else {
            input.value = value;
          }
        }
      });
    }

    // Images - convert URLs to photo objects
    let sourceImages = [];
    if (Array.isArray(ad.images) && ad.images.length) {
      sourceImages = ad.images;
    } else if (Array.isArray(ad.gallery) && ad.gallery.length) {
      sourceImages = ad.gallery;
    }
    if (sourceImages.length) {
      postPhotos = sourceImages.map((url, index) => ({
        file: null,
        url,
        preview: url,
        isExisting: true,
        index
      }));
      renderPhotoList();
    }

    updateDescriptionCount();

    // Stocker l'original pour comparaison lors du PATCH
    if (editMode) {
      originalAdData = ad;
    }
  }

  // Open modal in edit mode
  async function openEditModal(adId) {
    if (!adId) {
      return;
    }
    openPostModal({ adId });
  }

  // Expose to window for profile modal
  window.openEditModal = openEditModal;

  async function submitPost(event) {
    event.preventDefault();
    if (postIsSubmitting) {
      return;
    }
    if (!validatePostForm()) {
      return;
    }
    postIsSubmitting = true;
    postSubmit.classList.add('loading');
    postStatus.textContent = editMode ? 'Mise à jour en cours…' : 'Publication en cours…';

    try {
      // Handle images: separate existing URLs from new files to upload
      const existingImages = postPhotos.filter((p) => p.isExisting && p.url).map((p) => p.url);
      const newPhotosToUpload = postPhotos.filter((p) => !p.isExisting && p.file);

      // Upload new images
      const uploaded = await uploadImages(newPhotosToUpload);
      const payload = collectPostPayload();

      // --- Ajustements spécifiques à l'édition pour éviter 422 (validation stricte) ---
      if (editMode) {
        // Nettoyer les attributs: retirer valeurs nulles/vides
        if (payload.attributes && typeof payload.attributes === 'object') {
          Object.keys(payload.attributes).forEach((key) => {
            const val = payload.attributes[key];
            if (val == null || val === '') {
              delete payload.attributes[key];
            }
          });
          if (!Object.keys(payload.attributes).length) {
            delete payload.attributes; // supprime entièrement pour contourner la validation des attributs
          }
        }
        // Si catégorie inchangée et aucun attribut envoyé => supprimer category pour ignorer le custom validator
        if (
          originalAdData &&
          originalAdData.category &&
          payload.category === originalAdData.category &&
          !payload.attributes
        ) {
          delete payload.category;
        }
        // Localisation: si inchangée, ne pas renvoyer (pour réduire les champs soumis)
        if (
          originalAdData &&
          originalAdData.locationText === payload.locationText &&
          originalAdData.location?.coordinates &&
          Array.isArray(originalAdData.location.coordinates) &&
          originalAdData.location.coordinates.length === 2
        ) {
          const [origLng, origLat] = originalAdData.location.coordinates;
          const latMatch = Number(origLat).toFixed(6) === Number(payload.latitude).toFixed(6);
          const lngMatch = Number(origLng).toFixed(6) === Number(payload.longitude).toFixed(6);
          if (latMatch && lngMatch) {
            delete payload.locationText;
            delete payload.latitude;
            delete payload.longitude;
          }
        }
      }

      // Combine existing and new image URLs
      payload.images = [...existingImages, ...uploaded.map((item) => item.url)];

      if (payload.images.length === 0) {
        throw new Error('Ajoutez au moins une photo avant de publier.');
      }
      let response;
      if (editMode && editingAdId) {
        // Update existing ad
        response = await api.patch(`/api/ads/${editingAdId}`, payload, {
          headers: { 'Content-Type': 'application/json' }
        });
        showToast(response?.message || 'Annonce mise à jour ✅');
      } else {
        // Create new ad
        response = await api.post('/api/ads', payload, {
          headers: { 'Content-Type': 'application/json' }
        });
        showToast(response?.message || 'Annonce publiée ✅');
        discardDraft();
      }

      const serverAd =
        response?.data?.ad || response?.ad || response?.data?.data?.ad || response?.updatedAd;
      if (serverAd) {
        integrateServerAd(serverAd, { preserveScroll: currentView === 'list' });
      }

      await loadAds({ toastOnError: false });
      document.dispatchEvent(
        new CustomEvent('profile:invalidate-cache', {
          detail: {
            reason: editMode ? 'ad-updated' : 'ad-created'
          }
        })
      );
      closePostModal({ reset: true });
      editMode = false;
      editingAdId = null;
      postStatus.textContent = '';
    } catch (error) {
      appLogger.error('Post error', error);
      const message =
        error?.payload?.message || error?.message || 'Impossible de publier l’annonce.';
      postStatus.textContent = message;
      showToast(message);
    } finally {
      postIsSubmitting = false;
      postSubmit.classList.remove('loading');
    }
  }

  // Preview function
  function showPreview() {
    const payload = collectPostPayload();
    const auth = authStore.get();
    const rawImages = Array.isArray(payload.images) && payload.images.length ? payload.images : [];
    const previewImages = rawImages.length ? rawImages : [DEFAULT_IMAGE];
    const categoryConfig = getCategoryConfig(payload.category);
    const categoryLabel = categoryConfig?.label || normalizeLabel(payload.category, 'Autres');
    const categorySlug = categoryConfig?.slug || mapCategoryLabelToSlug(payload.category);
    const conditionSlug = payload.condition || 'good';
    const conditionLabel = CONDITION_LABELS[conditionSlug] || capitalize(conditionSlug);
    const locationText = payload.locationText || 'Localisation à préciser';
    const latitude = Number.isFinite(payload.latitude) ? payload.latitude : 36.8065;
    const longitude = Number.isFinite(payload.longitude) ? payload.longitude : 10.1815;
    let chips = buildChipsFromAttributes(payload.category, payload.attributes);
    if (!chips.length) {
      chips = [categoryLabel, conditionLabel, fmtPrice(payload.price)];
    }

    // Create a preview ad object matching the detail modal structure
    const previewAd = {
      id: 'preview-temp-id',
      _id: 'preview-temp-id',
      title: payload.title || 'Votre annonce',
      desc: payload.description,
      category: payload.category || '',
      catSlug: categorySlug || payload.category || 'autres',
      cat: categoryLabel,
      condition: conditionSlug,
      state: conditionLabel,
      price: Number.isFinite(payload.price) ? payload.price : 0,
      city: locationText.split(',')[0]?.trim() || 'Tunisie',
      locationText,
      latlng: [latitude, longitude],
      coords: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      status: 'active',
      views: 0,
      likes: 0,
      favorites: 0,
      favoritesCount: 0,
      contacts: 0,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      img: previewImages[0],
      gallery: previewImages,
      attributes: payload.attributes || {},
      chips,
      owner: auth?._id || 'preview-user',
      ownerId: auth?._id || 'preview-user',
      sellerName: auth?.name || 'Votre nom',
      sellerEmail: auth?.email || 'votre@email.com',
      sellerAvatar: auth?.avatar || DEFAULT_AVATAR,
      sellerMemberSince: auth?.createdAt || new Date().toISOString(),
      sellerAnnouncements: auth?.stats?.activeAds || 1,
      __preview: true // Flag to indicate this is a preview
    };

    // Close post modal
    setPostModalHidden(true);

    // Add preview banner to details modal
    setTimeout(() => {
      openDetailsModal(previewAd);

      // Add a preview banner at the top of the details modal
      const detailsBody = document.getElementById('detailsBody');
      if (detailsBody) {
        let previewBanner = document.getElementById('previewBanner');
        if (!previewBanner) {
          previewBanner = document.createElement('div');
          previewBanner.id = 'previewBanner';
          previewBanner.style.cssText = `
              position: sticky;
              top: 0;
              z-index: 100;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px 20px;
              border-radius: 0 0 12px 12px;
              margin: -20px -20px 20px -20px;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            `;
          previewBanner.innerHTML = `
              <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <div>
                  <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">Mode Prévisualisation</div>
                  <div style="font-size: 13px; opacity: 0.9;">Voici comment votre annonce apparaîtra aux acheteurs</div>
                </div>
              </div>
              <button type="button" id="closePreview" style="
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
                white-space: nowrap;
              " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Retour à l'édition
              </button>
            `;
          detailsBody.prepend(previewBanner);

          // Add click handler for close preview button
          document.getElementById('closePreview')?.addEventListener('click', () => {
            closeDetailsModal();
            setTimeout(() => {
              setPostModalHidden(false);
            }, 100);
          });
        }
      }

      // Hide contact button in preview mode
      const contactTrigger = document.getElementById('contactTrigger');
      if (contactTrigger) {
        contactTrigger.style.display = 'none';
      }

      // Add a note about contact being disabled in preview
      const detailsActions = document.querySelector('.details-actions');
      if (detailsActions && !document.getElementById('previewContactNote')) {
        const note = document.createElement('div');
        note.id = 'previewContactNote';
        note.style.cssText = `
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.3);
            color: #667eea;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
          `;
        note.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Le bouton de contact sera actif une fois l'annonce publiée
          `;
        detailsActions.appendChild(note);
      }
    }, 100);
  }

  postBtn?.addEventListener('click', () => openPostModal());
  closePostBtn?.addEventListener('click', () => closePostModal({ reset: false }));
  postCancel?.addEventListener('click', () => closePostModal({ reset: false }));
  postPreview?.addEventListener('click', () => {
    if (!validatePostForm()) {
      showToast('⚠️ Veuillez remplir tous les champs requis');
      return;
    }
    showPreview();
  });
  postSaveDraft?.addEventListener('click', () => {
    const payload = collectPostPayload();
    saveDraft({ ...payload, photos: postPhotos.map((p) => p.preview) });
    postStatus.textContent = 'Brouillon enregistré ✔';
    setTimeout(() => (postStatus.textContent = ''), 2000);
  });
  postForm?.addEventListener('submit', submitPost);

  postCategory?.addEventListener('change', () => {
    buildAttributesForm(postCategory.value);
    queueDraftSave();
  });
  [postTitleInput, postCondition, postPrice, postAddress, postLat, postLng].forEach((input) => {
    input?.addEventListener('input', () => {
      if (input === postLat || input === postLng) {
        updatePostMapMarker(postLat.value, postLng.value);
      }
      queueDraftSave();
    });
  });
  postDescription?.addEventListener('input', () => {
    updateDescriptionCount();
    queueDraftSave();
  });
  postPhotosInput?.addEventListener('change', async (event) => {
    setFieldError('postPhotos', '');
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    const remainingSlots = MAX_IMAGES - postPhotos.length;
    const selection = files.slice(0, remainingSlots);
    for (const file of selection) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast(`Format non supporté: ${file.name}`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        showToast(`${file.name} dépasse 8 Mo`);
        continue;
      }
      const preview = await readFilePreview(file);
      postPhotos.push({ file, preview });
    }
    renderPhotoList();
    queueDraftSave();
    postPhotosInput.value = '';
  });

  postPhotosList?.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.uploader-remove');
    if (!removeBtn) {
      return;
    }
    const index = Number(removeBtn.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    postPhotos.splice(index, 1);
    renderPhotoList();
    queueDraftSave();
  });

  postUseLocation?.addEventListener('click', () => requestUserLocation());

  postModal?.addEventListener('click', (event) => {
    if (event.target === postModal) {
      closePostModal({ reset: false });
    }
  });

  postDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePostModal({ reset: false });
    }
  });

  postDraftResume?.addEventListener('click', () => {
    const draft = loadDraft();
    if (draft) {
      restoreDraft(draft);
      postDraftBanner.hidden = true;
    }
  });

  postDraftDiscard?.addEventListener('click', () => {
    discardDraft();
    postDraftBanner.hidden = true;
  });

  async function readFilePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- DETAILS MODAL ----------
  const detailsModal = document.getElementById('detailsModal');
  const detailsDialog = document.getElementById('detailsDialog');
  const closeDetailsBtn = document.getElementById('closeDetails');
  const shareDetailsBtn = document.getElementById('shareDetails');
  const detailsCarouselTrack = document.getElementById('detailsCarouselTrack');
  const detailsCarouselDots = document.getElementById('detailsCarouselDots');
  const detailsPrev = document.getElementById('detailsPrev');
  const detailsNext = document.getElementById('detailsNext');
  const detailsImageCounter = document.getElementById('detailsImageCounter');
  const detailsSkeleton = document.getElementById('detailsSkeleton');
  const detailsTitleEl = document.getElementById('detailsTitle');
  const detailsPriceEl = document.getElementById('detailsPrice');
  const detailsMeta = document.getElementById('detailsMeta');
  const detailsDescEl = document.getElementById('detailsDesc');
  const detailsReadMore = document.getElementById('detailsReadMore');
  const detailsSeller = document.getElementById('detailsSeller');
  let detailsSave = document.getElementById('detailsSave');
  const detailsContact = document.getElementById('detailsContact');
  const contactPopover = document.getElementById('contactPopover');
  const contactAnchor = document.getElementById('sellerCardWrap');
  const contactMessage = document.getElementById('cpMessage');
  const contactCloseBtn = document.getElementById('cpClose');
  const contactCancelBtn = document.getElementById('cpCancel');
  const contactSendBtn = document.getElementById('cpSend');
  const contactCounter = document.getElementById('cpCounter');
  const contactError = document.getElementById('cpError');
  const detailsVisitBtn = document.getElementById('detailsVisit');
  const detailsActionsContainer = document.querySelector('.details-actions');
  const detailsTags = document.getElementById('detailsTags');
  const detailsBodyEl = document.querySelector('.details-body');
  const imageLightbox = document.getElementById('imageLightbox');
  const lightboxDialog = imageLightbox?.querySelector('.lightbox__dialog');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitleEl = document.getElementById('lightboxTitle');
  const lightboxCounterEl = document.getElementById('lightboxCounter');
  const lightboxPrev = imageLightbox?.querySelector('[data-action="prev"]');
  const lightboxNext = imageLightbox?.querySelector('[data-action="next"]');
  const lightboxCloseBtn = imageLightbox?.querySelector('[data-action="close"]');
  const lightboxBackdrop = imageLightbox?.querySelector('[data-action="dismiss"]');

  let detailsCurrentImages = [];
  let detailsCurrentIndex = 0;
  let detailsCurrentAd = null;
  let detailsDescFull = '';
  let detailsDescExpanded = false;
  let detailsSkeletonTimeout = null;
  const deepLinkSkeletonSkipQueue = new Map();
  function queueSkeletonSkipForAd(adId, passes = 1) {
    const normalized = normalizeAdId(adId);
    if (!normalized || passes <= 0) {
      return;
    }
    deepLinkSkeletonSkipQueue.set(normalized, passes);
  }
  function consumeSkeletonSkipForAd(adId) {
    const normalized = normalizeAdId(adId);
    if (!normalized) {
      return false;
    }
    if (!deepLinkSkeletonSkipQueue.has(normalized)) {
      return false;
    }
    const remaining = deepLinkSkeletonSkipQueue.get(normalized) - 1;
    if (remaining > 0) {
      deepLinkSkeletonSkipQueue.set(normalized, remaining);
    } else {
      deepLinkSkeletonSkipQueue.delete(normalized);
    }
    return true;
  }
  function clearSkeletonSkipForAd(adId) {
    const normalized = normalizeAdId(adId);
    if (!normalized) {
      return;
    }
    deepLinkSkeletonSkipQueue.delete(normalized);
  }
  let lightboxActive = false;
  let lightboxLastFocus = null;
  let contactPopoverTimer = null;
  let contactTrapActive = false;
  let contactLastFocus = null;
  let contactSending = false;
  let contactCooldownUntil = 0;
  const CONTACT_MAX_LENGTH = 500;
  const CONTACT_COOLDOWN_MS = 3000;
  const CONTACT_FOCUS_SELECTOR =
    'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
  let pendingDeepLinkAdId = null;
  let activeDeepLinkAdId = null;
  let deepLinkOpening = false;

  function buildGallery(ad) {
    const sources = Array.isArray(ad.gallery) && ad.gallery.length ? ad.gallery : [ad.img];
    return sources.map((url, index) =>
      buildOptimizedImage(url, index === 0 ? 960 : 1280, index === 0 ? 75 : 70)
    );
  }

  function renderGallery(images, title) {
    if (detailsSkeletonTimeout) {
      clearTimeout(detailsSkeletonTimeout);
      detailsSkeletonTimeout = null;
    }
    const currentItemId = detailsDialog?.dataset?.itemId;
    const shouldSkipSkeleton = consumeSkeletonSkipForAd(currentItemId);
    if (!shouldSkipSkeleton) {
      detailsSkeleton.classList.add('active');
      detailsSkeletonTimeout = setTimeout(() => {
        detailsSkeleton.classList.remove('active');
        detailsSkeletonTimeout = null;
      }, 1500);
    } else {
      detailsSkeleton.classList.remove('active');
    }
    detailsCarouselTrack.innerHTML = '';
    detailsCarouselDots.innerHTML = '';
    let firstLoaded = false;
    images.forEach((src, index) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      if (index === 0) {
        slide.classList.add('active');
      }
      slide.dataset.index = String(index);
      slide.setAttribute('role', 'button');
      slide.setAttribute('aria-label', `Agrandir l'image ${index + 1}`);
      slide.tabIndex = index === 0 ? 0 : -1;
      slide.addEventListener('click', () => openLightbox(index));
      slide.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          openLightbox(index);
        }
      });
      const img = document.createElement('img');
      img.decoding = 'async';
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.alt = `${title} - photo ${index + 1}`;
      img.src = buildOptimizedImage(src, index === 0 ? 960 : 1280, 75);
      img.srcset = buildSrcSet(src, [640, 960, 1280], 75);
      img.sizes = '(max-width: 768px) 92vw, min(640px, 60vw)';
      img.width = 960;
      img.height = 720;
      img.style.aspectRatio = '4 / 3';
      img.addEventListener('load', () => {
        if (!firstLoaded) {
          if (detailsSkeletonTimeout) {
            clearTimeout(detailsSkeletonTimeout);
            detailsSkeletonTimeout = null;
          }
          firstLoaded = true;
          if (!shouldSkipSkeleton) {
            detailsSkeleton.classList.remove('active');
          }
        }
      });
      slide.appendChild(img);
      detailsCarouselTrack.appendChild(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      if (index === 0) {
        dot.classList.add('active');
      }
      dot.setAttribute('aria-label', `Voir l'image ${index + 1}`);
      dot.addEventListener('click', () => goToSlide(index));
      detailsCarouselDots.appendChild(dot);
    });
    if (!images.length) {
      if (detailsSkeletonTimeout) {
        clearTimeout(detailsSkeletonTimeout);
        detailsSkeletonTimeout = null;
      }
      detailsSkeleton.classList.remove('active');
    }
    updateCarouselUI();
  }

  function updateCarouselUI() {
    const slides = Array.from(detailsCarouselTrack.children);
    slides.forEach((slide, idx) => {
      const isActive = idx === detailsCurrentIndex;
      slide.classList.toggle('active', isActive);
      if (isActive) {
        slide.setAttribute('tabindex', '0');
      } else {
        slide.setAttribute('tabindex', '-1');
      }
    });
    const dots = Array.from(detailsCarouselDots.children);
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === detailsCurrentIndex));
    const total = detailsCurrentImages.length || 1;
    detailsImageCounter.textContent = `${Math.min(detailsCurrentIndex + 1, total)} / ${total}`;
    const multiple = detailsCurrentImages.length > 1;
    detailsPrev.style.visibility = multiple ? 'visible' : 'hidden';
    detailsNext.style.visibility = multiple ? 'visible' : 'hidden';
    detailsCarouselDots.style.display = multiple ? 'flex' : 'none';
  }

  function normalizeIndex(index, total) {
    if (!Number.isFinite(index) || total <= 0) {
      return 0;
    }
    const normalized = index % total;
    return (normalized + total) % total;
  }

  function changeSlide(delta) {
    if (!detailsCurrentImages.length) {
      return;
    }
    detailsCurrentIndex = normalizeIndex(detailsCurrentIndex + delta, detailsCurrentImages.length);
    updateCarouselUI();
  }

  function goToSlide(index) {
    if (!detailsCurrentImages.length) {
      return;
    }
    detailsCurrentIndex = normalizeIndex(index, detailsCurrentImages.length);
    updateCarouselUI();
  }

  function applyDetailsContent(
    ad,
    { replaceGallery = true, gallery: providedGallery = null } = {}
  ) {
    if (!ad) {
      return;
    }
    const gallery = providedGallery ?? buildGallery(ad);
    const totalImages = gallery.length || 0;
    const wasLightboxActive = lightboxActive;

    detailsCurrentAd = ad;
    detailsDialog.dataset.itemId = String(ad.id ?? '');
    updateShareButtonState(ad);

    detailsTitleEl.textContent = ad.title;
    detailsPriceEl.innerHTML = `<strong>${fmtPrice(ad.price)}</strong>`;
    renderDetailsMeta(ad);
    updateDetailsStats(ad);
    renderDetailsTags(ad);
    const nextDesc = ad.desc || '';
    if (replaceGallery || nextDesc !== detailsDescFull) {
      setDetailsDescription(nextDesc);
    } else {
      updateDescription();
    }
    renderSeller(ad);
    updateDetailsActions(ad);

    if (replaceGallery) {
      detailsCurrentImages = gallery;
      detailsCurrentIndex = 0;
      renderGallery(gallery, ad.title);
    } else {
      const previousIndex = detailsCurrentIndex;
      detailsCurrentImages = gallery;
      const safeIndex = gallery.length ? normalizeIndex(previousIndex, gallery.length) : 0;
      detailsCurrentIndex = safeIndex;
      updateCarouselUI();
      if (wasLightboxActive) {
        updateLightboxView();
      } else if (lightboxTitleEl) {
        lightboxTitleEl.textContent = ad.title || 'Photo';
        if (lightboxCounterEl) {
          const displayTotal = gallery.length || 1;
          lightboxCounterEl.textContent = `${Math.min(detailsCurrentIndex + 1, displayTotal)}/${displayTotal}`;
        }
      }
    }

    if (lightboxImage && !wasLightboxActive) {
      const displayTotal = totalImages || 1;
      lightboxImage.alt = `${ad.title || 'Photo'} — ${Math.min(detailsCurrentIndex + 1, displayTotal)} / ${displayTotal}`;
    }

    setDetailsLoading(false);
  }

  function getCurrentAdQueryParam() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('ad');
    } catch (_error) {
      return null;
    }
  }

  function clearAdQueryParamIfNeeded({ force = false } = {}) {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('ad')) {
        activeDeepLinkAdId = null;
        return;
      }
      const currentParam = normalizeAdId(url.searchParams.get('ad'));
      if (!force && activeDeepLinkAdId && currentParam && currentParam !== activeDeepLinkAdId) {
        return;
      }
      url.searchParams.delete('ad');
      const search = url.searchParams.toString();
      const nextUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
      window.history.replaceState({}, '', nextUrl);
      activeDeepLinkAdId = null;
    } catch (error) {
      appLogger.warn?.('clearAdQueryParamIfNeeded failed', error);
      activeDeepLinkAdId = null;
    }
  }

  function updateShareButtonState(ad) {
    if (!shareDetailsBtn) {
      return;
    }
    const normalizedId = normalizeAdId(ad?.id);
    if (!normalizedId) {
      shareDetailsBtn.disabled = true;
      shareDetailsBtn.removeAttribute('data-share-url');
      shareDetailsBtn.setAttribute('aria-label', 'Lien de partage indisponible');
      shareDetailsBtn.title = 'Lien de partage indisponible';
      return;
    }
    const shareUrl = buildAdShareUrl(normalizedId);
    shareDetailsBtn.disabled = false;
    shareDetailsBtn.dataset.shareUrl = shareUrl;
    shareDetailsBtn.setAttribute('aria-label', 'Partager cette annonce');
    shareDetailsBtn.title = 'Partager cette annonce';
  }

  function buildAdShareUrl(adId) {
    const normalized = normalizeAdId(adId);
    if (!normalized) {
      return '';
    }
    try {
      const origin =
        window.location.origin || `${window.location.protocol}//${window.location.host}`;
      const base = new URL(window.location.pathname || '/', origin);
      base.search = '';
      base.searchParams.set('ad', normalized);
      base.hash = '';
      return base.toString();
    } catch (error) {
      appLogger.warn?.('buildAdShareUrl fallback', error);
      const origin = window.location.origin || '';
      return `${origin || ''}/?ad=${encodeURIComponent(normalized)}`;
    }
  }

  async function copyShareLink(value) {
    if (!value) {
      throw new Error('Missing share URL');
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!success) {
      throw new Error('execCommand copy failed');
    }
  }

  async function handleShareDetailsClick() {
    if (!shareDetailsBtn || shareDetailsBtn.disabled) {
      return;
    }
    if (!detailsCurrentAd) {
      showToast('Annonce introuvable');
      return;
    }
    const normalizedId = normalizeAdId(detailsCurrentAd.id);
    if (!normalizedId) {
      showToast('Lien de partage indisponible');
      return;
    }
    const shareUrl = shareDetailsBtn.dataset.shareUrl || buildAdShareUrl(normalizedId);
    if (!shareUrl) {
      showToast('Lien de partage indisponible');
      return;
    }
    shareDetailsBtn.setAttribute('aria-busy', 'true');
    shareDetailsBtn.disabled = true;
    try {
      if (typeof navigator?.share === 'function') {
        try {
          await navigator.share({
            title: detailsCurrentAd.title || 'Annonce MapMarket',
            text: detailsCurrentAd.desc?.slice?.(0, 120) || 'Découvrez cette annonce sur MapMarket',
            url: shareUrl
          });
          showToast('Lien prêt à être partagé ✨');
          return;
        } catch (shareError) {
          if (shareError?.name === 'AbortError') {
            return;
          }
          appLogger.warn?.('navigator.share failed, fallback to copy', shareError);
        }
      }
      await copyShareLink(shareUrl);
      showToast('Lien copié dans le presse-papiers 📋');
    } catch (error) {
      appLogger.error('handleShareDetailsClick error', error);
      showToast('Impossible de partager ce lien pour le moment');
    } finally {
      shareDetailsBtn.removeAttribute('aria-busy');
      shareDetailsBtn.disabled = false;
    }
  }

  function refreshOpenDetails(ad) {
    if (!ad || !detailsModal || detailsModal.style.display !== 'flex') {
      return;
    }
    const currentId = normalizeAdId(detailsDialog?.dataset?.itemId);
    const nextId = normalizeAdId(ad.id);
    if (!currentId || currentId !== nextId) {
      return;
    }
    const nextGallery = buildGallery(ad);
    const shouldReplace = !arraysShallowEqual(detailsCurrentImages, nextGallery);
    applyDetailsContent(ad, { replaceGallery: shouldReplace, gallery: nextGallery });
  }

  function getLightboxFocusables() {
    if (!imageLightbox) {
      return [];
    }
    return Array.from(imageLightbox.querySelectorAll('button:not([disabled])')).filter((el) => {
      if (!el) {
        return false;
      }
      if (typeof el.offsetParent === 'undefined') {
        return true;
      }
      return el.offsetParent !== null && el.tabIndex !== -1;
    });
  }

  function updateLightboxView() {
    if (!lightboxActive || !detailsCurrentImages.length || !lightboxImage) {
      return;
    }
    const total = detailsCurrentImages.length;
    const index = normalizeIndex(detailsCurrentIndex, total);
    detailsCurrentIndex = index;
    const baseSrc = detailsCurrentImages[index];
    const hdSrc = buildOptimizedImage(baseSrc, 1600, 82);
    const setImagePayload = () => {
      lightboxImage.src = hdSrc;
      lightboxImage.srcset = buildSrcSet(baseSrc, [1024, 1280, 1600, 1920], 82);
      lightboxImage.sizes = '(min-width: 1024px) 70vw, 92vw';
    };
    lightboxImage.removeAttribute('src');
    lightboxImage.removeAttribute('srcset');
    lightboxImage.removeAttribute('sizes');
    lightboxImage.alt = `${detailsCurrentAd?.title || 'Photo'} — ${index + 1} / ${total}`;
    lightboxImage.style.cursor = total > 1 ? 'pointer' : 'default';
    if (lightboxTitleEl) {
      lightboxTitleEl.textContent = detailsCurrentAd?.title || 'Photo';
    }
    if (lightboxCounterEl) {
      lightboxCounterEl.textContent = `${index + 1}/${total}`;
    }
    requestAnimationFrame(setImagePayload);
    if (lightboxPrev) {
      const visible = total > 1;
      lightboxPrev.style.visibility = visible ? 'visible' : 'hidden';
      lightboxPrev.tabIndex = visible ? 0 : -1;
      lightboxPrev.setAttribute('aria-hidden', String(!visible));
      lightboxPrev.disabled = !visible;
    }
    if (lightboxNext) {
      const visible = total > 1;
      lightboxNext.style.visibility = visible ? 'visible' : 'hidden';
      lightboxNext.tabIndex = visible ? 0 : -1;
      lightboxNext.setAttribute('aria-hidden', String(!visible));
      lightboxNext.disabled = !visible;
    }
    if (lightboxDialog) {
      lightboxDialog.setAttribute('aria-label', detailsCurrentAd?.title || 'Image agrandie');
    }
    if (lightboxActive) {
      const slides = detailsCarouselTrack?.children;
      if (slides && slides[detailsCurrentIndex]) {
        lightboxLastFocus = slides[detailsCurrentIndex];
      }
    }
  }

  function openLightbox(index = 0) {
    if (!imageLightbox || !detailsCurrentImages.length) {
      return;
    }
    const targetIndex = normalizeIndex(
      Number.isFinite(index) ? index : 0,
      detailsCurrentImages.length
    );
    goToSlide(targetIndex);
    lightboxActive = true;
    lightboxLastFocus = document.activeElement;
    imageLightbox.hidden = false;
    imageLightbox.classList.add('is-open');
    imageLightbox.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    updateLightboxView();
    requestAnimationFrame(() => lightboxDialog?.focus?.({ preventScroll: true }));
  }

  function closeLightbox(options = {}) {
    if (!lightboxActive || !imageLightbox) {
      return;
    }
    const { restoreFocus = true } = options;
    lightboxActive = false;
    detailsCurrentIndex = 0;
    imageLightbox.classList.remove('is-open');
    imageLightbox.setAttribute('aria-hidden', 'true');
    lightboxPrev?.blur();
    lightboxNext?.blur();
    lightboxCloseBtn?.blur();
    setTimeout(() => {
      if (!lightboxActive) {
        imageLightbox.hidden = true;
      }
    }, 200);
    unlockBodyScroll();
    updateCarouselUI();
    if (restoreFocus && lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') {
      lightboxLastFocus.focus({ preventScroll: true });
    }
    lightboxLastFocus = null;
  }

  function categorySymbol(cat) {
    const slug = mapCategoryLabelToSlug(cat);
    return CATEGORY_ICONS[slug] || '📦';
  }

  function getTransactionTypeIcon(transactionType, { extraClass = '' } = {}) {
    if (!transactionType) {
      return '';
    }

    const iconPath =
      transactionType === 'vente' ? '/icons/maison-a-vendre.svg' : '/icons/maison-a-louer.svg';

    const label = transactionType === 'vente' ? 'À vendre' : 'À louer';
    const classes = ['transaction-icon'];
    if (extraClass) {
      classes.push(extraClass);
    }

    return `<img src="${iconPath}" alt="${label}" class="${classes.join(' ')}" loading="lazy" decoding="async" />`;
  }

  function renderDetailsMeta(ad) {
    const badges = [];
    badges.push(
      {
        class: 'location',
        text: ad.city || 'Localisation à préciser',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin w-3.5 h-3.5"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>'
      },
      {
        class: 'date',
        text: `Publiée le ${formatDateLong(ad.date)}`,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock w-3.5 h-3.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
      }
    );
    detailsMeta.innerHTML = badges
      .map((badge) => {
        return `<span class="details-meta-item ${badge.class} tag">${badge.icon}<span class="label">${badge.text}</span></span>`;
      })
      .join('');
  }

  function setDetailsLoading(isLoading) {
    if (!detailsDialog) {
      return;
    }
    detailsDialog.classList.toggle('is-loading', Boolean(isLoading));
    if (isLoading) {
      detailsDialog.setAttribute('aria-busy', 'true');
    } else {
      detailsDialog.removeAttribute('aria-busy');
    }
    const interactive = [detailsSave, detailsContact, detailsVisitBtn, detailsReadMore];
    interactive.forEach((node) => {
      if (!node) {
        return;
      }
      if (isLoading) {
        node.setAttribute('disabled', '');
        node.setAttribute('aria-disabled', 'true');
      } else {
        node.removeAttribute('disabled');
        node.removeAttribute('aria-disabled');
      }
    });
    if (isLoading && detailsSave) {
      detailsSave.dataset.id = '';
    }
  }

  function showDetailsLoadingState(id = null) {
    if (detailsSkeletonTimeout) {
      clearTimeout(detailsSkeletonTimeout);
      detailsSkeletonTimeout = null;
    }
    setDetailsLoading(true);
    detailsCurrentAd = null;
    detailsCurrentImages = [];
    detailsCurrentIndex = 0;
    detailsSkeleton.classList.add('active');
    detailsCarouselTrack.innerHTML = '';
    detailsCarouselDots.innerHTML = '';
    detailsImageCounter.textContent = '…';
    if (lightboxImage) {
      lightboxImage.removeAttribute('src');
      lightboxImage.removeAttribute('srcset');
      lightboxImage.removeAttribute('sizes');
      lightboxImage.alt = '';
    }
    detailsDialog.dataset.itemId = id ? String(id) : '';
    detailsTitleEl.innerHTML =
      '<span class="skeleton-line skeleton-line--lg" aria-hidden="true"></span>';
    detailsPriceEl.innerHTML =
      '<span class="skeleton-pill skeleton-pill--lg" aria-hidden="true"></span>';
    detailsMeta.innerHTML = [
      '<span class="skeleton-pill skeleton-pill--md" aria-hidden="true"></span>',
      '<span class="skeleton-pill skeleton-pill--sm" aria-hidden="true"></span>'
    ].join('');
    detailsDescFull = '';
    detailsDescExpanded = false;
    detailsDescEl.innerHTML = [
      '<span class="skeleton-line" aria-hidden="true"></span>',
      '<span class="skeleton-line skeleton-line--sm" aria-hidden="true"></span>',
      '<span class="skeleton-line skeleton-line--sm" aria-hidden="true"></span>'
    ].join('');
    detailsReadMore.classList.remove('visible');
    detailsTags.style.display = 'none';
    detailsTags.innerHTML = '';
    detailsSeller.innerHTML = `
        <div class="seller-skeleton" aria-hidden="true">
          <span class="skeleton-avatar"></span>
          <div class="seller-skeleton__lines">
            <span class="skeleton-line skeleton-line--sm"></span>
            <span class="skeleton-line skeleton-line--xs"></span>
            <span class="skeleton-line skeleton-line--xs"></span>
          </div>
        </div>
      `;
    resetContactForm();
    if (contactPopover && !contactPopover.hasAttribute('hidden')) {
      closeContactPopover({ immediate: true, restoreFocus: false });
    }
    setContactLoading(false);
    if (detailsModal.style.display !== 'flex') {
      if (detailsModal) {
        const activeEl = document.activeElement;
        detailsModal._lastTrigger = activeEl instanceof HTMLElement ? activeEl : null;
      }
      detailsModal.style.display = 'flex';
      detailsModal.classList.add('active');
      detailsModal.setAttribute('aria-hidden', 'false');
      lockBodyScroll();
      obscureMap();
      if (favModal?._stickyOpen && favList) {
        favModal._favScrollTop = favList.scrollTop || favModal._favScrollTop || 0;
      }
      const focusTarget = closeDetailsBtn || detailsDialog;
      setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 40);
    }
    if (detailsBodyEl) {
      detailsBodyEl.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }

  function arraysShallowEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  function updateDetailsStats(ad) {
    const statsRoot = detailsDialog.querySelector('.details-meta.details-meta-stats');
    const categoryRoot = detailsDialog.querySelector('.details-meta.details-meta-category');

    // Gérer la catégorie (à gauche)
    if (categoryRoot) {
      if (ad && ad.cat) {
        categoryRoot.innerHTML = `<div class="cat ${categoryClass(ad.catSlug || ad.cat)}">${categorySymbol(ad.catSlug || ad.cat)} <span>${ad.cat}</span></div>`;
        categoryRoot.style.display = 'inline-flex';
      } else {
        categoryRoot.innerHTML = '';
        categoryRoot.style.display = 'none';
      }
    }

    // Gérer les stats (à droite)
    if (!statsRoot) {
      return;
    }
    const stats = [];

    if (ad && typeof ad.views !== 'undefined') {
      stats.push(
        `<span class="details-meta-item views" aria-label="Nombre de vues"><span class="icon" aria-hidden="true">👁️</span><span class="label"><strong class="count">${ad.views}</strong> vues</span></span>`
      );
    }
    const favCountValue = ad && (ad.likes ?? ad.favorites);
    if (typeof favCountValue !== 'undefined') {
      stats.push(
        `<span class="details-meta-item fav-meta" aria-label="Nombre de favoris"><span class="icon" aria-hidden="true">❤️</span><span class="label"><strong class="count">${favCountValue}</strong> favoris</span></span>`
      );
    }
    statsRoot.innerHTML = stats.join('');
  }

  function buildDetailsTagItems(ad) {
    if (!ad) {
      return [];
    }
    const attrs = ad.attributes || {};
    const category = String(ad.catSlug || ad.category || '').toLowerCase();

    if (category === 'auto') {
      const items = [];
      if (attrs.year) {
        items.push({ type: 'year', label: String(attrs.year).trim() });
      }
      if (attrs.mileage != null && String(attrs.mileage).trim() !== '') {
        const mileageNumber = Number(attrs.mileage);
        const formattedMileage = Number.isFinite(mileageNumber)
          ? `${mileageNumber.toLocaleString('fr-FR')} km`
          : `${String(attrs.mileage).trim()}`;
        items.push({ type: 'mileage', label: formattedMileage });
      }
      if (attrs.fuel) {
        items.push({ type: 'fuel', label: capitalize(String(attrs.fuel)) });
      }
      if (attrs.gearbox) {
        items.push({ type: 'gearbox', label: capitalize(String(attrs.gearbox)) });
      }
      return items;
    }

    const chips = Array.isArray(ad.chips) ? ad.chips : [];
    return chips
      .map((label, index) => ({
        type: 'default',
        key: `chip-${index}`,
        label: typeof label === 'string' ? label : String(label ?? '')
      }))
      .filter((item) => item.label.trim().length);
  }

  function getDetailsTagIcon(type) {
    switch (type) {
      case 'year':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="4.5" width="18" height="16.5" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M3 9h18" stroke="currentColor" stroke-width="1.6" />
            <path d="M8 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        `;
      case 'mileage':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M12 13l3.2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M5 6.5l2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M19 6.5l-2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M12 6V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        `;
      case 'fuel':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3.5c-3 3-4.5 5.4-4.5 7.5a4.5 4.5 0 0 0 9 0c0-2.1-1.5-4.5-4.5-7.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18 6.5l2 2v7.5a2 2 0 0 1-2 2h-.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M7 21h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        `;
      case 'gearbox':
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 6v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M17 6v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M7 12h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M12 6v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="7" cy="6" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4" />
            <circle cx="17" cy="6" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4" />
            <circle cx="7" cy="18" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4" />
            <circle cx="17" cy="18" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4" />
          </svg>
        `;
      default:
        return `
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M12 8v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        `;
    }
  }

  function renderDetailsTags(ad) {
    const items = buildDetailsTagItems(ad);
    if (items.length) {
      detailsTags.style.display = 'flex';
      detailsTags.innerHTML = items
        .map((tag) => {
          const dataType = typeof tag.type === 'string' ? tag.type.toLowerCase().replace(/[^a-z0-9-]/g, '') : 'default';
          const label = escapeHtml(tag.label || '');
          const icon = getDetailsTagIcon(dataType || 'default');
          return `
            <span class="details-tag" data-tag-type="${dataType}" aria-label="${label}">
              <span class="details-tag__icon" aria-hidden="true">${icon}</span>
              <span class="details-tag__label">${label}</span>
            </span>
          `;
        })
        .join('');
    } else {
      detailsTags.style.display = 'none';
      detailsTags.innerHTML = '';
    }
  }

  function setDetailsDescription(desc) {
    detailsDescFull = desc || 'Aucune description fournie pour cette annonce.';
    detailsDescExpanded = false;
    updateDescription();
  }

  function updateDescription() {
    const limit = 220;
    if (detailsDescFull.length > limit && !detailsDescExpanded) {
      detailsDescEl.textContent = detailsDescFull.slice(0, limit) + '…';
      detailsReadMore.classList.add('visible');
      detailsReadMore.textContent = 'Lire la suite';
    } else {
      detailsDescEl.textContent = detailsDescFull;
      // Masquer le bouton une fois le texte complet affiché
      detailsReadMore.classList.remove('visible');
    }
  }

  function renderSeller(ad) {
    const avatarBase = ad.sellerAvatar || DEFAULT_AVATAR;

    // Si le vendeur est l'utilisateur connecté, utiliser l'avatar à jour depuis authStore
    const currentUser = window.authStore?.get();
    let sellerAvatarSrc = avatarBase;
    if (
      currentUser &&
      ad.ownerId &&
      String(currentUser._id) === String(ad.ownerId) &&
      currentUser.avatar
    ) {
      sellerAvatarSrc = window.getAvatarUrl(currentUser.avatar);
    }

    const avatarThumb = buildOptimizedImage(sellerAvatarSrc, 160, 60);
    const memberDate = ad.sellerMemberSince
      ? formatDateLong(ad.sellerMemberSince)
      : formatDateLong(ad.date);
    const activeCount = ad.sellerAnnouncements ?? 1;
    detailsSeller.innerHTML = `
        <img src="${avatarThumb}" alt="${ad.sellerName || 'Vendeur'}" loading="lazy" decoding="async" width="52" height="52" style="width:52px;height:52px;">
        <div class="seller-meta">
          <strong>${ad.sellerName || `Vendeur ${ad.city}`}</strong>
          <span>Membre depuis le ${memberDate}</span>
          <span>${activeCount} annonce(s) active(s)</span>
        </div>
      `;
  }

  function updateDetailsActions(ad) {
    if (!detailsActionsContainer) {
      return;
    }
    const currentUser = authStore.get();
    const isOwner = currentUser && ad.ownerId && String(currentUser._id) === String(ad.ownerId);
    const isPreview = ad && ad.__preview === true;

    if (isPreview) {
      // Boutons pour le mode prévisualisation (désactivés)
      detailsActionsContainer.innerHTML = `
          <button class="cta-outline" id="detailsSave" type="button" aria-label="Ajouter aux favoris" disabled style="opacity: 0.5; cursor: not-allowed;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path
                d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span>Ajouter aux favoris</span>
          </button>
          <button class="cta-primary" id="detailsContact" type="button" aria-label="Contacter le vendeur" disabled style="opacity: 0.5; cursor: not-allowed;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M22 12h-4" />
              <path d="M2 12h4" />
              <path d="M12 2v4" />
              <path d="M12 22v-4" />
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
            <span>Contacter</span>
          </button>
          <button class="cta-secondary" id="detailsVisit" type="button" aria-label="Voir sur la carte" disabled style="opacity: 0.5; cursor: not-allowed;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M12 19V6" />
              <path d="m5 12 7-7 7 7" />
            </svg>
            <span>Voir sur la carte</span>
          </button>
        `;
      // Pas d'événements attachés en mode preview car les boutons sont désactivés
    } else if (isOwner) {
      // Boutons pour le propriétaire
      detailsActionsContainer.innerHTML = `
          <button class="cta-primary" id="detailsEdit" type="button" aria-label="Modifier l'annonce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            <span>Modifier</span>
          </button>
          <button class="cta-outline danger" id="detailsDelete" type="button" aria-label="Supprimer l'annonce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Supprimer</span>
          </button>
          <button class="cta-secondary" id="detailsVisit" type="button" aria-label="Voir sur la carte">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M12 19V6" />
              <path d="m5 12 7-7 7 7" />
            </svg>
            <span>Voir sur la carte</span>
          </button>
        `;

      // Attacher les événements
      const editBtn = document.getElementById('detailsEdit');
      const deleteBtn = document.getElementById('detailsDelete');
      const visitBtn = document.getElementById('detailsVisit');

      detailsSave = document.getElementById('detailsSave');
      if (editBtn) {
        editBtn.addEventListener('click', () => handleEditAd(ad));
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDeleteAd(ad));
      }
      if (visitBtn) {
        visitBtn.addEventListener('click', handleDetailsVisit);
      }
    } else {
      // Boutons pour les visiteurs
      detailsActionsContainer.innerHTML = `
          <button class="cta-outline" id="detailsSave" type="button" aria-label="Ajouter aux favoris">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path
                d="M19 14c1.5-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span>Ajouter aux favoris</span>
          </button>
          <button class="cta-primary" id="detailsContact" type="button" aria-label="Contacter le vendeur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M22 12h-4" />
              <path d="M2 12h4" />
              <path d="M12 2v4" />
              <path d="M12 22v-4" />
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
            <span>Contacter</span>
          </button>
          <button class="cta-secondary" id="detailsVisit" type="button" aria-label="Voir sur la carte">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M12 19V6" />
              <path d="m5 12 7-7 7 7" />
            </svg>
            <span>Voir sur la carte</span>
          </button>
        `;

      // Réattacher les événements pour les visiteurs
      const saveBtn = document.getElementById('detailsSave');
      detailsSave = saveBtn;
      const contactBtn = document.getElementById('detailsContact');
      const visitBtn = document.getElementById('detailsVisit');

      if (saveBtn) {
        saveBtn.dataset.id = String(ad.id ?? '');
        // Normaliser l'ID pour la comparaison
        const adIdNormalized = normalizeAdId(ad.id);
        const isFav = favStore.has(adIdNormalized);

        setDetailsSaveState(isFav);
        saveBtn.addEventListener('click', handleDetailsSaveClick);
      }
      if (contactBtn) {
        contactBtn.addEventListener('click', openContactPopover);
      }
      if (visitBtn) {
        visitBtn.addEventListener('click', handleDetailsVisit);
      }
    }
  }

  function handleEditAd(ad) {
    if (!ad) {
      appLogger.warn('handleEditAd appelé sans annonce');
      return;
    }
    // Fermer la modal de détails pour éviter le chevauchement/z-index
    closeDetailsModal();
    // Toujours recharger depuis l'API pour obtenir toutes les données (images, coordonnées, attributes)
    setTimeout(() => {
      openPostModal({ adId: ad.id || ad._id });
    }, 100);
  }

  async function handleDeleteAd(ad) {
    const confirmed = await showConfirmDialog({
      title: "Supprimer l'annonce",
      message:
        'Êtes-vous sûr de vouloir supprimer cette annonce ? Elle sera archivée et ne sera plus visible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.del(`/api/ads/${ad.id}`);
      if (response?.status === 'success') {
        showToast('Annonce archivée avec succès');
        closeDetailsModal();

        const normalizedId = normalizeAdId(ad.id ?? ad._id);
        const removeById = (items) =>
          Array.isArray(items)
            ? items.filter((item) => normalizeAdId(item?.id ?? item?._id) !== normalizedId)
            : [];

        if (normalizedId) {
          const nextAllItems = removeById(allItems);
          if (nextAllItems.length !== allItems.length) {
            allItems = nextAllItems;
            rebuildAllItemsIndex();
          }

          const nextPageItems = removeById(paging.items);
          if (nextPageItems.length !== paging.items.length) {
            paging.items = nextPageItems;
            filteredCache = paging.items;
            cachePage(paging.page, {
              items: paging.items,
              nextCursor: paging.nextCursor,
              hasNext: paging.hasNext
            });
          }

          if (paging.cache?.size) {
            paging.cache.forEach((entry, pageNumber) => {
              if (!entry?.items) {
                return;
              }
              const cleaned = removeById(entry.items);
              if (cleaned.length !== entry.items.length) {
                paging.cache.set(pageNumber, {
                  ...entry,
                  items: cleaned.map((item) => ({ ...item }))
                });
              }
            });
          }

          if (typeof paging.total === 'number') {
            paging.total = Math.max(0, paging.total - 1);
            if (typeof paging.totalPages === 'number') {
              const computedPages = Math.max(1, Math.ceil(Math.max(paging.total, 0) / PAGE_SIZE));
              paging.totalPages = computedPages;
            }
          }
        }

        if (typeof renderList === 'function') {
          renderList(true);
        }
        if (typeof renderMap === 'function') {
          renderMap({ force: currentView === 'map', invalidate: currentView === 'map' });
        }

        // Retirer du store des favoris si présent
        const adId = String(ad.id);
        if (favStore.has(adId)) {
          favStore.delete(adId);
          favDataCache.delete(adId);
          updateFavBadge();
          syncAllFavoriteButtons();
          if (isFavModalOpen()) {
            renderFavSheet();
          }
        }

        document.dispatchEvent(
          new CustomEvent('profile:invalidate-cache', {
            detail: {
              reason: 'ad-deleted',
              adId: normalizedId || adId
            }
          })
        );
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (error) {
      appLogger.error('Delete ad error:', error);
      showToast("Erreur lors de la suppression de l'annonce");
    }
  }
  function updateContactCounter() {
    if (!contactCounter || !contactMessage) {
      return;
    }
    const remaining = Math.max(0, CONTACT_MAX_LENGTH - contactMessage.value.length);
    contactCounter.textContent = String(remaining);
    contactCounter.classList.toggle('is-low', remaining <= 20);
  }

  function clearContactError() {
    if (!contactError) {
      return;
    }
    contactError.textContent = '';
    contactError.hidden = true;
  }

  function showContactError(message) {
    if (!contactError) {
      return;
    }
    contactError.textContent = message;
    contactError.hidden = false;
  }

  function autoSizeContactMessage({ reset = false } = {}) {
    if (!contactMessage) {
      return;
    }
    if (reset) {
      contactMessage.style.height = '';
      return;
    }
    contactMessage.style.height = 'auto';
    const next = Math.min(200, Math.max(54, contactMessage.scrollHeight));
    contactMessage.style.height = `${next}px`;
    updateContactPlacement();
    ensureContactVisibility();
  }

  function getContactFocusables() {
    if (!contactPopover || contactPopover.hasAttribute('hidden')) {
      return [];
    }
    const nodes = Array.from(contactPopover.querySelectorAll(CONTACT_FOCUS_SELECTOR));
    return nodes.filter((node) => {
      if (node.hasAttribute('disabled')) {
        return false;
      }
      if (node.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    });
  }

  function updateContactPlacement() {
    if (!contactPopover || contactPopover.hasAttribute('hidden')) {
      return;
    }
    const anchorRect = contactAnchor?.getBoundingClientRect?.();
    const dialogRect = detailsDialog?.getBoundingClientRect?.();
    if (!anchorRect || !dialogRect) {
      return;
    }
    const popHeight = contactPopover.offsetHeight || 0;
    const spaceAbove = anchorRect.top - dialogRect.top;
    const spaceBelow = dialogRect.bottom - anchorRect.bottom;
    const needsBottom = popHeight + 28 > spaceAbove && spaceBelow > spaceAbove;
    contactPopover.classList.toggle('is-bottom', needsBottom);
  }

  function activateContactFocusTrap() {
    contactTrapActive = true;
  }

  function deactivateContactFocusTrap() {
    contactTrapActive = false;
  }

  function setContactLoading(isLoading) {
    if (!contactSendBtn) {
      return;
    }
    if (isLoading) {
      contactSending = true;
      contactSendBtn.classList.add('is-loading');
      contactSendBtn.setAttribute('disabled', '');
      contactCancelBtn?.setAttribute('disabled', '');
      contactCloseBtn?.setAttribute('disabled', '');
      contactMessage?.setAttribute('readonly', '');
    } else {
      contactSending = false;
      contactSendBtn.classList.remove('is-loading');
      contactSendBtn.removeAttribute('disabled');
      contactCancelBtn?.removeAttribute('disabled');
      contactCloseBtn?.removeAttribute('disabled');
      contactMessage?.removeAttribute('readonly');
    }
  }

  function ensureContactVisibility() {
    if (!contactPopover || contactPopover.hasAttribute('hidden') || !detailsBodyEl) {
      return;
    }
    requestAnimationFrame(() => {
      const popRect = contactPopover.getBoundingClientRect();
      const dialogRect = detailsDialog?.getBoundingClientRect();
      if (!popRect || !dialogRect) {
        return;
      }
      const offsetTop = popRect.top - (dialogRect.top + 16);
      const offsetBottom = popRect.bottom - (dialogRect.bottom - 16);
      if (offsetTop < 0) {
        detailsBodyEl.scrollBy({
          top: offsetTop - 12,
          behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
        });
      } else if (offsetBottom > 0) {
        detailsBodyEl.scrollBy({
          top: offsetBottom + 12,
          behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
        });
      }
    });
  }
  function resetContactForm() {
    if (contactMessage) {
      contactMessage.value = '';
      autoSizeContactMessage({ reset: true });
    }
    updateContactCounter();
    clearContactError();
  }

  function openContactPopover() {
    if (!contactPopover) {
      return;
    }
    const auth = authStore.get();
    if (!auth) {
      // Ne pas ouvrir le modal d'auth : juste un feedback elegant
      showToast('Connectez-vous pour envoyer un message 🔒');
      if (!contactPopover.hasAttribute('hidden')) {
        closeContactPopover({ immediate: true, restoreFocus: false });
      }
      return;
    }
    if (contactSending) {
      return;
    }
    if (Date.now() < contactCooldownUntil) {
      showToast('Un instant… vous pourrez renvoyer un message dans quelques secondes.');
      return;
    }
    contactLastFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : detailsContact;
    if (contactPopoverTimer) {
      clearTimeout(contactPopoverTimer);
      contactPopoverTimer = null;
    }
    setContactLoading(false);
    contactPopover.setAttribute('aria-hidden', 'false');
    contactPopover.removeAttribute('hidden');
    contactPopover.classList.remove('closing');
    requestAnimationFrame(() => {
      updateContactPlacement();
      contactPopover.classList.add('open');
      activateContactFocusTrap();
      ensureContactVisibility();
    });
    clearContactError();
    updateContactCounter();
    autoSizeContactMessage();
    requestAnimationFrame(() => {
      updateContactPlacement();
      ensureContactVisibility();
      contactMessage?.focus?.({ preventScroll: true });
    });
  }

  function closeContactPopover({ restoreFocus = false, immediate = false } = {}) {
    if (!contactPopover || contactPopover.hasAttribute('hidden')) {
      return;
    }
    if (contactPopoverTimer) {
      clearTimeout(contactPopoverTimer);
      contactPopoverTimer = null;
    }
    deactivateContactFocusTrap();
    contactPopover.classList.remove('open', 'is-bottom');
    contactPopover.setAttribute('aria-hidden', 'true');
    setContactLoading(false);
    if (contactMessage) {
      contactMessage.removeAttribute('readonly');
      contactMessage.blur();
    }
    if (immediate) {
      contactPopover.setAttribute('hidden', '');
      autoSizeContactMessage({ reset: true });
    } else {
      contactPopoverTimer = window.setTimeout(() => {
        contactPopover?.setAttribute('hidden', '');
        contactPopoverTimer = null;
        autoSizeContactMessage({ reset: true });
      }, 220);
    }
    if (restoreFocus) {
      (detailsContact || contactLastFocus)?.focus?.({ preventScroll: true });
    }
    contactLastFocus = null;
    clearContactError();
  }

  function setDetailsSaveState(isFav) {
    if (!detailsSave || !detailsSave.isConnected) {
      detailsSave = document.getElementById('detailsSave');
    }
    if (!detailsSave) {
      return;
    }
    detailsSave.classList.toggle('active', isFav);
    detailsSave.setAttribute('aria-pressed', String(isFav));
    detailsSave.setAttribute('title', isFav ? 'Retirer des favoris' : 'Ajouter aux favoris');
    const svg = detailsSave.querySelector('svg');
    const span = detailsSave.querySelector('span');
    const path = svg?.querySelector('path');
    if (path) {
      path.setAttribute('fill', isFav ? 'currentColor' : 'none');
      path.setAttribute('stroke', 'currentColor');
    }
    if (span) {
      span.textContent = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
    }
  }

  function syncFavoriteButtons(id, isFav) {
    const key = normalizeAdId(id);
    if (!key) {
      return;
    }

    // Mettre à jour les boutons dans la liste
    listView.querySelectorAll(`.fav[data-id="${key}"]`).forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isFav));
      btn.setAttribute('title', isFav ? 'Retirer des favoris' : 'Ajouter aux favoris');
      const svg = btn.querySelector('svg');
      updateFavIcon(svg, isFav);
    });

    // Mettre à jour le bouton dans le modal de détail
    const detailsSaveBtn = document.getElementById('detailsSave');
    if (detailsSaveBtn && detailsSaveBtn.dataset.id === key) {
      setDetailsSaveState(isFav);
    }

    // Fallback: vérifier aussi via detailsCurrentAd
    if (detailsCurrentAd && normalizeAdId(detailsCurrentAd.id) === key) {
      setDetailsSaveState(isFav);
    }

    updateFavBadge();
  }

  function openDetailsModal(adData) {
    if (!adData) {
      return;
    }
    const alreadyOpen =
      detailsModal &&
      detailsModal.style.display === 'flex' &&
      detailsModal.getAttribute('aria-hidden') === 'false';
    if (lightboxActive) {
      closeLightbox({ restoreFocus: false });
    }
    lightboxActive = false;
    if (detailsModal && !alreadyOpen) {
      const activeEl = document.activeElement;
      detailsModal._lastTrigger = activeEl instanceof HTMLElement ? activeEl : null;
    }
    resetContactForm();
    setContactLoading(false);
    if (contactPopover) {
      contactPopover.classList.remove('open');
      contactPopover.setAttribute('hidden', '');
      contactPopover.setAttribute('aria-hidden', 'true');
      contactPopoverTimer = null;
      deactivateContactFocusTrap();
    }
    if (lightboxImage) {
      lightboxImage.removeAttribute('src');
      lightboxImage.removeAttribute('srcset');
      lightboxImage.removeAttribute('sizes');
      lightboxImage.alt = '';
    }
    applyDetailsContent(adData, { replaceGallery: true });

    // Force la synchronisation du bouton favoris après la création du DOM
    setTimeout(() => {
      syncAllFavoriteButtons();
    }, 0);

    if (!alreadyOpen) {
      detailsModal.style.display = 'flex';
      detailsModal.classList.add('active');
      detailsModal.setAttribute('aria-hidden', 'false');
      lockBodyScroll();
      obscureMap();
      if (favModal?._stickyOpen && favList) {
        favModal._favScrollTop = favList.scrollTop || favModal._favScrollTop || 0;
      }
      const focusTarget = closeDetailsBtn || detailsDialog;
      setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 40);
    }
    if (detailsBodyEl) {
      detailsBodyEl.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }

  // Exposer openDetailsModal globalement pour permettre l'ouverture depuis d'autres modules
  window.openDetailsModal = openDetailsModal;
  window.openDetailsById = openDetailsById;

  function closeDetailsModal() {
    if (lightboxActive) {
      closeLightbox({ restoreFocus: false });
    }
    if (contactPopover) {
      closeContactPopover({ immediate: true, restoreFocus: false });
    }
    resetContactForm();
    setDetailsLoading(false);

    // Check if we were in preview mode
    const wasInPreviewMode = !!document.getElementById('previewBanner');

    // Remove preview banner if exists
    const previewBanner = document.getElementById('previewBanner');
    if (previewBanner) {
      previewBanner.remove();
    }

    // Remove preview contact note if exists
    const previewContactNote = document.getElementById('previewContactNote');
    if (previewContactNote) {
      previewContactNote.remove();
    }

    // Restore contact button visibility
    const contactTrigger = document.getElementById('contactTrigger');
    if (contactTrigger) {
      contactTrigger.style.display = '';
    }

    const stickyOpen = !!favModal?._stickyOpen;
    const stickyScrollTop =
      typeof favModal?._favScrollTop === 'number' ? favModal._favScrollTop : 0;
    const stickyId = favModal?._lastSelectedFavId ?? null;
    const stickyCard = favModal?._lastSelectedCard ?? null;
    const lastTrigger = detailsModal?._lastTrigger;
    detailsModal.style.display = 'none';
    detailsModal.classList.remove('active');
    detailsModal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    restoreMap();
    if (detailsSkeletonTimeout) {
      clearTimeout(detailsSkeletonTimeout);
      detailsSkeletonTimeout = null;
    }
    detailsCarouselTrack.innerHTML = '';
    detailsCarouselDots.innerHTML = '';

    // If we were in preview mode, reopen the post modal
    if (wasInPreviewMode) {
      setTimeout(() => {
        setPostModalHidden(false);
      }, 100);
    }
    detailsSkeleton.classList.remove('active');
    detailsCurrentImages = [];
    detailsCurrentIndex = 0;
    updateShareButtonState(null);
    if (detailsPriceEl) {
      detailsPriceEl.innerHTML = '<strong>—</strong>';
    }
    if (stickyOpen) {
      requestAnimationFrame(() => {
        if (favList) {
          favList.scrollTop = stickyScrollTop || 0;
          let focusTarget = stickyCard && document.body.contains(stickyCard) ? stickyCard : null;
          if ((!focusTarget || !focusTarget.isConnected) && stickyId != null) {
            focusTarget = favList.querySelector(`.mm-card[data-id="${stickyId}"]`);
          }
          focusTarget?.focus?.({ preventScroll: true });
          if (!focusTarget && favList.firstElementChild instanceof HTMLElement) {
            favList.firstElementChild.focus({ preventScroll: true });
          }
        }
      });
    } else if (lastTrigger && typeof lastTrigger.focus === 'function') {
      requestAnimationFrame(() => lastTrigger.focus({ preventScroll: true }));
    }
    if (favModal) {
      if (stickyOpen) {
        favModal._lastSelectedCard = stickyCard && stickyCard.isConnected ? stickyCard : null;
      } else {
        favModal._lastSelectedCard = null;
        favModal._lastSelectedFavId = null;
        favModal._favScrollTop = 0;
      }
    }
    clearAdQueryParamIfNeeded();
    if (detailsModal) {
      detailsModal._lastTrigger = null;
    }
  }

  detailsPrev.addEventListener('click', () => {
    changeSlide(-1);
    if (lightboxActive) {
      updateLightboxView();
    }
  });
  detailsNext.addEventListener('click', () => {
    changeSlide(1);
    if (lightboxActive) {
      updateLightboxView();
    }
  });
  closeDetailsBtn.addEventListener('click', closeDetailsModal);
  shareDetailsBtn?.addEventListener('click', handleShareDetailsClick);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
      closeDetailsModal();
    }
  });
  lightboxPrev?.addEventListener('click', () => {
    changeSlide(-1);
    updateLightboxView();
  });
  lightboxNext?.addEventListener('click', () => {
    changeSlide(1);
    updateLightboxView();
  });
  lightboxCloseBtn?.addEventListener('click', () => closeLightbox());
  lightboxBackdrop?.addEventListener('click', () => closeLightbox());
  lightboxImage?.addEventListener('click', () => {
    if (!lightboxActive || detailsCurrentImages.length <= 1) {
      return;
    }
    changeSlide(1);
    updateLightboxView();
  });

  function handleDetailsSaveClick() {
    if (!detailsCurrentAd) {
      return;
    }
    const auth = authStore.get();
    if (!auth) {
      showToast('Connectez-vous pour ajouter des favoris 🔐');
      return;
    }
    const saveBtn = document.getElementById('detailsSave');
    const id = saveBtn?.dataset.id ?? detailsCurrentAd.id;
    const shouldAdd = !favStore.has(id);
    setFavoriteState(id, shouldAdd, { feedback: false }).then((success) => {
      if (success) {
        if (shouldAdd && saveBtn) {
          triggerFavAnimation(saveBtn);
        }
        showToast(shouldAdd ? 'Ajouté aux favoris' : 'Retiré des favoris');
      }
    });
  }

  function handleDetailsVisit() {
    if (!detailsCurrentAd) {
      return;
    }
    const id = detailsDialog?.dataset?.itemId || detailsCurrentAd.id;
    closeDetailsModal();
    animateTo('map', { skipSameStateFocus: true });
    setTimeout(
      async () => {
        const instance = await ensureMap();
        if (!instance) {
          return;
        }
        instance.invalidateSize();
        focusMarkerById(id);
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          mapContainer.setAttribute('tabindex', '-1');
          mapContainer.focus({ preventScroll: false });
        }
      },
      prefersReducedMotion.matches ? 80 : 220
    );
  }

  // Attacher les événements initiaux (seront recréés si nécessaire)
  if (detailsSave) {
    detailsSave.addEventListener('click', handleDetailsSaveClick);
  }

  if (detailsContact) {
    detailsContact.addEventListener('click', openContactPopover);
  }

  if (detailsVisitBtn) {
    detailsVisitBtn.addEventListener('click', handleDetailsVisit);
  }

  contactCancelBtn?.addEventListener('click', () => {
    closeContactPopover({ restoreFocus: true });
  });

  contactCloseBtn?.addEventListener('click', () => {
    closeContactPopover({ restoreFocus: true });
  });

  contactSendBtn?.addEventListener('click', () => {
    sendContactMessage();
  });

  contactMessage?.addEventListener('input', () => {
    clearContactError();
    updateContactCounter();
    autoSizeContactMessage();
  });

  contactMessage?.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      sendContactMessage();
    }
  });

  async function sendContactMessage() {
    if (!contactPopover || contactPopover.hasAttribute('hidden')) {
      return;
    }
    if (!contactMessage) {
      return;
    }
    if (contactSending) {
      return;
    }
    if (!detailsCurrentAd) {
      showContactError('Annonce introuvable. Veuillez réessayer.');
      return;
    }
    if (Date.now() < contactCooldownUntil) {
      showContactError('Patientez encore un instant avant un nouvel envoi.');
      return;
    }
    const message = contactMessage.value.trim();
    if (message.length === 0) {
      showContactError('Veuillez saisir un message.');
      contactMessage.focus({ preventScroll: true });
      return;
    }
    clearContactError();
    setContactLoading(true);
    let requestSucceeded = false;
    try {
      const response = await sendContactRequest(detailsCurrentAd.id, message);
      requestSucceeded = true;
      contactCooldownUntil = Date.now() + CONTACT_COOLDOWN_MS;
      showToast('Message envoyé ✅');
      if (navMessages) {
        navMessages.setAttribute('data-unread', 'true');
      }
      if (response?.conversation?.id) {
        appLogger.info('[contact] Conversation mise à jour', {
          conversationId: response.conversation.id,
          created: response.created
        });
      }
      resetContactForm();
      closeContactPopover({ restoreFocus: true });
    } catch (error) {
      appLogger.error('[contact] Envoi impossible', error);
      if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
        if (typeof authStore?.set === 'function') {
          authStore.set(null);
        }
        closeContactPopover({ immediate: true, restoreFocus: false });
        showToast('Session expirée. Connectez-vous pour envoyer un message.');
        return;
      }
      let messageToShow = 'Une erreur est survenue. Merci de réessayer.';
      if (error?.code === 'NETWORK_ERROR') {
        messageToShow = 'Serveur injoignable. Vérifiez votre connexion.';
      } else if (error?.code === 'RATE_LIMITED' || error?.status === 429) {
        messageToShow = 'Vous avez atteint la limite. Patientez avant de réessayer.';
      } else if (error?.status === 403) {
        messageToShow = error?.payload?.message || 'Vous ne pouvez pas contacter ce vendeur.';
      } else if (error?.status === 404) {
        messageToShow = 'Annonce introuvable.';
      } else if (error?.payload?.message) {
        messageToShow = error.payload.message;
      }
      showContactError(messageToShow);
      if (contactMessage && !contactPopover?.hasAttribute('hidden')) {
        contactMessage.focus({ preventScroll: true });
      }
    } finally {
      if (!requestSucceeded) {
        setContactLoading(false);
      }
    }
  }

  async function sendContactRequest(adId, message) {
    const response = await api.post('/api/chat/start', { adId, text: message });
    const data = response?.data || null;
    if (data?.conversation) {
      try {
        document.dispatchEvent(
          new CustomEvent('chat:conversation-started', {
            detail: data
          })
        );
      } catch (eventError) {
        appLogger.warn?.('[contact] Event dispatch échoué', eventError);
      }
    }
    return data;
  }

  window.addEventListener('resize', () => {
    if (!contactPopover || contactPopover.hasAttribute('hidden')) {
      return;
    }
    autoSizeContactMessage();
    updateContactPlacement();
    ensureContactVisibility();
  });

  detailsReadMore.addEventListener('click', () => {
    detailsDescExpanded = !detailsDescExpanded;
    updateDescription();
  });

  document.addEventListener('keydown', (e) => {
    if (lightboxActive) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        changeSlide(1);
        updateLightboxView();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changeSlide(-1);
        updateLightboxView();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = getLightboxFocusables();
        if (!focusables.length) {
          return;
        }
        const activeEl = document.activeElement;
        const currentIndex = focusables.indexOf(activeEl);
        if (e.shiftKey) {
          if (currentIndex <= 0) {
            e.preventDefault();
            focusables[focusables.length - 1]?.focus?.({ preventScroll: true });
          }
        } else {
          if (currentIndex === focusables.length - 1) {
            e.preventDefault();
            focusables[0]?.focus?.({ preventScroll: true });
          }
        }
        return;
      }
    }
    if (detailsModal.style.display !== 'flex') {
      return;
    }
    if (contactTrapActive && e.key === 'Tab') {
      const focusables = getContactFocusables();
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const activeEl = document.activeElement;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (activeEl === first || !contactPopover?.contains(activeEl)) {
          e.preventDefault();
          last?.focus?.({ preventScroll: true });
        }
      } else {
        if (activeEl === last || !contactPopover?.contains(activeEl)) {
          e.preventDefault();
          first?.focus?.({ preventScroll: true });
        }
      }
      return;
    }
    if (e.key === 'Escape' && contactPopover && !contactPopover.hasAttribute('hidden')) {
      e.preventDefault();
      closeContactPopover({ restoreFocus: true });
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDetailsModal();
      return;
    }
    if (e.key === 'ArrowRight') {
      changeSlide(1);
    }
    if (e.key === 'ArrowLeft') {
      changeSlide(-1);
    }
  });

  async function openDetailsById(id, fallback = null, options = {}) {
    const normalizedId = normalizeAdId(id);
    if (!normalizedId) {
      return;
    }
    const { preferDeferredOpen = false } = options;
    const base = fallback ?? getItemById(normalizedId);
    let hasOpened = false;
    let openedWithSkeleton = false;
    if (base) {
      const optimistic = optimisticIncrementAdViews(base) || base;
      openDetailsModal(optimistic);
      hasOpened = true;
    } else if (!preferDeferredOpen) {
      showDetailsLoadingState(normalizedId);
      hasOpened = true;
      openedWithSkeleton = true;
    }
    const fetched = await fetchAdById(normalizedId);
    if (fetched) {
      if (hasOpened) {
        refreshOpenDetails(fetched);
      } else {
        openDetailsModal(fetched);
        hasOpened = true;
      }
      // Tracker la vue de l'annonce pour les annonces récemment vues
      if (window.recentlyViewed && typeof window.recentlyViewed.trackAdView === 'function') {
        window.recentlyViewed.trackAdView(normalizedId);
      }
      return;
    }
    if (openedWithSkeleton) {
      clearSkeletonSkipForAd(normalizedId);
      closeDetailsModal();
      showToast('Annonce introuvable');
      return;
    }
    if (!hasOpened) {
      clearSkeletonSkipForAd(normalizedId);
      if (preferDeferredOpen) {
        clearAdQueryParamIfNeeded({ force: true });
      }
      showToast('Annonce introuvable');
    }
  }

  function openPendingDeepLink(targetId) {
    const normalized = normalizeAdId(targetId);
    if (!normalized) {
      return;
    }
    const fallbackAd = getItemById(normalized);
    const preferDeferredOpen = !fallbackAd;
    const skeletonSkips = preferDeferredOpen ? 1 : 2;
    const alreadyOpenId = normalizeAdId(detailsDialog?.dataset?.itemId);
    const modalVisible = detailsModal?.style?.display === 'flex';
    if (modalVisible && alreadyOpenId === normalized) {
      clearSkeletonSkipForAd(normalized);
      activeDeepLinkAdId = normalized;
      pendingDeepLinkAdId = null;
      return;
    }
    if (deepLinkOpening) {
      pendingDeepLinkAdId = normalized;
      return;
    }
    deepLinkOpening = true;
    activeDeepLinkAdId = normalized;
    queueSkeletonSkipForAd(normalized, skeletonSkips);
    const result = openDetailsById(normalized, fallbackAd, { preferDeferredOpen });
    const handleFinal = () => {
      deepLinkOpening = false;
      clearSkeletonSkipForAd(normalized);
      if (pendingDeepLinkAdId && pendingDeepLinkAdId !== normalized) {
        const nextId = pendingDeepLinkAdId;
        pendingDeepLinkAdId = null;
        openPendingDeepLink(nextId);
      }
    };
    if (result?.then) {
      result
        .catch((error) => {
          appLogger.warn?.('Deep link opening failed', error);
          activeDeepLinkAdId = null;
          clearAdQueryParamIfNeeded({ force: true });
        })
        .finally(handleFinal);
    } else {
      handleFinal();
    }
  }

  function scheduleDeepLinkOpen(adId) {
    const normalized = normalizeAdId(adId);
    if (!normalized) {
      return;
    }
    pendingDeepLinkAdId = normalized;
    const runOpen = () => {
      if (pendingDeepLinkAdId !== normalized) {
        return;
      }
      pendingDeepLinkAdId = null;
      openPendingDeepLink(normalized);
    };
    if (initialAdsPromise && typeof initialAdsPromise.then === 'function') {
      initialAdsPromise
        .catch((error) => {
          appLogger.warn?.('Initial ads load failed before deep link open', error);
        })
        .finally(runOpen);
      return;
    }
    runOpen();
  }

  async function fetchAdById(id) {
    try {
      const response = await api.get(`/api/ads/${id}`);
      if (response?.data?.ad) {
        const mapped = mapAdFromApi(response.data.ad);
        upsertAd(mapped);
        return mapped;
      }
    } catch (error) {
      appLogger.error('fetchAdById error', error);
    }
    return null;
  }

  listView.addEventListener('click', (e) => {
    const adWrapper = e.target.closest('.ad-content');
    if (!adWrapper || e.target.closest('.fav')) {
      return;
    }
    const adId = adWrapper.dataset.id;
    openDetailsById(adId, getItemById(adId));
  });

  // ---------- FAVORITE ANIMATION ----------
  function triggerFavAnimation(buttonEl) {
    if (!buttonEl || buttonEl.classList.contains('animating')) {
      return;
    }

    buttonEl.classList.add('animating');

    // 1. Créer le conteneur pour les particules
    let wrapper = buttonEl.querySelector('.fav-anim-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'fav-anim-wrapper';
      buttonEl.appendChild(wrapper);
    }
    wrapper.innerHTML = ''; // Vider les anciennes particules

    // 2. Créer et animer les particules
    const particleCount = 7;
    const angleIncrement = (2 * Math.PI) / particleCount;
    const radius = 25; // Distance de dispersion

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'fav-particle';
      const angle = i * angleIncrement;
      // Calcul de la position finale pour l'animation
      const tx = `calc(-50% + ${radius * Math.cos(angle)}px)`;
      const ty = `calc(-50% + ${radius * Math.sin(angle)}px)`;
      particle.style.setProperty('--tx', tx);
      particle.style.setProperty('--ty', ty);
      wrapper.appendChild(particle);
    }

    // 3. Nettoyer après l'animation
    setTimeout(() => {
      buttonEl.classList.remove('animating');
      if (wrapper) {
        wrapper.innerHTML = '';
      }
    }, 600);
  }

  // ---------- TOAST ----------
  const toast = document.getElementById('toast');
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => (toast.style.display = 'none'), 1800);
  }
  window.showToast = showToast;

  // ---------- FOOTER & LEGAL ----------
  (function footerAndLegal() {
    const footer = document.getElementById('appFooter');
    if (!footer) {
      return;
    }

    const yearEl = document.getElementById('yearNow');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterEmail = document.getElementById('newsletterEmail');
    const newsletterBtn = newsletterForm?.querySelector('.mm-news__btn');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!newsletterEmail?.checkValidity()) {
          newsletterEmail?.reportValidity?.();
          newsletterEmail?.focus?.();
          return;
        }
        if (newsletterBtn) {
          newsletterBtn.disabled = true;
        }
        try {
          const emailValue = newsletterEmail?.value?.trim();
          const payload = await api.post('/api/newsletter', { email: emailValue });
          showToast(payload?.message || 'Merci ! Vous recevrez prochainement nos actualités.');
          newsletterForm.reset();
        } catch (error) {
          const message =
            error?.message || 'Une erreur est survenue. Réessayez dans quelques instants.';
          showToast(message);
          newsletterEmail?.focus?.();
        } finally {
          if (newsletterBtn) {
            newsletterBtn.disabled = false;
          }
        }
      });
    }

    footer.querySelectorAll('[data-nav]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = link.getAttribute('data-nav');
        if (target === 'map') {
          animateTo('map', { skipSameStateFocus: true });
        } else if (target === 'list') {
          animateTo('list', { skipSameStateFocus: true });
        } else {
          showToast('Fonctionnalité bientôt disponible ✨');
        }
      });
    });

    const legalModal = document.getElementById('legalModal');
    const legalBody = document.getElementById('legalBody');
    const legalTitle = document.getElementById('legalTitle');
    const legalDialog = legalModal?.querySelector('.mm-modal__dialog');
    const focusSelectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let legalLastFocus = null;

    const legalContent = {
      terms: { title: 'Conditions d’utilisation', html: buildTermsHtml },
      privacy: { title: 'Politique de confidentialité', html: buildPrivacyHtml },
      cookies: { title: 'Politique relative aux cookies', html: buildCookiesHtml }
    };

    function getLegalFocusables() {
      if (!legalModal || legalModal.hidden) {
        return [];
      }
      const nodes = Array.from(legalModal.querySelectorAll(focusSelectors));
      return nodes.filter((el) => {
        if (el.hasAttribute('disabled')) {
          return false;
        }
        if (el.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        if (el === legalDialog || el === legalBody) {
          return true;
        }
        return el.offsetParent !== null;
      });
    }

    function handleTrapKeydown(event) {
      if (!legalModal?.classList.contains('mm-open')) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLegalModal();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusables = getLegalFocusables();
      if (!focusables.length) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first || !focusables.includes(document.activeElement)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    }

    function openLegalModal(key) {
      if (!legalModal || !legalBody || !legalTitle) {
        return;
      }
      const data = legalContent[key];
      if (!data) {
        return;
      }
      const alreadyOpen = legalModal.classList.contains('mm-open') && !legalModal.hidden;
      legalBody.scrollTop = 0;
      legalTitle.textContent = data.title;
      legalBody.innerHTML = data.html();
      if (alreadyOpen) {
        requestAnimationFrame(() => {
          const focusables = getLegalFocusables();
          (focusables[0] || legalDialog)?.focus?.({ preventScroll: true });
        });
        return;
      }
      legalLastFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      legalModal.hidden = false;
      legalModal.setAttribute('aria-hidden', 'false');
      lockBodyScroll();
      requestAnimationFrame(() => {
        legalModal.classList.add('mm-open');
        const focusables = getLegalFocusables();
        (focusables[0] || legalDialog)?.focus?.({ preventScroll: true });
      });
      document.addEventListener('keydown', handleTrapKeydown, true);
    }

    function closeLegalModal() {
      if (!legalModal || legalModal.hidden) {
        return;
      }
      legalModal.classList.remove('mm-open');
      legalModal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleTrapKeydown, true);
      unlockBodyScroll();
      setTimeout(() => {
        legalModal.hidden = true;
        legalBody.scrollTop = 0;
        legalBody.innerHTML = '';
        if (legalLastFocus && typeof legalLastFocus.focus === 'function') {
          legalLastFocus.focus({ preventScroll: true });
        }
        legalLastFocus = null;
      }, 200);
    }

    legalModal?.addEventListener('click', (event) => {
      const closeTrigger = event.target.closest('[data-close]');
      if (closeTrigger) {
        event.preventDefault();
        closeLegalModal();
      }
    });

    legalBody?.addEventListener('click', (event) => {
      const link = event.target.closest('[data-legal]');
      if (!link) {
        return;
      }
      event.preventDefault();
      openLegalModal(link.getAttribute('data-legal'));
    });

    footer.addEventListener('click', (event) => {
      const link = event.target.closest('[data-legal]');
      if (!link) {
        return;
      }
      event.preventDefault();
      openLegalModal(link.getAttribute('data-legal'));
    });

    function buildTermsHtml() {
      const date = new Date().toLocaleDateString('fr-FR');
      return `
          <p><em>Dernière mise à jour : ${date}</em></p>
          <h3>1. Objet</h3>
          <p>MapMarket est une plateforme permettant de rechercher, comparer et localiser des offres près de vous. Les présentes conditions régissent l’accès et l’utilisation du service.</p>
          <h3>2. Compte &amp; éligibilité</h3>
          <ul>
            <li>Vous devez avoir au moins 16 ans pour utiliser MapMarket.</li>
            <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
            <li>Vous nous informez sans délai de tout accès non autorisé.</li>
          </ul>
          <h3>3. Utilisation acceptable</h3>
          <ul>
            <li>Ne pas perturber ou contourner la sécurité du service.</li>
            <li>Ne pas extraire massivement les données (scraping) sans autorisation écrite.</li>
            <li>Respecter les lois applicables et les droits des tiers.</li>
          </ul>
          <h3>4. Contenus &amp; annonces</h3>
          <p>Les contenus publiés par des tiers (annonces, visuels, prix) engagent leurs auteurs. MapMarket peut retirer tout contenu illicite, trompeur ou contraire aux présentes.</p>
          <h3>5. Données &amp; confidentialité</h3>
          <p>Nous traitons vos données conformément à notre <a href="#" data-legal="privacy">Politique de confidentialité</a>.</p>
          <h3>6. Propriété intellectuelle</h3>
          <p>MapMarket et ses éléments sont protégés. Toute reproduction non autorisée est interdite.</p>
          <h3>7. Disponibilité &amp; modification du service</h3>
          <p>Nous pouvons modifier ou interrompre tout ou partie du service pour maintenance, évolution ou cas de force majeure.</p>
          <h3>8. Responsabilité</h3>
          <p>Le service est fourni « en l’état ». MapMarket ne peut être tenue responsable des pertes indirectes ou immatérielles résultant de l’usage du service.</p>
          <h3>9. Résiliation</h3>
          <p>Nous pouvons suspendre ou résilier l’accès en cas de violation des présentes.</p>
          <h3>10. Droit applicable</h3>
          <p>Les présentes sont régies par le droit français. En cas de litige, compétence des tribunaux de Paris, sous réserve de dispositions impératives.</p>
          <h3>11. Contact</h3>
          <p>Contact : <a href="mailto:support@mapmarket.app">support@mapmarket.app</a></p>
        `;
    }

    function buildPrivacyHtml() {
      const date = new Date().toLocaleDateString('fr-FR');
      return `
          <p><em>Dernière mise à jour : ${date}</em></p>
          <h3>1. Responsable du traitement</h3>
          <p>MapMarket (éditeur) est responsable du traitement des données collectées via l’application.</p>
          <h3>2. Données collectées</h3>
          <ul>
            <li>Données de compte : e-mail, nom (si fourni), préférences.</li>
            <li>Données d’usage : pages visitées, recherches, actions (logs).</li>
            <li>Géolocalisation (si consentie) pour afficher des résultats proches.</li>
            <li>Cookies et identifiants techniques (voir Politique cookies).</li>
          </ul>
          <h3>3. Finalités</h3>
          <ul>
            <li>Fourniture du service, personnalisation des résultats.</li>
            <li>Mesure d’audience, prévention de la fraude, sécurité.</li>
            <li>Communication (newsletter si consentement).</li>
          </ul>
          <h3>4. Base légale</h3>
          <p>Exécution du contrat (service), intérêt légitime (sécurité/analytics), consentement (newsletter, géolocalisation, cookies non essentiels).</p>
          <h3>5. Durées de conservation</h3>
          <p>Données de compte : pendant l’utilisation + 3 ans d’archivage limité. Logs : 12 mois max. Cookies : selon leur finalité (voir Politique cookies).</p>
          <h3>6. Partage</h3>
          <p>Prestataires (hébergement, e-mailing, analytics) dans l’UE ou pays adéquats. Aucune vente de données.</p>
          <h3>7. Vos droits</h3>
          <p>Accès, rectification, effacement, opposition, portabilité, limitation. Exercer : <a href="mailto:privacy@mapmarket.app">privacy@mapmarket.app</a>. Droit de réclamation : CNIL.</p>
          <h3>8. Sécurité</h3>
          <p>Mesures techniques et organisationnelles raisonnables (chiffrement en transit, contrôle d’accès, sauvegardes).</p>
          <h3>9. Enfants</h3>
          <p>Service non destiné aux moins de 16 ans.</p>
          <h3>10. Modifications</h3>
          <p>Nous pouvons mettre à jour la présente politique ; en cas de changement significatif, une information appropriée est fournie.</p>
        `;
    }

    function buildCookiesHtml() {
      const date = new Date().toLocaleDateString('fr-FR');
      return `
          <p><em>Dernière mise à jour : ${date}</em></p>
          <h3>1. Qu’est-ce qu’un cookie ?</h3>
          <p>Petit fichier texte déposé sur votre terminal pour reconnaître votre navigateur, mesurer l’audience et personnaliser l’expérience.</p>
          <h3>2. Types de cookies utilisés</h3>
          <ul>
            <li>Strictement nécessaires : sécurité, session, préférences techniques.</li>
            <li>Mesure d’audience : statistiques agrégées (ex. pages vues).</li>
            <li>Fonctionnels : géolocalisation consentie, sauvegarde de filtres.</li>
            <li>Marketing (le cas échéant) : uniquement avec consentement.</li>
          </ul>
          <h3>3. Gestion du consentement</h3>
          <p>Vous pouvez accepter ou refuser les catégories non essentielles via le gestionnaire de consentement (bannière, paramètres) et votre navigateur.</p>
          <h3>4. Durées</h3>
          <p>De la session à 13 mois selon la finalité. Les traceurs équivalents (localStorage/ID) suivent les mêmes principes.</p>
          <h3>5. Paramètres</h3>
          <p>Pour plus d’informations ou exercer vos droits : <a href="mailto:privacy@mapmarket.app">privacy@mapmarket.app</a>.</p>
        `;
    }
  })();

  // ---------- INIT ----------
  const initialAuth = authStore.get();
  if (initialAuth) {
    applyFavoritesFromUser(initialAuth);
  }

  // Listen for avatar updates from profile modal
  document.addEventListener('user:avatar-updated', (event) => {
    const { avatarUrl } = event.detail || {};
    if (avatarUrl) {
      appLogger.info('Avatar update event received:', avatarUrl);
      window.updateUserAvatar(avatarUrl);
    }
  });

  // Log startup info

  updateAuthUI();
  initialAdsPromise = loadAds();
  hydrateAuthFromSession();

  try {
    const currentUrl = new URL(window.location.href);
    const authParam = currentUrl.searchParams.get('auth');
    const verifyParam = currentUrl.searchParams.get('verify');
    if (verifyParam === 'success') {
      showToast('Email confirmé 🎉 Bienvenue sur MapMarket.');
    } else if (verifyParam === 'invalid') {
      setTimeout(() => {
        openAuth('loginEmail', 'login');
        setAuthFeedback(
          'Ce lien de confirmation est invalide ou expiré. Demandez un nouveau mail.',
          'error'
        );
      }, 350);
    } else if (verifyParam === 'error') {
      showToast('Impossible de confirmer votre email pour le moment. Réessayez plus tard.');
    }
    let shouldReplace = false;
    if (authParam === 'login' || authParam === 'signup' || authParam === 'forgot') {
      setTimeout(() => {
        const focusTarget =
          authParam === 'signup'
            ? 'signupName'
            : authParam === 'forgot'
              ? 'forgotEmail'
              : 'loginEmail';
        const initialTab = authParam || 'login';
        openAuth(focusTarget, initialTab);
      }, 350);
      currentUrl.searchParams.delete('auth');
      shouldReplace = true;
    }
    if (verifyParam) {
      currentUrl.searchParams.delete('verify');
      shouldReplace = true;
    }
    const adParam = currentUrl.searchParams.get('ad');
    if (adParam) {
      scheduleDeepLinkOpen(adParam);
    }
    if (shouldReplace) {
      const cleanedSearch = currentUrl.searchParams.toString();
      const nextUrl = `${currentUrl.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}${
        currentUrl.hash
      }`;
      window.history.replaceState({}, '', nextUrl);
    }
  } catch (_error) {
    // Ignorer les erreurs d'URL (ex: environnements file://)
  }

  window.addEventListener('popstate', () => {
    const adParam = getCurrentAdQueryParam();
    if (adParam) {
      scheduleDeepLinkOpen(adParam);
      return;
    }
    if (activeDeepLinkAdId && detailsModal?.style?.display === 'flex') {
      activeDeepLinkAdId = null;
      closeDetailsModal();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // First, unregister all existing service workers to clear old cache
        const registrations = await navigator.serviceWorker.getRegistrations();
        let needsReload = false;

        for (const registration of registrations) {
          // Check if it's the old version
          const sw = registration.active || registration.waiting || registration.installing;
          if (sw && sw.scriptURL.includes('/sw.js')) {
            // Unregister old service worker
            await registration.unregister();
            needsReload = true;
          }
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName.startsWith('mapmarket-')) {
                return caches.delete(cacheName);
              }
            })
          );
        }

        // Register the new service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        });

        // Force update check
        registration.update();

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              }
            });
          }
        });

        // Reload page if we unregistered an old worker (only once)
        if (needsReload && !sessionStorage.getItem('sw-reloaded')) {
          sessionStorage.setItem('sw-reloaded', 'true');
          window.location.reload();
        }
      } catch (error) {
        appLogger.error('Service Worker error:', error);
      }

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {});
    });
  }
})();

// ========== PROFILE MODAL ==========
console.log('🚀 profile-modal.js file is loading...');

function initProfileModal() {
  console.log('Initializing profile modal...');
  
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileClose');
  const profileTabs = document.querySelectorAll('.profile-tab');
  const profileTabContents = document.querySelectorAll('.profile-tab-content');
  const profileAdsFilters = document.querySelectorAll('.profile-filter-btn');
  const passwordForm = document.getElementById('profilePasswordForm');
  
  if (!profileModal) {
    console.error('Profile modal not found in DOM');
    return;
  }
  
  console.log('Profile modal found, setting up...');
  
  let currentFilter = 'all';
  let userAds = [];
  
  // Get API instance from global scope
  const getApi = () => window.api || { 
    get: async (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    post: async (url, data) => fetch(url, { 
      method: 'POST', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: async (url) => fetch(url, { method: 'DELETE', credentials: 'include' }).then(r => r.json())
  };
  
  // Open profile modal
  function openProfileModal() {
    console.log('Opening profile modal...');
    const user = window.authStore?.get();
    console.log('User data:', user);
    
    if (!user) {
      console.log('No user found, opening auth modal');
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal();
      }
      return;
    }
    
    profileModal.classList.add('is-open');
    profileModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Load user data
    loadUserProfile(user);
    loadUserStats();
    loadUserAds();
  }
  
  // Close profile modal
  function closeProfileModal() {
    console.log('Closing profile modal...');
    profileModal.classList.remove('is-open');
    profileModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  // Load user profile info
  function loadUserProfile(user) {
    document.getElementById('profileTitle').textContent = user.name || 'Utilisateur';
    document.getElementById('profileEmail').textContent = user.email || '';
    
    // Avatar
    const avatarUrl = user.avatar 
      ? `/uploads/avatars/${user.avatar}` 
      : '/uploads/avatars/default.jpg';
    document.getElementById('profileAvatar').src = avatarUrl;
    
    // Member since
    if (user.memberSince || user.createdAt) {
      const date = new Date(user.memberSince || user.createdAt);
      const year = date.getFullYear();
      document.getElementById('profileMemberSince').textContent = `Membre depuis ${year}`;
    }
  }
  
  // Load user stats
  async function loadUserStats() {
    try {
      const api = getApi();
      const response = await api.get('/api/users/me/stats');
      if (response?.data?.stats) {
        const stats = response.data.stats;
        document.getElementById('statActiveAds').textContent = stats.active || 0;
        document.getElementById('statDraftAds').textContent = stats.draft || 0;
        document.getElementById('statTotalViews').textContent = stats.totalViews || 0;
        document.getElementById('statTotalFavorites').textContent = stats.totalFavorites || 0;
        
        // Update filter counts
        document.getElementById('filterAllCount').textContent = stats.total || 0;
        document.getElementById('filterActiveCount').textContent = stats.active || 0;
        document.getElementById('filterDraftCount').textContent = stats.draft || 0;
        document.getElementById('filterArchivedCount').textContent = stats.archived || 0;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }
  
  // Load user ads
  async function loadUserAds() {
    try {
      const user = window.authStore?.get();
      if (!user?._id) return;
      
      const api = getApi();
      
      // Fetch all user ads (active, draft, archived)
      const [activeRes, draftRes, archivedRes] = await Promise.all([
        api.get(`/api/ads?owner=${user._id}&status=active&limit=100`),
        api.get(`/api/ads?owner=${user._id}&status=draft&limit=100`),
        api.get(`/api/ads?owner=${user._id}&status=archived&limit=100`)
      ]);
      
      userAds = [
        ...(activeRes?.data?.items || []),
        ...(draftRes?.data?.items || []),
        ...(archivedRes?.data?.items || [])
      ];
      
      renderUserAds();
    } catch (error) {
      console.error('Error loading user ads:', error);
      // Try alternative approach - single request without status filter
      try {
        const user = window.authStore?.get();
        const api = getApi();
        const response = await api.get(`/api/ads?owner=${user._id}&limit=100`);
        userAds = response?.data?.items || [];
        renderUserAds();
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError);
      }
    }
  }
  
  // Render user ads
  function renderUserAds() {
    const grid = document.getElementById('profileAdsGrid');
    const emptyState = document.getElementById('profileAdsEmpty');
    
    // Filter ads
    let filteredAds = userAds;
    if (currentFilter !== 'all') {
      filteredAds = userAds.filter(ad => ad.status === currentFilter);
    }
    
    if (filteredAds.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = filteredAds.map(ad => {
      const imageUrl = ad.images && ad.images.length > 0 
        ? ad.images[0] 
        : 'https://via.placeholder.com/400x300?text=No+Image';
      
      const statusLabel = {
        active: 'Active',
        draft: 'Brouillon',
        archived: 'Archivée'
      }[ad.status] || ad.status;
      
      return `
        <div class="profile-ad-card" data-ad-id="${ad._id}">
          <div style="position: relative;">
            <img class="profile-ad-image" src="${imageUrl}" alt="${ad.title || ''}" />
            <div class="profile-ad-status ${ad.status}">${statusLabel}</div>
          </div>
          <div class="profile-ad-body">
            <h4 class="profile-ad-title">${ad.title || 'Sans titre'}</h4>
            <div class="profile-ad-meta">
              <div class="profile-ad-price">${ad.price ? ad.price.toFixed(2) + ' €' : 'N/A'}</div>
              <div class="profile-ad-stats">
                <span class="profile-ad-stat" title="Vues">
                  👁️ ${ad.views || 0}
                </span>
                <span class="profile-ad-stat" title="Favoris">
                  ❤️ ${ad.favoritesCount || 0}
                </span>
              </div>
            </div>
            <div class="profile-ad-actions">
              <button class="profile-ad-btn" onclick="viewAdDetails('${ad._id}')">
                👁️ Voir
              </button>
              <button class="profile-ad-btn" onclick="editAd('${ad._id}')">
                ✏️ Modifier
              </button>
              ${ad.status !== 'archived' ? `
                <button class="profile-ad-btn danger" onclick="deleteAd('${ad._id}')">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // View ad details
  window.viewAdDetails = function(adId) {
    closeProfileModal();
    if (typeof window.openDetailsById === 'function') {
      window.openDetailsById(adId);
    }
  };
  
  // Edit ad
  window.editAd = function(adId) {
    const ad = userAds.find(a => a._id === adId);
    if (ad) {
      closeProfileModal();
      // Open post modal in edit mode
      // TODO: Implement edit functionality
      if (typeof window.showToast === 'function') {
        window.showToast('Fonctionnalité de modification en cours de développement');
      }
    }
  };
  
  // Delete ad
  window.deleteAd = async function(adId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }
    
    try {
      const api = getApi();
      await api.delete(`/api/ads/${adId}`);
      if (typeof window.showToast === 'function') {
        window.showToast('Annonce supprimée avec succès');
      }
      userAds = userAds.filter(a => a._id !== adId);
      renderUserAds();
      loadUserStats();
    } catch (error) {
      console.error('Error deleting ad:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('Erreur lors de la suppression');
      }
    }
  };
  
  // Tab switching
  profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Update tabs
      profileTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update content
      profileTabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // Filter ads
  profileAdsFilters.forEach(filter => {
    filter.addEventListener('click', () => {
      currentFilter = filter.getAttribute('data-filter');
      
      // Update active filter
      profileAdsFilters.forEach(f => f.classList.remove('active'));
      filter.classList.add('active');
      
      renderUserAds();
    });
  });
  
  // Password form
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Clear errors
      document.querySelectorAll('.profile-form-error').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
      });
      
      // Validation
      if (newPassword.length < 8) {
        const errorEl = document.getElementById('newPasswordError');
        errorEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères';
        errorEl.classList.add('visible');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        const errorEl = document.getElementById('confirmPasswordError');
        errorEl.textContent = 'Les mots de passe ne correspondent pas';
        errorEl.classList.add('visible');
        return;
      }
      
      const submitBtn = document.getElementById('passwordSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Modification en cours...';
      
      try {
        const api = getApi();
        await api.post('/api/users/me/change-password', {
          currentPassword,
          newPassword
        });
        
        if (typeof window.showToast === 'function') {
          window.showToast('Mot de passe modifié avec succès');
        }
        passwordForm.reset();
        
      } catch (error) {
        console.error('Error changing password:', error);
        const errorEl = document.getElementById('currentPasswordError');
        errorEl.textContent = error.response?.data?.message || 'Erreur lors du changement de mot de passe';
        errorEl.classList.add('visible');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Changer le mot de passe';
      }
    });
  }
  
  // Close modal
  profileClose?.addEventListener('click', closeProfileModal);
  
  // Close on backdrop click
  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) {
      closeProfileModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profileModal.classList.contains('is-open')) {
      closeProfileModal();
    }
  });
  
  // Expose open function globally
  window.openProfileModal = openProfileModal;
  window.closeProfileModal = closeProfileModal;
  
  console.log('Profile modal initialization complete!');
}

// Initialize when DOM is ready
console.log('Profile modal script loaded, DOM state:', document.readyState);
if (document.readyState === 'loading') {
  console.log('Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, initializing...');
    initProfileModal();
  });
} else {
  console.log('DOM already loaded, initializing immediately...');
  initProfileModal();
}

// Update user menu to open profile modal
document.addEventListener('click', (e) => {
  const profileBtn = e.target.closest('[data-action="profile"]');
  if (profileBtn) {
    e.preventDefault();
    console.log('Profile button clicked!');
    if (typeof window.openProfileModal === 'function') {
      window.openProfileModal();
    } else {
      console.error('openProfileModal function not available');
    }
  }
});

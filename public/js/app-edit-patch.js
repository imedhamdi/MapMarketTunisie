// This file contains the replacement for submitPost function
// Line 3845-3878 in app.js

    const logger = window.__APP_LOGGER__ || console;

    async function submitPost(event) {
      event.preventDefault();
      if (postIsSubmitting) return;
      if (!validatePostForm()) return;
      postIsSubmitting = true;
      postSubmit.classList.add('loading');
      postStatus.textContent = editMode ? 'Mise à jour en cours…' : 'Publication en cours…';

      try {
        // Handle images: separate existing URLs from new files to upload
        const existingImages = postPhotos.filter(p => p.isExisting && p.url).map(p => p.url);
        const newPhotosToUpload = postPhotos.filter(p => !p.isExisting && p.file);
        
        // Upload new images
        const uploaded = await uploadImages(newPhotosToUpload);
        
        // Collect payload
        const payload = collectPostPayload();
        
        // Combine existing and new image URLs
        payload.images = [...existingImages, ...uploaded.map(item => item.url)];
        
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
        
        await loadAds({ toastOnError: false });
        closePostModal({ reset: true });
        editMode = false;
        editingAdId = null;
        postStatus.textContent = '';
      } catch (error) {
        logger.error('Post error', error);
        const message = error?.payload?.message || error?.message || 
          (editMode ? 'Impossible de mettre à jour l\'annonce.' : 'Impossible de publier l\'annonce.');
        postStatus.textContent = message;
        showToast(message);
      } finally {
        postIsSubmitting = false;
        postSubmit.classList.remove('loading');
      }
    }

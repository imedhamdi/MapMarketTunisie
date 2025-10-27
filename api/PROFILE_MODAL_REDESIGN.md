# Modal "Mon Profil" - Refonte Design (Style Modal Favoris)

## 🎨 Objectif

Transformer le modal "Mon Profil" pour qu'il ait **exactement le même design, animations et transitions** que le modal "Favoris".

---

## ✅ Changements Implémentés

### 1. Structure HTML

#### Avant (Ancien Design)
```html
<div class="profile-modal" id="profileModal">
  <div class="profile-dialog">
    <div class="profile-header">...</div>
    <div class="profile-body">...</div>
  </div>
</div>
```

#### Après (Nouveau Design - Style Favoris)
```html
<div id="profileOverlay" class="mm-overlay" hidden></div>
<div class="mm-modal" id="profileModal">
  <header class="mm-header">
    <div class="mm-header-row">
      <h2>Mon Profil <span class="mm-count"></span></h2>
      <div class="mm-actions">
        <button class="mm-icon">✕</button>
      </div>
    </div>
  </header>
  <div class="mm-modal-body">...</div>
</div>
```

#### Classes Utilisées (Identiques au Modal Favoris)
- `.mm-overlay` : Fond semi-transparent avec backdrop-filter
- `.mm-modal` : Conteneur principal (slide-in depuis la droite)
- `.mm-header` : En-tête sticky avec bordure
- `.mm-header-row` : Ligne de titre avec actions
- `.mm-count` : Badge de compteur
- `.mm-actions` : Boutons d'actions
- `.mm-icon` : Bouton icône rond
- `.mm-grid` : Grille d'affichage des annonces
- `.mm-empty` : État vide

---

### 2. Animations et Transitions CSS

#### Overlay (Fond Semi-Transparent)
```css
.mm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(var(--color-text-primary-rgb), .45);
  backdrop-filter: saturate(120%) blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity .2s ease;
  z-index: var(--z-drawer);
}

.mm-overlay.active {
  opacity: 1;
  pointer-events: auto;
}
```

#### Modal (Slide-in depuis la Droite)
```css
.mm-modal {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(720px, 92vw);
  max-width: 720px;
  background: var(--color-surface);
  box-shadow: -8px 0 24px rgba(var(--color-deep-rgb), .12);
  transform: translateX(110%); /* Caché à droite */
  transition: transform .25s ease;
  display: flex;
  flex-direction: column;
  z-index: var(--z-drawer);
  overflow: hidden;
}

.mm-modal.mm-open {
  transform: translateX(0); /* Visible */
}
```

**Durées des transitions:**
- Overlay : 200ms (opacity)
- Modal : 250ms (transform)

---

### 3. JavaScript - Fonctions d'Ouverture/Fermeture

#### `openProfileModal()`
```javascript
function openProfileModal() {
  const user = window.authStore?.get();
  if (!user) {
    if (typeof window.openAuthModal === 'function') {
      window.openAuthModal();
    }
    return;
  }

  if (!profileModal || !profileOverlay) return;

  // Si déjà ouvert, juste mettre à jour
  if (profileModal.classList.contains('mm-open')) {
    loadUserProfile(user);
    loadUserStats();
    loadUserAnalytics();
    loadRecentActivity();
    loadUserAds();
    return;
  }

  // Charger les données
  loadUserProfile(user);
  loadUserStats();
  loadUserAnalytics();
  loadRecentActivity();
  loadUserAds();

  // Ouvrir avec animation (comme le modal favoris)
  profileOverlay.hidden = false;
  requestAnimationFrame(() => {
    profileOverlay.classList.add('active');
    profileModal.classList.add('mm-open');
    profileModal.setAttribute('aria-hidden', 'false');
  });
  
  lockBodyScroll();
}
```

**Séquence d'animation:**
1. `profileOverlay.hidden = false` - Rendre visible
2. `requestAnimationFrame()` - Attendre le prochain frame
3. `profileOverlay.classList.add('active')` - Fade in de l'overlay (200ms)
4. `profileModal.classList.add('mm-open')` - Slide in du modal (250ms)
5. `lockBodyScroll()` - Bloquer le scroll du body

#### `closeProfileModal()`
```javascript
function closeProfileModal() {
  if (!profileModal || !profileOverlay) return;
  if (!profileModal.classList.contains('mm-open')) return;

  profileModal.classList.remove('mm-open');
  profileModal.setAttribute('aria-hidden', 'true');
  profileOverlay.classList.remove('active');
  
  setTimeout(() => {
    if (profileOverlay && !profileModal.classList.contains('mm-open')) {
      profileOverlay.hidden = true;
    }
  }, 250); // Attendre la fin de l'animation
  
  unlockBodyScroll();
}
```

**Séquence de fermeture:**
1. `profileModal.classList.remove('mm-open')` - Slide out du modal (250ms)
2. `profileOverlay.classList.remove('active')` - Fade out de l'overlay (200ms)
3. `setTimeout(..., 250)` - Attendre 250ms
4. `profileOverlay.hidden = true` - Masquer l'overlay
5. `unlockBodyScroll()` - Débloquer le scroll du body

---

### 4. Helpers - Gestion du Scroll

```javascript
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
};

const unlockBodyScroll = () => {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
};
```

**Pourquoi `paddingRight` ?**
- Compense la disparition de la scrollbar
- Évite le "jump" horizontal lors du lock
- Calcul : largeur fenêtre - largeur sans scrollbar

---

### 5. Event Listeners

#### Fermeture sur Overlay Click
```javascript
profileOverlay?.addEventListener('click', (e) => {
  if (e.target === profileOverlay) {
    closeProfileModal();
  }
});
```

#### Fermeture sur Touche Escape
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && profileModal.classList.contains('mm-open')) {
    closeProfileModal();
  }
});
```

#### Bouton de Fermeture
```javascript
profileClose?.addEventListener('click', closeProfileModal);
```

---

### 6. Design Visuel - Composants

#### En-tête (Header)
```html
<header class="mm-header">
  <div class="mm-header-row">
    <h2>Mon Profil <span class="mm-count"></span></h2>
    <div class="mm-actions">
      <button class="mm-icon">✕</button>
    </div>
  </div>
</header>
```

**Styles:**
- Background: `var(--color-surface)`
- Border-bottom: `1px solid var(--color-border-faint)`
- Position: `sticky` (reste visible lors du scroll)
- Padding: `16px 20px`
- Z-index: `1`

#### Section Profile Header
- Avatar 80x80px avec bordure brand
- Icône edit (📷) en bas à droite
- Nom d'utilisateur en h3 (1.25rem, bold)
- Email et date avec icônes

#### Tabs (Onglets)
```css
.profile-tab {
  flex: 1;
  padding: 12px 16px;
  border: 0;
  background: none;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.profile-tab.active {
  color: var(--color-brand-500);
  border-bottom-color: var(--color-brand-500);
}
```

#### Stats Cards (Cartes Gradient)
4 cartes avec gradients différents:
1. **Actives** : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
2. **Brouillons** : `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
3. **Vues** : `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`
4. **Favoris** : `linear-gradient(135deg, #fa709a 0%, #fee140 100%)`

#### Filtres d'Annonces
```css
.profile-filter-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-filter-btn.active {
  background: var(--color-brand-500);
  color: white;
}
```

---

### 7. Responsive Design

#### Largeur du Modal
```css
width: min(720px, 92vw);
max-width: 720px;
```

- Desktop: 720px
- Mobile: 92% de la largeur viewport
- Toujours pleine hauteur: `100dvh`

#### Position
- `position: fixed`
- `top: 0`
- `right: 0`
- Z-index: `var(--z-drawer)`

---

## 📊 Comparaison Avant/Après

| Aspect | Avant | Après |
|--------|-------|-------|
| **Animation** | Fade simple | Slide-in depuis droite |
| **Overlay** | Aucun | Backdrop blur + fade |
| **Position** | Centré | Fixé à droite |
| **Largeur** | Variable | 720px max (92vw mobile) |
| **Hauteur** | Auto | 100dvh (plein écran) |
| **Scroll body** | Non géré | Lock avec padding compensation |
| **Fermeture** | Bouton seulement | Bouton + Overlay + Escape |
| **Classes CSS** | Custom `.profile-*` | Standard `.mm-*` |
| **Transition** | Instantanée | 250ms ease |

---

## 🎯 Résultat Final

### Comportement Identique au Modal Favoris

✅ **Ouverture:**
1. Overlay fade in (200ms)
2. Modal slide in depuis la droite (250ms)
3. Body scroll lock avec compensation scrollbar

✅ **Fermeture:**
1. Modal slide out vers la droite (250ms)
2. Overlay fade out (200ms)
3. Body scroll unlock
4. Overlay masqué après animation

✅ **Interactions:**
- Click sur overlay → Fermeture
- Touche Escape → Fermeture
- Bouton ✕ → Fermeture

✅ **Design:**
- En-tête sticky identique
- Boutons d'actions arrondis
- Grille d'annonces avec même layout
- État vide avec icône

---

## 📝 Fichiers Modifiés

### 1. `/public/index.html`
- Restructuration complète du HTML du modal profil
- Ajout de `#profileOverlay`
- Utilisation des classes `.mm-*`
- Styles inline pour composants spécifiques

### 2. `/public/js/profile-modal.js`
- Ajout `lockBodyScroll()` / `unlockBodyScroll()`
- Refonte `openProfileModal()` avec `requestAnimationFrame`
- Refonte `closeProfileModal()` avec timeout
- Event listener sur overlay click
- Mise à jour gestion des erreurs (display au lieu de classes)
- Mise à jour tabs et filtres (styles inline)

### 3. `/public/css/app.css`
- Aucune modification nécessaire
- Utilise les classes `.mm-*` existantes
- Tout le style est déjà défini pour le modal favoris

---

## 🧪 Test de Validation

### Checklist Visuelle
- [ ] Modal slide depuis la droite
- [ ] Overlay avec backdrop blur
- [ ] Transition fluide (250ms)
- [ ] Header sticky lors du scroll
- [ ] Tabs avec bordure colorée sur active
- [ ] Stats cards avec gradients
- [ ] Filtres changent de couleur sur click
- [ ] Grille d'annonces identique au favoris

### Checklist Fonctionnelle
- [ ] Ouverture via bouton profil
- [ ] Fermeture via bouton ✕
- [ ] Fermeture via click sur overlay
- [ ] Fermeture via touche Escape
- [ ] Scroll du body bloqué quand ouvert
- [ ] Pas de jump horizontal (padding compensation)
- [ ] Données chargées correctement
- [ ] Tabs switchent correctement
- [ ] Filtres fonctionnent
- [ ] Upload avatar fonctionne
- [ ] Changement mot de passe fonctionne

---

## 💡 Améliorations Bonus

### Animations Supplémentaires Possibles
```css
@keyframes slideInRight {
  from {
    transform: translateX(110%);
  }
  to {
    transform: translateX(0);
  }
}

.mm-modal.mm-open {
  animation: slideInRight 0.25s ease;
}
```

### Backdrop Blur Support Check
```javascript
const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(2px)');
if (!supportsBackdropFilter) {
  profileOverlay.style.background = 'rgba(0, 0, 0, 0.6)';
}
```

---

## ✨ Conclusion

Le modal "Mon Profil" utilise maintenant **exactement le même système** que le modal "Favoris":

- ✅ Même structure HTML (`.mm-modal`, `.mm-overlay`)
- ✅ Même animations (slide-in 250ms, fade 200ms)
- ✅ Même comportement JavaScript
- ✅ Même gestion du scroll
- ✅ Même design visuel

**Résultat: UX cohérente et professionnelle sur toute l'application !** 🎉

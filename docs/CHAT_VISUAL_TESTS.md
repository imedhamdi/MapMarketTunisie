# ✅ Checklist de Tests Visuels - Chat v2.0

## 🎯 Tests de Base

### Layout & Structure
- [ ] Modal s'ouvre correctement (760px de largeur)
- [ ] Layout 2 colonnes fonctionne (>960px)
- [ ] Sidebar visible (340px de largeur)
- [ ] Chat panel s'affiche correctement
- [ ] Header sticky fonctionne au scroll
- [ ] Input area reste en bas (sticky)

### Responsive
- [ ] Desktop (>960px): Layout 2 colonnes OK
- [ ] Tablet (640-960px): Layout adaptatif OK
- [ ] Mobile (<640px): Full screen OK
- [ ] Mobile: Retour à la liste fonctionne
- [ ] Mobile: Thumbnails 68px cohérents
- [ ] Mobile: Touch targets 42px minimum

## 🎨 Design System

### Variables CSS
- [ ] Couleurs cohérentes partout
- [ ] Shadows appliquées uniformément
- [ ] Border-radius harmonieux
- [ ] Transitions fluides (pas de saccades)
- [ ] Variables RGB fonctionnent pour transparence

### Palette de Couleurs
- [ ] Surface: blanc pur (#ffffff)
- [ ] Background: gris ultra-clair (#f7f9fc)
- [ ] Borders: quasi-invisibles (rgba opacité 0.06)
- [ ] Accent: rose cohérent (#ff4d6d)
- [ ] Text: hiérarchie claire (4 niveaux)

## 💬 Conversations

### Liste
- [ ] Items affichés correctement
- [ ] Thumbnail 68x68px rond (14px radius)
- [ ] Grid colonnes: 68px | 1fr | auto
- [ ] Texte ne déborde pas (ellipsis)
- [ ] Border-bottom visible mais subtile
- [ ] Scroll fluide avec scrollbar fine

### États
- [ ] **Normal**: Fond blanc, bordure subtile
- [ ] **Hover**: Fond gris alt + translateX(2px)
- [ ] **Active**: Gradient + bordure gauche 4px
- [ ] **Unread**: Fond teinté + bordure gauche 2px
- [ ] Badge notification animé (pop effect)
- [ ] Avatar affiché correctement (fallback OK)

### Hover Effects
- [ ] Translation smooth (2px à droite)
- [ ] Shadow apparaît subtilement
- [ ] Thumbnail scale(1.1) + translateY(-2px)
- [ ] Cursor pointer sur item

## 💬 Messages

### Bulles
- [ ] **Reçus**: Blanc pur, border-radius 20px/20px/20px/6px
- [ ] **Envoyés**: Gradient rose, border-radius 20px/20px/6px/20px
- [ ] Max-width 70% respecté
- [ ] Padding 14px 18px confortable
- [ ] Shadow double (neumorphique)
- [ ] Border subtile visible

### Animation d'apparition
- [ ] Fade in fluide (opacity 0 → 1)
- [ ] Scale 0.94 → 1.0
- [ ] TranslateY 8px → 0
- [ ] Duration 0.35s perceptible
- [ ] Transform-origin correct (bottom left/right)

### Hover
- [ ] Shadow s'intensifie
- [ ] Pas de mouvement brusque
- [ ] Transition fluide

### Contenu
- [ ] Texte lisible (0.9375rem)
- [ ] Line-height 1.5 confortable
- [ ] Word-wrap fonctionne
- [ ] Timestamp visible
- [ ] Status icons corrects

## 🔍 Barre de Recherche

### Style
- [ ] Height 44px
- [ ] Border-radius full (pill shape)
- [ ] Border 1.5px visible
- [ ] Background gris alternatif
- [ ] Placeholder visible

### Focus
- [ ] Border devient accent
- [ ] Ring 4px apparaît (accent-light)
- [ ] TranslateY(-1px)
- [ ] Shadow s'intensifie
- [ ] Icône change de couleur (→ accent)
- [ ] Transition fluide

### Fonctionnalités
- [ ] Clear button apparaît quand texte
- [ ] Clear button hover OK
- [ ] Recherche filtre en temps réel
- [ ] Placeholder texte clair

## ⌨️ Zone de Saisie

### Input Area
- [ ] Padding généreux (24-28px)
- [ ] Background blanc avec blur
- [ ] Shadow supérieure visible
- [ ] Border-radius 24px (input-row)
- [ ] Border 2px visible

### Focus State
- [ ] Border devient accent
- [ ] Ring 4px apparaît
- [ ] TranslateY(-2px)
- [ ] Shadow amplifiée (3 layers)
- [ ] Halo flou en arrière-plan visible
- [ ] Background devient blanc pur

### Textarea
- [ ] Min-height 44px
- [ ] Max-height 160px (scrollable)
- [ ] Resize none
- [ ] Placeholder visible
- [ ] Font-weight 500
- [ ] Auto-resize fonctionne

## 🎛️ Boutons

### Send Button
- [ ] **Disabled**: Gris, inset shadow, cursor not-allowed
- [ ] **Active**: Gradient vibrant, 3-layer shadow
- [ ] **Hover**: Scale(1.1) + translateY(-2px)
- [ ] **Active (clic)**: Scale(0.95)
- [ ] Animation pulse en arrière-plan (quand actif)
- [ ] Icon 22x22px centrée
- [ ] Border-radius full
- [ ] Width/Height 46px

### Attach Button
- [ ] Background transparent
- [ ] Hover: Background accent-light
- [ ] Hover: Scale(1.1) + rotate(5deg)
- [ ] Hover: Color → accent-strong
- [ ] Disabled: Opacity 0.3
- [ ] Icon 22x22px
- [ ] Width/Height 44px

### Voice Button
- [ ] Background transparent
- [ ] Hover: Background accent-light + scale(1.1)
- [ ] Recording: Background accent-light + pulse
- [ ] Pulse animation fluide (ring expansion)
- [ ] Icon scale au hover
- [ ] Disabled: Opacity 0.3

## 🎭 Animations

### Message Fade In
- [ ] Apparition fluide
- [ ] Pas de flash
- [ ] Scale + translateY + opacity
- [ ] Duration 350ms perceptible mais pas lente
- [ ] Transform-origin correct

### Badge Pop
- [ ] Animation bounce
- [ ] Overshoot visible (scale 1.15)
- [ ] Duration 400ms
- [ ] Pas de lag

### Send Pulse
- [ ] Ring expansion visible
- [ ] Opacity fade out
- [ ] Loop infini fluide
- [ ] Pas distrayant

### Attachment Slide In
- [ ] Slide from bottom
- [ ] Opacity 0 → 1
- [ ] Duration 300ms
- [ ] Pas de saccade

### Shimmer (Skeleton)
- [ ] Gradient se déplace
- [ ] Direction correcte (gauche → droite)
- [ ] Loop infini fluide
- [ ] Pas de flash

## 🎯 Micro-interactions

### Hover Effects
- [ ] Conversations: translateX(2px)
- [ ] Thumbnails: scale(1.1) + translateY(-2px)
- [ ] Buttons: scale(1.1)
- [ ] Cards: shadow amplifiée
- [ ] Tous fluides (pas de saccades)

### Click Feedback
- [ ] Buttons: scale(0.95) au clic
- [ ] Conversations: feedback visuel
- [ ] Messages: pas de feedback (normal)
- [ ] Clear button: feedback visuel

### Focus States
- [ ] Input: ring + halo visible
- [ ] Buttons: outline visible
- [ ] Conversations: outline visible (keyboard)
- [ ] Clear visibility (accessibility)

## 💀 Loading States

### Skeleton Loaders
- [ ] Affichés pendant chargement
- [ ] Shimmer animation fluide
- [ ] Gradient subtil
- [ ] Layout préservé (pas de jump)
- [ ] 3 items skeleton minimum

### Empty States
- [ ] Icon 64x64px visible
- [ ] Texte centré et clair
- [ ] Fade in animation
- [ ] Pas de layout shift

### Loading Indicators
- [ ] Spinner visible si long
- [ ] Typing indicator animé
- [ ] Pas bloquant
- [ ] Feedback visuel clair

## 🎨 Visual Polish

### Shadows
- [ ] Soft shadows partout
- [ ] Pas de shadows trop prononcées
- [ ] Neumorphisme subtil (double ombre)
- [ ] Cohérence globale

### Border Radius
- [ ] Échelle harmonieuse
- [ ] Pas de coins carrés inattendus
- [ ] Full radius sur pills
- [ ] Cohérence globale

### Spacing
- [ ] Espacement respirant
- [ ] Pas de collisions visuelles
- [ ] Alignement parfait
- [ ] Cohérence globale

### Typography
- [ ] Hiérarchie claire
- [ ] Tailles cohérentes
- [ ] Weights appropriés
- [ ] Letter-spacing subtil sur titres
- [ ] Tabular-nums sur timestamps

## 🖥️ Cross-browser

### Chrome/Edge
- [ ] Layout OK
- [ ] Animations fluides
- [ ] Backdrop-filter OK
- [ ] Pas de bugs visuels

### Firefox
- [ ] Layout OK
- [ ] Animations fluides
- [ ] Backdrop-filter OK (ou fallback)
- [ ] Scrollbar custom OK

### Safari
- [ ] Layout OK
- [ ] Animations fluides
- [ ] Backdrop-filter OK
- [ ] Webkit-specific OK

## 📱 Mobile

### iOS Safari
- [ ] Layout responsive OK
- [ ] Touch targets 42px minimum
- [ ] Animations fluides (60fps)
- [ ] Pas de lag au scroll
- [ ] Safe area respectée

### Android Chrome
- [ ] Layout responsive OK
- [ ] Touch targets OK
- [ ] Animations fluides
- [ ] Pas de lag
- [ ] Scrollbar OK

## ♿ Accessibilité

### Focus Visible
- [ ] Tous les éléments interactifs
- [ ] Outline bien visible (2px minimum)
- [ ] Offset approprié (2-3px)
- [ ] Couleur contrastée

### Contraste
- [ ] Texte primary vs background: AAA
- [ ] Texte secondary vs background: AA
- [ ] Icons vs background: AA minimum
- [ ] Disabled states clairs

### Keyboard Navigation
- [ ] Tab order logique
- [ ] Focus trap dans modal
- [ ] Escape ferme modal
- [ ] Enter envoie message

## 🎭 États Spéciaux

### Error States
- [ ] Border rouge subtile
- [ ] Background rouge transparent
- [ ] Message d'erreur visible
- [ ] Icon d'erreur appropriée

### Success States
- [ ] Feedback visuel clair
- [ ] Pas intrusif
- [ ] Disparaît automatiquement

### Disabled States
- [ ] Opacity réduite
- [ ] Cursor not-allowed
- [ ] Pas d'interaction
- [ ] Visuel clair

---

## 📊 Score de Qualité

**Objectif**: ✅ 100% des checks passés

### Priorités
- 🔴 **P0 (Bloquant)**: Layout, Responsive, Fonctionnalités de base
- 🟡 **P1 (Important)**: Animations, Micro-interactions, Polish
- 🟢 **P2 (Nice to have)**: Détails, Edge cases

### Validation
- [ ] Tests desktop (Chrome) ✅
- [ ] Tests desktop (Firefox) ✅
- [ ] Tests desktop (Safari) ✅
- [ ] Tests mobile (iOS) ✅
- [ ] Tests mobile (Android) ✅
- [ ] Tests accessibilité ✅
- [ ] Tests performance ✅

---

**Note**: Utiliser DevTools pour ralentir les animations (6x slower) et bien observer chaque détail.

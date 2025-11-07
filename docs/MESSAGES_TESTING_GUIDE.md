# Guide de Test - Modal Messagerie 🧪

## 🎯 Tests à Effectuer

### 1. Test de la Taille du Modal

**Ce qui doit fonctionner :**
- ✅ Le modal messagerie doit avoir la même largeur que le modal favoris (720px)
- ✅ Le modal doit prendre toute la hauteur de l'écran (100dvh)
- ✅ Le modal doit s'ouvrir depuis la droite (comme favoris)

**Comment tester :**
1. Ouvrir le modal favoris → noter la largeur
2. Ouvrir le modal messagerie → vérifier qu'il a la même largeur
3. Comparer visuellement les deux modals côte à côte

---

### 2. Test du Scroll de la Liste de Conversations

**Ce qui doit fonctionner :**
- ✅ La liste de conversations doit scroller si elle contient plus d'éléments que la hauteur disponible
- ✅ Le header avec la recherche doit rester fixe en haut
- ✅ La scrollbar doit être visible et stylisée

**Comment tester :**
1. Ajouter plusieurs conversations (minimum 10-15)
2. Vérifier que la liste scroll
3. Vérifier que le header reste en place
4. Tester le scroll avec la molette et le trackpad

**Code JS pour tester :**
```javascript
// Dans la console du navigateur
// Ajouter des conversations de test
const list = document.querySelector('.conversations-list');
for (let i = 0; i < 20; i++) {
  const item = document.querySelector('.conversation-item').cloneNode(true);
  list.appendChild(item);
}
```

---

### 3. Test du Scroll des Messages

**Ce qui doit fonctionner :**
- ✅ Les messages doivent scroller dans la zone de chat
- ✅ Le header du chat doit rester fixe en haut
- ✅ La zone de saisie doit rester fixe en bas
- ✅ La scrollbar doit être visible

**Comment tester :**
1. Ouvrir une conversation
2. Ajouter plusieurs messages (minimum 20)
3. Vérifier que les messages scrollent
4. Vérifier que le header et l'input restent fixes

**Code JS pour tester :**
```javascript
// Dans la console
const messagesContainer = document.querySelector('.chat-panel__messages');
for (let i = 0; i < 30; i++) {
  const msg = document.querySelector('.message-row').cloneNode(true);
  messagesContainer.appendChild(msg);
}
```

---

### 4. Test des Boutons d'Action

#### Bouton Pièce Jointe (📎)

**Ce qui doit fonctionner :**
- ✅ Le bouton doit être visible et cliquable
- ✅ Hover : changement de background
- ✅ Taille : 44x44px (zone de touch suffisante)
- ✅ État désactivé visible si disabled

**Comment tester :**
1. Survoler le bouton → vérifier le hover effect
2. Cliquer → vérifier l'interaction
3. Vérifier la taille avec DevTools

#### Bouton Envoyer

**Ce qui doit fonctionner :**
- ✅ Le bouton doit être visible avec la couleur brand (#ff4d6d)
- ✅ Hover : lift effect (translateY) + changement de shadow
- ✅ Active : retour à la position normale
- ✅ Disabled : opacity 0.5 + no pointer
- ✅ Hauteur : 44px (aligné avec attach button)

**Comment tester :**
1. Survoler le bouton → vérifier l'animation de lift
2. Cliquer → vérifier le feedback visuel
3. Taper du texte puis vérifier que le bouton s'active
4. Vider le texte → vérifier que le bouton se désactive

---

### 5. Test du Textarea

**Ce qui doit fonctionner :**
- ✅ Placeholder visible
- ✅ Focus : border brand + shadow + background blanc
- ✅ Resize vertical automatique (min 44px, max 140px)
- ✅ Line-height confortable (1.5)

**Comment tester :**
1. Cliquer dans le textarea → vérifier le focus state
2. Taper plusieurs lignes → vérifier l'auto-resize
3. Vérifier qu'il ne dépasse pas 140px de hauteur
4. Shift+Enter pour nouvelle ligne

**Raccourcis à tester :**
- Enter : envoyer le message
- Shift+Enter : nouvelle ligne
- Escape : fermer le modal

---

### 6. Test Responsive Mobile

**Breakpoint : 640px**

**Ce qui doit fonctionner :**
- ✅ Modal plein écran sur mobile
- ✅ Miniatures réduites à 64x64px
- ✅ Boutons adaptés
- ✅ Scroll fluide

**Comment tester :**
1. Ouvrir DevTools
2. Passer en mode responsive (Ctrl+Shift+M)
3. Tester différentes tailles : 375px, 414px, 768px
4. Vérifier que tout reste accessible

---

### 7. Test du Comportement Flex

**Ce qui NE doit PAS se passer :**
- ❌ Le header ne doit PAS se compresser
- ❌ L'input ne doit PAS disparaître
- ❌ Les conversations ne doivent PAS déborder
- ❌ Les messages ne doivent PAS déborder

**Comment tester :**
1. Redimensionner la fenêtre du navigateur
2. Vérifier que les zones scrollables s'adaptent
3. Vérifier que header et input restent visibles

---

## 🎨 Tests Visuels

### Alignement et Espacements

**À vérifier :**
```
Header
  padding: 16px 20px
  border-bottom: 1px solid

Liste
  items avec border-bottom
  padding: 16px 24px
  
Chat Input
  padding: 16px 20px
  gap: 10px entre éléments
  
Boutons
  attach: 44x44px
  send: height 44px
  gap: 10px entre eux
```

### Couleurs

**À vérifier :**
```
Background liste: #f8f9fa
Background surface: #ffffff
Border: #e2e8f0
Accent (send button): #ff4d6d
Text primary: #0f172a
Text secondary: #64748b
Text tertiary: #94a3b8
```

---

## 🧪 Tests d'Interaction

### Scénario 1 : Consultation de Conversations
1. Ouvrir le modal
2. Scroller dans la liste
3. Cliquer sur une conversation
4. Vérifier l'affichage du chat

### Scénario 2 : Envoi d'un Message
1. Ouvrir une conversation
2. Taper un message
3. Cliquer sur Envoyer
4. Vérifier l'envoi

### Scénario 3 : Ajout de Pièce Jointe
1. Cliquer sur le bouton 📎
2. Sélectionner un fichier
3. Vérifier l'aperçu
4. Envoyer

### Scénario 4 : Navigation
1. Ouvrir le chat
2. Cliquer sur retour (←)
3. Retourner à la liste
4. Sélectionner une autre conversation

---

## 🐛 Bugs Potentiels à Surveiller

### Problème de Scroll

**Symptôme :** La liste ne scroll pas

**Vérifier :**
```css
.conversations-list {
  flex: 1; /* ✓ */
  overflow-y: auto; /* ✓ */
  min-height: 0; /* ✓ Important ! */
}

.messages-conversations {
  min-height: 0; /* ✓ Important ! */
}
```

### Boutons Non Cliquables

**Symptôme :** Les boutons ne répondent pas

**Vérifier :**
- Z-index conflicts
- Pointer-events
- Overlays qui bloquent

### Input Caché

**Symptôme :** La zone de saisie n'est pas visible

**Vérifier :**
```css
.chat-panel__input {
  flex-shrink: 0; /* ✓ Ne doit pas être compressé */
}
```

---

## ✅ Checklist Complète

### Visuel
- [ ] Modal 720px de largeur
- [ ] Hauteur 100dvh
- [ ] Couleurs cohérentes avec l'app
- [ ] Typographie claire
- [ ] Espacements réguliers

### Scroll
- [ ] Liste de conversations scroll
- [ ] Messages de chat scroll
- [ ] Header reste fixe (conversations)
- [ ] Header reste fixe (chat)
- [ ] Input reste fixe en bas

### Boutons
- [ ] Bouton pièce jointe visible
- [ ] Bouton pièce jointe cliquable
- [ ] Bouton envoyer visible
- [ ] Bouton envoyer cliquable
- [ ] Hover effects fonctionnent
- [ ] États disabled visibles

### Interactions
- [ ] Focus dans textarea
- [ ] Placeholder visible
- [ ] Auto-resize du textarea
- [ ] Navigation clavier (Tab)
- [ ] Escape ferme le modal

### Responsive
- [ ] Desktop (>640px) OK
- [ ] Mobile (<640px) OK
- [ ] Tablet (768px) OK
- [ ] Pas de débordement horizontal

### Performance
- [ ] Scroll fluide
- [ ] Animations fluides
- [ ] Pas de lag au hover
- [ ] Chargement rapide

---

## 🔧 DevTools Tips

### Vérifier les Hauteurs

```javascript
// Dans la console
const modal = document.querySelector('.mm-modal--messages');
const list = document.querySelector('.conversations-list');
const chat = document.querySelector('.chat-panel__messages');

console.log('Modal height:', modal.offsetHeight);
console.log('List height:', list.offsetHeight);
console.log('List scrollHeight:', list.scrollHeight);
console.log('Chat height:', chat.offsetHeight);
console.log('Chat scrollHeight:', chat.scrollHeight);
```

### Vérifier le Scroll

```javascript
// La liste est-elle scrollable ?
const list = document.querySelector('.conversations-list');
console.log('Scrollable:', list.scrollHeight > list.clientHeight);

// Les messages sont-ils scrollables ?
const chat = document.querySelector('.chat-panel__messages');
console.log('Scrollable:', chat.scrollHeight > chat.clientHeight);
```

### Forcer le Scroll

```javascript
// Scroller en bas de la liste
list.scrollTop = list.scrollHeight;

// Scroller en bas du chat
chat.scrollTop = chat.scrollHeight;
```

---

## 📊 Résultats Attendus

✅ **Success** : Tous les tests passent  
⚠️ **Warning** : Tests passent mais avec des ajustements mineurs nécessaires  
❌ **Fail** : Tests échouent, corrections nécessaires

---

**Bonne chance avec les tests ! 🚀**

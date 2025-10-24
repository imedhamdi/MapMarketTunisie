# 📍 Fonctionnalité de Sauvegarde de Localisation

## ✅ Modifications effectuées

### 1. **Backend - Modèle User** (`src/models/user.model.js`)
- ✅ Ajout du champ `lastUpdated` dans `LocationSchema`
- Stocke la date de dernière mise à jour de la position

### 2. **Backend - Controller** (`src/controllers/user.controller.js`)
- ✅ Modification de `applyLocation()` pour mettre à jour `lastUpdated` quand les coords changent
- ✅ Nouvelle fonction `updateLocation()` pour sauvegarder lat/lng/radiusKm
- Endpoint: `POST /api/user/me/location`

### 3. **Backend - Validator** (`src/validators/user.schema.js`)
- ✅ Mise à jour de `updateLocationSchema` pour accepter `{ lat, lng, radiusKm }`

### 4. **Backend - Routes** (`src/routes/user.routes.js`)
- ✅ Route déjà existante : `POST /me/location`

### 5. **Frontend - JavaScript** (`public/index.html`)

#### Nouvelles fonctions ajoutées :

**`saveLocationToAPI(lat, lng, radiusKm)`**
- Sauvegarde la position dans la BDD via l'API
- Appelée après géolocalisation réussie

**`loadSavedLocation()`**
- Charge la position sauvegardée depuis `/api/auth/me`
- Retourne `{ lat, lng, radiusKm, lastUpdated }`

**`checkAndUpdateLocation(savedLocation, currentLat, currentLng)`**
- Compare la position actuelle avec la sauvegarde
- Retourne `true` si distance > 10km (nécessite mise à jour)
- Retourne `false` si position similaire

**`autoLoadSavedLocation()`**
- Appelée automatiquement au chargement de la page (après 500ms)
- Restaure la position sauvegardée
- Vérifie en arrière-plan si la position a changé de +10km
- Met à jour silencieusement si nécessaire

#### Modifications dans `startLocate()` :
- Vérifie si la position doit être sauvegardée (nouveau ou changement > 10km)
- Sauvegarde automatiquement dans la BDD
- Toast confirmant "Position détectée ✅"

## 🎯 Comportement de l'utilisateur

### Scénario 1 : Premier clic sur "Me localiser"
1. L'utilisateur clique sur "Me localiser"
2. Le navigateur demande la permission de géolocalisation
3. La position est détectée
4. **Sauvegardée automatiquement dans la BDD**
5. Toast: "Position détectée ✅"

### Scénario 2 : Retour sur la page (même position)
1. La page se charge
2. **Position automatiquement restaurée depuis la BDD** (après 500ms)
3. Vérification en arrière-plan: position actuelle vs sauvegardée
4. Si distance < 10km → Pas de mise à jour
5. L'utilisateur voit directement sa zone sur la carte

### Scénario 3 : L'utilisateur a changé de ville (+10km)
1. La page se charge
2. Position restaurée depuis la BDD
3. Vérification en arrière-plan détecte un changement > 10km
4. **Mise à jour silencieuse dans la BDD**
5. Carte ajustée automatiquement à la nouvelle position

### Scénario 4 : Clic manuel sur "Me localiser" (position différente)
1. L'utilisateur clique sur "Me localiser"
2. Position détectée
3. Comparaison avec la sauvegarde
4. Si > 10km → **Mise à jour dans la BDD**
5. Si < 10km → Pas de mise à jour (économie de requêtes)

## 🔧 Configuration

### Paramètres modifiables :

**Distance seuil** : Actuellement 10km
```javascript
if (distance > 10) { // Changer ici pour autre distance
```

**Délai de chargement auto** : Actuellement 500ms
```javascript
setTimeout(autoLoadSavedLocation, 500); // Changer ici
```

**Cache de géolocalisation** : 5 minutes
```javascript
maximumAge: 300000 // 5 min en millisecondes
```

## 📊 Données sauvegardées

Structure dans MongoDB (user.location) :
```json
{
  "coords": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "radiusKm": 10,
  "consent": true,
  "lastUpdated": "2025-10-24T14:30:00.000Z"
}
```

## 🔐 Sécurité

- ✅ Authentification requise (`authRequired` middleware)
- ✅ Validation Joi des coordonnées
- ✅ Cookies httpOnly pour les tokens
- ✅ Consent explicite (consent: true)

## 🚀 Pour tester

1. Démarrer le serveur : `npm run dev`
2. Se connecter à l'application
3. Cliquer sur "Me localiser"
4. Vérifier dans la console : "Position sauvegardée dans la BDD"
5. Rafraîchir la page
6. Vérifier dans la console : "Position sauvegardée trouvée, restauration..."

## 📝 Logs de débogage

Console logs ajoutés :
- ✅ "Position sauvegardée dans la BDD"
- ✅ "Position sauvegardée trouvée, restauration..."
- ✅ "Position a changé de X km, mise à jour..."
- ✅ "Position similaire (X km), pas de mise à jour nécessaire"
- ✅ "Position actuelle différente, mise à jour silencieuse..."

## 💡 Améliorations futures possibles

1. Ajouter un indicateur visuel "Position sauvegardée" dans l'UI
2. Permettre à l'utilisateur de désactiver l'auto-localisation
3. Historique des positions (pour analytics)
4. Notification si la position a été restaurée automatiquement
5. Option pour "Oublier ma position"

# Fonctionnalité de Sauvegarde de Localisation Utilisateur

## 📋 Résumé des Modifications

Cette fonctionnalité permet de sauvegarder automatiquement les coordonnées et le nom de la ville de l'utilisateur lorsqu'il clique sur le bouton "Me localiser".

## ✅ Fonctionnalités Implémentées

### 1. Modèle de Données (User)
Le modèle `User` contient déjà un schéma `LocationSchema` avec :
- ✅ **city** : Nom de la ville (String)
- ✅ **coords** : Coordonnées géographiques (GeoJSON Point: [longitude, latitude])
- ✅ **radiusKm** : Rayon de recherche en km (Number, défaut: 10)
- ✅ **consent** : Consentement de géolocalisation (Boolean)
- ✅ **lastUpdated** : Date de dernière mise à jour (Date)

### 2. Backend - API Controller (`src/controllers/user.controller.js`)

#### Nouvelles Fonctions Ajoutées :

**`calculateDistance(lat1, lng1, lat2, lng2)`**
- Calcule la distance entre deux points géographiques en kilomètres
- Utilise la formule de Haversine
- Permet de détecter les changements significatifs de position

**`getCityFromCoords(lat, lng)`**
- Effectue un géocodage inverse via Nominatim (OpenStreetMap)
- Récupère automatiquement le nom de la ville
- Gère les erreurs avec un fallback gracieux

#### Fonction Modifiée :

**`updateLocation(req, res)`**
- Vérifie si les coordonnées ont vraiment changé (seuil: 10 mètres)
- Récupère automatiquement le nom de la ville via géocodage inverse
- Met à jour uniquement si nécessaire (évite les écritures inutiles en base)
- Retourne un message personnalisé avec le nom de la ville
- Support des deux formats d'API (legacy et nouveau)

### 3. Frontend - Interface JavaScript (`public/js/app.js`)

#### Fonction Modifiée :

**`saveLocationToAPI(lat, lng, radiusKm)`**
- Maintenant retourne les données complètes de localisation (incluant la ville)
- Permet au frontend de récupérer le nom de la ville après sauvegarde

**`startLocate()`**
- Affiche le nom de la ville dans le toast de notification
- Message personnalisé : "Position détectée: {NomVille} ✅"
- Gère l'absence de nom de ville avec un message par défaut

## 🔄 Flux de Fonctionnement

1. **L'utilisateur clique sur "Me localiser"** 📍
   
2. **Le navigateur récupère les coordonnées GPS** 🌍
   
3. **Vérification de changement** 🔍
   - Compare avec la position sauvegardée
   - Seuil: 10 mètres (évite les micro-mouvements)
   
4. **Si changement détecté** ✨
   - Appel API: `POST /api/user/me/location`
   - Backend effectue un géocodage inverse (Nominatim)
   - Récupération automatique du nom de la ville
   - Sauvegarde en base de données avec `lastUpdated`
   
5. **Affichage du résultat** 🎉
   - Toast avec le nom de la ville : "Position détectée: Tunis ✅"
   - Carte centrée sur la position
   - Cercle de rayon affiché

6. **Si pas de changement** 💤
   - Mise à jour uniquement du rayon si modifié
   - Message : "Localisation inchangée"

## 🎯 Avantages

### Performance
- ✅ Évite les appels API inutiles (seuil de 10 mètres)
- ✅ Pas de géocodage inverse si position inchangée
- ✅ Cache de la position sauvegardée

### Expérience Utilisateur
- ✅ Affichage du nom de la ville dans le toast
- ✅ Feedback immédiat et personnalisé
- ✅ Auto-chargement de la position au démarrage

### Données
- ✅ Historique via `lastUpdated`
- ✅ Validation des coordonnées (modèle Mongoose)
- ✅ Index géospatial 2dsphere pour les requêtes de proximité

## 🧪 Tests

Un fichier de tests d'intégration a été créé :
`tests/integration/locationUpdate.test.js`

### Scénarios testés :
1. ✅ Enregistrement de localisation avec ville
2. ✅ Non-mise à jour si coordonnées inchangées (< 10m)
3. ✅ Mise à jour si changement significatif
4. ✅ Récupération via GET /api/auth/me

### Lancer les tests :
```bash
npm test -- locationUpdate.test.js
```

## 📝 Exemple d'Utilisation

### Requête API
```bash
POST /api/user/me/location
Content-Type: application/json
Cookie: accessToken=...

{
  "lat": 36.8065,
  "lng": 10.1815,
  "radiusKm": 15
}
```

### Réponse
```json
{
  "success": true,
  "message": "Localisation enregistrée: Tunis",
  "data": {
    "location": {
      "city": "Tunis",
      "coords": {
        "type": "Point",
        "coordinates": [10.1815, 36.8065]
      },
      "radiusKm": 15,
      "consent": true,
      "lastUpdated": "2025-11-06T10:30:00.000Z"
    }
  }
}
```

## 🔧 Configuration

### Service de Géocodage
- **Provider** : Nominatim (OpenStreetMap)
- **Endpoint** : `https://nominatim.openstreetmap.org/reverse`
- **Language** : Français (`Accept-Language: fr`)
- **User-Agent** : `MapMarketTunisie/1.0`

### Seuils
- **Distance minimale pour mise à jour** : 10 mètres (0.01 km)
- **Timeout géolocalisation navigateur** : 12 secondes
- **Rayon par défaut** : 10 km
- **Rayon max** : 100 km

## 📊 Structure de Données

```javascript
user.location = {
  city: "Tunis",              // Nom de la ville (auto)
  coords: {
    type: "Point",
    coordinates: [10.1815, 36.8065]  // [lng, lat]
  },
  radiusKm: 15,              // Rayon de recherche
  consent: true,             // Consentement géoloc
  lastUpdated: Date          // Date de dernière MAJ
}
```

## 🚀 Déploiement

Aucune migration de base de données nécessaire car :
- Le schéma `LocationSchema` existait déjà
- Tous les champs sont optionnels
- Compatible avec les données existantes

## 🔐 Sécurité

- ✅ Validation Joi des coordonnées
- ✅ Middleware d'authentification requis
- ✅ Sanitization des inputs (city)
- ✅ Rate limiting sur les endpoints API
- ✅ CORS et credentials configurés

## 📌 Points d'Attention

1. **Nominatim Rate Limiting**
   - Limite : ~1 requête/seconde
   - Pour usage intensif, envisager un cache ou Mapbox/Google Maps API

2. **Géolocalisation Navigateur**
   - Nécessite HTTPS en production
   - Permission utilisateur requise
   - Précision variable selon l'appareil

3. **Index Géospatial**
   - Déjà configuré : `UserSchema.index({ 'location.coords': '2dsphere' })`
   - Permet les requêtes de proximité ($near, $geoWithin)

## 🎨 Interface Utilisateur

Le bouton "Me localiser" affiche maintenant :
- 📍 Icône de localisation
- ⏳ Spinner pendant le chargement
- ✅ Toast avec le nom de la ville
- 🔽 Dropdown pour le rayon de recherche

## 🔄 Compatibilité

- ✅ Compatible avec l'ancien format d'API
- ✅ Fonctionne sans la ville (fallback gracieux)
- ✅ Auto-chargement de la position sauvegardée
- ✅ Synchronisation avec les filtres de carte

## 📚 Documentation API

### Endpoint: `POST /api/user/me/location`
**Authentification** : Requise (Cookie)

**Body** :
- `lat` (Number, required) : Latitude (-90 à 90)
- `lng` (Number, required) : Longitude (-180 à 180)
- `radiusKm` (Number, optional) : Rayon de recherche (1-100 km)

**Réponse** : Objet location avec ville auto-détectée

### Endpoint: `GET /api/auth/me`
**Authentification** : Requise

**Réponse** : Données utilisateur incluant `location`

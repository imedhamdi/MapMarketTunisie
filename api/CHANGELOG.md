# Changelog - Refactoring MapMarket API

## [1.0.0] - 2025-10-25

### 🎉 Refactoring Majeur Production-Ready

#### ✨ Nouvelles Fonctionnalités

##### Logging Professionnel
- Ajout de Winston pour logging structuré
- Rotation automatique des fichiers de logs (14 jours)
- Logs différenciés par niveau (debug, info, warn, error)
- Séparation des logs d'erreur
- Logging des requêtes HTTP avec durée
- Méthodes utilitaires: `logRequest()`, `logError()`, `logDB()`

**Fichiers:**
- ✨ `src/config/logger.js`
- ✨ `src/middlewares/requestLogger.js`

##### Services Métier
- Création de la couche service (business logic)
- Séparation claire des responsabilités
- Code réutilisable et testable

**Fichiers:**
- ✨ `src/services/ad.service.js` - Service des annonces
- ✨ `src/services/user.service.js` - Service utilisateurs
- ✨ `src/services/auth.service.js` - Service authentification

**Fonctions principales:**
- `adService.createAd()`, `listAds()`, `updateAd()`, `deleteAd()`
- `userService.createUser()`, `updateProfile()`, `updateLocation()`
- `authService.signup()`, `login()`, `refresh()`, `resetPassword()`

##### Constantes Centralisées
- Fichier unique pour toutes les constantes
- Elimination des "magic numbers" et "magic strings"
- Documentation inline

**Fichier:**
- ✨ `src/config/constants.js`

**Constantes disponibles:**
- `HTTP_STATUS` - Codes HTTP
- `AD_STATUS`, `AD_CATEGORY`, `AD_CONDITION`
- `USER_ROLE`, `PAGINATION`, `CONTENT_LIMITS`
- `RATE_LIMIT`, `ERROR_MESSAGES`, etc.

##### Gestion d'Erreurs
- Wrapper `asyncHandler` pour éliminer try/catch
- Classe `ApiError` personnalisée
- Factory `createError` pour erreurs typées

**Fichier:**
- ✨ `src/utils/asyncHandler.js`

**Exports:**
- `asyncHandler(fn)` - Wrapper de fonction async
- `ApiError` - Classe d'erreur personnalisée
- `createError.*` - Factory d'erreurs

##### Sanitization
- Middleware global de sanitization
- Protection XSS automatique
- Sanitization récursive des objets

**Fichier:**
- ✨ `src/middlewares/sanitize.js`

##### Health Checks
- Endpoints de monitoring pour orchestrateurs
- Vérification état MongoDB
- Métriques système (CPU, mémoire, uptime)

**Fichiers:**
- ✨ `src/controllers/health.controller.js`
- ✨ `src/routes/health.routes.js`

**Endpoints:**
- `GET /health` - Health check basique
- `GET /ready` - Readiness probe
- `GET /metrics` - Métriques système

#### ♻️ Améliorations

##### Configuration
- Validation stricte des variables d'environnement
- Erreurs explicites en production si config manquante
- Suppression des valeurs par défaut sensibles

**Fichier modifié:**
- ♻️ `src/config/env.js`

##### Serveur
- Graceful shutdown (arrêt propre)
- Gestion des signaux SIGTERM/SIGINT
- Timeout de 10s pour fermeture
- Gestion des erreurs non capturées

**Fichier modifié:**
- ♻️ `src/server.js`

**Événements gérés:**
- `unhandledRejection`
- `uncaughtException`
- `SIGTERM`, `SIGINT`

##### Base de Données
- Logging des événements MongoDB
- Gestion de la reconnexion
- Logs d'erreur détaillés

**Fichier modifié:**
- ♻️ `src/db/mongoose.js`

##### Middleware d'Erreur
- Utilisation du logger Winston
- Utilisation des constantes HTTP_STATUS
- Messages d'erreur sécurisés en production

**Fichier modifié:**
- ♻️ `src/middlewares/error.js`

##### Application
- Ajout du middleware de sanitization
- Ajout du logger de requêtes
- Ajout des routes health
- Réorganisation de l'ordre des middlewares
- Suppression de morgan (remplacé par Winston)

**Fichier modifié:**
- ♻️ `src/app.js`

##### Controllers
- Nettoyage de tous les `console.log` de debug
- Utilisation du logger Winston
- Messages d'erreur via logger

**Fichiers modifiés:**
- ♻️ `src/controllers/ad.controller.js` (6 console.log retirés)
- ♻️ `src/controllers/user.controller.js` (4 console.log retirés)

#### 🗑️ Suppressions

##### Dépendances
- Suppression de `morgan` (remplacé par Winston)

##### Code
- Tous les `console.log` de debug retirés
- Code mort nettoyé

#### 📝 Documentation

**Nouveaux fichiers:**
- ✨ `REFACTORING_GUIDE.md` - Guide complet (500+ lignes)
- ✨ `REFACTORING_SUMMARY.md` - Résumé exécutif (300+ lignes)
- ✨ `GETTING_STARTED.md` - Guide de démarrage rapide
- ✨ `README_NEW.md` - README mis à jour
- ✨ `.env.example` - Mis à jour avec nouvelles variables

#### ✅ Qualité de Code

**Configuration:**
- ✨ `.eslintrc.json` - Configuration ESLint stricte

**Règles appliquées:**
- `no-console` (warn)
- `no-unused-vars` avec patterns
- `prefer-const`, `no-var`
- `prefer-arrow-callback`
- Style uniforme (quotes, semi, indent)

#### 📦 Dépendances

**Ajoutées:**
- `winston@^3.18.3` - Logging professionnel
- `winston-daily-rotate-file@^5.0.0` - Rotation logs

**Supprimées:**
- `morgan` - Remplacé par Winston

## Structure des Fichiers

### Nouveaux fichiers (15)

```
src/
├── config/
│   ├── constants.js          ✨ NOUVEAU
│   └── logger.js             ✨ NOUVEAU
├── controllers/
│   └── health.controller.js  ✨ NOUVEAU
├── middlewares/
│   ├── requestLogger.js      ✨ NOUVEAU
│   └── sanitize.js           ✨ NOUVEAU
├── routes/
│   └── health.routes.js      ✨ NOUVEAU
├── services/                 ✨ NOUVEAU DOSSIER
│   ├── ad.service.js
│   ├── auth.service.js
│   └── user.service.js
└── utils/
    └── asyncHandler.js       ✨ NOUVEAU

Documentation:
├── REFACTORING_GUIDE.md      ✨ NOUVEAU
├── REFACTORING_SUMMARY.md    ✨ NOUVEAU
├── GETTING_STARTED.md        ✨ NOUVEAU
└── README_NEW.md             ✨ NOUVEAU

Configuration:
├── .eslintrc.json            ✨ NOUVEAU
└── .env.example              ♻️ MIS À JOUR
```

### Fichiers modifiés (10+)

```
src/
├── config/
│   └── env.js                ♻️ Validation ajoutée
├── controllers/
│   ├── ad.controller.js      ♻️ Nettoyé
│   └── user.controller.js    ♻️ Nettoyé
├── db/
│   └── mongoose.js           ♻️ Logging ajouté
├── middlewares/
│   └── error.js              ♻️ Logger + constantes
├── app.js                    ♻️ Stack réorganisé
└── server.js                 ♻️ Lifecycle amélioré

package.json                  ♻️ Dépendances mises à jour
```

## Métriques

- **Lignes ajoutées**: ~2500+
- **Lignes modifiées**: ~500+
- **Fichiers créés**: 15+
- **Fichiers modifiés**: 10+
- **console.log retirés**: 15+
- **Services créés**: 3
- **Middlewares créés**: 2
- **Routes ajoutées**: 3 (health checks)

## Breaking Changes

Aucun breaking change pour les endpoints existants.

Les nouvelles fonctionnalités sont additives et rétrocompatibles.

## Migration

Si vous mettez à jour depuis une version antérieure :

1. **Installer nouvelles dépendances**
```bash
npm install
```

2. **Mettre à jour .env**
```bash
# Ajouter si nécessaire:
ENABLE_FILE_LOGS=false
```

3. **Vérifier les imports**
Si vous avez des controllers personnalisés :
```javascript
// Ancien
console.log('Info');

// Nouveau
import logger from '../config/logger.js';
logger.info('Info');
```

4. **Utiliser les services** (optionnel mais recommandé)
```javascript
import adService from '../services/ad.service.js';
const ads = await adService.listAds(filters);
```

## Notes de Version

### Compatibilité
- Node.js >= 18.18.0
- MongoDB >= 5.0
- Express 4.19.2

### Environnements Testés
- ✅ Development (local)
- ⚠️ Production (configuration requise)

### Performance
- Amélioration des requêtes DB avec services
- Logging asynchrone (pas de blocage)
- Sanitization optimisée

### Sécurité
- ✅ Validation environnement stricte
- ✅ Sanitization globale XSS
- ✅ Pas de secrets par défaut
- ✅ Logs d'audit complets

## Contributeurs

- **Refactoring Lead**: Équipe MapMarket
- **Date**: Octobre 2025
- **Durée**: Refactoring complet en 1 session

## Remerciements

Merci aux mainteneurs des libraries utilisées :
- Winston
- Express
- MongoDB/Mongoose
- Et tous les autres !

---

Pour plus de détails, voir:
- [REFACTORING_GUIDE.md](REFACTORING_GUIDE.md)
- [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)
- [GETTING_STARTED.md](GETTING_STARTED.md)

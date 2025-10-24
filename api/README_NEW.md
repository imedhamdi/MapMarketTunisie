# MapMarket API 🗺️

> Backend Node.js/Express production-ready pour MapMarket Tunisie - Plateforme de petites annonces géolocalisées

[![Node.js](https://img.shields.io/badge/Node.js-18.18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.6-green.svg)](https://www.mongodb.com/)

## 📋 Table des Matières

- [Caractéristiques](#-caractéristiques)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Routes](#️-api-routes)
- [Health Checks](#-health-checks)
- [Logging](#-logging)
- [Sécurité](#-sécurité)
- [Production](#-production)
- [Développement](#-développement)

## ✨ Caractéristiques

### Fonctionnalités Métier
- 🔐 **Authentification complète** - JWT avec refresh tokens
- 👤 **Gestion utilisateurs** - Profils, avatars, localisation
- 📢 **Annonces géolocalisées** - CRUD complet avec recherche avancée
- ⭐ **Système de favoris** - Gestion multi-utilisateurs
- 📧 **Reset password** - Email avec tokens sécurisés
- 🗺️ **Géolocalisation** - Support MongoDB GeoJSON

### Architecture & Qualité
- 🏗️ **Architecture en couches** - Services, Controllers, Routes
- 📝 **Logging professionnel** - Winston avec rotation
- 🛡️ **Sécurité renforcée** - Helmet, CORS, Rate limiting, Sanitization
- ⚡ **Performance optimisée** - Requêtes lean(), index MongoDB
- 🔍 **Health checks** - Monitoring Kubernetes-ready
- 📊 **Constantes centralisées** - Maintenance facilitée
- 🎯 **Gestion d'erreurs** - Middleware async handler
- ✅ **Code quality** - ESLint, standards stricts

## 🏗️ Architecture

```
api/
├── src/
│   ├── config/          # Configuration (env, logger, constants)
│   ├── controllers/     # Controllers (orchestration)
│   ├── services/        # Business logic
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── middlewares/     # Auth, validation, sanitization, logging
│   ├── utils/           # Helpers (crypto, responses, async)
│   ├── validators/      # Joi schemas
│   └── db/              # Database connection
├── logs/                # Winston logs (rotated)
├── uploads/             # User avatars
├── public/              # Frontend assets
└── tests/               # Tests (à venir)
```

## 🚀 Installation

### Prérequis
- Node.js >= 18.18.0
- MongoDB (local ou Atlas)
- npm ou yarn

### Setup

```bash
# Cloner le repository
git clone <repo-url>
cd MapMarketTunisie/api

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrer en développement
npm run dev

# Ou en production
npm start
```

## ⚙️ Configuration

### Variables d'Environnement

Créer un fichier `.env` basé sur `.env.example` :

```bash
# Environment
NODE_ENV=development

# Server
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGO_DB_NAME=mapmarket

# JWT (CHANGER EN PRODUCTION!)
JWT_ACCESS_SECRET=votre-secret-access-32-chars-min
JWT_REFRESH_SECRET=votre-secret-refresh-32-chars-min

# Email
SMTP_HOST=localhost
SMTP_PORT=1025

# Logging
ENABLE_FILE_LOGS=false
```

⚠️ **En production** :
- Générer des secrets JWT forts (32+ caractères)
- Configurer HTTPS
- Activer les logs fichiers
- Configurer un SMTP réel

## 🛣️ API Routes

### Authentication (`/api/auth`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/signup` | Créer un compte | - |
| POST | `/login` | Se connecter | - |
| POST | `/refresh` | Rafraîchir les tokens | Cookie |
| POST | `/logout` | Se déconnecter | - |
| POST | `/forgot-password` | Demander reset | - |
| POST | `/reset-password` | Réinitialiser MDP | - |
| GET | `/me` | Obtenir profil | Token |

### Users (`/api/users`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| PATCH | `/me` | Mettre à jour profil | Token |
| POST | `/me/location` | Mettre à jour localisation | Token |
| PATCH | `/me/avatar` | Upload avatar | Token |
| POST | `/me/favorites` | Gérer favoris | Token |
| DELETE | `/me` | Supprimer compte | Token |
| GET | `/me/stats` | Statistiques utilisateur | Token |
| GET | `/me/analytics` | Analytics détaillées | Token |
| POST | `/me/change-password` | Changer MDP | Token |

### Ads (`/api/ads`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Liste des annonces | - |
| POST | `/` | Créer annonce | Token |
| GET | `/:id` | Détails annonce | - |
| PATCH | `/:id` | Modifier annonce | Propriétaire |
| DELETE | `/:id` | Supprimer annonce | Propriétaire |

### Geocoding (`/api/geocode`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/search` | Recherche d'adresse | - |
| GET | `/reverse` | Géocodage inversé | - |

## 🏥 Health Checks

| Endpoint | Description | Usage |
|----------|-------------|-------|
| `/health` | Santé basique | Liveness probe |
| `/ready` | État complet (DB, mémoire) | Readiness probe |
| `/metrics` | Métriques système | Monitoring |

Exemples :

```bash
# Health check
curl http://localhost:4000/health

# Readiness (Kubernetes)
curl http://localhost:4000/ready

# Métriques
curl http://localhost:4000/metrics
```

Réponses :

```json
{
  "status": "success",
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-25T00:00:00.000Z",
    "uptime": 3600
  }
}
```

## 📝 Logging

### Configuration Winston

Logs structurés avec rotation automatique :

```javascript
import logger from './config/logger.js';

// Différents niveaux
logger.info('Message informatif', { userId, action });
logger.error('Erreur critique', { error: err.message });
logger.warn('Avertissement', { context });
logger.debug('Debug info', { data });

// Méthodes utilitaires
logger.logRequest(req, res, duration);
logger.logError(error, context);
logger.logDB('operation', 'collection', duration);
```

### Fichiers de Logs

En production (avec `ENABLE_FILE_LOGS=true`) :

```
logs/
├── combined-2025-10-25.log  # Tous les logs
├── error-2025-10-25.log     # Erreurs uniquement
└── ...                      # Rotation 14 jours
```

Consulter les logs :

```bash
# En temps réel
tail -f logs/combined-*.log

# Erreurs uniquement
tail -f logs/error-*.log

# Recherche
grep "error" logs/combined-*.log | jq .
```

## 🔒 Sécurité

### Mesures Implémentées

- ✅ **Helmet** - Headers de sécurité HTTP
- ✅ **CORS** - Origines contrôlées
- ✅ **Rate Limiting** - Protection contre brute-force
- ✅ **HPP** - Protection contre parameter pollution
- ✅ **Sanitization** - Protection XSS automatique
- ✅ **JWT** - Tokens signés avec secrets forts
- ✅ **Validation** - Joi schemas stricts
- ✅ **Cookies httpOnly** - Protection contre XSS

### Rate Limits

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Général | 1000 req | 15 min |
| Auth | 50 req | 1 min |
| Forgot password | 10 req | 15 min |

### Variables Sensibles

⚠️ Ne jamais commiter :
- `.env`
- Secrets JWT
- Credentials MongoDB
- Clés SMTP

## 🚀 Production

### Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Secrets JWT générés (32+ chars)
- [ ] MongoDB URI de production
- [ ] SMTP configuré
- [ ] HTTPS activé
- [ ] Logs fichiers activés
- [ ] Health checks testés
- [ ] Monitoring en place
- [ ] Backups configurés
- [ ] Rate limits ajustés

### Commandes

```bash
# Production
NODE_ENV=production npm start

# Avec PM2
pm2 start src/server.js --name mapmarket-api

# Docker
docker build -t mapmarket-api .
docker run -p 4000:4000 mapmarket-api
```

### Monitoring

Intégrations recommandées :
- APM : New Relic, DataDog, Sentry
- Logs : ELK Stack, Splunk
- Metrics : Prometheus + Grafana

## 👨‍💻 Développement

### Scripts Disponibles

```bash
npm run dev      # Développement avec nodemon
npm start        # Production
npm run lint     # Vérifier le code
npm run lint --fix  # Corriger auto
```

### Standards de Code

ESLint configuré avec :
- ES2022+
- Modules ESM
- Single quotes
- Semi-colons obligatoires
- Indentation 2 espaces
- No console.log (sauf warn/error)

### Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Tests

```bash
# À venir
npm test
npm run test:coverage
npm run test:watch
```

## 📚 Documentation

- [Guide de Refactoring](REFACTORING_GUIDE.md) - Documentation détaillée du refactoring
- [Résumé des Changements](REFACTORING_SUMMARY.md) - Résumé exécutif
- [Troubleshooting Service Worker](SERVICE_WORKER_TROUBLESHOOTING.md) - Debug PWA

## 🤝 Support

Pour toute question :
- 📧 Email : support@mapmarket.tn
- 🐛 Issues : [GitHub Issues](https://github.com/your-org/mapmarket/issues)

## 📄 License

MIT © MapMarket Tunisie

---

**Fait avec ❤️ par l'équipe MapMarket**

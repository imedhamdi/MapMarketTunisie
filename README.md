# 🗺️ MapMarket Tunisie

Application web de petites annonces géolocalisées pour la Tunisie.

## 📁 Structure du projet

```
MapMarketTunisie/
├── 📂 src/                      # Code source du backend
│   ├── 📂 config/              # Configuration (env, logger, mailer, redis)
│   ├── 📂 controllers/         # Contrôleurs API (auth, user, ad, geocode, health, seo)
│   ├── 📂 db/                  # Configuration base de données (mongoose)
│   ├── 📂 middlewares/         # Middlewares Express (auth, cache, error, rateLimit, etc.)
│   ├── 📂 models/              # Modèles Mongoose (User, Ad)
│   ├── 📂 routes/              # Routes API
│   ├── 📂 services/            # Logique métier (auth, user, ad, image)
│   ├── 📂 utils/               # Utilitaires (crypto, tokens, responses, geoHelpers)
│   ├── 📂 validators/          # Schémas de validation Joi
│   ├── 📄 app.js               # Configuration Express
│   └── 📄 server.js            # Point d'entrée du serveur
│
├── 📂 public/                   # Fichiers statiques (frontend)
│   ├── 📂 css/                 # Styles CSS sources
│   │   ├── 📂 modules/         # Modules CSS (header, footer, cards, modals, etc.)
│   │   ├── 📂 tokens/          # Tokens CSS (variables de design)
│   │   ├── 📄 app.css          # CSS principal
│   │   └── 📄 tokens.css       # CSS des tokens
│   ├── 📂 dist/                # Fichiers CSS/JS minifiés (générés par build)
│   ├── 📂 icons/               # Icônes et favicons
│   ├── 📂 js/                  # Scripts JavaScript
│   ├── 📂 vendor/              # Bibliothèques tierces
│   ├── 📄 index.html           # Page HTML principale
│   ├── 📄 manifest.webmanifest # Manifest PWA
│   ├── 📄 runtime-config.js    # Configuration runtime
│   └── 📄 sw.js                # Service Worker
│
├── 📂 scripts/                  # Scripts utilitaires
│   ├── 📄 build-js.mjs         # Build JavaScript avec esbuild
│   ├── 📄 backup-mongodb.sh    # Sauvegarde MongoDB
│   ├── 📄 restore-mongodb.sh   # Restauration MongoDB
│   ├── 📄 seed.js              # Seed de données
│   ├── 📄 seed-large.js        # Seed de données large
│   └── 📄 clean-console-logs.sh # Nettoyage des console.log
│
├── 📂 tests/                    # Tests
│   └── 📂 integration/         # Tests d'intégration
│       └── 📄 changePassword.test.js
│
├── 📂 uploads/                  # Fichiers uploadés (ignorés par Git)
│   ├── 📂 avatars/             # Photos de profil
│   └── 📂 ads/                 # Images d'annonces
│
├── 📂 backups/                  # Sauvegardes MongoDB (ignorées par Git)
│   └── 📂 mongodb/
│
├── 📂 docs/                     # Documentation
│   ├── 📄 PROFILE_MODAL_MIGRATION.md
│   └── 📄 RESPONSIVE_IMPROVEMENTS.md
│
├── 📂 .husky/                   # Git hooks
│
├── 📄 .env                      # Variables d'environnement (local)
├── 📄 .env.example              # Template des variables d'environnement
├── 📄 .env.staging              # Variables d'environnement (staging)
├── 📄 .eslintrc.json            # Configuration ESLint
├── 📄 .eslintignore             # Fichiers ignorés par ESLint
├── 📄 .prettierrc               # Configuration Prettier
├── 📄 .prettierignore           # Fichiers ignorés par Prettier
├── 📄 .lintstagedrc             # Configuration lint-staged
├── 📄 .gitignore                # Fichiers ignorés par Git
├── 📄 postcss.config.cjs        # Configuration PostCSS
├── 📄 package.json              # Dépendances et scripts npm
└── 📄 README.md                 # Ce fichier
```

## 🚀 Installation

```bash
# Cloner le projet
git clone https://github.com/imedhamdi/MapMarketTunisie.git
cd MapMarketTunisie

# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrer MongoDB (assurez-vous que MongoDB est installé)
# Linux/Mac:
sudo systemctl start mongodb
# Ou avec Docker:
docker run -d -p 27017:27017 mongo

# Lancer le serveur en mode développement
npm run dev
```

## 📜 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre le serveur en mode développement avec nodemon |
| `npm run dev:staging` | Démarre le serveur en mode staging |
| `npm start` | Démarre le serveur en production (après build) |
| `npm run build` | Build CSS et JS pour la production |
| `npm run build:css` | Build uniquement le CSS |
| `npm run build:js` | Build uniquement le JavaScript |
| `npm test` | Lance les tests |
| `npm run test:watch` | Lance les tests en mode watch |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run lint:fix` | Corrige automatiquement les erreurs ESLint |
| `npm run format` | Formate le code avec Prettier |
| `npm run seed` | Seed la base de données avec des données de test |
| `npm run backup` | Sauvegarde la base de données MongoDB |
| `npm run restore` | Restaure la base de données MongoDB |

## 🛠️ Technologies utilisées

### Backend
- **Node.js** (>=18.18.0) - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** + **Mongoose** - Base de données NoSQL
- **Redis** - Cache et sessions (optionnel)
- **JWT** - Authentification
- **Bcrypt** - Hachage de mots de passe
- **Multer** + **Sharp** - Upload et traitement d'images
- **Nodemailer** - Envoi d'emails
- **Winston** - Logging
- **Joi** - Validation de données
- **Helmet** - Sécurité HTTP
- **Express Rate Limit** - Rate limiting

### Frontend
- **HTML5** - Structure
- **CSS3** (PostCSS) - Styles avec modules CSS
- **JavaScript** (Vanilla) - Logique client
- **Leaflet.js** - Cartes interactives
- **MarkerCluster** - Clustering de marqueurs

### DevOps & Qualité
- **ESLint** + **Prettier** - Linting et formatage
- **Husky** + **lint-staged** - Git hooks
- **Mocha** + **Chai** + **Supertest** - Tests
- **esbuild** - Bundler JavaScript
- **PostCSS** + **cssnano** - Optimisation CSS

## 🔐 Variables d'environnement

Créer un fichier `.env` à la racine avec :

```env
# Server
NODE_ENV=development
PORT=3000
CLIENT_ORIGINS=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mapmarket

# Redis (optionnel)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=votre_secret_refresh_token_tres_long
REFRESH_TOKEN_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_application
EMAIL_FROM=noreply@mapmarket.tn

# Upload
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

## 🏗️ Architecture

### Backend API

L'API suit une architecture **MVC** (Model-View-Controller) avec séparation des responsabilités :

- **Models** : Définition des schémas de données (Mongoose)
- **Controllers** : Gestion des requêtes HTTP
- **Services** : Logique métier réutilisable
- **Middlewares** : Authentification, validation, gestion d'erreurs, etc.
- **Routes** : Définition des endpoints API
- **Validators** : Validation des données avec Joi

### Frontend

Frontend **SSR** (Server-Side Rendering) avec une approche **progressive** :

- HTML rendu côté serveur
- CSS modulaire avec PostCSS
- JavaScript vanilla pour l'interactivité
- PWA-ready avec Service Worker et manifest

### Sécurité

- ✅ Helmet pour les headers HTTP
- ✅ CORS configuré
- ✅ Rate limiting (protection DDoS)
- ✅ Validation et sanitization des inputs
- ✅ Protection CSRF
- ✅ Hachage bcrypt pour les mots de passe
- ✅ JWT pour l'authentification
- ✅ Content Security Policy (CSP)

## 📝 Conventions de code

- **Indentation** : 2 espaces
- **Quotes** : Single quotes (`'`)
- **Semi-colons** : Obligatoires
- **Naming** :
  - Variables/fonctions : `camelCase`
  - Classes/Modèles : `PascalCase`
  - Constantes : `UPPER_SNAKE_CASE`
  - Fichiers : `kebab-case.js` ou `camelCase.js`

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Lancer les tests en mode watch
npm run test:watch

# Lancer un test spécifique
npm run test:changePassword
```

## 📦 Build & Déploiement

```bash
# Build pour la production
npm run build

# Démarrer en production
npm start
```

## 🤝 Contribution

1. Créer une branche feature : `git checkout -b feature/ma-feature`
2. Commit les changements : `git commit -m 'Ajout de ma feature'`
3. Push vers la branche : `git push origin feature/ma-feature`
4. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👨‍�💻 Auteur

**Imed Hamdi** - [imedhamdi](https://github.com/imedhamdi)

## 🙏 Remerciements

- OpenStreetMap pour les cartes
- Leaflet.js pour la bibliothèque de cartes
- La communauté open-source

---

**MapMarket Tunisie** - Trouvez des annonces près de chez vous 🗺️

# 🚀 Guide de Développement - MapMarket API

## 📋 Table des matières

- [Environnements](#environnements)
- [Code Quality](#code-quality)
- [Seed Data](#seed-data)
- [Versioning API](#versioning-api)
- [Backup & Recovery](#backup--recovery)

---

## 🌍 Environnements

### Configuration

Le projet supporte 3 environnements:

- **Development** (`NODE_ENV=development`)
- **Staging** (`NODE_ENV=staging`)
- **Production** (`NODE_ENV=production`)

### Fichiers de configuration

```
.env              # Development (local)
.env.staging      # Staging
.env.production   # Production (à créer)
```

### Démarrage

```bash
# Development
npm run dev

# Staging
npm run dev:staging

# Production
npm start
```

---

## ✨ Code Quality

### Prettier

Formateur de code automatique configuré pour maintenir un style cohérent.

```bash
# Formater tout le code
npm run format

# Vérifier le formatage
npm run format:check
```

**Configuration:** `.prettierrc`

### ESLint

Linter pour détecter les erreurs et appliquer les meilleures pratiques.

```bash
# Linter le code
npm run lint

# Corriger automatiquement
npm run lint:fix
```

**Configuration:** `.eslintrc.json`

### Husky + Lint-staged

Pre-commit hooks pour garantir la qualité du code avant chaque commit.

**Ce qui est automatiquement vérifié:**
- ✅ Formatage Prettier
- ✅ Linting ESLint
- ✅ Correction automatique si possible

**Configuration:** `.husky/pre-commit` + `.lintstagedrc`

```bash
# Les hooks s'exécutent automatiquement à chaque commit
git add .
git commit -m "feat: nouvelle fonctionnalité"
# → Prettier et ESLint s'exécutent automatiquement
```

---

## 🌱 Seed Data

### Utilisation

Peupler la base de données avec des données de test:

```bash
npm run seed
```

**Contenu créé:**
- 👤 3 utilisateurs de test
- 📝 6 annonces dans différentes catégories
- 📍 Localisations réalistes (Tunis, Sfax, Sousse)

### Comptes de test

Après le seed, vous pouvez vous connecter avec:

```
Email: ahmed@test.tn
Password: Password123!

Email: fatma@test.tn
Password: Password123!

Email: karim@test.tn
Password: Password123!
```

### Personnalisation

Éditez `scripts/seed.js` pour ajouter vos propres données de test.

---

## 🔢 Versioning API

### Routes versionnées

L'API est maintenant versionnée pour faciliter les évolutions:

```
/api/v1/auth/*
/api/v1/users/*
/api/v1/ads/*
/api/v1/geocode/*
```

### Rétrocompatibilité

Les routes sans version continuent de fonctionner (deprecated):

```
/api/auth/*    → /api/v1/auth/*
/api/users/*   → /api/v1/users/*
/api/ads/*     → /api/v1/ads/*
/api/geocode/* → /api/v1/geocode/*
```

⚠️ **Recommandation:** Utilisez `/api/v1/*` dans vos nouvelles intégrations.

### Futures versions

Lors d'évolutions majeures, créez une nouvelle version:

```javascript
// src/routes/v2/index.js
import { Router } from 'express';
const router = Router();
// Nouvelles routes v2
export default router;

// src/app.js
app.use('/api/v2', apiV2Routes);
```

---

## 💾 Backup & Recovery

### Backup automatique

**Configuration du cron (production):**

```bash
# Backup quotidien à 2h00
crontab -e
0 2 * * * cd /path/to/mapmarket/api && npm run backup >> logs/backup.log 2>&1
```

### Backup manuel

```bash
# Créer un backup immédiatement
npm run backup

# Les backups sont sauvegardés dans:
# backups/mongodb/backup_YYYYMMDD_HHMMSS.tar.gz
```

### Restauration

```bash
# Lister les backups disponibles
ls -lh backups/mongodb/

# Restaurer un backup spécifique
npm run restore backups/mongodb/backup_20241027_143000.tar.gz
```

⚠️ **Attention:** La restauration écrase la base de données actuelle!

### Rétention

- Backups conservés pendant 7 jours par défaut
- Modifier `RETENTION_DAYS` dans `scripts/backup-mongodb.sh`

### Tests de restauration

**Recommandation:** Testez vos backups mensuellement

```bash
# Voir DISASTER_RECOVERY.md pour la procédure complète
```

### Disaster Recovery

Consultez `DISASTER_RECOVERY.md` pour:
- 🚨 Plan de récupération après sinistre
- 📋 Scénarios de défaillance
- ✅ Checklist de vérification
- 📞 Contacts d'urgence

---

## 🛠️ Utilitaires Géographiques

### Helpers centralisés

La logique de normalisation des coordonnées est maintenant centralisée dans `src/utils/geoHelpers.js`:

```javascript
import { 
  normalizeLocationValue,
  validateCoordinates,
  createGeoPoint 
} from '../utils/geoHelpers.js';

// Créer un point GeoJSON
const point = createGeoPoint(10.1815, 36.8065);

// Valider des coordonnées
if (validateCoordinates([lng, lat])) {
  // OK
}
```

**Avantages:**
- ✅ Pas de duplication de code
- ✅ Tests unitaires centralisés
- ✅ Maintenance facilitée

---

## 📝 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer en mode développement |
| `npm run dev:staging` | Démarrer en mode staging |
| `npm start` | Démarrer en mode production |
| `npm run seed` | Peupler la base avec des données de test |
| `npm run backup` | Créer un backup MongoDB |
| `npm run restore <file>` | Restaurer un backup MongoDB |
| `npm run lint` | Linter le code |
| `npm run lint:fix` | Corriger automatiquement |
| `npm run format` | Formater le code |
| `npm run format:check` | Vérifier le formatage |

---

## 🚀 Workflow de Développement

### 1. Créer une branche

```bash
git checkout -b feature/ma-nouvelle-fonctionnalite
```

### 2. Développer

```bash
# Le code est automatiquement formaté et linté à chaque commit
npm run dev
```

### 3. Tester

```bash
# Avec des données de test
npm run seed

# Vérifier que tout fonctionne
curl http://localhost:4000/api/v1/health
```

### 4. Commit

```bash
git add .
git commit -m "feat: ma nouvelle fonctionnalité"
# → Pre-commit hooks s'exécutent automatiquement
```

### 5. Push & Pull Request

```bash
git push origin feature/ma-nouvelle-fonctionnalite
# Créer une PR sur GitHub
```

---

## 📚 Documentation Complémentaire

- [README.md](./README.md) - Documentation principale
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Plan de récupération
- [CHANGELOG.md](./CHANGELOG.md) - Historique des changements
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Guide de démarrage

---

## 🤝 Contribution

Avant de contribuer, assurez-vous que:

- ✅ Le code est formaté (Prettier)
- ✅ Le code passe le linter (ESLint)
- ✅ Les tests passent (quand ils seront ajoutés)
- ✅ La documentation est à jour

Les pre-commit hooks garantissent automatiquement les 2 premiers points.

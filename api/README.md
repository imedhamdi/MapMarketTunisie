# MapMarket API

Backend Node.js/Express pour la gestion des utilisateurs de MapMarket (authentification, favoris, localisation, avatars).

## 🚀 Démarrage

```bash
cd api
npm install
cp .env.example .env  # remplir les variables (voir ci-dessous)
npm run dev
```

Le serveur écoute par défaut sur `http://localhost:4000`.
L’interface web est servie depuis le même serveur (`http://localhost:4000/`) afin d’éviter toute erreur CORS.

## 🔐 Variables d'environnement

La configuration attend les variables suivantes :

```
# Server
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# MongoDB
MONGO_URI=m=mongodb+srv://imedhamdi007:imed25516242@api-nodejs.lpnpgx4.mongodb.net/retryWrites=truew=majority&appName=API-NodeJS
MONGO_DB_NAME=mapmarket

# JWT
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Mail
MAIL_FROM="MapMarket <no-reply@mapmarket.local>"
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
RESET_BASE_URL=http://localhost:5173/reset-password
```

> Vous pouvez fournir plusieurs origines séparées par des virgules, par exemple :  
> `CLIENT_ORIGIN=http://localhost:5173,http://localhost:5500`

> ℹ️ Le fichier `.env` n'est **pas** versionné.

## 🛣️ Routes principales

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Crée un compte, retourne l'utilisateur et place les cookies JWT |
| `POST` | `/api/auth/login` | Authentifie par email + mot de passe |
| `POST` | `/api/auth/refresh` | Renouvelle les tokens (cookie `refresh_token`) |
| `POST` | `/api/auth/logout` | Efface les cookies |
| `POST` | `/api/auth/forgot-password` | Envoie un lien de réinitialisation (toujours `200`) |
| `POST` | `/api/auth/reset-password` | Met à jour le mot de passe via token |
| `GET` | `/api/auth/me` | Renvoie l'utilisateur connecté |
| `PATCH` | `/api/users/me` | Met à jour nom/email/localisation |
| `POST` | `/api/users/me/location` | Met à jour la localisation uniquement |
| `PATCH` | `/api/users/me/avatar` | Met à jour l'avatar (multipart) |
| `POST` | `/api/users/me/favorites` | Ajoute/retire un favori |
| `DELETE` | `/api/users/me` | Supprime le compte |
| `GET` | `/api/ads` | Liste paginée des annonces (`page`, `limit`, `category`, `owner`, `status`) |
| `POST` | `/api/ads` | Crée une annonce (auth requis) |
| `GET` | `/api/ads/:id` | Récupère une annonce (+1 vue) |
| `PATCH` | `/api/ads/:id` | Met à jour l’annonce (auteur uniquement) |
| `DELETE` | `/api/ads/:id` | Supprime l’annonce (auteur uniquement) |

Toutes les réponses respectent le contrat :

```json
{ "status": "success", "message": "Texte court pour #authFeedback", "data": { ... } }
```

## 🧪 Exemples HTTPie

```
# Inscription
http -v POST :4000/api/auth/signup name="Imed Hamdi" email=imed@example.com password="Passw0rd!" --session=auth

# Connexion
http -v POST :4000/api/auth/login email=imed@example.com password="Passw0rd!" --session=auth

# Mot de passe oublié
http -v POST :4000/api/auth/forgot-password email=imed@example.com

# Réinitialisation
http -v POST :4000/api/auth/reset-password token==RAW_TOKEN password="NewPassw0rd!"

# Récupération profil
http -v GET :4000/api/auth/me --session=auth

# Mise à jour profil
http -v PATCH :4000/api/users/me name="Imed H." location:='{"city":"Lyon","coords":{"lat":45.764,"lng":4.8357},"radiusKm":15,"consent":true}' --session=auth

# Avatar
http -f PATCH :4000/api/users/me/avatar avatar@~/Pictures/me.jpg --session=auth

# Favoris
http -v POST :4000/api/users/me/favorites adId==68bab30e305fa7f3eb651842 action==add --session=auth

# Suppression de compte
http -v DELETE :4000/api/users/me --session=auth

# Créer une annonce
http -v POST :4000/api/ads title="Injecteur Bosch Golf 6" description="Pièce d'origine, testée, vendue avec facture." category=pieces condition=good price:=450 locationText="Tunis" latitude:=36.8065 longitude:=10.1815 images:='["https://img.example.com/123.jpg"]' attributes:='{"compatible":"Golf 6","grade":"bon"}' --session=auth
```

## 🔒 Sécurité & bonnes pratiques

- Cookies `httpOnly` + `sameSite=lax`, `secure` automatique en production.
- Mot de passe hashé via `bcrypt` (12 tours).
- Rate limiting dédié (`/auth/*`, `/auth/forgot-password`).
- `helmet`, `hpp`, `cors`, `morgan`, `cookie-parser`.
- Validation via Joi + nettoyage HTML basique.
- Tokens de reset hashés (SHA-256) et expirent après 30 minutes.

## 📁 Uploads

Les avatars sont stockés dans `uploads/avatars` (non versionné). Le dossier est créé automatiquement mais doit être accessible en écriture par le serveur.

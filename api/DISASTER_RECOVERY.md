# Disaster Recovery Plan - MapMarket API

## 🚨 Plan de Récupération après Sinistre

### 1. Stratégie de Backup

#### Backups Automatiques MongoDB

**Fréquence recommandée:**
- Production: Backup quotidien à 2h00 du matin
- Staging: Backup hebdomadaire le dimanche
- Développement: Backup manuel avant modifications majeures

**Rétention:**
- Backups quotidiens: 7 jours
- Backups hebdomadaires: 4 semaines
- Backups mensuels: 6 mois

#### Mise en place du backup automatique (Cron)

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour un backup quotidien à 2h00
0 2 * * * cd /path/to/mapmarket/api && ./scripts/backup-mongodb.sh >> logs/backup.log 2>&1
```

#### Backup manuel

```bash
# Exécuter un backup immédiatement
npm run backup

# Ou directement
./scripts/backup-mongodb.sh
```

### 2. Restauration

#### Restauration complète

```bash
# Lister les backups disponibles
ls -lh backups/mongodb/

# Restaurer un backup spécifique
./scripts/restore-mongodb.sh backups/mongodb/backup_20241027_143000.tar.gz
```

#### Restauration partielle (collection spécifique)

```bash
# Extraire l'archive
tar -xzf backups/mongodb/backup_20241027_143000.tar.gz

# Restaurer uniquement la collection users
mongorestore \
  --uri="$MONGO_URI" \
  --db="mapmarket" \
  --collection="users" \
  backup_20241027_143000/mapmarket/users.bson.gz
```

### 3. Scénarios de Sinistre

#### 🔥 Scénario 1: Perte complète de la base de données

**Actions:**
1. Identifier le backup le plus récent
2. Vérifier l'intégrité de l'archive
3. Restaurer avec `./scripts/restore-mongodb.sh`
4. Vérifier les données restaurées
5. Redémarrer les services applicatifs

**RTO (Recovery Time Objective):** 30 minutes  
**RPO (Recovery Point Objective):** 24 heures

#### 💥 Scénario 2: Corruption de données

**Actions:**
1. Isoler la collection/document corrompu
2. Identifier la dernière bonne sauvegarde
3. Restaurer uniquement la collection affectée
4. Valider l'intégrité des données
5. Communiquer avec les utilisateurs affectés

**RTO:** 1 heure  
**RPO:** 24 heures

#### ⚡ Scénario 3: Suppression accidentelle

**Actions:**
1. STOP immédiat de l'application
2. Ne PAS écraser les backups
3. Restaurer dans une base temporaire
4. Extraire les données manquantes
5. Réinjecter dans la base principale

**RTO:** 2 heures  
**RPO:** 24 heures

#### 🌪️ Scénario 4: Défaillance serveur complète

**Actions:**
1. Provisionner nouveau serveur
2. Installer dépendances (Node.js, MongoDB Tools)
3. Cloner le repository
4. Restaurer variables d'environnement
5. Restaurer backup MongoDB
6. Relancer l'application
7. Vérifier la disponibilité

**RTO:** 4 heures  
**RPO:** 24 heures

### 4. Backups des Assets

#### Avatars et fichiers uploadés

```bash
# Backup des avatars
tar -czf backups/avatars_$(date +%Y%m%d_%H%M%S).tar.gz uploads/avatars/

# Restauration
tar -xzf backups/avatars_20241027_143000.tar.gz -C uploads/
```

#### Logs

```bash
# Archiver les logs avant rotation
tar -czf backups/logs_$(date +%Y%m%d_%H%M%S).tar.gz logs/

# Les logs Winston font déjà de la rotation automatique
```

### 5. Backups Cloud (Recommandé)

#### AWS S3

```bash
# Installation AWS CLI
npm install -g aws-cli

# Sync automatique des backups
aws s3 sync backups/ s3://mapmarket-backups/ --delete

# Restauration depuis S3
aws s3 sync s3://mapmarket-backups/ backups/
```

#### MongoDB Atlas Backups

Si vous utilisez MongoDB Atlas:
- Backups automatiques activés par défaut
- Point-in-time restore disponible
- Interface web pour restauration
- Pas besoin de mongodump/mongorestore

### 6. Tests de Restauration

**Fréquence:** Mensuel (1er de chaque mois)

**Procédure de test:**

```bash
# 1. Créer une base de test
export MONGO_DB_NAME=mapmarket-test-restore

# 2. Restaurer le dernier backup
./scripts/restore-mongodb.sh backups/mongodb/latest.tar.gz

# 3. Vérifier les données
node scripts/verify-restore.js

# 4. Nettoyer
mongosh "$MONGO_URI" --eval "db.getSiblingDB('mapmarket-test-restore').dropDatabase()"
```

### 7. Checklist de Vérification Post-Restauration

- [ ] Connexion à la base de données OK
- [ ] Nombre de documents cohérent
- [ ] Collections présentes et indexées
- [ ] Login utilisateur fonctionne
- [ ] Création d'annonce fonctionne
- [ ] API /health retourne 200
- [ ] Logs applicatifs normaux
- [ ] Pas d'erreurs MongoDB dans les logs

### 8. Contacts d'Urgence

**Équipe Technique:**
- Admin Système: admin@mapmarket.tn
- DBA: dba@mapmarket.tn
- DevOps: devops@mapmarket.tn

**Fournisseurs:**
- Hébergeur: support@hebergeur.com
- MongoDB Atlas: https://support.mongodb.com

### 9. Documentation Complémentaire

- [Guide de backup MongoDB](https://www.mongodb.com/docs/database-tools/mongodump/)
- [Guide de restauration MongoDB](https://www.mongodb.com/docs/database-tools/mongorestore/)
- [Stratégies de backup](https://www.mongodb.com/basics/backup-and-restore)

### 10. Évolutions Futures

**Court terme (3 mois):**
- [ ] Mise en place backup S3
- [ ] Alerting sur échec de backup
- [ ] Monitoring espace disque backups

**Moyen terme (6 mois):**
- [ ] Backup géo-répliqué
- [ ] Tests automatisés de restauration
- [ ] Dashboard de monitoring des backups

**Long terme (12 mois):**
- [ ] Infrastructure as Code pour disaster recovery
- [ ] Environnement de secours (failover)
- [ ] Réplication multi-région

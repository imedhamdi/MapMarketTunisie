/**
 * Script de seed pour peupler la base de données de développement
 * Usage: node scripts/seed.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import User from '../src/models/user.model.js';
import Ad from '../src/models/ad.model.js';
import { AD_STATUS, AD_CATEGORY, AD_CONDITION } from '../src/config/constants.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'mapmarket-dev';

// Données de seed
const users = [
  {
    name: 'Ahmed Benali',
    email: 'ahmed@test.tn',
    password: 'Password123!',
    location: {
      city: 'Tunis',
      coords: {
        type: 'Point',
        coordinates: [10.1815, 36.8065]
      },
      radiusKm: 15,
      consent: true
    }
  },
  {
    name: 'Fatma Sassi',
    email: 'fatma@test.tn',
    password: 'Password123!',
    location: {
      city: 'Sfax',
      coords: {
        type: 'Point',
        coordinates: [10.7611, 34.7406]
      },
      radiusKm: 10,
      consent: true
    }
  },
  {
    name: 'Karim Trabelsi',
    email: 'karim@test.tn',
    password: 'Password123!',
    location: {
      city: 'Sousse',
      coords: {
        type: 'Point',
        coordinates: [10.6411, 35.8256]
      },
      radiusKm: 20,
      consent: true
    }
  }
];

const ads = [
  {
    title: 'Appartement F3 centre-ville Tunis',
    description:
      'Bel appartement de 100m² au cœur de Tunis, 3 chambres, cuisine équipée, proche de toutes commodités.',
    category: AD_CATEGORY.REAL_ESTATE,
    condition: AD_CONDITION.GOOD,
    price: 250000,
    locationText: 'Tunis Centre',
    location: {
      type: 'Point',
      coordinates: [10.1815, 36.8065]
    },
    images: []
  },
  {
    title: 'Peugeot 208 Diesel 2018',
    description:
      'Voiture en excellent état, entretien régulier, climatisation, GPS, bluetooth. Première main.',
    category: AD_CATEGORY.AUTO,
    condition: AD_CONDITION.VERY_GOOD,
    price: 28000,
    locationText: 'Sfax',
    location: {
      type: 'Point',
      coordinates: [10.7611, 34.7406]
    },
    images: []
  },
  {
    title: 'iPhone 13 Pro 256GB',
    description:
      "iPhone 13 Pro en parfait état, batterie à 95%, avec boîte et accessoires d'origine. Aucune rayure.",
    category: AD_CATEGORY.ELECTRONICS,
    condition: AD_CONDITION.VERY_GOOD,
    price: 1800,
    locationText: 'Sousse',
    location: {
      type: 'Point',
      coordinates: [10.6411, 35.8256]
    },
    images: []
  },
  {
    title: 'Pneus 4 saisons Michelin 205/55 R16',
    description:
      'Lot de 4 pneus Michelin CrossClimate, très peu utilisés (moins de 5000km). Excellent état.',
    category: AD_CATEGORY.PARTS,
    condition: AD_CONDITION.VERY_GOOD,
    price: 400,
    locationText: 'Tunis',
    location: {
      type: 'Point',
      coordinates: [10.1815, 36.8065]
    },
    images: []
  },
  {
    title: 'Veste en cuir homme taille L',
    description: 'Veste en cuir véritable de marque, couleur marron, jamais portée. Coupe moderne.',
    category: AD_CATEGORY.FASHION,
    condition: AD_CONDITION.NEW,
    price: 150,
    locationText: 'Sfax',
    location: {
      type: 'Point',
      coordinates: [10.7611, 34.7406]
    },
    images: []
  },
  {
    title: 'VTT Rockrider 26 pouces',
    description:
      'VTT en bon état, freins à disque, suspension avant, idéal pour balades en montagne.',
    category: AD_CATEGORY.LEISURE,
    condition: AD_CONDITION.GOOD,
    price: 350,
    locationText: 'Sousse',
    location: {
      type: 'Point',
      coordinates: [10.6411, 35.8256]
    },
    images: []
  }
];

async function seed() {
  try {
    console.log('🌱 Début du seeding...');

    // Connexion à MongoDB
    await mongoose.connect(MONGO_URI, {
      dbName: MONGO_DB_NAME
    });
    console.log('✅ Connecté à MongoDB');

    // Nettoyer la base
    await User.deleteMany({});
    await Ad.deleteMany({});
    console.log('🧹 Base de données nettoyée');

    // Hasher les mots de passe
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );

    // Créer les utilisateurs
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ ${createdUsers.length} utilisateurs créés`);

    // Créer les annonces avec les bons propriétaires
    const adsWithOwners = ads.map((ad, index) => ({
      ...ad,
      owner: createdUsers[index % createdUsers.length]._id,
      status: AD_STATUS.ACTIVE
    }));

    const createdAds = await Ad.insertMany(adsWithOwners);
    console.log(`✅ ${createdAds.length} annonces créées`);

    console.log('\n📊 Résumé du seeding:');
    console.log(`   👤 Utilisateurs: ${createdUsers.length}`);
    console.log(`   📝 Annonces: ${createdAds.length}`);
    console.log('\n🎉 Seeding terminé avec succès!');
    console.log('\n🔑 Comptes de test:');
    users.forEach((user) => {
      console.log(`   📧 ${user.email} / ${user.password}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
}

seed();

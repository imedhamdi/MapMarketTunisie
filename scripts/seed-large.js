/**
 * Script de seed pour créer un grand nombre d'annonces (300)
 * Usage: node scripts/seed-large.js
 */
/* eslint-disable no-console */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import User from '../src/models/user.model.js';
import Ad from '../src/models/ad.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'mapmarket-dev';
const NUMBER_OF_ADS = 300;

// Villes tunisiennes avec coordonnées
const tunisianCities = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Sfax', lat: 34.7406, lng: 10.7611 },
  { name: 'Sousse', lat: 35.8256, lng: 10.6369 },
  { name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { name: 'Gafsa', lat: 34.425, lng: 8.7842 },
  { name: 'Monastir', lat: 35.7772, lng: 10.8264 },
  { name: 'Ben Arous', lat: 36.7531, lng: 10.2181 }
];

// Templates d'annonces par catégorie
const adTemplates = {
  immobilier: [
    {
      title: 'Appartement S+2',
      desc: 'Bel appartement avec balcon',
      minPrice: 150000,
      maxPrice: 350000,
      attrs: { surface: 80, rooms: 2 }
    },
    {
      title: 'Villa S+4',
      desc: 'Villa spacieuse avec jardin',
      minPrice: 400000,
      maxPrice: 900000,
      attrs: { surface: 200, rooms: 4 }
    },
    {
      title: 'Studio meublé',
      desc: 'Studio tout équipé',
      minPrice: 50000,
      maxPrice: 120000,
      attrs: { surface: 35, rooms: 1, furnished: true }
    },
    {
      title: 'Duplex S+3',
      desc: 'Duplex moderne',
      minPrice: 250000,
      maxPrice: 500000,
      attrs: { surface: 140, rooms: 3 }
    },
    {
      title: 'Terrain 500m²',
      desc: 'Terrain constructible',
      minPrice: 80000,
      maxPrice: 200000,
      attrs: { surface: 500 }
    }
  ],
  auto: [
    {
      title: 'Peugeot 208',
      desc: 'Voiture économique en bon état',
      minPrice: 20000,
      maxPrice: 45000,
      attrs: { year: 2018, mileage: 65000, fuel: 'Diesel', gearbox: 'Manuelle' }
    },
    {
      title: 'Renault Clio',
      desc: 'Citadine fiable',
      minPrice: 18000,
      maxPrice: 35000,
      attrs: { year: 2017, mileage: 75000, fuel: 'Essence', gearbox: 'Manuelle' }
    },
    {
      title: 'BMW Série 3',
      desc: 'Berline de luxe',
      minPrice: 55000,
      maxPrice: 95000,
      attrs: { year: 2016, mileage: 80000, fuel: 'Diesel', gearbox: 'Automatique' }
    },
    {
      title: 'Volkswagen Golf',
      desc: 'Compacte polyvalente',
      minPrice: 28000,
      maxPrice: 48000,
      attrs: { year: 2019, mileage: 45000, fuel: 'Diesel', gearbox: 'Manuelle' }
    },
    {
      title: 'Toyota Yaris',
      desc: 'Petite citadine économique',
      minPrice: 22000,
      maxPrice: 38000,
      attrs: { year: 2020, mileage: 30000, fuel: 'Essence', gearbox: 'Manuelle' }
    }
  ],
  electroniques: [
    {
      title: 'iPhone 14 Pro',
      desc: 'Smartphone Apple dernière génération',
      minPrice: 2200,
      maxPrice: 3200,
      attrs: { storage: 256, brand: 'Apple' }
    },
    {
      title: 'Samsung Galaxy S23',
      desc: 'Smartphone Samsung flagship',
      minPrice: 1800,
      maxPrice: 2800,
      attrs: { storage: 256, brand: 'Samsung' }
    },
    {
      title: 'MacBook Air M2',
      desc: 'Ordinateur portable Apple',
      minPrice: 2800,
      maxPrice: 3800,
      attrs: { storage: 512, brand: 'Apple' }
    },
    {
      title: 'iPad Pro',
      desc: 'Tablette professionnelle',
      minPrice: 2000,
      maxPrice: 3000,
      attrs: { storage: 256, brand: 'Apple' }
    },
    {
      title: 'Console PS5',
      desc: 'PlayStation 5 avec jeux',
      minPrice: 1500,
      maxPrice: 2200,
      attrs: { storage: 825, brand: 'Sony' }
    }
  ],
  mode: [
    {
      title: 'Veste en cuir',
      desc: 'Veste cuir véritable',
      minPrice: 120,
      maxPrice: 300,
      attrs: { gender: 'Homme', size: 'M', brand: 'Zara' }
    },
    {
      title: 'Robe de soirée',
      desc: 'Robe élégante',
      minPrice: 180,
      maxPrice: 400,
      attrs: { gender: 'Femme', size: '38', brand: 'H&M' }
    },
    {
      title: 'Sneakers Nike',
      desc: 'Baskets sport',
      minPrice: 150,
      maxPrice: 280,
      attrs: { gender: 'Mixte', size: '42', brand: 'Nike' }
    },
    {
      title: 'Sac à main',
      desc: 'Sac de marque',
      minPrice: 800,
      maxPrice: 1500,
      attrs: { gender: 'Femme', size: 'Unique', brand: 'Louis Vuitton' }
    },
    {
      title: 'Costume homme',
      desc: 'Costume 2 pièces',
      minPrice: 350,
      maxPrice: 600,
      attrs: { gender: 'Homme', size: '50', brand: 'Hugo Boss' }
    }
  ],
  pieces: [
    {
      title: 'Phares avant Peugeot',
      desc: 'Paire de phares neufs',
      minPrice: 200,
      maxPrice: 350,
      attrs: { compatible: 'Peugeot 208', grade: 'Neuf' }
    },
    {
      title: 'Turbo Renault',
      desc: 'Turbo reconditionné',
      minPrice: 350,
      maxPrice: 550,
      attrs: { compatible: 'Renault', grade: 'Reconditionné' }
    },
    {
      title: 'Jantes alu 17"',
      desc: 'Set de 4 jantes',
      minPrice: 600,
      maxPrice: 1000,
      attrs: { compatible: 'Universel', grade: 'Bon état' }
    },
    {
      title: 'Batterie voiture',
      desc: 'Batterie neuve 70Ah',
      minPrice: 140,
      maxPrice: 220,
      attrs: { compatible: 'Universel', grade: 'Neuf' }
    },
    {
      title: 'Pare-brise VW',
      desc: "Pare-brise d'origine",
      minPrice: 250,
      maxPrice: 400,
      attrs: { compatible: 'VW Golf', grade: 'Neuf' }
    }
  ],
  loisirs: [
    {
      title: 'VTT 29 pouces',
      desc: 'Vélo tout terrain',
      minPrice: 600,
      maxPrice: 1200,
      attrs: { activity: 'Cyclisme' }
    },
    {
      title: 'Raquettes tennis',
      desc: 'Paire de raquettes pro',
      minPrice: 120,
      maxPrice: 250,
      attrs: { activity: 'Tennis' }
    },
    {
      title: 'Kayak gonflable',
      desc: 'Kayak 2 places',
      minPrice: 300,
      maxPrice: 500,
      attrs: { activity: 'Nautique' }
    },
    {
      title: 'Tapis de yoga',
      desc: 'Tapis + accessoires',
      minPrice: 60,
      maxPrice: 120,
      attrs: { activity: 'Fitness' }
    },
    {
      title: 'Nintendo Switch',
      desc: 'Console + jeux',
      minPrice: 800,
      maxPrice: 1200,
      attrs: { activity: 'Gaming' }
    }
  ]
};

const conditions = ['new', 'very_good', 'good', 'fair'];

// Images par catégorie (Unsplash)
const categoryImages = {
  immobilier: [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'
  ],
  auto: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
    'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'
  ],
  electroniques: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800',
    'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800'
  ],
  mode: [
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'
  ],
  pieces: [
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
    'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800'
  ],
  loisirs: [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
    'https://images.unsplash.com/photo-1505682634904-d7c8d95cdc50?w=800',
    'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=800'
  ]
};

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[random(0, arr.length - 1)];
}

function generateAds(users) {
  const ads = [];
  const categories = Object.keys(adTemplates);

  for (let i = 0; i < NUMBER_OF_ADS; i++) {
    const category = randomElement(categories);
    const template = randomElement(adTemplates[category]);
    const city = randomElement(tunisianCities);
    const owner = randomElement(users);
    const condition = randomElement(conditions);

    // Générer 1 à 4 images aléatoires pour chaque annonce
    const images = categoryImages[category] || [];
    const numImages = random(1, Math.min(4, images.length));
    const adImages = [];
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numImages; j++) {
      adImages.push(shuffled[j]);
    }

    // Stats réalistes basées sur l'état et le prix
    let baseViews = 50;
    let baseFavorites = 5;

    // Les articles en meilleur état ont plus de vues
    if (condition === 'new') {
      baseViews = random(100, 300);
      baseFavorites = random(10, 40);
    } else if (condition === 'very_good') {
      baseViews = random(50, 200);
      baseFavorites = random(5, 25);
    } else if (condition === 'good') {
      baseViews = random(30, 150);
      baseFavorites = random(3, 15);
    } else {
      baseViews = random(10, 80);
      baseFavorites = random(1, 8);
    }

    // Les annonces avec plus d'images ont plus de vues
    baseViews += numImages * 20;
    baseFavorites += Math.floor(numImages / 2);

    const ad = {
      owner: owner._id,
      title: `${template.title} ${city.name}`,
      description:
        template.desc +
        ". Excellent rapport qualité-prix. Visible sur rendez-vous. N'hésitez pas à me contacter pour plus d'informations ou pour organiser une visite.",
      category,
      condition,
      price: random(template.minPrice, template.maxPrice),
      locationText: city.name,
      location: {
        type: 'Point',
        coordinates: [
          city.lng + (Math.random() - 0.5) * 0.05,
          city.lat + (Math.random() - 0.5) * 0.05
        ]
      },
      attributes: template.attrs || {},
      attributesNormalized: {},
      images: adImages,
      status: 'active',
      views: baseViews,
      favoritesCount: baseFavorites
    };

    ads.push(ad);
  }

  return ads;
}

async function seed() {
  try {
    console.log(`🚀 Début du seeding de ${NUMBER_OF_ADS} annonces...\n`);

    // Connexion
    await mongoose.connect(MONGO_URI, {
      dbName: MONGO_DB_NAME
    });
    console.log('✅ Connecté à MongoDB');

    // Nettoyer
    console.log('🧹 Nettoyage de la base...');
    await Ad.deleteMany({});

    // Trouver ou créer des utilisateurs
    let users = await User.find().limit(5);

    if (users.length === 0) {
      console.log('👤 Création de 5 utilisateurs...');
      const userTemplates = [
        { name: 'Ahmed', email: 'ahmed@test.tn' },
        { name: 'Fatma', email: 'fatma@test.tn' },
        { name: 'Karim', email: 'karim@test.tn' },
        { name: 'Leila', email: 'leila@test.tn' },
        { name: 'Omar', email: 'omar@test.tn' }
      ];
      const testUsers = await Promise.all(
        userTemplates.map(async (user) => ({
          ...user,
          password: await bcrypt.hash('Password123!', 10)
        }))
      );
      users = await User.insertMany(testUsers);
      console.log(`✅ ${users.length} utilisateurs créés`);
    } else {
      console.log(`✅ ${users.length} utilisateurs existants trouvés`);
    }

    // Générer les annonces
    console.log(`\n📝 Génération de ${NUMBER_OF_ADS} annonces...`);
    const ads = generateAds(users);

    // Insertion en masse (beaucoup plus rapide)
    const startTime = Date.now();
    const createdAds = await Ad.insertMany(ads);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ ${createdAds.length} annonces créées en ${duration}s`);

    // Stats
    const stats = {};
    createdAds.forEach((ad) => {
      stats[ad.category] = (stats[ad.category] || 0) + 1;
    });

    console.log('\n📊 Répartition par catégorie:');
    Object.entries(stats).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    console.log('\n🎉 Seeding terminé avec succès!');
    console.log(
      `\n⚡ Performance: ${(NUMBER_OF_ADS / parseFloat(duration)).toFixed(0)} annonces/seconde`
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seed();
/* eslint-disable no-console */

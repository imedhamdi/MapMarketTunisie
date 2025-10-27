/**
 * Script pour créer des annonces en masse via l'API
 * Usage: node scripts/create-bulk-ads.js
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGZiZmI3NjYwODkxYjhmMDE5Yzc5NjUiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MTU3Mzk5OSwiZXhwIjoxNzYxNTc0ODk5fQ.R4DW92gGbhCbzZIObrqnTcBTc-vEJr_Q8dQisCnaYDo';
const NUMBER_OF_ADS = 300;

// Données réalistes pour la Tunisie
const tunisianCities = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Sfax', lat: 34.7406, lng: 10.7611 },
  { name: 'Sousse', lat: 35.8256, lng: 10.6369 },
  { name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { name: 'Gafsa', lat: 34.4250, lng: 8.7842 },
  { name: 'Monastir', lat: 35.7772, lng: 10.8264 },
  { name: 'Ben Arous', lat: 36.7531, lng: 10.2181 },
  { name: 'Kasserine', lat: 35.1675, lng: 8.8306 },
  { name: 'Médenine', lat: 33.3550, lng: 10.5053 },
  { name: 'Nabeul', lat: 36.4561, lng: 10.7356 },
  { name: 'Tataouine', lat: 32.9297, lng: 10.4517 },
  { name: 'Béja', lat: 36.7256, lng: 9.1817 },
  { name: 'Jendouba', lat: 36.5011, lng: 8.7806 },
  { name: 'Mahdia', lat: 35.5047, lng: 11.0622 },
  { name: 'Sidi Bouzid', lat: 35.0381, lng: 9.4858 },
  { name: 'Zaghouan', lat: 36.4028, lng: 10.1425 },
  { name: 'Kef', lat: 36.1744, lng: 8.7050 }
];

const categories = {
  immobilier: [
    { title: 'Villa S+4 avec piscine', price: 850000, description: 'Magnifique villa de standing avec piscine, jardin arboré de 500m². Cuisine équipée, salon spacieux, 4 chambres avec placards, 3 salles de bain. Garage pour 2 voitures. Quartier calme et sécurisé.', attributes: { surface: 250, rooms: 4, furnished: false, floor: 0 } },
    { title: 'Appartement S+2 centre ville', price: 180000, description: 'Appartement bien situé en plein centre, à proximité de toutes commodités. 2 chambres lumineuses, salon avec balcon, cuisine aménagée. Immeuble récent avec ascenseur.', attributes: { surface: 90, rooms: 2, furnished: false, floor: 3 } },
    { title: 'Studio meublé proche université', price: 65000, description: 'Studio idéal étudiant ou jeune actif, entièrement meublé et équipé. Kitchenette, salle de bain, coin nuit. Charges incluses. Disponible immédiatement.', attributes: { surface: 35, rooms: 1, furnished: true, floor: 2 } },
    { title: 'Duplex S+3 moderne', price: 320000, description: 'Superbe duplex moderne sur 2 niveaux. RDC: salon, cuisine américaine. Étage: 3 chambres, 2 SDB. Terrasse panoramique. Parking privé.', attributes: { surface: 140, rooms: 3, furnished: false, floor: 4 } },
    { title: 'Terrain constructible 500m²', price: 120000, description: 'Beau terrain plat et viabilisé, bien situé dans zone résidentielle. Accès facile, tous les réseaux disponibles. Idéal pour construction villa.', attributes: { surface: 500, rooms: 0, furnished: false, floor: 0 } }
  ],
  auto: [
    { title: 'Peugeot 208 GTi 2019', price: 35000, description: 'Peugeot 208 GTi en excellent état, carnet d\'entretien à jour. Toutes options: GPS, caméra de recul, sièges chauffants, jantes alu. Première main, non fumeur.', attributes: { year: 2019, mileage: 45000, fuel: 'Essence', gearbox: 'Manuelle' } },
    { title: 'Renault Clio 4 Diesel', price: 28000, description: 'Renault Clio économique, peu kilométrée. Climatisation, radio CD, vitres électriques. Très bon état général, révision récente. Consommation réduite.', attributes: { year: 2018, mileage: 62000, fuel: 'Diesel', gearbox: 'Manuelle' } },
    { title: 'BMW Série 3 2016', price: 65000, description: 'BMW Série 3 full options, état impeccable. Intérieur cuir, toit ouvrant, système audio premium, aide au stationnement. Entretien BMW uniquement.', attributes: { year: 2016, mileage: 78000, fuel: 'Diesel', gearbox: 'Automatique' } },
    { title: 'Volkswagen Golf 7', price: 32000, description: 'VW Golf 7 fiable et économique. Boîte automatique DSG, régulateur de vitesse, écran tactile. Historique complet, aucun accident.', attributes: { year: 2017, mileage: 85000, fuel: 'Diesel', gearbox: 'Automatique' } },
    { title: 'Fiat 500 Edition Spéciale', price: 18000, description: 'Petite citadine parfaite pour la ville. Faible kilométrage, climatisation, direction assistée. Idéale premier véhicule.', attributes: { year: 2020, mileage: 25000, fuel: 'Essence', gearbox: 'Manuelle' } }
  ],
  electroniques: [
    { title: 'iPhone 14 Pro 256GB', price: 2800, description: 'iPhone 14 Pro en parfait état, acheté il y a 6 mois. Garantie Apple valide jusqu\'en 2025. Écran sans rayure, batterie 98%. Boîte + accessoires d\'origine.', attributes: { storage: 256, brand: 'Apple', grade: 'Excellent' } },
    { title: 'MacBook Air M2 2023', price: 3200, description: 'MacBook Air dernier modèle, puce M2, 16GB RAM, 512GB SSD. Comme neuf, utilisé 2 mois. Facture + garantie 2 ans. Housse de protection incluse.', attributes: { storage: 512, brand: 'Apple', grade: 'Comme neuf' } },
    { title: 'Samsung Galaxy S23 Ultra', price: 2400, description: 'Samsung S23 Ultra 512GB, écran Dynamic AMOLED 2X. Appareil photo exceptionnel. État impeccable, coque + film protecteur. Chargeur rapide inclus.', attributes: { storage: 512, brand: 'Samsung', grade: 'Très bon' } },
    { title: 'iPad Pro 12.9" + Apple Pencil', price: 2600, description: 'iPad Pro 12.9 pouces, écran Liquid Retina XDR. Apple Pencil 2ème génération + Magic Keyboard. Idéal créatifs et professionnels.', attributes: { storage: 256, brand: 'Apple', grade: 'Excellent' } },
    { title: 'PS5 + 2 manettes + 5 jeux', price: 1800, description: 'PlayStation 5 édition standard avec lecteur. 2 manettes DualSense, 5 jeux récents (FIFA, COD, Spider-Man...). Très peu utilisée.', attributes: { storage: 825, brand: 'Sony', grade: 'Très bon' } }
  ],
  mode: [
    { title: 'Veste en cuir Zara Homme', price: 180, description: 'Veste en cuir véritable de marque Zara, taille M. Coupe slim, couleur noire. Portée 3-4 fois, état neuf. Doublure en satin.', attributes: { gender: 'Homme', size: 'M', brand: 'Zara' } },
    { title: 'Robe de soirée longue', price: 250, description: 'Magnifique robe de soirée longue, couleur bordeaux. Tissu satiné de haute qualité. Taille 38, portée une seule fois. Parfaite pour mariages.', attributes: { gender: 'Femme', size: '38', brand: 'H&M Premium' } },
    { title: 'Sneakers Nike Air Max', price: 220, description: 'Baskets Nike Air Max neuves, jamais portées. Pointure 42, coloris blanc/noir. Boîte d\'origine avec étiquettes. Semelle Air Max confortable.', attributes: { gender: 'Mixte', size: '42', brand: 'Nike' } },
    { title: 'Sac à main Louis Vuitton', price: 1200, description: 'Sac à main Louis Vuitton authentique avec certificat. Modèle Neverfull MM, toile monogram. Excellent état, utilisé avec soin. Dustbag inclus.', attributes: { gender: 'Femme', size: 'Unique', brand: 'Louis Vuitton' } },
    { title: 'Costume homme Hugo Boss', price: 480, description: 'Costume 2 pièces Hugo Boss, taille 50. Laine de qualité, coupe moderne. Veste + pantalon assorti. Nettoyé à sec, état impeccable.', attributes: { gender: 'Homme', size: '50', brand: 'Hugo Boss' } }
  ],
  pieces: [
    { title: 'Phares avant Peugeot 208', price: 280, description: 'Paire de phares avant d\'origine pour Peugeot 208 (2012-2019). État neuf, jamais montés. Compatible tous modèles. Prix pour les 2 phares.', attributes: { compatible: 'Peugeot 208', grade: 'Neuf', reference: 'PG208-PH-001' } },
    { title: 'Turbo Renault Megane 1.5 dCi', price: 450, description: 'Turbocompresseur reconditionné pour Renault Megane 1.5 dCi. Garantie 12 mois. Testé et vérifié. Installation possible sur demande.', attributes: { compatible: 'Renault Megane', grade: 'Reconditionné', reference: 'RN-TURBO-15DCI' } },
    { title: 'Jantes alu 17" + pneus', price: 800, description: 'Lot de 4 jantes aluminium 17 pouces + pneus Michelin. Bon état général, équilibrées. Compatible plusieurs modèles (Golf, Audi A3, Seat...).', attributes: { compatible: 'Universel', grade: 'Bon état', reference: 'JANTE-17-ALU' } },
    { title: 'Batterie voiture 70Ah', price: 180, description: 'Batterie auto neuve 70Ah 12V. Démarrage garanti -15°C. Compatible essence et diesel. Installation gratuite. Garantie constructeur 2 ans.', attributes: { compatible: 'Universel', grade: 'Neuf', reference: 'BAT-70AH-12V' } },
    { title: 'Pare-brise Volkswagen Golf 7', price: 320, description: 'Pare-brise d\'origine VW Golf 7. Verre feuilleté avec capteur de pluie. Neuf, jamais posé. Installation possible par professionnel agréé.', attributes: { compatible: 'VW Golf 7', grade: 'Neuf', reference: 'VW-PBRISE-G7' } }
  ],
  loisirs: [
    { title: 'Vélo VTT Giant 29 pouces', price: 850, description: 'VTT Giant semi-rigide, roues 29", 21 vitesses Shimano. Fourche à suspension, freins à disque hydrauliques. Excellent état, peu utilisé.', attributes: { activity: 'Cyclisme' } },
    { title: 'Raquettes tennis Wilson Pro', price: 180, description: 'Paire de raquettes de tennis Wilson Pro Staff. Cordage récent, grip neuf. Idéal niveau intermédiaire/avancé. Housse de protection incluse.', attributes: { activity: 'Tennis' } },
    { title: 'Kayak gonflable 2 places', price: 420, description: 'Kayak gonflable robuste pour 2 personnes. Matériau renforcé, pagaies en aluminium, pompe incluse. Compact et facile à transporter.', attributes: { activity: 'Sports nautiques' } },
    { title: 'Tapis de yoga + accessoires', price: 85, description: 'Tapis de yoga professionnel antidérapant + 2 briques + sangle. Épaisseur confortable, matériau écologique. Sac de transport inclus.', attributes: { activity: 'Fitness' } },
    { title: 'Console Nintendo Switch OLED', price: 980, description: 'Nintendo Switch modèle OLED + 3 jeux (Zelda, Mario Kart, Animal Crossing). État parfait, écran sans rayure. Station d\'accueil + câbles.', attributes: { activity: 'Jeux vidéo' } }
  ]
};

const conditions = ['new', 'very_good', 'good', 'fair'];

// Fonction pour générer une variation aléatoire
function getRandomVariation(basePrice, variation = 0.3) {
  const min = basePrice * (1 - variation);
  const max = basePrice * (1 + variation);
  return Math.round(Math.random() * (max - min) + min);
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomCondition() {
  return getRandomElement(conditions);
}

function getRandomCity() {
  return getRandomElement(tunisianCities);
}

// Créer une annonce
async function createAd(adData) {
  try {
    const response = await fetch(`${API_URL}/api/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(adData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Erreur création annonce:`, error.message);
    return null;
  }
}

// Générer les annonces
async function generateAds() {
  console.log(`🚀 Démarrage de la création de ${NUMBER_OF_ADS} annonces...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < NUMBER_OF_ADS; i++) {
    // Choisir une catégorie aléatoire
    const categoryKeys = Object.keys(categories);
    const category = getRandomElement(categoryKeys);
    const templates = categories[category];
    const template = getRandomElement(templates);

    // Choisir une ville aléatoire
    const city = getRandomCity();

    // Créer les données de l'annonce avec variations
    const adData = {
      title: template.title,
      description: template.description,
      category: category,
      condition: getRandomCondition(),
      price: getRandomVariation(template.price),
      locationText: city.name,
      latitude: city.lat + (Math.random() - 0.5) * 0.05, // Variation de ~2.5km
      longitude: city.lng + (Math.random() - 0.5) * 0.05,
      attributes: template.attributes,
      images: [] // Pas d'images pour l'instant
    };

    const result = await createAd(adData);

    if (result) {
      successCount++;
      console.log(`✅ [${successCount}/${NUMBER_OF_ADS}] ${category} - ${template.title} (${city.name})`);
    } else {
      errorCount++;
      console.log(`❌ [Erreur ${errorCount}] Échec création annonce`);
    }

    // Petite pause pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Réussi: ${successCount}`);
  console.log(`   ❌ Échec: ${errorCount}`);
  console.log(`\n🎉 Terminé!`);
}

// Lancer le script
generateAds().catch(console.error);

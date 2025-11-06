/* eslint-env jest */
import { describe, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/user.model.js';
import { generateTokens } from '../../src/utils/generateTokens.js';

describe('Location Update API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const testUser = await User.create({
      name: 'Test User Location',
      email: `test-location-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'user'
    });

    userId = testUser._id;
    const tokens = generateTokens(testUser);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await User.findByIdAndDelete(userId);
    await mongoose.connection.close();
  });

  it('devrait enregistrer la localisation avec récupération automatique de la ville', async () => {
    // Coordonnées de Tunis
    const lat = 36.8065;
    const lng = 10.1815;
    const radiusKm = 15;

    const response = await request(app)
      .post('/api/user/me/location')
      .set('Cookie', `accessToken=${authToken}`)
      .send({ lat, lng, radiusKm })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.location).toBeDefined();
    expect(response.body.data.location.coords.coordinates).toEqual([lng, lat]);
    expect(response.body.data.location.radiusKm).toBe(radiusKm);
    expect(response.body.data.location.consent).toBe(true);
    expect(response.body.data.location.lastUpdated).toBeDefined();

    // La ville devrait être "Tunis" ou similaire
    console.log('Ville détectée:', response.body.data.location.city);
    expect(response.body.data.location.city).toBeTruthy();
  });

  it("ne devrait pas mettre à jour si les coordonnées n'ont pas changé (< 10m)", async () => {
    // Première mise à jour
    const lat1 = 36.8065;
    const lng1 = 10.1815;

    await request(app)
      .post('/api/user/me/location')
      .set('Cookie', `accessToken=${authToken}`)
      .send({ lat: lat1, lng: lng1, radiusKm: 10 })
      .expect(200);

    // Deuxième mise à jour avec coordonnées presque identiques (< 10m)
    const lat2 = 36.80651; // Différence d'environ 1 mètre
    const lng2 = 10.18151;

    const response = await request(app)
      .post('/api/user/me/location')
      .set('Cookie', `accessToken=${authToken}`)
      .send({ lat: lat2, lng: lng2, radiusKm: 10 })
      .expect(200);

    expect(response.body.message).toContain('inchangée');
  });

  it('devrait mettre à jour si les coordonnées ont changé significativement', async () => {
    // Première position: Tunis
    const lat1 = 36.8065;
    const lng1 = 10.1815;

    await request(app)
      .post('/api/user/me/location')
      .set('Cookie', `accessToken=${authToken}`)
      .send({ lat: lat1, lng: lng1, radiusKm: 10 })
      .expect(200);

    // Deuxième position: Carthage (environ 15km)
    const lat2 = 36.853;
    const lng2 = 10.3233;

    const response = await request(app)
      .post('/api/user/me/location')
      .set('Cookie', `accessToken=${authToken}`)
      .send({ lat: lat2, lng: lng2, radiusKm: 10 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.location.coords.coordinates).toEqual([lng2, lat2]);
    expect(response.body.data.location.city).toBeTruthy();
  });

  it('devrait récupérer la localisation sauvegardée via GET /api/auth/me', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `accessToken=${authToken}`)
      .expect(200);

    expect(response.body.data.user.location).toBeDefined();
    expect(response.body.data.user.location.coords).toBeDefined();
    expect(response.body.data.user.location.city).toBeTruthy();
    expect(response.body.data.user.location.lastUpdated).toBeDefined();
  });
});

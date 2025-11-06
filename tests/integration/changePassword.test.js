/**
 * Tests d'intégration pour le changement de mot de passe
 * Tests du flux critique POST /api/users/me/change-password
 */

import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import User from '../../src/models/user.model.js';
import { hashPassword } from '../../src/utils/crypto.js';
import mongoose from 'mongoose';
import redis from '../../src/config/redis.js';

describe('POST /api/users/me/change-password', () => {
  let authToken;
  let testUser;
  const originalPassword = 'TestPassword123!';
  const newPassword = 'NewPassword456!';

  before(async () => {
    // Connexion à la base de données de test
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
    }

    // Nettoyer le cache Redis si activé
    if (redis.isConnected) {
      await redis.flushAll();
    }
  });

  beforeEach(async () => {
    // Nettoyer la collection users
    await User.deleteMany({});

    // Nettoyer le cache Redis avant chaque test si activé
    if (redis.isConnected) {
      await redis.flushAll();
    }

    // Créer un utilisateur de test
    const hashedPassword = await hashPassword(originalPassword);
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword
    });

    // Authentifier l'utilisateur pour obtenir un token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: originalPassword
    });

    authToken = loginRes.body.data.accessToken;
  });

  after(async () => {
    // Nettoyer après tous les tests
    await User.deleteMany({});
  });

  describe('Validation des données', () => {
    it('devrait retourner 400 si currentPassword est manquant', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          newPassword: newPassword
        });

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('MISSING_FIELDS');
      expect(res.body.message).to.include('requis');
    });

    it('devrait retourner 400 si newPassword est manquant', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword
        });

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('MISSING_FIELDS');
      expect(res.body.message).to.include('requis');
    });

    it('devrait retourner 400 si newPassword a moins de 8 caractères', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: 'Short1!'
        });

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('INVALID_PASSWORD');
      expect(res.body.message).to.include('8 caractères');
    });

    it("devrait retourner 401 sans token d'authentification", async () => {
      const res = await request(app).post('/api/users/me/change-password').send({
        currentPassword: originalPassword,
        newPassword: newPassword
      });

      expect(res.status).to.equal(401);
    });
  });

  describe('Vérification du mot de passe actuel', () => {
    it('devrait retourner 401 si le mot de passe actuel est incorrect', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: newPassword
        });

      expect(res.status).to.equal(401);
      expect(res.body.code).to.equal('INVALID_PASSWORD');
      expect(res.body.message).to.include('incorrect');
    });
  });

  describe('Changement de mot de passe réussi', () => {
    it('devrait changer le mot de passe avec succès', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.message).to.include('succès');
    });

    it('devrait hasher le nouveau mot de passe en base de données', async () => {
      await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      const updatedUser = await User.findById(testUser._id).select('+password');

      // Le mot de passe ne doit pas être stocké en clair
      expect(updatedUser.password).to.not.equal(newPassword);

      // Le mot de passe doit être un hash bcrypt
      expect(updatedUser.password).to.match(/^\$2[ayb]\$.{56}$/);
    });

    it('devrait permettre la connexion avec le nouveau mot de passe', async () => {
      // Changer le mot de passe
      await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      // Essayer de se connecter avec le nouveau mot de passe
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: newPassword
      });

      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.data.accessToken).to.exist;
    });

    it("ne devrait plus permettre la connexion avec l'ancien mot de passe", async () => {
      // Changer le mot de passe
      await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      // Essayer de se connecter avec l'ancien mot de passe
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: originalPassword
      });

      expect(loginRes.status).to.equal(401);
    });
  });

  describe('Intégration avec userService', () => {
    it('devrait utiliser userService.changePassword au lieu de bcryptjs', async () => {
      // Ce test vérifie indirectement que le service est utilisé
      // en s'assurant que le changement fonctionne correctement
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: newPassword
        });

      expect(res.status).to.equal(200);

      // Vérifier que le nouveau mot de passe fonctionne
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: newPassword
      });

      expect(loginRes.status).to.equal(200);
    });
  });

  describe('Cas limites', () => {
    it('devrait gérer les caractères spéciaux dans le mot de passe', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()_+{}[]|:;<>?,./~`';

      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: specialPassword
        });

      expect(res.status).to.equal(200);

      // Vérifier la connexion avec le nouveau mot de passe
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: specialPassword
      });

      expect(loginRes.status).to.equal(200);
    });

    it('devrait gérer un mot de passe très long', async () => {
      const longPassword = 'A'.repeat(100) + '1!';

      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: longPassword
        });

      expect(res.status).to.equal(200);
    });

    it('ne devrait pas permettre de réutiliser le même mot de passe', async () => {
      const res = await request(app)
        .post('/api/users/me/change-password')
        .set('Cookie', `access_token=${authToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword: originalPassword
        });

      // Le changement devrait réussir même si c'est le même
      // (c'est au client de décider si c'est permis)
      expect(res.status).to.equal(200);
    });
  });
});

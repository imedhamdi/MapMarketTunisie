import NewsletterContact from '../models/newsletter.model.js';

export class NewsletterEmailExistsError extends Error {
  constructor(email) {
    super('Cette adresse est déjà enregistrée dans notre liste de contacts.');
    this.email = email;
    this.code = 'NEWSLETTER_EMAIL_EXISTS';
    this.statusCode = 409;
  }
}

export async function addNewsletterContact(email) {
  if (!email) {
    const error = new Error('Email requis pour s’inscrire à la newsletter.');
    error.code = 'NEWSLETTER_EMAIL_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail) {
    const error = new Error('Email requis pour s’inscrire à la newsletter.');
    error.code = 'NEWSLETTER_EMAIL_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  try {
    const contact = await NewsletterContact.create({ email: normalizedEmail });
    return contact;
  } catch (error) {
    if (error?.code === 11000) {
      throw new NewsletterEmailExistsError(normalizedEmail);
    }
    throw error;
  }
}

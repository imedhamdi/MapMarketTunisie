import { sendSuccess, sendError } from '../utils/responses.js';
import { addNewsletterContact, NewsletterEmailExistsError } from '../services/newsletter.service.js';

export async function subscribeNewsletter(req, res) {
  const { email } = req.body;
  try {
    const contact = await addNewsletterContact(email);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Merci ! Votre email a bien été ajouté à notre liste de contacts.',
      data: {
        id: contact.id,
        email: contact.email,
        addedAt: contact.addedAt
      }
    });
  } catch (error) {
    if (error instanceof NewsletterEmailExistsError) {
      return sendError(res, {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message
      });
    }
    throw error;
  }
}

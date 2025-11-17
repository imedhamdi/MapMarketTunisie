import { Router } from 'express';

import { subscribeNewsletter } from '../controllers/newsletter.controller.js';
import validate from '../middlewares/validate.js';
import { subscribeNewsletterSchema } from '../validators/newsletter.schema.js';

const router = Router();

router.post('/', validate(subscribeNewsletterSchema), subscribeNewsletter);

export default router;

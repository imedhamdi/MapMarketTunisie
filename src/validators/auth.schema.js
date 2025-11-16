import Joi from 'joi';

const emailField = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } });
const passwordField = Joi.string().min(8).max(128);

export const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required().messages({
    'string.empty': 'Le nom est requis',
    'string.min': 'Le nom doit contenir au moins 2 caractères'
  }),
  email: emailField.required().messages({
    'string.empty': 'Email requis',
    'string.email': 'Adresse email invalide'
  }),
  password: passwordField.required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères'
  })
});

export const loginSchema = Joi.object({
  email: emailField.required(),
  password: Joi.string().required().messages({
    'string.empty': 'Mot de passe requis'
  })
});

export const forgotPasswordSchema = Joi.object({
  email: emailField.required()
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().required()
});

export const resendVerificationSchema = Joi.object({
  email: emailField.required()
});

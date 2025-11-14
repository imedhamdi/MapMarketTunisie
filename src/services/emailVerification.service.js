import User from '../models/user.model.js';
import { hashToken } from '../utils/crypto.js';
import { generateAuthTokens } from '../utils/generateTokens.js';

function createVerificationError(message = 'Lien invalide ou expiré.') {
  const error = new Error(message);
  error.code = 'VERIFICATION_TOKEN_INVALID';
  error.statusCode = 400;
  return error;
}

export async function finalizeEmailVerification(token) {
  if (!token || typeof token !== 'string') {
    throw createVerificationError();
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: hashedToken,
    emailVerificationTokenExp: { $gt: new Date() }
  }).select('+emailVerificationTokenHash +emailVerificationTokenExp');

  if (!user) {
    throw createVerificationError();
  }

  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExp = undefined;
  user.emailVerified = true;
  await user.save();

  const tokens = generateAuthTokens(user);
  return { user, tokens };
}

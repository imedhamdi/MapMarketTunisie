export function sendSuccess(
  res,
  { statusCode = 200, message = 'Opération réussie', data = undefined } = {}
) {
  const payload = {
    status: 'success',
    message
  };
  if (data !== undefined) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(
  res,
  { statusCode = 400, code = 'BAD_REQUEST', message = 'Une erreur est survenue' } = {}
) {
  return res.status(statusCode).json({
    status: 'error',
    code,
    message
  });
}

export function formatUser(user) {
  if (!user) {
    return user;
  }
  const plain = user.toObject ? user.toObject({ versionKey: false }) : { ...user };
  delete plain.password;
  delete plain.resetTokenHash;
  delete plain.resetTokenExp;
  if (Array.isArray(plain.favorites)) {
    plain.favorites = plain.favorites.map((value) =>
      value && typeof value.toString === 'function' ? value.toString() : value
    );
  }
  return plain;
}

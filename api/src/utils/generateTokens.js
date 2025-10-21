import jwt from 'jsonwebtoken';

import env from '../config/env.js';

function parseDurationToMs(value) {
  if (!value) return undefined;
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return amount * multipliers[unit];
}

export function createAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires });
}

export function createRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpires });
}

export function generateAuthTokens(user) {
  const basePayload = {
    sub: user.id ?? user._id,
    role: user.role ?? 'user'
  };
  return {
    accessToken: createAccessToken(basePayload),
    refreshToken: createRefreshToken(basePayload)
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const accessMaxAge = parseDurationToMs(env.jwtAccessExpires);
  const refreshMaxAge = parseDurationToMs(env.jwtRefreshExpires);

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure,
    maxAge: accessMaxAge
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure,
    maxAge: refreshMaxAge
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    sameSite: env.cookie.sameSite,
    secure: env.cookie.secure
  });
}

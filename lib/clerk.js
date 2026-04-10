// lib/clerk.js
// Clerk JWT verification utility for serverless functions

import { createRemoteJWKSet, jwtVerify } from 'jose';

const CLERK_DOMAIN = process.env.CLERK_DOMAIN || '';

const JWKS = createRemoteJWKSet(
  new URL(`https://${CLERK_DOMAIN}/.well-known/jwks.json`)
);

/**
 * Verify a Clerk session JWT and return the user payload.
 * Throws on invalid / expired token — callers catch and return 401.
 */
export async function verifyClerkToken(token) {
  if (!token) throw new Error('No token provided');

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${CLERK_DOMAIN}`,
  });

  return {
    sub:       payload.sub,
    email:     payload.email,
    firstName: payload.given_name,
    lastName:  payload.family_name,
    ...payload,
  };
}

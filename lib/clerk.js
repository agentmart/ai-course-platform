// lib/clerk.js
// Clerk JWT verification utility for serverless functions
// Clerk tokens are standard JWTs — verify with the JWKS endpoint

import { createRemoteJWKSet, jwtVerify } from 'jose';

// CLERK_DOMAIN looks like: "xxxx.clerk.accounts.dev"  (your Clerk Frontend API domain)
// JWKS endpoint: https://{CLERK_DOMAIN}/.well-known/jwks.json
// JWT issuer:    https://{CLERK_DOMAIN}
const CLERK_DOMAIN = process.env.CLERK_DOMAIN || '';

const JWKS = createRemoteJWKSet(
  new URL(`https://${CLERK_DOMAIN}/.well-known/jwks.json`)
);

/**
 * Verify a Clerk session JWT and return the user payload.
 * Throws on invalid / expired token (callers should catch and return 401).
 */
export async function verifyClerkToken(token) {
  if (!token) throw new Error('No token provided');

  const { payload } = await jwtVerify(token, JWKS, {
    // Issuer is the Frontend API URL — exactly the CLERK_DOMAIN with https://
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

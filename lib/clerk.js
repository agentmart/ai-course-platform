// lib/clerk.js
// Clerk JWT verification utility for serverless functions
// Clerk tokens are standard JWTs — verify with the JWKS endpoint

import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`https://${process.env.CLERK_DOMAIN}/.well-known/jwks.json`)
);

/**
 * Verify a Clerk session JWT and return the user payload.
 * Returns null if the token is invalid or expired.
 *
 * @param {string} token - The Bearer token from Authorization header
 * @returns {object|null} - { sub: clerkUserId, email, ... } or null
 */
export async function verifyClerkToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://clerk.${process.env.CLERK_DOMAIN}`,
    });

    return {
      sub: payload.sub,           // Clerk user ID
      email: payload.email,       // User's email
      firstName: payload.given_name,
      lastName: payload.family_name,
      ...payload,
    };
  } catch (err) {
    console.warn('Token verification failed:', err.message);
    return null;
  }
}

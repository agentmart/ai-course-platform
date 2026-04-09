// lib/clerk.js
// Clerk JWT verification utility for serverless functions
// CommonJS module — required by api/*.js via require('../lib/clerk.js')
// (ESM import/export syntax is NOT compatible with require() in Node 18/20)

const { createRemoteJWKSet, jwtVerify } = require('jose');

// CLERK_DOMAIN: e.g. "xxxx.clerk.accounts.dev" (your Clerk Frontend API domain)
const CLERK_DOMAIN = process.env.CLERK_DOMAIN || '';

const JWKS = createRemoteJWKSet(
  new URL(`https://${CLERK_DOMAIN}/.well-known/jwks.json`)
);

/**
 * Verify a Clerk session JWT and return the user payload.
 * Throws on invalid / expired token — callers catch and return 401.
 */
async function verifyClerkToken(token) {
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

module.exports = { verifyClerkToken };

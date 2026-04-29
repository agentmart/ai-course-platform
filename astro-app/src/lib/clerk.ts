import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface ClerkUser extends JWTPayload {
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedDomain: string | null = null;

function getJwks(domain: string) {
  if (!cachedJwks || cachedDomain !== domain) {
    cachedJwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
    cachedDomain = domain;
  }
  return cachedJwks;
}

/**
 * Verify a Clerk session JWT against the project JWKS.
 * Throws on invalid / expired token — callers catch and return 401.
 */
export async function verifyClerkToken(
  token: string | null | undefined,
  env: { CLERK_DOMAIN?: string }
): Promise<ClerkUser> {
  if (!token) throw new Error('No token provided');
  const domain = env.CLERK_DOMAIN ?? '';
  if (!domain) throw new Error('CLERK_DOMAIN not configured');

  const { payload } = await jwtVerify(token, getJwks(domain), {
    issuer: `https://${domain}`,
  });

  return {
    sub: String(payload.sub ?? ''),
    email: payload.email as string | undefined,
    firstName: payload.given_name as string | undefined,
    lastName: payload.family_name as string | undefined,
    ...payload,
  };
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

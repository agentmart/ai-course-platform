import type { APIRoute } from 'astro';
import { withAuth, jsonResponse, appCors, envFrom } from '~/lib/handler';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) => {
  return new Response(null, { status: 204, headers: appCors(envFrom(locals)) });
};

export const GET: APIRoute = async (ctx) => {
  const r = await withAuth(ctx);
  if (r instanceof Response) return r;
  return jsonResponse(
    {
      hasAccess: true,
      tier: 'authenticated',
      accessLevel: 2,
      maxDayUnlocked: 60,
      features: { progressTracking: true, saveJobs: true },
    },
    { headers: r.cors }
  );
};

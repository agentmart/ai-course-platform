import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';
import { computeStreak } from '~/lib/gamification';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const GET: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const supabase = getSupabaseAdmin(env);
  const headers: Record<string, string> = { 'access-control-allow-origin': '*' };

  try {
    const { count, error: cErr } = await supabase
      .from('user_access')
      .select('*', { count: 'exact', head: true });
    if (cErr) throw cErr;
    const totalUsers = count ?? 0;

    const pageSize = 1000;
    let from = 0;
    let allUsers: any[] = [];
    while (true) {
      const { data: batch, error } = await supabase
        .from('user_access')
        .select('clerk_user_id, progress_data, subscription_type, updated_at')
        .not('progress_data->completed', 'is', null)
        .order('clerk_user_id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    let totalDaysCompleted = 0;
    const dayCounts: Record<number, number> = {};
    const leaderboard = allUsers
      .map((u) => {
        const completed: number[] = u.progress_data?.completed ?? [];
        const c = completed.length;
        totalDaysCompleted += c;
        completed.forEach((d) => {
          dayCounts[d] = (dayCounts[d] ?? 0) + 1;
        });
        return { displayName: 'User', daysCompleted: c, tier: u.subscription_type ?? 'free' };
      })
      .filter((u) => u.daysCompleted > 0)
      .sort((a, b) => b.daysCompleted - a.daysCompleted)
      .slice(0, 20);

    let mostPopularDay: number | null = null;
    let maxCount = 0;
    for (const [day, c] of Object.entries(dayCounts)) {
      if (c > maxCount) {
        maxCount = c;
        mostPopularDay = Number(day);
      }
    }
    const avgDays = totalUsers > 0 ? Math.round(totalDaysCompleted / totalUsers) : 0;

    const result: any = {
      stats: { totalUsers, totalDaysCompleted, avgDaysPerUser: avgDays, mostPopularDay },
      leaderboard,
    };

    const tok = bearerToken(request);
    if (tok) {
      headers['cache-control'] = 'private, no-store';
      try {
        const claims = await verifyClerkToken(tok, env);
        const me = allUsers.find((u) => u.clerk_user_id === claims.sub);
        if (me) {
          const myCompleted: number[] = me.progress_data?.completed ?? [];
          const myCount = myCompleted.length;
          const allCounts = allUsers.map((u) => (u.progress_data?.completed ?? []).length);
          const below = allCounts.filter((c) => c < myCount).length;
          const percentile = allCounts.length > 0 ? Math.round((below / allCounts.length) * 100) : 0;

          // Calendar-day streak from completion_dates[] (Sprint 5).
          // Falls back to legacy consecutive-day-number streak when a user has
          // completed days but no completion_dates yet (pre-Sprint-5 data).
          const dates: string[] = me.progress_data?.completion_dates ?? [];
          let streak = computeStreak(dates);
          if (streak === 0 && dates.length === 0 && myCompleted.length > 0) {
            const sorted = [...myCompleted].sort((a, b) => a - b);
            streak = 1;
            for (let i = sorted.length - 1; i > 0; i--) {
              if (sorted[i] - sorted[i - 1] === 1) streak++;
              else break;
            }
          }

          result.me = {
            daysCompleted: myCount,
            percentile,
            streak,
            completed: myCompleted,
            badges: me.progress_data?.badges ?? [],
          };
        } else {
          result.me = { daysCompleted: 0, percentile: 0, streak: 0, completed: [], badges: [] };
        }
      } catch {
        // invalid token — skip personal stats
      }
    } else {
      headers['cache-control'] = 'public, max-age=60';
    }
    return jsonResponse(result, { headers });
  } catch (e: any) {
    console.error('Leaderboard error:', e?.message ?? e);
    return jsonResponse({ error: 'Internal server error' }, { status: 500, headers });
  }
};

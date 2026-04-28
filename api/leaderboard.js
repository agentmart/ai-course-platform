// api/leaderboard.js
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Total signed-up learners (matches Clerk signup count) — independent of progress.
    let totalUsers = 0;
    {
      const { count, error: cErr } = await supabase
        .from('user_access')
        .select('*', { count: 'exact', head: true });
      if (cErr) throw cErr;
      totalUsers = count || 0;
    }

    // Paginated fetch to avoid loading entire table into memory
    const pageSize = 1000;
    let from = 0;
    let allUsers = [];

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

    // Aggregate stats (over participants — those with a `completed` key)
    let totalDaysCompleted = 0;
    const dayCounts = {};

    const leaderboard = allUsers
      .map(u => {
        const completed = u.progress_data?.completed || [];
        const count = completed.length;
        totalDaysCompleted += count;
        completed.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });

        return {
          displayName: 'User',
          daysCompleted: count,
          tier: u.subscription_type || 'free',
        };
      })
      .filter(u => u.daysCompleted > 0)
      .sort((a, b) => b.daysCompleted - a.daysCompleted)
      .slice(0, 20);

    // Find most popular day
    let mostPopularDay = null;
    let maxCount = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxCount) { maxCount = count; mostPopularDay = Number(day); }
    }

    const avgDays = totalUsers > 0 ? Math.round(totalDaysCompleted / totalUsers) : 0;

    const result = {
      stats: {
        totalUsers,
        totalDaysCompleted,
        avgDaysPerUser: avgDays,
        mostPopularDay,
      },
      leaderboard,
    };

    // If the user is authenticated, include their personal stats
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      res.setHeader('Cache-Control', 'private, no-store');
      try {
        const claims = await verifyClerkToken(token);
        const userId = claims.sub;
        const me = allUsers.find(u => u.clerk_user_id === userId);
        if (me) {
          const myCompleted = me.progress_data?.completed || [];
          const myCount = myCompleted.length;

          // Percentile is over fellow participants (users who have a `completed` key),
          // not over total signups. Matches what 'percentile of learners' implies.
          const allCounts = allUsers.map(u => (u.progress_data?.completed || []).length);
          const below = allCounts.filter(c => c < myCount).length;
          const percentile = allCounts.length > 0 ? Math.round((below / allCounts.length) * 100) : 0;

          // Calculate streak (consecutive days from last completed)
          const sorted = [...myCompleted].sort((a, b) => a - b);
          let streak = 0;
          if (sorted.length > 0) {
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
          };
        } else {
          // Authenticated user with no progress yet — show zeroed stats instead of anon prompt
          result.me = { daysCompleted: 0, percentile: 0, streak: 0, completed: [] };
        }
      } catch(e) {
        // Token invalid — skip personal stats
      }
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60');
    }

    return res.status(200).json(result);
  } catch(e) {
    console.error('Leaderboard error:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

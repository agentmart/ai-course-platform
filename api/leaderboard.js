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
  res.setHeader('Cache-Control', 'public, max-age=60');

  try {
    // Fetch all users with progress data
    const { data: users, error } = await supabase
      .from('user_access')
      .select('clerk_user_id, first_name, last_name, progress_data, subscription_type, updated_at')
      .not('progress_data', 'is', null);

    if (error) throw error;

    // Aggregate stats
    let totalUsers = users?.length || 0;
    let totalDaysCompleted = 0;
    const dayCounts = {};

    const leaderboard = (users || [])
      .map(u => {
        const completed = u.progress_data?.completed || [];
        const count = completed.length;
        totalDaysCompleted += count;
        completed.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });

        // Privacy: first name + last initial only
        const firstName = u.first_name || 'Anonymous';
        const lastInitial = u.last_name ? u.last_name[0] + '.' : '';

        return {
          displayName: lastInitial ? `${firstName} ${lastInitial}` : firstName,
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
      try {
        const claims = await verifyClerkToken(token);
        const userId = claims.sub;
        const me = users?.find(u => u.clerk_user_id === userId);
        if (me) {
          const myCompleted = me.progress_data?.completed || [];
          const myCount = myCompleted.length;

          // Calculate percentile rank
          const allCounts = (users || []).map(u => (u.progress_data?.completed || []).length);
          const below = allCounts.filter(c => c < myCount).length;
          const percentile = totalUsers > 0 ? Math.round((below / totalUsers) * 100) : 0;

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
        }
      } catch(e) {
        // Token invalid — skip personal stats
      }
    }

    return res.status(200).json(result);
  } catch(e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

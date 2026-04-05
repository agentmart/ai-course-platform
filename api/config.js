// api/config.js
// Returns public-safe config to the browser so HTML files don't need hardcoded keys.
// Only expose NEXT_PUBLIC_ vars — never secret keys.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // cache 5 min

  return res.status(200).json({
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    clerkDomain:         process.env.CLERK_DOMAIN || '',
    appUrl:              process.env.NEXT_PUBLIC_APP_URL || '',
    supabaseUrl:         process.env.SUPABASE_URL || '',
    supabaseAnonKey:     process.env.SUPABASE_ANON_KEY || '',
    pendoApiKey:         process.env.PENDO_API_KEY || '',
  });
}

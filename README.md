# Become AI PM — Course Platform

[![becomeaipm.com](https://img.shields.io/badge/live-becomeaipm.com-c8590a?style=flat-square)](https://becomeaipm.com)

Free, hands-on 60-day curriculum that turns product managers into AI PMs.
Live site: **https://becomeaipm.com**

## What this repo ships

- **60-day course** — runnable labs, interview prep, and PM leadership framing ([public/days/](public/days/))
- **AI PM jobs tracker** — 100+ AI companies, refreshed daily across 4 ATS providers ([api/companies.js](api/companies.js), [scripts/daily-jobs-check.mjs](scripts/daily-jobs-check.mjs))
- **AI cost calculator** — compare Claude, GPT, Gemini, and open-source pricing ([public/ai-calculator.html](public/ai-calculator.html))
- **PM-OS** — copy-paste prompts and templates for day-to-day AI PM work ([public/pm-os.html](public/pm-os.html))

## Related pages

- [AI PM course (60 days)](https://becomeaipm.com/ai-pm-course)
- [How to become an AI PM in 2026](https://becomeaipm.com/how-to-become-ai-pm)
- [AI PM jobs — live tracker](https://becomeaipm.com/ai-pm-jobs)
- [AI PM companies directory](https://becomeaipm.com/companies.html)
- [PM-OS — prompts & templates](https://becomeaipm.com/pm-os.html)

## Stack

Static HTML/CSS/JS frontend + Vercel serverless (`api/*.js`) + Supabase PostgreSQL.
No build step. Auth via Clerk. Analytics via Pendo.

See [DEPLOY.md](DEPLOY.md) for setup and [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for launch steps.

## Commands

```bash
npm run sync:dry     # Test weekly company sync (dry run, no DB writes)
npm run sync:live    # Weekly AI company discovery → Supabase
npm run jobs:check   # Daily PM job checker across 4 ATS providers
```

## License

Content and curriculum: © Stavan Mehta. Code: MIT.
Built by [Stavan Mehta](https://www.linkedin.com/in/stavanmehta/).

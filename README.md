# toshers

Shell project scaffolded with Vercel + Neon.

## Stack

- Hosting: [Vercel](https://vercel.com)
- Database: [Neon](https://neon.tech) (provisioned via Vercel Marketplace)

## Getting started

```bash
vercel link
vercel env pull .env.local
```

The `DATABASE_URL` (and related Neon env vars) are injected automatically by the Vercel Marketplace integration.

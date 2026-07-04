# Hosting Plan

## Recommended Architecture

- Marketing site: Astro static output serving mirrored static pages from the existing Showit site at `kaylinanorton.com`.
- Static hosting: Cloudflare Workers static assets or Netlify.
- Blog: managed WordPress at `blog.kaylinanorton.com`.
- Primary domain: `kaylinanorton.com` and `www.kaylinanorton.com` point at the static host.

This keeps the marketing site fast and low-maintenance while WordPress remains a normal editable blog.

The current pass mirrors the public static pages only: Home, Portfolio, About, Information, and Contact. The Blog/WordPress portion is intentionally deferred for a second pass.

## Local Requirements

Astro currently requires Node.js `v22.12.0` or higher. This repo pins that in `.nvmrc` and `package.json`.

```sh
node -v
npm install
npm run build
npm run preview
```

For this Showit mirror pass, use the built preview rather than `npm run dev`; the mirrored HTML files live in `public/` and are copied into `dist` during the production build.

## Build Settings

Use these settings for either static host:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22.12.0`
- Package manager: `npm`

## Cloudflare Workers Static Assets

The repo includes `wrangler.jsonc` for static asset deploys.

```sh
npm run build
npx wrangler deploy
```

Cloudflare DNS shape:

- `kaylinanorton.com` -> static site
- `www.kaylinanorton.com` -> static site
- `blog.kaylinanorton.com` -> managed WordPress host

## Netlify

The repo includes `netlify.toml`.

Connect the Git repository in Netlify and use:

- Build command: `npm run build`
- Package manager: `npm`
- Publish directory: `dist`
- Node version: `22.12.0`

## WordPress Blog

Recommended first pass: run WordPress on `blog.kaylinanorton.com`.

Using `/blog` is possible later, but it needs either a host that serves both Astro output and PHP WordPress, or a reverse proxy from the static edge to the WordPress origin.

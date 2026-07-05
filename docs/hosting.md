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

### Contact Form

The contact page uses Netlify Forms. In Netlify, keep form detection enabled, then redeploy from `main`.

After deploy, test the staging Netlify URL and confirm:

- The `contact` form appears in Netlify Forms.
- A real test submission appears in the `contact` submissions list.
- Email notifications are configured for the right inbox.
- Spam protection is active through the `bot-field` honeypot.

The form redirects to `/thank-you/` after a successful submission.

### SMS Alerts

The repo includes a Netlify event function at `netlify/functions/send-contact-sms.mjs`. It runs after Netlify verifies a form submission and sends a short Twilio SMS for the `contact` form.

Set these environment variables in Netlify under Project configuration > Environment variables:

- `TWILIO_ACCOUNT_SID`: Twilio Account SID.
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token.
- `CONTACT_SMS_TO`: Destination phone number in E.164 format, such as `+15555555555`.
- `TWILIO_FROM_NUMBER`: Twilio sender number in E.164 format.

Instead of `TWILIO_FROM_NUMBER`, you can set `TWILIO_MESSAGING_SERVICE_SID` if the Twilio account uses a Messaging Service.

Twilio trial accounts only allow predefined SMS templates. For trial testing, add `TWILIO_TRIAL_TEMPLATE_NAME` with one of Twilio's allowed template names, such as `sms_appointment_reminders`. Remove this variable after upgrading Twilio so SMS alerts can include the contact inquiry details.

After setting the variables, redeploy the site and submit a real test contact form entry on the Netlify staging URL. Check Netlify Function logs and Twilio Messaging logs if the SMS does not arrive.

## WordPress Blog

Recommended first pass: run WordPress on `blog.kaylinanorton.com`.

Using `/blog` is possible later, but it needs either a host that serves both Astro output and PHP WordPress, or a reverse proxy from the static edge to the WordPress origin.

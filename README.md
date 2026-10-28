# ESA Tracking System

Bus journey tracking and control-room dashboards for the ESA operations portal.

## Run locally

```sh
npm install
npm run dev
```

Create a local `.env.local` from `.env.example` and set the Supabase project URL
and publishable key. Never put a Supabase service-role key in frontend
environment variables.

## Deploy the frontend to Netlify

Connect this repository to Netlify and use:

- Build command: `npm run build`
- Publish directory: `dist`

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Netlify site
environment variables. The `public/_redirects` file enables client-side routes.

## Enable secure bus telemetry

Bus telemetry is accessed through the Supabase Edge Function; browser clients
do not receive direct table permissions or the service-role key.

1. Apply the Supabase SQL migrations in `supabase/migrations` in filename order.
2. Set `BUS_SYNC_PIN` as a Supabase Function secret. Do not commit the PIN or
   the service-role key.
3. Deploy `supabase/functions/bus-telemetry`:

   ```sh
   npx supabase functions deploy bus-telemetry --project-ref YOUR_PROJECT_REF
   ```

The function's JWT verification is disabled in `supabase/config.toml` because
the function validates the phone/PIN itself and issues a short-lived,
server-backed session token. After deployment, sign out and sign in again on
each device.

## Verify

```sh
npm run build
```

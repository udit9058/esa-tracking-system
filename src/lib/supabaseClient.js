import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://iwgbcuickzadicyazvgo.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_ej-digLjHRKJznNkmxsiFw_u1nuybxY';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes('YOUR_PROJECT_URL') &&
  !supabaseUrl.includes('your-project-ref')
);

if (supabasePublishableKey && supabasePublishableKey.includes('service_role')) {
  throw new Error(
    'SECURITY VIOLATION: A service_role secret key was detected in VITE_SUPABASE_PUBLISHABLE_KEY. Immediately remove it from .env.local.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

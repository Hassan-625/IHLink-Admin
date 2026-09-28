import { createClient } from "@supabase/supabase-js";

// These are public browser credentials (not the service-role secret). Environment
// variables can override them for staging or a future Supabase project.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ||
  "https://lnqsroyiybutkfngbyge.supabase.co") as string;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_VtL5RtPncmUXxxjrM_tFQw_T4cPPYDq") as string;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

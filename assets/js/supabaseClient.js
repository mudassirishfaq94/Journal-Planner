export const SUPABASE_URL = 'https://elcupprujwtatgyxlbac.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tnmQhqixfujIpPxxciqveg_Tfx-sZnd';
export const APP_STATE_ID = 'default';

let supabaseInstance = null;

export async function getSupabase() {
  if (supabaseInstance) return supabaseInstance;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.1');
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseInstance;
  } catch (error) {
    console.warn('Failed to load Supabase SDK, running in local-only mode:', error);
    return null;
  }
}

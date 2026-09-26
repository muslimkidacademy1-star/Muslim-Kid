import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://pxmewwwnekelycvrrhnt.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable__dAotAl0iQ2g3-VnK9qXRQ_NL_i_eE5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

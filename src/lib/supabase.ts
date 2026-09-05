import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nqnctynfnbpadwsxkwiw.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_wTZwHcekOtmx54f1lVK5HQ_zb_syH4O";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


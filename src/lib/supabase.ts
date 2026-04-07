import { createClient } from '@supabase/supabase-js';

// Using the provided keys as fallbacks for the AI Studio environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zwomvctlcluqtgevmrgl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XbWqJOSefY0k3DLQW-MlUg_JTiu_PWw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const supabase = createClient(url, key, { auth: { persistSession: false } });

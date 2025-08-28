
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these placeholders with your actual Supabase credentials.
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

if (supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn("Supabase credentials are placeholders. Please replace them in src/lib/supabase.ts");
}

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;


// This function is for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (): SupabaseClient | null => {
    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase URL or Key is missing.");
        return null;
    }
    
    if (supabaseClient) {
        return supabaseClient;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
}

// This function is for SERVER-SIDE USAGE ONLY.
export const getSupabaseServerClient = (): SupabaseClient | null => {
     if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase URL or Key is missing.");
        return null;
    }
    
    if (supabaseServerClient) {
        return supabaseServerClient;
    }

    supabaseServerClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
    return supabaseServerClient;
}

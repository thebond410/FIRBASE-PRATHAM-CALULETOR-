
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials are now read from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is not set in environment variables. Please check your .env file.");
}

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;


// This function is for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (): SupabaseClient | null => {
    if (!supabaseUrl || !supabaseKey) {
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

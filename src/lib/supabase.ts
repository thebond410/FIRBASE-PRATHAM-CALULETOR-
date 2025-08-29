
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials are now read from environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is not set in environment variables. The app may not function correctly.");
}

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;


// This function is for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (): SupabaseClient | null => {
    // If we don't have the credentials from env, we cannot create a client.
    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    // Return the existing client if it has already been initialized.
    if (supabaseClient) {
        return supabaseClient;
    }

    // Create a new client
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

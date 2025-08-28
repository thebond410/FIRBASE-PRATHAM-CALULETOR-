
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This variable will be reused for client-side operations.
let supabaseClient: SupabaseClient | null = null;

// This function is for CLIENT-SIDE USAGE ONLY.
// It initializes a Supabase client using credentials from localStorage.
export const getSupabaseClient = (): SupabaseClient | null => {
    // This code will only run in the browser.
    if (typeof window === 'undefined') {
        return null;
    }
    
    // If the client is already created, return it.
    if (supabaseClient) {
        return supabaseClient;
    }
    
    try {
        // Get credentials from localStorage, which are set in the Settings page.
        const supabaseUrl = localStorage.getItem('supabase_url');
        const supabaseKey = localStorage.getItem('supabase_key');

        if (supabaseUrl && supabaseKey) {
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            return supabaseClient;
        }
    } catch (error) {
        console.error("Could not read Supabase credentials from localStorage.", error);
    }
    
    return null;
}

// This function is for SERVER-SIDE USAGE ONLY.
// It initializes a Supabase client using environment variables.
export const getSupabaseServerClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        return createClient(supabaseUrl, supabaseKey, {
            // It's good practice to disable session persistence for server-side clients
            // as they are typically used for one-off requests.
            auth: { persistSession: false }
        });
    }
    
    console.warn("Supabase server credentials not found in environment variables.");
    return null;
}

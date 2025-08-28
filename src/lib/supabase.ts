
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This will be used for client-side operations
let supabaseClient: SupabaseClient | null = null;

// This function is intended for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (): SupabaseClient | null => {
    // Ensure this code only runs in the browser.
    if (typeof window === 'undefined') {
        return null;
    }
    
    // Return the existing client if it's already initialized.
    if (supabaseClient) {
        return supabaseClient;
    }
    
    try {
        // Get credentials from localStorage.
        const supabaseUrl = localStorage.getItem('supabase_url');
        const supabaseKey = localStorage.getItem('supabase_key');

        // If credentials exist, create and cache the client.
        if (supabaseUrl && supabaseKey) {
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            return supabaseClient;
        }
    } catch (error) {
        console.error("Could not read Supabase credentials from localStorage.", error);
    }
    
    return null;
}

// This function is intended for SERVER-SIDE USAGE ONLY.
export const getSupabaseServerClient = () => {
    // On the server, we get credentials from environment variables.
    // These should be set in your Vercel/hosting environment.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
        return createClient(supabaseUrl, supabaseKey, {
            auth: {
                // It's a good practice to persist session for server-side clients
                // in case you use auth features, though not strictly needed for just data access.
                persistSession: false
            }
        });
    }
    
    console.warn("Supabase server credentials not found in environment variables. Uploads and server-side operations will fail.");
    return null;
}

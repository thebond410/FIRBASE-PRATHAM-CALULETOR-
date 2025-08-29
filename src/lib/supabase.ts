
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials are now read from environment variables on the server,
// but we prioritize localStorage on the client for user-configurable settings.
const serverSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serverSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!serverSupabaseUrl || !serverSupabaseKey) {
    console.warn("Supabase URL or Key is not set in environment variables. This is fine for client-side only usage.");
}

let supabaseClient: SupabaseClient | null = null;
let lastUrl: string | undefined = undefined;
let lastKey: string | undefined = undefined;

let supabaseServerClient: SupabaseClient | null = null;


// This function is for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (url?: string | null, key?: string | null): SupabaseClient | null => {
    let supabaseUrl = url;
    let supabaseKey = key;

    // Fallback to localStorage if no credentials passed
    if (typeof window !== 'undefined') {
        if (!supabaseUrl) supabaseUrl = localStorage.getItem('supabase_url');
        if (!supabaseKey) supabaseKey = localStorage.getItem('supabase_key');
    }
    
    // If still no credentials, we can't create a client.
    if (!supabaseUrl || !supabaseKey) {
        return null;
    }

    // If the credentials haven't changed, return the existing client.
    // This prevents re-creating the client on every call with the same credentials.
    if (supabaseClient && lastUrl === supabaseUrl && lastKey === supabaseKey) {
        return supabaseClient;
    }

    // Store the last used credentials
    lastUrl = supabaseUrl;
    lastKey = supabaseKey;
    
    // Create a new client
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
}

// This function is for SERVER-SIDE USAGE ONLY.
export const getSupabaseServerClient = (): SupabaseClient | null => {
     if (!serverSupabaseUrl || !serverSupabaseKey) {
        return null;
    }
    
    if (supabaseServerClient) {
        return supabaseServerClient;
    }

    supabaseServerClient = createClient(serverSupabaseUrl, serverSupabaseKey, {
        auth: { persistSession: false }
    });
    return supabaseServerClient;
}

    
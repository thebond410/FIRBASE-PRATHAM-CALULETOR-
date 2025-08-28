
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This will be used for client-side operations
let supabaseClient: SupabaseClient | null = null;

// This will be used for server-side operations
let supabaseServerClient: SupabaseClient | null = null;


export const getSupabaseClient = () => {
    // Client-side client uses localStorage
    if (typeof window !== 'undefined') {
        if (supabaseClient) {
            return supabaseClient;
        }
         try {
            const supabaseUrl = localStorage.getItem('supabase_url');
            const supabaseKey = localStorage.getItem('supabase_key');

            if (supabaseUrl && supabaseKey) {
                supabaseClient = createClient(supabaseUrl, supabaseKey);
                return supabaseClient;
            }
        } catch (error) {
            console.error("Cannot create Supabase client, localStorage not available or credentials missing.", error);
        }
    }
    return null;
}

export const getSupabaseServerClient = () => {
     // Server-side client uses environment variables
    if (supabaseServerClient) {
        return supabaseServerClient;
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        supabaseServerClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        return supabaseServerClient;
    }
    return null;
}

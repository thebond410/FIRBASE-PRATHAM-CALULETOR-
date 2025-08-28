
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This will be used for client-side operations
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (typeof window !== 'undefined') {
        if (supabaseClient) {
            return supabaseClient;
        }
         try {
            const supabaseUrl = localStorage.getItem('supabase_url') || process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = localStorage.getItem('supabase_key') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                supabaseClient = createClient(supabaseUrl, supabaseKey);
                return supabaseClient;
            }
        } catch (error) {
            console.error("Cannot create Supabase client, credentials missing.", error);
        }
    }
    return null;
}

// Server client should be created on each request for server components/actions.
export const getSupabaseServerClient = () => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    }
    console.error("Supabase server credentials not found in environment variables.");
    return null;
}

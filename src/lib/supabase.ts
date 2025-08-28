
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
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

    return null;
}

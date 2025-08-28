
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these placeholders with your actual Supabase credentials.
const supabaseUrl = 'https://xwobggszxxdnlzzhgkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2JnZ3N6eHhkbmx6emhna2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTUxNjIsImV4cCI6MjA3MTk3MTE2Mn0.cAI3Tp5ihJY7jPiCGCNN9GAQAHUYcvoaLCOIYTk77_o';

if (supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn("Supabase credentials are placeholders. Please replace them in src/lib/supabase.ts for the app to function.");
}

let supabaseClient: SupabaseClient | null = null;
let supabaseServerClient: SupabaseClient | null = null;


// This function is for CLIENT-SIDE USAGE ONLY.
export const getSupabaseClient = (): SupabaseClient | null => {
    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
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
     if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
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

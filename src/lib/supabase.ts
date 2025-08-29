
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials are now hardcoded to ensure a fixed connection.
const supabaseUrl = "https://xwobggszxxdnlzzhgkff.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2JnZ3N6eHhkbmx6emhna2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTUxNjIsImV4cCI6MjA3MTk3MTE2Mn0.cAI3Tp5ihJY7jPiCGCNN9GAQAHUYcvoaLCOIYTk77_o";

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is not set in the code. The app may not function correctly.");
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

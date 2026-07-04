/**
 * supabase.js
 * Initializes and exports a single shared Supabase client.
 * Every other module imports from here — never initializes its own client.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const { createClient } = supabase; // loaded via CDN <script> in each HTML page

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,       // keeps session alive across page refreshes
        autoRefreshToken: true,     // silently refreshes JWT before expiry
        detectSessionInUrl: true    // handles email verification redirect links
    }
});

export { supabaseClient };

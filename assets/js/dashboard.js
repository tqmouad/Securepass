/**
 * dashboard.js
 * Loads vault statistics from metadata only — never decrypts passwords.
 */

import { supabaseClient } from './supabase.js';

async function getVaultStats() {
    const { data, error } = await supabaseClient
        .from('passwords')
        .select('strength, favorite, created_at');

    if (error) throw error;

    const total     = data.length;
    const strong    = data.filter(p => p.strength === 'strong' || p.strength === 'expert').length;
    const weak      = data.filter(p => p.strength === 'weak').length;
    const favorites = data.filter(p => p.favorite).length;

    // Most recent 5 entries
    const recent = [...data]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    return { total, strong, weak, favorites, recent };
}

export { getVaultStats };

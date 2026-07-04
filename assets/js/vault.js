/**
 * vault.js
 * CRUD operations for password entries.
 * Encrypts before writing, decrypts only on explicit user request.
 */

import { supabaseClient } from './supabase.js';
import { encryptPassword, decryptPassword } from './crypto.js';

/**
 * Save a new password entry to the vault.
 * Encrypts the plaintext password before storage.
 */
async function savePasswordEntry({ platform, username, plaintextPassword, notes, strength, favorite }, key) {
    const { ciphertext, iv } = await encryptPassword(plaintextPassword, key);

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .from('passwords')
        .insert({
            user_id:            user.id,
            platform,
            username,
            encrypted_password: ciphertext,
            iv,
            notes:              notes || '',
            strength,
            favorite:           favorite || false
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch all vault entries for the current user.
 * Returns encrypted rows — does NOT decrypt.
 */
async function getVaultEntries({ search = '', filterStrength = '', favoritesOnly = false } = {}) {
    let query = supabaseClient
        .from('passwords')
        .select('id, platform, username, notes, strength, favorite, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`platform.ilike.%${search}%,username.ilike.%${search}%`);
    }
    if (filterStrength) {
        query = query.eq('strength', filterStrength);
    }
    if (favoritesOnly) {
        query = query.eq('favorite', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Fetch a single entry including the encrypted password and IV.
 * Called only when user explicitly clicks "View Password".
 */
async function getEntryForDecryption(id) {
    const { data, error } = await supabaseClient
        .from('passwords')
        .select('encrypted_password, iv')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Decrypt a single entry on demand.
 */
async function decryptEntry(id, key) {
    const { encrypted_password, iv } = await getEntryForDecryption(id);
    return decryptPassword(encrypted_password, iv, key);
}

/**
 * Update an existing entry. Re-encrypts if password changed.
 */
async function updateEntry(id, changes, key) {
    const payload = { ...changes, updated_at: new Date().toISOString() };

    if (changes.plaintextPassword) {
        const { ciphertext, iv } = await encryptPassword(changes.plaintextPassword, key);
        payload.encrypted_password = ciphertext;
        payload.iv                 = iv;
        delete payload.plaintextPassword;
    }

    const { data, error } = await supabaseClient
        .from('passwords')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Toggle favorite status.
 */
async function toggleFavorite(id, currentValue) {
    const { data, error } = await supabaseClient
        .from('passwords')
        .update({ favorite: !currentValue })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete an entry permanently.
 */
async function deleteEntry(id) {
    const { error } = await supabaseClient
        .from('passwords')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export { savePasswordEntry, getVaultEntries, decryptEntry, updateEntry, toggleFavorite, deleteEntry };

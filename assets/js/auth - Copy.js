/**
 * auth.js
 * All authentication operations. Never touches encryption — auth and
 * vault keys are deliberately separate concerns.
 */

import { supabaseClient } from './supabase.js';

/**
 * Register a new user.
 * Supabase sends a verification email automatically.
 */
async function register(name, email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { name }          // stored in raw_user_meta_data, picked up by trigger
        }
    });
    if (error) throw error;
    return data;
}

/**
 * Log in an existing verified user.
 */
async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

/**
 * Log out current user and clear session.
 */
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = '/pages/login.html';
}

/**
 * Returns the current session or null if not logged in.
 */
async function getCurrentSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

/**
 * Returns the current user object or null.
 */
async function getCurrentUser() {
    const session = await getCurrentSession();
    return session?.user ?? null;
}

/**
 * Send password reset email.
 */
async function sendPasswordReset(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/reset-password.html`
    });
    if (error) throw error;
}

/**
 * Guard: redirect to login if no active session.
 * Call at the top of every protected page.
 */
async function requireAuth() {
    const session = await getCurrentSession();
    if (!session) {
        window.location.href = '/pages/login.html';
        return null;
    }
    return session;
}

export { register, login, logout, getCurrentSession, getCurrentUser, sendPasswordReset, requireAuth };

/**
 * login.js
 * Handles the 2-step login flow:
 *   Step 1 → email + login password (authenticates with Supabase)
 *   Step 2 → master password (derives encryption key, stored in sessionStorage)
 */

import { login } from './auth.js';
import { storeMasterKeySession } from './crypto.js';

const stepLogin  = document.getElementById('step-login');
const stepMaster = document.getElementById('step-master');
const authError  = document.getElementById('auth-error');

let loggedInEmail = '';

// ── Step 1: Login ─────────────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', async () => {
    clearErrors();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('btn-login');

    if (!email) { setError('email-error', 'Email is required.'); return; }
    if (!password) { setError('password-error', 'Password is required.'); return; }

    btn.disabled = true;
    btn.textContent = 'Logging in…';
    hideError();

    try {
        await login(email, password);
        loggedInEmail = email;
        showStep(stepMaster);
        document.getElementById('master-password').focus();
    } catch (err) {
        showError(err.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : err.message
        );
    } finally {
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
});

// ── Step 2: Master password ───────────────────────────────────────────────────
document.getElementById('btn-unlock').addEventListener('click', async () => {
    const master = document.getElementById('master-password').value;
    const btn    = document.getElementById('btn-unlock');

    if (!master) { setError('master-error', 'Master password is required.'); return; }

    btn.disabled = true;
    btn.textContent = 'Unlocking…';

    try {
        // Derive and store the CryptoKey in sessionStorage for this session.
        await storeMasterKeySession(master, loggedInEmail);
        window.location.href = '/pages/dashboard.html';
    } catch (err) {
        showError('Failed to derive encryption key. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Unlock Vault →';
    }
});

// ── Enter key support ─────────────────────────────────────────────────────────
document.getElementById('master-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-unlock').click();
});

document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
});

// ── Show/hide password toggles ────────────────────────────────────────────────
document.querySelectorAll('.input-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        target.type = target.type === 'password' ? 'text' : 'password';
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showStep(step) {
    [stepLogin, stepMaster].forEach(s => s.classList.add('hidden'));
    step.classList.remove('hidden');
}

function setError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
}

function hideError() {
    authError.classList.add('hidden');
}

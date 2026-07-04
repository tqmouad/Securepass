/**
 * register.js
 * Handles the 3-step registration flow:
 *   Step 1 → account details (name, email, login password)
 *   Step 2 → master password setup (vault encryption key source)
 *   Step 3 → verify email prompt
 */

import { register } from './auth.js';
import { storeMasterKeySession } from './crypto.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const stepAccount = document.getElementById('step-account');
const stepMaster  = document.getElementById('step-master');
const stepVerify  = document.getElementById('step-verify');
const authError   = document.getElementById('auth-error');

// ── Step navigation ───────────────────────────────────────────────────────────
document.getElementById('btn-next').addEventListener('click', () => {
    if (!validateAccountStep()) return;
    showStep(stepMaster);
});

document.getElementById('btn-back').addEventListener('click', () => {
    showStep(stepAccount);
});

// ── Register ──────────────────────────────────────────────────────────────────
document.getElementById('btn-register').addEventListener('click', async () => {
    if (!validateMasterStep()) return;

    const name            = document.getElementById('name').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const masterPassword  = document.getElementById('master-password').value;
    const btn             = document.getElementById('btn-register');

    btn.disabled = true;
    btn.textContent = 'Creating account…';
    hideError();

    try {
        await register(name, email, password);
        // Derive and store the key in sessionStorage so the user
        // doesn't re-enter the master password right after registering.
        await storeMasterKeySession(masterPassword, email);

        document.getElementById('verify-email-display').textContent = email;
        showStep(stepVerify);
    } catch (err) {
        showError(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
});

// ── Validation ────────────────────────────────────────────────────────────────
function validateAccountStep() {
    let valid = true;
    clearErrors();

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm-password').value;

    if (!name) { setError('name-error', 'Name is required.'); valid = false; }
    if (!email || !email.includes('@')) { setError('email-error', 'Valid email required.'); valid = false; }
    if (password.length < 8) { setError('password-error', 'Minimum 8 characters.'); valid = false; }
    if (password !== confirm) { setError('confirm-password-error', 'Passwords do not match.'); valid = false; }

    return valid;
}

function validateMasterStep() {
    let valid = true;
    const master  = document.getElementById('master-password').value;
    const confirm = document.getElementById('confirm-master').value;

    if (master.length < 8) { setError('master-password-error', 'Minimum 8 characters.'); valid = false; }
    if (master !== confirm) { setError('confirm-master-error', 'Master passwords do not match.'); valid = false; }

    return valid;
}

// ── Master password strength visual ──────────────────────────────────────────
document.getElementById('master-password').addEventListener('input', (e) => {
    const val = e.target.value;
    const fill = document.getElementById('master-strength-fill');
    const score = Math.min(100, val.length * 5 + ((/[A-Z]/.test(val)) ? 10 : 0) + ((/[0-9]/.test(val)) ? 10 : 0) + ((/[^a-zA-Z0-9]/.test(val)) ? 20 : 0));
    fill.style.width = score + '%';
    fill.className = 'strength-bar__fill ' + (score < 40 ? 'weak' : score < 70 ? 'medium' : 'strong');
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
    [stepAccount, stepMaster, stepVerify].forEach(s => s.classList.add('hidden'));
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

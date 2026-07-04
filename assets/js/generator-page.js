/**
 * generator-page.js
 * Wires generator.html to generator.js, crypto.js, vault.js.
 */

import { requireAuth, logout } from './auth.js';
import { generatePassword } from './generator.js';
import { getSessionKey, clearSessionKey } from './crypto.js';
import { savePasswordEntry } from './vault.js';

(async () => {
    const session = await requireAuth();
    if (!session) return;

    const key = await getSessionKey();
    if (!key) {
        // Session key expired (tab was closed and reopened)
        window.location.href = '/pages/login.html';
        return;
    }

    let lastResult = null;

    const lengthInput   = document.getElementById('length');
    const lengthDisplay = document.getElementById('length-display');

    lengthInput.addEventListener('input', () => {
        lengthDisplay.textContent = lengthInput.value;
    });

    function getOptions() {
        return {
            length:           parseInt(lengthInput.value),
            uppercase:        document.getElementById('opt-uppercase').checked,
            lowercase:        document.getElementById('opt-lowercase').checked,
            numbers:          document.getElementById('opt-numbers').checked,
            symbols:          document.getElementById('opt-symbols').checked,
            excludeAmbiguous: document.getElementById('opt-no-ambiguous').checked,
            noRepeats:        document.getElementById('opt-no-repeats').checked
        };
    }

    function generate() {
        try {
            const result = generatePassword(getOptions());
            lastResult   = result;
            renderResult(result);
        } catch (err) {
            showOutputError(err.message);
        }
    }

    function renderResult({ password, strength, entropy, crackTime }) {
        document.getElementById('output-placeholder').classList.add('hidden');
        document.getElementById('output-result').classList.remove('hidden');
        document.getElementById('output-error').classList.add('hidden');

        document.getElementById('generated-password').textContent = password;
        document.getElementById('crack-time').textContent         = crackTime;
        document.getElementById('entropy-label').textContent      = `${entropy} bits entropy`;

        const fill  = document.getElementById('strength-fill');
        const label = document.getElementById('strength-label');

        const widthMap   = { weak: '25%', medium: '55%', strong: '80%', expert: '100%' };
        fill.style.width = widthMap[strength] || '50%';
        fill.className   = `strength-meter__fill ${strength}`;

        label.textContent = strength.charAt(0).toUpperCase() + strength.slice(1);
        label.className   = `badge badge--${strength}`;
    }

    function showOutputError(msg) {
        document.getElementById('output-placeholder').classList.add('hidden');
        document.getElementById('output-result').classList.add('hidden');
        const err = document.getElementById('output-error');
        err.textContent = msg;
        err.classList.remove('hidden');
    }

    document.getElementById('btn-generate').addEventListener('click', generate);
    document.getElementById('btn-regenerate').addEventListener('click', generate);

    document.getElementById('btn-copy').addEventListener('click', () => {
        if (!lastResult) return;
        navigator.clipboard.writeText(lastResult.password).then(() => showToast('Copied to clipboard!'));
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
        if (!lastResult) return;

        const platform = document.getElementById('platform').value;
        const username = document.getElementById('username').value.trim();
        const notes    = document.getElementById('notes').value.trim();

        if (!platform) { showToast('Please select a platform first.', 'warn'); return; }

        const btn = document.getElementById('btn-save');
        btn.disabled     = true;
        btn.textContent  = 'Saving…';

        try {
            await savePasswordEntry({
                platform,
                username,
                plaintextPassword: lastResult.password,
                notes,
                strength: lastResult.strength,
                favorite: false
            }, key);
            showToast('Saved to vault! ✓', 'success');
        } catch (err) {
            showToast('Save failed: ' + err.message, 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = '💾 Save to Vault';
        }
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        clearSessionKey();
        await logout();
    });

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className   = `toast toast--${type}`;
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
})();

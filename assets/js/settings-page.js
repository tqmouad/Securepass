import { requireAuth, logout, getCurrentUser } from './auth.js';
import { supabaseClient } from './supabase.js';
import { getSessionKey, clearSessionKey } from './crypto.js';
import { getVaultEntries, decryptEntry } from './vault.js';

(async () => {
    const session = await requireAuth();
    if (!session) return;

    const user = await getCurrentUser();
    document.getElementById('profile-name').value = user?.user_metadata?.name || '';

    document.getElementById('btn-save-name').addEventListener('click', async () => {
        const name = document.getElementById('profile-name').value.trim();
        const { error } = await supabaseClient.auth.updateUser({ data: { name } });
        showToast(error ? error.message : 'Name updated!', error ? 'error' : 'success');
    });

    document.getElementById('btn-change-password').addEventListener('click', async () => {
        const pwd = document.getElementById('new-login-password').value;
        if (pwd.length < 8) { showToast('Minimum 8 characters.', 'warn'); return; }
        const { error } = await supabaseClient.auth.updateUser({ password: pwd });
        showToast(error ? error.message : 'Password updated!', error ? 'error' : 'success');
    });

    document.getElementById('btn-export').addEventListener('click', async () => {
        const key = await getSessionKey();
        if (!key) { showToast('Session expired. Please log in again.', 'error'); return; }
        try {
            const entries = await getVaultEntries();
            const decrypted = await Promise.all(entries.map(async e => {
                const plain = await decryptEntry(e.id, key);
                return { platform: e.platform, username: e.username, password: plain, notes: e.notes, strength: e.strength };
            }));
            const blob = new Blob([JSON.stringify(decrypted, null, 2)], { type: 'application/json' });
            const a    = document.createElement('a');
            a.href     = URL.createObjectURL(blob);
            a.download = `securepass-export-${Date.now()}.json`;
            a.click();
            showToast('Vault exported. Keep this file safe!', 'success');
        } catch (err) {
            showToast('Export failed: ' + err.message, 'error');
        }
    });

    document.getElementById('btn-delete-account').addEventListener('click', async () => {
        if (!confirm('Delete your account permanently? All passwords will be lost forever.')) return;
        const { error } = await supabaseClient.rpc('delete_user');
        if (error) { showToast('Delete failed: ' + error.message, 'error'); return; }
        clearSessionKey();
        window.location.href = '../index.html';
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

/**
 * dashboard-page.js
 * Wires dashboard.html to dashboard.js and auth.js.
 */

import { requireAuth, logout, getCurrentUser } from './auth.js';
import { getVaultStats } from './dashboard.js';
import { clearSessionKey } from './crypto.js';

(async () => {
    const session = await requireAuth();
    if (!session) return;

    // Display name
    const user = await getCurrentUser();
    const profile = user?.user_metadata?.name || user?.email || 'there';
    document.getElementById('user-name').textContent = profile;

    // Load stats
    try {
        const stats = await getVaultStats();

        document.getElementById('stat-total').textContent     = stats.total;
        document.getElementById('stat-strong').textContent    = stats.strong;
        document.getElementById('stat-weak').textContent      = stats.weak;
        document.getElementById('stat-favorites').textContent = stats.favorites;

        if (stats.total === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Failed to load stats:', err.message);
    }

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
        clearSessionKey();
        await logout();
    });
})();

/**
 * vault-page.js
 * Wires vault.html — list, search, decrypt-on-demand, delete, favorite.
 */

import { requireAuth, logout } from './auth.js';
import { getSessionKey, clearSessionKey } from './crypto.js';
import { getVaultEntries, decryptEntry, deleteEntry, toggleFavorite } from './vault.js';

(async () => {
    const session = await requireAuth();
    if (!session) return;

    const key = await getSessionKey();
    if (!key) { window.location.href = '/pages/login.html'; return; }

    let entries = [];

    const vaultList   = document.getElementById('vault-list');
    const emptyState  = document.getElementById('empty-state');
    const loadingState= document.getElementById('loading-state');

    // ── Load ────────────────────────────────────────────────────────────────
    async function loadVault() {
        loadingState.classList.remove('hidden');
        vaultList.innerHTML = '';
        emptyState.classList.add('hidden');

        try {
            const search    = document.getElementById('search').value.trim();
            const strength  = document.getElementById('filter-strength').value;
            const favorites = document.getElementById('filter-favorites').checked;

            entries = await getVaultEntries({ search, filterStrength: strength, favoritesOnly: favorites });

            loadingState.classList.add('hidden');

            if (entries.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            entries.forEach(entry => vaultList.appendChild(buildCard(entry)));
        } catch (err) {
            loadingState.classList.add('hidden');
            showToast('Failed to load vault: ' + err.message, 'error');
        }
    }

    // ── Card builder ────────────────────────────────────────────────────────
    function buildCard(entry) {
        const card = document.createElement('div');
        card.className  = 'vault-card';
        card.dataset.id = entry.id;

        card.innerHTML = `
            <div class="vault-card__main">
                <div class="vault-card__icon">${platformIcon(entry.platform)}</div>
                <div class="vault-card__info">
                    <div class="vault-card__platform">${entry.platform || '—'}</div>
                    <div class="vault-card__username">${entry.username || 'No username'}</div>
                    ${entry.notes ? `<div class="vault-card__notes">${entry.notes}</div>` : ''}
                </div>
            </div>
            <div class="vault-card__meta">
                <span class="badge badge--${entry.strength}">${entry.strength}</span>
                <span class="vault-card__date">${formatDate(entry.created_at)}</span>
            </div>
            <div class="vault-card__actions">
                <button class="btn btn--ghost btn--sm btn-favorite" title="Favorite">${entry.favorite ? '⭐' : '☆'}</button>
                <button class="btn btn--ghost btn--sm btn-view"   title="View password">👁 View</button>
                <button class="btn btn--ghost btn--sm btn-copy"   title="Copy">📋</button>
                <button class="btn btn--danger btn--sm btn-delete" title="Delete">🗑</button>
            </div>
        `;

        card.querySelector('.btn-view').addEventListener('click', () => openModal(entry));
        card.querySelector('.btn-copy').addEventListener('click', () => copyEntry(entry));
        card.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(entry, card));
        card.querySelector('.btn-favorite').addEventListener('click', () => toggleFav(entry, card));

        return card;
    }

    // ── View / Modal ────────────────────────────────────────────────────────
    async function openModal(entry) {
        try {
            const plaintext = await decryptEntry(entry.id, key);
            document.getElementById('modal-title').textContent    = entry.platform;
            document.getElementById('modal-password').value       = plaintext;
            document.getElementById('modal-overlay').classList.remove('hidden');

            document.getElementById('modal-copy').onclick = () => {
                navigator.clipboard.writeText(plaintext).then(() => showToast('Copied!'));
            };
        } catch {
            showToast('Decryption failed. Wrong master password?', 'error');
        }
    }

    document.getElementById('modal-close').addEventListener('click',     closeModal);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.getElementById('modal-password').closest('.input-wrapper')
        .querySelector('.input-toggle').addEventListener('click', () => {
            const inp = document.getElementById('modal-password');
            inp.type  = inp.type === 'password' ? 'text' : 'password';
        });

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-password').value = '';
    }

    // ── Copy without showing ────────────────────────────────────────────────
    async function copyEntry(entry) {
        try {
            const plaintext = await decryptEntry(entry.id, key);
            await navigator.clipboard.writeText(plaintext);
            showToast('Password copied!');
        } catch {
            showToast('Copy failed.', 'error');
        }
    }

    // ── Delete ──────────────────────────────────────────────────────────────
    async function confirmDelete(entry, card) {
        if (!confirm(`Delete ${entry.platform} password? This cannot be undone.`)) return;
        try {
            await deleteEntry(entry.id);
            card.remove();
            if (vaultList.children.length === 0) emptyState.classList.remove('hidden');
            showToast('Deleted.');
        } catch (err) {
            showToast('Delete failed: ' + err.message, 'error');
        }
    }

    // ── Favorite toggle ─────────────────────────────────────────────────────
    async function toggleFav(entry, card) {
        try {
            const updated = await toggleFavorite(entry.id, entry.favorite);
            entry.favorite = updated.favorite;
            card.querySelector('.btn-favorite').textContent = entry.favorite ? '⭐' : '☆';
        } catch (err) {
            showToast('Failed to update favorite.', 'error');
        }
    }

    // ── Search + filter ─────────────────────────────────────────────────────
    let searchTimer;
    document.getElementById('search').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadVault, 300);
    });
    document.getElementById('filter-strength').addEventListener('change', loadVault);
    document.getElementById('filter-favorites').addEventListener('change', loadVault);

    // ── Logout ──────────────────────────────────────────────────────────────
    document.getElementById('btn-logout').addEventListener('click', async () => {
        clearSessionKey();
        await logout();
    });

    // ── Helpers ─────────────────────────────────────────────────────────────
    function platformIcon(platform) {
        const icons = { github:'🐙', instagram:'📸', facebook:'📘', gmail:'📧',
                        amazon:'📦', bank:'🏦', wifi:'📶', linkedin:'💼',
                        tiktok:'🎵', outlook:'📩', gaming:'🎮' };
        return icons[(platform || '').toLowerCase()] || '🔑';
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className   = `toast toast--${type}`;
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    await loadVault();
})();

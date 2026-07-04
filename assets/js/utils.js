/**
 * utils.js — shared pure helpers
 */

/** Debounce: delay fn execution until ms have passed since last call */
function debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/** Copy text to clipboard, returns true on success */
async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
}

/** Format ISO date string to readable label */
function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export { debounce, copyToClipboard, formatDate };

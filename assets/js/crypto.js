/**
 * crypto.js
 * Client-side cryptography using the Web Crypto API.
 *
 * Key decisions:
 *   - PBKDF2 for key derivation (available in Web Crypto; Argon2 is not)
 *   - AES-GCM for encryption (authenticated encryption — detects tampering)
 *   - New random IV for every encryption operation (reusing IVs breaks AES-GCM)
 *   - Derived key stored in sessionStorage as exportable JWK so the user
 *     only enters the master password once per browser session.
 *   - Salt is deterministic (derived from email) so key derivation is
 *     reproducible across logins without storing the salt server-side.
 *     Trade-off: if the user changes email, existing entries become undecryptable.
 *     This is acceptable for a portfolio project; production would store the salt.
 */

const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 minimum recommendation
const KEY_STORAGE_KEY   = 'sp_derived_key';

// ── Key derivation ────────────────────────────────────────────────────────────

/**
 * Derives a CryptoKey from the master password using PBKDF2.
 * @param {string} masterPassword
 * @param {string} salt - deterministic per user (we use email)
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(masterPassword, salt) {
    const enc = new TextEncoder();

    // Import the master password as raw key material.
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(masterPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derive the AES-GCM key.
    return crypto.subtle.deriveKey(
        {
            name:       'PBKDF2',
            salt:       enc.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash:       'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,   // extractable — needed to store in sessionStorage as JWK
        ['encrypt', 'decrypt']
    );
}

/**
 * Derives the key and stores it in sessionStorage for the current session.
 * Called after successful login so subsequent operations don't re-derive.
 * sessionStorage is cleared automatically when the browser tab closes.
 * @param {string} masterPassword
 * @param {string} email - used as the PBKDF2 salt
 */
async function storeMasterKeySession(masterPassword, email) {
    const key    = await deriveKey(masterPassword, email);
    const jwk    = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(jwk));
}

/**
 * Retrieves the derived CryptoKey from sessionStorage.
 * Returns null if not found (session expired or tab was closed).
 * @returns {Promise<CryptoKey|null>}
 */
async function getSessionKey() {
    const raw = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (!raw) return null;

    try {
        const jwk = JSON.parse(raw);
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    } catch {
        return null;
    }
}

/**
 * Clears the derived key from sessionStorage on logout.
 */
function clearSessionKey() {
    sessionStorage.removeItem(KEY_STORAGE_KEY);
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-GCM.
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<{ ciphertext: string, iv: string }>} both base64-encoded
 */
async function encryptPassword(plaintext, key) {
    const enc = new TextEncoder();
    // Generate a fresh 12-byte random IV for every encryption.
    // Reusing an IV with the same key completely breaks AES-GCM security.
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
    );

    return {
        ciphertext: bufferToBase64(ciphertextBuffer),
        iv:         bufferToBase64(iv)
    };
}

/**
 * Decrypts an AES-GCM ciphertext.
 * @param {string} ciphertext - base64-encoded
 * @param {string} iv         - base64-encoded
 * @param {CryptoKey} key
 * @returns {Promise<string>} plaintext
 */
async function decryptPassword(ciphertext, iv, key) {
    const dec = new TextDecoder();

    const plaintextBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(iv) },
        key,
        base64ToBuffer(ciphertext)
    );

    return dec.decode(plaintextBuffer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export {
    deriveKey,
    storeMasterKeySession,
    getSessionKey,
    clearSessionKey,
    encryptPassword,
    decryptPassword
};

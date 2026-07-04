/**
 * generator.js
 * Cryptographically secure password generation.
 * Uses crypto.getRandomValues() exclusively — never Math.random().
 */

const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers:   '0123456789',
    symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Characters that look similar and cause confusion (0/O, 1/l/I etc.)
const AMBIGUOUS = /[0O1lI]/g;

/**
 * Generate a cryptographically secure password.
 * @param {object} options
 * @param {number}  options.length       - 8–64
 * @param {boolean} options.uppercase    - include A-Z
 * @param {boolean} options.lowercase    - include a-z
 * @param {boolean} options.numbers      - include 0-9
 * @param {boolean} options.symbols      - include special chars
 * @param {boolean} options.excludeAmbiguous - remove 0,O,1,l,I
 * @param {boolean} options.noRepeats    - avoid consecutive repeated chars
 * @returns {{ password: string, strength: string, entropy: number, crackTime: string }}
 */
function generatePassword(options) {
    const {
        length          = 16,
        uppercase       = true,
        lowercase       = true,
        numbers         = true,
        symbols         = true,
        excludeAmbiguous = false,
        noRepeats       = false
    } = options;

    // Validation — must select at least one character type
    if (!uppercase && !lowercase && !numbers && !symbols) {
        throw new Error('You must select at least one character type.');
    }

    if (length < 8 || length > 64) {
        throw new Error('Length must be between 8 and 64.');
    }

    // Build charset
    let charset = '';
    if (uppercase) charset += CHARSETS.uppercase;
    if (lowercase) charset += CHARSETS.lowercase;
    if (numbers)   charset += CHARSETS.numbers;
    if (symbols)   charset += CHARSETS.symbols;

    if (excludeAmbiguous) {
        charset = charset.replace(AMBIGUOUS, '');
    }

    // Guarantee at least one character from each selected type
    const required = [];
    if (uppercase) required.push(randomChar(excludeAmbiguous ? CHARSETS.uppercase.replace(AMBIGUOUS, '') : CHARSETS.uppercase));
    if (lowercase) required.push(randomChar(excludeAmbiguous ? CHARSETS.lowercase.replace(AMBIGUOUS, '') : CHARSETS.lowercase));
    if (numbers)   required.push(randomChar(excludeAmbiguous ? CHARSETS.numbers.replace(AMBIGUOUS, '')   : CHARSETS.numbers));
    if (symbols)   required.push(randomChar(CHARSETS.symbols));

    // Fill remaining length
    const remaining = length - required.length;
    const chars = [];
    let last = '';

    for (let i = 0; i < remaining; i++) {
        let char;
        let attempts = 0;
        do {
            char = randomChar(charset);
            attempts++;
        } while (noRepeats && char === last && attempts < 10);
        chars.push(char);
        last = char;
    }

    // Combine required + random and shuffle
    const all = shuffle([...required, ...chars]);
    const password = all.join('');

    const charsetSize = charset.length;
    const entropy     = calculateEntropy(length, charsetSize);
    const strength    = estimateStrength(entropy);
    const crackTime   = estimateCrackTime(entropy);

    return { password, strength, entropy: Math.round(entropy), crackTime };
}

/**
 * Pick a random character from a string using crypto.getRandomValues().
 */
function randomChar(str) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return str[array[0] % str.length];
}

/**
 * Fisher-Yates shuffle using crypto.getRandomValues().
 */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const j = array[0] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Entropy in bits: log2(charsetSize ^ length) = length * log2(charsetSize)
 */
function calculateEntropy(length, charsetSize) {
    return length * Math.log2(charsetSize);
}

/**
 * Map entropy bits to a human-readable strength label.
 */
function estimateStrength(entropyBits) {
    if (entropyBits < 40)  return 'weak';
    if (entropyBits < 60)  return 'medium';
    if (entropyBits < 100) return 'strong';
    return 'expert';
}

/**
 * Rough crack-time estimate assuming 10 billion guesses/second (fast offline attack).
 */
function estimateCrackTime(entropyBits) {
    const guessesPerSecond = 1e10;
    const combinations     = Math.pow(2, entropyBits);
    const seconds          = combinations / guessesPerSecond / 2; // average half keyspace

    if (seconds < 1)           return 'Less than a second';
    if (seconds < 60)          return `${Math.round(seconds)} seconds`;
    if (seconds < 3600)        return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400)       return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 2592000)     return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000)    return `${Math.round(seconds / 2592000)} months`;
    if (seconds < 3153600000)  return `${Math.round(seconds / 31536000)} years`;
    return 'Centuries';
}

export { generatePassword, calculateEntropy, estimateStrength, estimateCrackTime };

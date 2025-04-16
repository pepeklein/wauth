// Cache to store previously checked numbers
const cache = {};

// Prevent multiple submissions
let isSubmitting = false;

/**
 * Makes a request to the API and checks the status until a definitive response is received.
 * @param {string} phone - The phone number.
 * @param {string} country - The country code.
 * @param {string} nonce - A unique identifier for the request.
 * @returns {Promise<Object>} - The API response object.
 */
async function fetchWhatsAppStatus(phone, country, nonce) {
    const MAX_RETRIES = 3; // Maximum number of attempts
    const RETRY_DELAY = 3000; // Delay between attempts (in ms)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch('http://127.0.0.1:5500/whatsapp_checker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ number: phone, country, nonce }),
            });

            const data = await response.json();
            console.log(`Attempt ${attempt + 1}:`, data);

            if (data.message && data.message.whatsapp !== 'checking') {
                return data; // Return the definitive response
            }
        } catch (error) {
            console.error(`Error on attempt ${attempt + 1}:`, error);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }

    throw new Error('The process took longer than expected. Please try again.');
}

document.getElementById('whatsapp-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    if (isSubmitting) return; // Prevent multiple submissions
    isSubmitting = true;

    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value.trim();
    const statusDiv = document.getElementById('whatsapp-status');
    const spinner = statusDiv.querySelector('.spinner');
    const statusText = statusDiv.querySelector('.status-text');

    resetStatus(statusDiv, statusText);

    if (!isValidPhoneNumber(phone)) {
        updateStatus(statusDiv, statusText, MESSAGES.invalidNumber, 'red');
        isSubmitting = false;
        return;
    }

    setLoadingState(statusDiv, spinner, statusText);

    try {
        const nonce = Date.now().toString() + Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        const data = await fetchWhatsAppStatus(phone, country, nonce);

        if (data.message && data.message.whatsapp === 'yes') {
            updateStatus(statusDiv, statusText, MESSAGES.hasWhatsApp, 'green');
        } else if (data.message && data.message.whatsapp === 'no') {
            updateStatus(statusDiv, statusText, MESSAGES.noWhatsApp, 'red');
        } else {
            updateStatus(statusDiv, statusText, MESSAGES.unexpectedError, 'red');
        }
    } catch (error) {
        console.error('Request error:', error);
        updateStatus(statusDiv, statusText, error.message, 'red');
    } finally {
        removeLoadingState(statusDiv, spinner);
        isSubmitting = false;
    }
});

/**
 * Resets the status display to its default state.
 * @param {HTMLElement} statusDiv - The status container element.
 * @param {HTMLElement} statusText - The status text element.
 */
function resetStatus(statusDiv, statusText) {
    statusDiv.className = ''; // Clear all classes
    statusText.textContent = MESSAGES.awaitingVerification;
}

/**
 * Validates the phone number format.
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} - True if the phone number is valid, false otherwise.
 */
function isValidPhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10,15}$/; // 10-15 digits
    return phoneRegex.test(phone) && !phone.startsWith('0'); // Don't allow leading zeros
}

/**
 * Sets the loading state by showing the spinner and updating the text.
 * @param {HTMLElement} statusDiv - The status container element.
 * @param {HTMLElement} spinner - The spinner element.
 * @param {HTMLElement} statusText - The status text element.
 */
function setLoadingState(statusDiv, spinner, statusText) {
    statusDiv.classList.add('loading');
    spinner.style.display = ''; // Show spinner
    statusText.textContent = MESSAGES.verifying;
}

/**
 * Updates the status display with a message and a color.
 * @param {HTMLElement} statusDiv - The status container element.
 * @param {HTMLElement} statusText - The status text element.
 * @param {string} message - The message to display.
 * @param {string} colorClass - The color class to apply (e.g., 'green', 'red').
 */
function sanitizeHTML(str) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = str;
    return tempDiv.innerHTML;
}

function updateStatus(statusDiv, statusText, message, colorClass) {
    statusDiv.classList.remove('green', 'red', 'loading'); // Remove specific classes
    statusDiv.classList.add(colorClass); // Apply color class
    statusText.innerHTML = sanitizeHTML(message); // Use sanitized message
}

/**
 * Removes the loading state by hiding the spinner.
 * @param {HTMLElement} statusDiv - The status container element.
 * @param {HTMLElement} spinner - The spinner element.
 */
function removeLoadingState(statusDiv, spinner) {
    statusDiv.classList.remove('loading');
    spinner.style.display = 'none'; // Hide spinner
}

/**
 * Constants for fixed messages used in the application.
 */
const MESSAGES = {
    awaitingVerification: 'Awaiting verification...',
    verifying: 'Verifying...',
    hasWhatsApp: 'The number is registered on WhatsApp.',
    noWhatsApp: 'The number is not registered on WhatsApp.',
    invalidNumber: 'Invalid phone number format. Enter only the area code and number.',
    networkError: 'Network error. Check your connection.',
    unexpectedError: 'Unexpected error.',
};
// Cache to store previously checked numbers
const cache = {};

// Prevent multiple submissions
let isSubmitting = false;

// Add event listener to the form submission
document.getElementById('whatsapp-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    if (isSubmitting) return; // Block multiple submissions
    isSubmitting = true;

    // Get input values
    const phone = document.getElementById('phone').value;
    const country = document.getElementById('country').value;
    const statusDiv = document.getElementById('whatsapp-status');
    const spinner = statusDiv.querySelector('.spinner');
    const statusText = statusDiv.querySelector('.status-text');

    // Reset default status
    resetStatus(statusDiv, statusText);

    // Validate phone number before sending the request
    if (!isValidPhoneNumber(phone)) {
        updateStatus(statusDiv, statusText, MESSAGES.invalidNumber, 'red');
        return;
    }

    // Check the number is already stored in the cache
    const cacheKey = `${country}-${phone}`;
    if (cache[cacheKey]) {
        console.log('Resposta do cache:', cache[cacheKey]);
        const cachedResponse = cache[cacheKey];
        updateStatus(
            statusDiv,
            statusText,
            cachedResponse.whatsapp === 'yes' ? MESSAGES.hasWhatsApp : MESSAGES.noWhatsApp,
            cachedResponse.whatsapp === 'yes' ? 'green' : 'red'
        );
        isSubmitting = false; // Allow new submissions
        return;
    }

    // Show loading state
    setLoadingState(statusDiv, spinner, statusText);

    try {
        const nonce = Date.now().toString() + crypto.randomBytes(16).toString('hex');
        // Send the request to the backend
        const response = await fetch('https://localhost:5500/whatsapp_checker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // 'Authorization': `Bearer TOKEN_JWT` // Substitute with actual token if needed
            },
            body: new URLSearchParams({ number: phone, country, nonce }),
        });

        const data = await response.json();
        console.log('Resposta da API:', data);

        // Response structure validation before storing it in the cache
        if (data.message && typeof data.message.whatsapp === 'string') {
            cache[cacheKey] = data.message;
        } else {
            console.error('Resposta inesperada da API:', data);
            updateStatus(statusDiv, statusText, MESSAGES.unexpectedError, 'red');
            return;
        }

        // Update status based on the API response
        if (data.message && data.message.whatsapp === 'yes') {
            updateStatus(statusDiv, statusText, MESSAGES.hasWhatsApp, 'green');
        } else {
            updateStatus(statusDiv, statusText, MESSAGES.noWhatsApp, 'red');
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        if (error.name === 'TypeError') {
            updateStatus(statusDiv, statusText, MESSAGES.networkError, 'red');
        } else {
            updateStatus(statusDiv, statusText, MESSAGES.unexpectedError, 'red');
        }
    } finally {
        removeLoadingState(statusDiv, spinner); // Remove loading state
        isSubmitting = false; // Allow new submissions
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
    statusText.innerHTML = sanitizeHTML(message); // Use mensagem sanitizada
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
    awaitingVerification: 'Aguardando verificação...',
    verifying: 'Verificando...',
    hasWhatsApp: 'O número está registrado no WhatsApp.',
    noWhatsApp: 'O número não está registrado no WhatsApp.',
    invalidNumber: 'Formato de número inválido. Digite apenas o DDD e o número.',
    networkError: 'Erro de rede. Verifique sua conexão.',
    unexpectedError: 'Erro inesperado.',
};
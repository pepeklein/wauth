/*
 * Cache to store previously checked phone numbers to avoid redundant API calls.
 * The cache key is a combination of the country code and phone number.
 */
const cache = {};

/*
 * Flag to prevent multiple form submissions at the same time.
 */
let isSubmitting = false;

/*
 * Event listener for the form submission.
 * Handles the process of validating the phone number, checking the cache, and sending the request to the backend.
 */
document.getElementById('whatsapp-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    if (isSubmitting) return; // Prevent multiple submissions
    isSubmitting = true;

    // Get input values from the form
    const phone = document.getElementById('phone').value;
    const country = document.getElementById('country').value;
    const statusDiv = document.getElementById('whatsapp-status');
    const spinner = statusDiv.querySelector('.spinner');
    const statusText = statusDiv.querySelector('.status-text');

    // Reset the status display to its default state
    resetStatus(statusDiv, statusText);

    // Validate the phone number format before proceeding
    if (!isValidPhoneNumber(phone)) {
        updateStatus(statusDiv, statusText, MESSAGES.invalidNumber, 'red');
        isSubmitting = false;
        return;
    }

    // Check the number is already stored in cache
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

    // Show loading state while the request is being processed
    setLoadingState(statusDiv, spinner, statusText);

    try {
        // Generate a unique nonce for the request to prevent duplicates
        const nonce = Date.now().toString() + Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        /*
         * Function to handle retries for the API request.
         * Retries up to 3 times if the API response indicates that the verification is still in progress.
         */
        const fetchWithRetries = async (attempt = 1) => {
            const nonce = Date.now().toString() + Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            const response = await fetch('https://localhost:5500/whatsapp_checker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ number: phone, country, nonce }),
            });

            const data = await response.json();
            console.log(`Resposta da API (tentativa ${attempt}):`, data);

            if (data.message && data.message.whatsapp === 'checking') {
                if (attempt < 3) {
                    // Update the status to indicate a delay and keep the spinner active
                    if (attempt === 2) {
                        updateStatus(statusDiv, statusText, MESSAGES.takingLonger, 'yellow');
                    }

                    // Add a delay before the next retry
                    const delay = attempt === 2 ? 5000 : 3000; // 3s before the second attempt, 5s before the third
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    return fetchWithRetries(attempt + 1);
                } else {
                    updateStatus(statusDiv, statusText, MESSAGES.unableToVerify, 'red');
                    throw new Error('Não foi possível verificar após várias tentativas.');
                }
            }

            return data;
        };

        const data = await fetchWithRetries();

        // Validate the response structure before storing it in the cache
        if (data.message && typeof data.message.whatsapp === 'string') {
            cache[cacheKey] = data.message;
        } else {
            console.error('Resposta inesperada da API:', data);
            updateStatus(statusDiv, statusText, MESSAGES.unexpectedError, 'red');
            return;
        }

        // Update the status based on the API response
        if (data.message.whatsapp === 'yes') {
            updateStatus(statusDiv, statusText, MESSAGES.hasWhatsApp, 'green');
        } else if (data.message.whatsapp === 'no') {
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
        removeLoadingState(statusDiv, spinner); // Remove the loading state
        isSubmitting = false; // Allow new submissions
    }
});

// Constants for fixed messages used in the application.
const MESSAGES = {
    awaitingVerification: 'Aguardando verificação...',
    verifying: 'Verificando...',
    takingLonger: 'Aguarde. Isso está levando mais do que o esperado.',
    hasWhatsApp: 'O número está registrado no WhatsApp.',
    noWhatsApp: 'O número não está registrado no WhatsApp.',
    invalidNumber: 'Formato de número inválido. Digite apenas o DDD e o número.',
    networkError: 'Erro de rede. Verifique sua conexão.',
    unexpectedError: 'Erro inesperado.',
    unableToVerify: 'Não foi possível verificar. Tente novamente.',
};

/**
 * Resets the status display to its initial state.
 * @param {HTMLElement} statusDiv - The element displaying the status.
 * @param {HTMLElement} statusText - The element displaying the status text.
 */
function resetStatus(statusDiv, statusText) {
    statusDiv.classList.remove('green', 'red', 'yellow', 'loading');
    const spinner = statusDiv.querySelector('.spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
    statusText.textContent = MESSAGES.awaitingVerification;
}

/**
 * Validates the phone number format.
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} - Returns true if the phone number is valid, otherwise false.
 */
function isValidPhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10,15}$/; // Accepts numbers with 10 to 15 digits
    return phoneRegex.test(phone);
}

/**
 * Sets the loading state on the status display.
 * @param {HTMLElement} statusDiv - The element displaying the status.
 * @param {HTMLElement} spinner - The spinner element.
 * @param {HTMLElement} statusText - The element displaying the status text.
 */
function setLoadingState(statusDiv, spinner, statusText) {
    statusDiv.classList.add('loading');
    if (spinner) {
        spinner.style.display = 'inline-block';
    }
    statusText.textContent = MESSAGES.verifying;
}

/**
 * Removes the loading state from the status display.
 * @param {HTMLElement} statusDiv - The element displaying the status.
 * @param {HTMLElement} spinner - The spinner element.
 */
function removeLoadingState(statusDiv, spinner) {
    statusDiv.classList.remove('loading');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Updates the status displayed to the user.
 * @param {HTMLElement} statusDiv - The element displaying the status.
 * @param {HTMLElement} statusText - The element displaying the status text.
 * @param {string} message - The message to display.
 * @param {string} colorClass - The color class (green, red, yellow) to apply.
 */
function updateStatus(statusDiv, statusText, message, colorClass) {
    statusDiv.classList.remove('green', 'red', 'yellow');
    statusDiv.classList.add(colorClass);
    statusText.textContent = message;
}
// Import required modules
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import validator from 'validator';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
}));

// Middleware for parsing requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10kb' }));

// Rate limiter to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per window
    message: { error: 'Too many requests. Please try again later.' },
});

app.use(limiter);

// Load API endpoint and key from environment variables
const ENDPOINT = process.env.ENDPOINT;
const API_KEY = process.env.API_KEY;

// Map to store nonces and their statuses
const nonces = new Map();

/**
 * Normalizes a phone number by removing unnecessary characters.
 * @param {string} number - The phone number entered by the user.
 * @returns {string} - The normalized phone number containing only digits.
 */
function normalizePhoneNumber(number) {
    let cleanedNumber = number.replace(/[\s()-]/g, '');
    if (cleanedNumber.startsWith('+')) {
        cleanedNumber = cleanedNumber.replace(/^\+\d{1,3}/, '');
    }
    return cleanedNumber;
}

/**
 * Validates the phone number format.
 * @param {string} number - The phone number to validate.
 * @returns {boolean} - True if the phone number is valid, false otherwise.
 */
function isValidPhoneNumber(number) {
    const phoneRegex = /^[0-9]{10,15}$/; // 10-15 digits
    return phoneRegex.test(number);
}

// Endpoint to check WhatsApp status
app.post('/whatsapp_checker', async (req, res) => {
    let { number, country } = req.body;
    const { nonce } = req.body;

    // Check if nonce already exists
    if (!nonces.has(nonce)) {
        nonces.set(nonce, { status: 'checking', attempts: 0 });
    }

    const nonceData = nonces.get(nonce);

    // Increment the number of attempts
    nonceData.attempts += 1;

    // Reject if attempts exceed 3 and status is still "checking"
    if (nonceData.attempts > 3 && nonceData.status === 'checking') {
        return res.status(400).json({ error: 'Maximum attempts exceeded.' });
    }

    // Update the nonce status
    nonces.set(nonce, { ...nonceData, status: 'checking' });

    // Sanitize inputs
    number = validator.trim(number);
    country = validator.escape(country);

    // Normalize the phone number
    number = normalizePhoneNumber(number);

    // Validate the phone number
    if (!isValidPhoneNumber(number)) {
        return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    try {
        console.log(`Attempt ${nonceData.attempts}: Sending request to external API...`);

        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': API_KEY,
            },
            body: new URLSearchParams({ number, country }),
        });

        if (!response.ok) {
            console.error('Request error:', response.statusText);
            return res.status(response.status).json({ error: `External API error: ${response.statusText}` });
        }

        const data = await response.json();

        // Update the nonce status
        if (data.message && data.message.whatsapp !== 'checking') {
            nonces.set(nonce, { ...nonceData, status: data.message.whatsapp });
        }

        return res.json(data);
    } catch (error) {
        console.error('Backend error:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Server is running! Use the /whatsapp_checker endpoint to send requests.');
});

// Start the server
const PORT = process.env.PORT || 5500;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
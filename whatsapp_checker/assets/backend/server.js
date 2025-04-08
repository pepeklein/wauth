import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Load API endpoint and key from .env file
const ENDPOINT = process.env.ENDPOINT;
const API_KEY = process.env.API_KEY;

console.log('Endpoint:', ENDPOINT);
console.log('API Key:', API_KEY);

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
    const phoneRegex = /^[0-9]{10,15}$/; // Example: 10-15 digits
    return phoneRegex.test(number);
}

// API endpoint to check if a phone number is registered on WhatsApp
app.post('/whatsapp_checker', async (req, res) => {
    let { number, country } = req.body;

    // Normalize the phone number
    number = normalizePhoneNumber(number);
    console.log('Normalized number:', number);
    console.log('Country:', country);

    // Validate the phone number
    if (!isValidPhoneNumber(number)) {
        return res.status(400).json({ error: 'Formato de número inválido.' });
    }

    try {
        // Send the request to the external API
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'User-Agent': 'PostmanRuntime/7.43.3',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': API_KEY,
            },
            body: new URLSearchParams({ number, country }),
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        res.json(data);
    } catch (error) {
        console.error('Request error:', error);

        // Handle different types of errors
        if (error.name === 'FetchError') {
            res.status(502).json({ error: 'Falha ao conectar com a API' });
        } else {
            res.status(500).json({ error: 'Um erro inesperado aconteceu' });
        }
    }
});

// Start the server on port 5500
app.listen(5500, () => {
    console.log('Servidor rodando em http://localhost:5500');
});
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
// import jwt from 'jsonwebtoken';
import https from 'https';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10kb' }));

/* Generate a JWT token for testing purposes
const token = jwt.sign({ user: 'exampleUser' }, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log('Token JWT gerado para testes:', token);
*/

console.log('SSL_KEY:', process.env.SSL_KEY.slice(0, 30) + '...');
console.log('SSL_CERT:', process.env.SSL_CERT.slice(0, 30) + '...');

if (process.env.NODE_ENV !== 'production') {
    console.log('Servidor iniciado.');
}

// Middleware to limit the number of requests to prevent abuse and ensure fair usage of the API
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});

app.use(limiter);

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

// Set to store nonces to prevent duplicate requests
const nonces = new Set();

// API endpoint to check if a phone number is registered on WhatsApp
app.post('/whatsapp_checker', async (req, res) => {
    let { number, country } = req.body;
    const { nonce } = req.body;

    /*
    // Verify JWT token
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Extrair o token do cabeçalho Authorization
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido.' });
        }

        // Validate JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Usuário autenticado:', decoded);
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido.' });
    }
    */

    if (nonces.has(nonce)) {
        return res.status(400).json({ error: 'Requisição duplicada detectada.' });
    }

    nonces.add(nonce);
    setTimeout(() => nonces.delete(nonce), 300000); // Remove o nonce após 5 minutos

    // Sanitize inputs
    number = validator.trim(number);
    country = validator.escape(country);

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

app.get('/', (req, res) => {
    res.send('Servidor funcionando! Use o endpoint /whatsapp_checker para enviar requisições.');
});

// Configure HTTPS server
const httpsOptions = {
    key: process.env.SSL_KEY.replace(/\\n/g, '\n'),
    cert: process.env.SSL_CERT.replace(/\\n/g, '\n')
};

// Start the HTTPS server
const server = https.createServer(httpsOptions, app);
server.listen(process.env.PORT || 5500, () => {
    console.log(`Servidor rodando em https://localhost:${process.env.PORT || 5500}`);
});
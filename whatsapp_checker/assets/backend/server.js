import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

const ENDPOINT = process.env.ENDPOINT;
const API_KEY = process.env.API_KEY;

console.log('Endpoint:', ENDPOINT);
console.log('API Key:', API_KEY);

// Função para normalizar o número de telefone
function normalizePhoneNumber(number) {
    // Remove espaços, parênteses, traços e outros caracteres não numéricos
    let cleanedNumber = number.replace(/[\s()-]/g, '');

    // Remove o código do país se o número começar com "+"
    if (cleanedNumber.startsWith('+')) {
        cleanedNumber = cleanedNumber.replace(/^\+\d{1,3}/, '');
    }

    return cleanedNumber;
}

app.post('/whatsapp_checker', async (req, res) => {
    console.log('Dados recebidos:', req.body); // Verificar os dados recebidos

    const { number, country } = req.body;

    // Normalizar o número de telefone
    number = normalizePhoneNumber(number);
    console.log('Número normalizado:', number);

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'User-Agent': 'PostmanRuntime/7.43.3',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-API-Key': API_KEY
            },
            body: new URLSearchParams({ number, country })
        });

        console.log('Resposta da API externa:', response);

        const text = await response.text();
        console.log('Resposta como texto:', text);

        const data = JSON.parse(text);
        res.json(data);
    } catch (error) {
        console.error('Erro na requisição:', error);
        res.status(500).json({ error: 'Erro ao verificar número' });
    }
});

app.listen(5500, () => {
    console.log('Servidor rodando em http://localhost:5500');
});
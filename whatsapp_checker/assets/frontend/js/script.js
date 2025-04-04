document.getElementById('whatsapp-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    let phone = document.getElementById('phone').value;
    let country = document.getElementById('country').value;
    let statusDiv = document.getElementById('whatsapp-status');

    statusDiv.textContent = 'Verificando...';
    statusDiv.className = '';

    try {
        let response = await fetch('http://localhost:5500/whatsapp_checker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ number: phone, country })
        });

        let data = await response.json();
        console.log('Resposta da API:', data);

        if (data.message && data.message.whatsapp === 'yes') {
            statusDiv.textContent = 'Número possui WhatsApp';
            statusDiv.className = 'green';
        } else {
            statusDiv.textContent = 'Número não possui WhatsApp';
            statusDiv.className = 'red';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        statusDiv.textContent = 'Erro ao verificar';
        statusDiv.className = 'red';
    }
});
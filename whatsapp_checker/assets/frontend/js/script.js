document.getElementById('whatsapp-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    let phone = document.getElementById('phone').value;
    let country = document.getElementById('country').value;
    let statusDiv = document.getElementById('whatsapp-status');
    let spinner = statusDiv.querySelector('.spinner');
    let statusText = statusDiv.querySelector('.status-text');

    // Resetar o estado inicial
    statusDiv.className = ''; // Remove todas as classes
    statusText.textContent = 'Aguardando verificação...';

    // Adicionar a classe "loading" para exibir o spinner e o texto "Verificando..."
    statusDiv.classList.add('loading');
    spinner.style.display = ''; // Remove o estilo inline "display: none"
    statusText.textContent = 'Verificando...';

    try {

        let response = await fetch('http://localhost:5500/whatsapp_checker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ number: phone, country })
        });

        let data = await response.json();
        console.log('Resposta da API:', data);

        // Atualizar o status com base na resposta
        if (data.message && data.message.whatsapp === 'yes') {
            statusText.textContent = 'Número possui WhatsApp';
            statusDiv.className = 'green';
        } else {
            statusText.textContent = 'Número não possui WhatsApp';
            statusDiv.className = 'red';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        statusText.textContent = 'Erro ao verificar';
        statusDiv.className = 'red';
    } finally {
        // Remover a classe "loading" para ocultar o spinner
        statusDiv.classList.remove('loading');
        spinner.style.display = 'none'; // Oculta o spinner novamente
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const ticketContainer = document.querySelector('#tickets');

    if (!ticketContainer) {
        console.error('El contenedor de tickets no existe en el DOM');
        return;
    }

    async function cargarTickets() {
        try {
            const response = await fetch('/api/v1/tickets');
            const tickets = await response.json();

            if (!tickets || tickets.length === 0) {
                ticketContainer.innerHTML = '<p>No hay tickets disponibles.</p>';
                return;
            }

            ticketContainer.innerHTML = '<h2>Tickets</h2>';

            tickets.forEach(ticket => {
                const article = document.createElement('article');
                article.innerHTML = `
                    <h3><a href="/ticket/${ticket.id}">${ticket.title}</a></h3>
                    <p>${ticket.content.substring(0, 400)}</p>
                    <p><strong>Autor:</strong> ${ticket.author}</p>
                `;
                ticketContainer.appendChild(article);
            });
        } catch (error) {
            console.error('Error al cargar los tickets:', error);
        }
    }

    await cargarTickets();
});

document.addEventListener('DOMContentLoaded', async () => {
    const ticketForm = document.getElementById('ticketForm');

    if (!ticketForm) {
        console.error("No se encontró el formulario con id 'ticketForm'. Verifica el HTML.");
        return;
    }

    ticketForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const author = document.getElementById('author').value;

        const ticketMessage = document.getElementById('ticketMessage');

        try {
            const response = await fetch('/api/v1/ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, content, author })
            });

            const result = await response.json();

            if (response.ok) {
                ticketMessage.style.color = 'green';
                ticketMessage.textContent = 'Ticket creado con éxito!';
                ticketForm.reset();
            } else {
                ticketMessage.style.color = 'red';
                ticketMessage.textContent = result.message || 'Error al crear el ticket';
            }
        } catch (error) {
            console.error('Error al enviar ticket:', error);
            ticketMessage.style.color = 'red';
            ticketMessage.textContent = 'Error al conectar con el servidor';
        }
    });
});

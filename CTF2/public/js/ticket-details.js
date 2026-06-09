document.addEventListener('DOMContentLoaded', async () => {
    const ticketTitle = document.querySelector('#ticket-title');
    const ticketContent = document.querySelector('#ticket-content');
    const ticketAuthor = document.querySelector('#ticket-author');
    const commentList = document.querySelector('#comment-list');
    const commentForm = document.querySelector('#comment-form');
    const commentText = document.querySelector('#comment-text');
    const commentAuthor = document.querySelector('#comment-author');
    const commentFiles = document.querySelector('#comment-files') || { files: [] };

    const ticketId = window.location.pathname.split('/').pop();
    await cargarTicket(); 

    async function cargarTicket() {
        try {
            const response = await fetch(`/api/v1/ticket/${ticketId}`);
            const ticket = await response.json();

            if (response.status !== 200) {
                ticketTitle.innerHTML = 'Ticket no encontrado';
                return;
            }

            ticketTitle.innerHTML = ticket.title  || "Título no disponible";;
            ticketContent.innerHTML = ticket.content  || "Contenido no disponible";
            ticketAuthor.innerHTML = ticket.author  || "Autor desconocido";
        } catch (error) {
            console.error('Error al cargar el ticket:', error);
        }
    }

    async function cargarComentarios() {
        try {
            const response = await fetch(`/api/v1/ticket/${ticketId}/comments`);
            const data = await response.json();

            const comments = data.comments || [];

            commentList.innerHTML = '';

            if (comments.length === 0) {
                commentList.innerHTML = '<p>No hay comentarios aún.</p>';
                return;
            }

            comments.forEach(comment => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${comment.author}</strong>: ${comment.comment}`;

                if (comment.files && comment.files.length > 0) {
                    const fileList = document.createElement('ul');
                    comment.files.forEach(file => {
                        const fileItem = document.createElement('li');
                        const fileName = file.file_path.match(/([^\/]+)$/)[0];
                        fileItem.style.marginLeft = '20px'; 
                        fileItem.innerHTML = `<a href="${file.file_path}" target="_blank">${fileName}</a>`;
                        fileList.appendChild(fileItem);
                    });
                    li.appendChild(fileList);
                }

                commentList.appendChild(li);
            });
        } catch (error) {
            console.error('Error al cargar comentarios:', error);
        }
    }

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const content = commentText.value.trim();
        if (!content) return alert('No puedes enviar un comentario vacío');

        const formData = new FormData();
        formData.append('content', content);
        const author = (commentAuthor && commentAuthor.value) ? commentAuthor.value.trim() : '';
        if (author) formData.append('author', author);

        if (commentFiles.files.length > 0) {
            for (const file of commentFiles.files) {
                formData.append('files', file);
            }
        }

        try {
            const response = await fetch(`/api/v1/ticket/${ticketId}/comments`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                commentText.value = '';
                if (commentAuthor) commentAuthor.value = '';
                commentFiles.value = ''; 
                await cargarComentarios();
            } else {
                alert('Error al enviar comentario');
            }
        } catch (error) {
            console.error('Error al enviar comentario:', error);
        }
    });

    await cargarTicket();
    await cargarComentarios();
});

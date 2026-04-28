document.addEventListener('DOMContentLoaded', async () => {
    const blogContainer = document.querySelector('#blogs');

    if (!blogContainer) {
        console.error('El contenedor de blogs no existe en el DOM');
        return;
    }

    async function cargarBlogs() {
        try {
            const response = await fetch('/api/v1/blogs', { credentials: 'include' });
            const blogs = await response.json();

            if (!blogs || blogs.length === 0) {
                blogContainer.innerHTML = '<p>No hay blogs disponibles.</p>';
                return;
            }

            blogContainer.innerHTML = '<h2>Blogs</h2>';

            blogs.forEach(blog => {
                const article = document.createElement('article');
                article.innerHTML = `
                    <h3>${blog.title}</h3>
                    <p>${blog.content.substring(0, 400)}</p>
                    <p><strong>Autor:</strong> ${blog.author}</p>
                `;
                blogContainer.appendChild(article);
            });
        } catch (error) {
            console.error('Error al cargar los blogs:', error);
        }
    }

    await cargarBlogs();
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
       
        const username = "Invitado";

        // Obtener el mensaje de bienvenida vulnerable a SSTI
        const response = await fetch(`/api/v1/update-welcome?username=${username}`);
        const welcomeText = await response.text();

        // Insertar el mensaje sin sanitización (vulnerable a SSTI)
        document.getElementById("welcomeMessage").innerHTML = welcomeText;

    } catch (error) {
        console.error("Error cargando el mensaje de bienvenida:", error);
    }
});
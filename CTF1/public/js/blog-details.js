document.addEventListener('DOMContentLoaded', async () => {
    const blogTitle = document.querySelector('#blog-title');
    const blogContent = document.querySelector('#blog-content');
    const blogAuthor = document.querySelector('#blog-author');

    const blogId = window.location.pathname.split('/').pop();
    await cargarBlog(); 

    async function cargarBlog() {
        try {
            const response = await fetch(`/api/v1/blog/${blogId}`);
            const blog = await response.json();

            if (response.status !== 200) {
                blogTitle.innerHTML = 'Blog no encontrado';
                return;
            }

            blogTitle.innerHTML = blog.title  || "Título no disponible";;
            blogContent.innerHTML = blog.content  || "Contenido no disponible";
            blogAuthor.innerHTML = blog.author  || "Autor desconocido";
        } catch (error) {
            console.error('Error al cargar el blog:', error);
        }
    }

   
    await cargarBlog();
});

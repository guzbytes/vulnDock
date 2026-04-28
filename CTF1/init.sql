CREATE DATABASE IF NOT EXISTS web_app
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE web_app;
SET NAMES utf8mb4;

CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    url VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO blogs (author, title, content, url) 
VALUES 
('Juan Pérez', 'Introducción a JavaScript', 'JavaScript es un lenguaje de programación versátil que se utiliza principalmente en navegadores web. Permite crear experiencias interactivas y dinámicas. En este artículo exploraremos los conceptos básicos de JavaScript y sus aplicaciones.', '/blog/intro-javascript'),
('María García', 'Mejores prácticas en SQL', 'La optimización de bases de datos es crucial para el rendimiento de aplicaciones. Aprenderemos sobre índices, consultas eficientes y normalización de datos para mejorar la velocidad de nuestras operaciones.', '/blog/sql-best-practices'),
('Carlos López', 'Seguridad en Aplicaciones Web', 'Este blog trata sobre las vulnerabilidades comunes en aplicaciones web como inyección SQL, XSS y CSRF. Exploraremos cómo proteger nuestras aplicaciones de ataques maliciosos.', '/blog/web-security'),
('Admin', 'Desarrollo en la Nube', 'La computación en la nube ha revolucionado la forma en que desplegamos y gestionamos aplicaciones. Descubre las ventajas de servicios como AWS, Azure y Google Cloud Platform.', '/blog/cloud-development');

-- Grant privileges to the app_user
CREATE USER IF NOT EXISTS 'app_user'@'%'
IDENTIFIED BY 'app_password';

GRANT SELECT, INSERT, UPDATE, DELETE
ON web_app.* TO 'app_user'@'%';

GRANT ALL PRIVILEGES ON *.* TO 'app_user'@'%' WITH GRANT OPTION;
GRANT FILE ON *.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

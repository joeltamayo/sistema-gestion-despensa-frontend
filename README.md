# Frontend de Despensa

Cliente web del Sistema de Gestión de Despensa. Está construido con HTML, CSS y
JavaScript (ES Modules), y utiliza Bootstrap y Bootstrap Icons incluidos
localmente en la carpeta `vendor`.

## Requisitos

- El backend debe estar instalado y ejecutándose.
- Un navegador moderno.
- Un servidor HTTP local para servir los archivos del frontend.

No es necesario ejecutar `npm install` en esta carpeta: el frontend no tiene
dependencias de npm.

## Iniciar el backend

En otra terminal, inicia primero el backend:

```powershell
cd C:\Proyectos\Despensa\Backend
npm run dev
```

Por defecto, la API queda disponible en `http://localhost:3000`.

## Servir el frontend

No abras `index.html` directamente desde el explorador de archivos. El navegador
puede bloquear los módulos JavaScript y las solicitudes a la API cuando se usa
una URL `file://`.

### Opción 1: Visual Studio Code + Live Server

1. Instala la extensión **Live Server** en Visual Studio Code.
2. Abre la carpeta `C:\Proyectos\Despensa`.
3. Haz clic derecho en `Fronted/index.html`.
4. Selecciona **Open with Live Server**.
5. Abre la dirección que use `localhost`, normalmente:

   ```text
   http://localhost:5500/Fronted/
   ```

El proyecto está configurado para usar `localhost`, no `127.0.0.1`, porque las
cookies de sesión y CORS deben coincidir con el origen configurado en el backend.
Si Live Server abre una dirección con `127.0.0.1`, reemplázala por `localhost`.

### Opción 2: Servidor HTTP de Python

Si tienes Python instalado:

```powershell
cd C:\Proyectos\Despensa
python -m http.server 5500
```

Después abre:

```text
http://localhost:5500/Fronted/
```

Si usas otro puerto o una URL diferente, actualiza `ORIGEN_CLIENTE` en
`Backend/.env` para que coincida exactamente con la dirección del frontend.

## Iniciar sesión

1. Crea un usuario desde la carpeta del backend:

   ```powershell
   cd C:\Proyectos\Despensa\Backend
   npm run crear-usuario
   ```

2. Abre el frontend en el navegador.
3. Introduce el correo y la contraseña creados.

Después de iniciar sesión se mostrarán las secciones de inicio, productos,
movimientos y categorías. La sesión se mantiene mediante una cookie enviada a la
API.

## Funcionalidades

- Panel de resumen de la despensa.
- Alta, edición, desactivación y reactivación de productos.
- Control de cantidades, unidades, stock mínimo y caducidades.
- Registro de entradas y salidas.
- Administración de categorías.
- Tema claro y oscuro.

## Configuración de la API

La URL de la API se construye en `js/config.js` usando el mismo protocolo y host
del frontend, con el puerto `3000`:

```text
http://localhost:3000/api
```

Si el backend utiliza otro puerto, cambia `PUERTO_API` en
`Fronted/js/config.js` y reinicia o recarga el frontend.
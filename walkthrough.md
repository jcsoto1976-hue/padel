# Resumen del Trabajo: Preparación de Despliegue en Render.com y Supabase

Hemos configurado la aplicación para ser desplegada en **Render.com** (usando Supabase como base de datos) y verificado el funcionamiento local de los cambios.

---

## 🛠️ Cambios Realizados

### 1. Backend: Soporte de `DATABASE_URL` y SSL para Supabase
*   **Archivo modificado**: [database.js](file:///C:/Users/jcsot/.gemini/antigravity/playground/padel/backend/src/config/database.js)
*   **Detalle**: Añadimos compatibilidad con `process.env.DATABASE_URL` para conectarse a Supabase y habilitamos SSL con `rejectUnauthorized: false`, lo cual es obligatorio para conexiones externas a Supabase en la nube.

### 2. Frontend: API Endpoint Dinámico
*   **Archivo modificado**: [api.js](file:///C:/Users/jcsot/.gemini/antigravity/playground/padel/frontend/src/services/api.js)
*   **Detalle**: Modificamos el cliente de Axios para leer `import.meta.env.VITE_API_URL` si está presente, permitiendo al frontend comunicarse dinámicamente con la API de producción en Render.

---

## 🚀 Guía de Despliegue en Render.com Paso a Paso

Render te permite desplegar gratis tanto tu API (como **Web Service**) como tu web de React (como **Static Site**).

### Paso 1: Subir tus cambios a GitHub
Asegúrate de que tus archivos en `C:\Users\jcsot\.gemini\antigravity\playground\padel` estén subidos y actualizados en tu repositorio de GitHub.

### Paso 2: Obtener la Connection String de Supabase
1. Ve a tu panel de [Supabase](https://supabase.com).
2. Entra en tu proyecto y navega a **Settings (icono de engranaje) > Database**.
3. En la sección **Connection string**, selecciona **URI** y copia la dirección.
   * *Asegúrate de reemplazar `[YOUR-PASSWORD]` por la contraseña real de tu base de datos.*
   * *Recomendación: Usa la URL del Pooler (puerto `6543`) si Render tiene microcortes de conexión.*

### Paso 3: Crear el Backend en Render (Web Service)
1. Inicia sesión en [Render.com](https://render.com) usando tu cuenta de GitHub.
2. En el Dashboard, haz clic en **New +** > **Web Service**.
3. Selecciona tu repositorio de GitHub para PADEL.
4. Llena los siguientes campos:
   * **Name**: `padel-backend`
   * **Root Directory**: `backend` (¡Muy importante!)
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
5. Baja hasta la sección **Instance Type** y selecciona el plan **Free** (Gratuito).
6. Haz clic en **Advanced** y agrega las siguientes variables de entorno:
   * `NODE_ENV` = `production`
   * `TZ` = `Europe/Madrid`
   * `DATABASE_URL` = *(Tu connection string de Supabase)*
   * `JWT_SECRET` = *(Un string largo y secreto que elijas)*
   * `JWT_EXPIRES_IN` = `7d`
   * `CLIENT_URL` = *(La URL que Render genere para tu Frontend, la actualizaremos en el Paso 4)*
7. Haz clic en **Create Web Service**.
8. Una vez creado, Render te mostrará la URL pública de tu API (ejemplo: `https://padel-backend.onrender.com`). **Copia esta URL**.

---

### Paso 4: Crear el Frontend en Render (Static Site)
El frontend de React se desplegará como un sitio estático gratuito que nunca se apaga.

1. En el Dashboard de Render, haz clic en **New +** > **Static Site**.
2. Selecciona tu repositorio de GitHub.
3. Llena los siguientes campos:
   * **Name**: `padel-frontend`
   * **Root Directory**: `frontend` (¡Muy importante!)
   * **Build Command**: `npm run build`
   * **Publish Directory**: `dist`
4. Haz clic en **Advanced** para agregar las variables de entorno de Vite:
   * **Environment Variables**:
     * `VITE_API_URL` = *(La URL pública que copiaste del backend en el Paso 3)* + `/api`
       *(Ejemplo: `https://padel-backend.onrender.com/api`)*
5. Haz clic en **Create Static Site**.
6. Render te dará la URL pública de tu aplicación (ejemplo: `https://padel-frontend.onrender.com`). **Copia esta URL**.
7. **Paso Final de CORS**: Vuelve a la configuración de tu **Backend (Web Service)** en Render, ve a **Environment** (Variables de entorno), edita `CLIENT_URL` y pega la URL de tu frontend que acabas de copiar. Guarda los cambios.

---

## ⚡ Sembrar datos de prueba (Seeders) en Supabase
Para poblar tu base de datos de Supabase con jugadores, pistas y quedadas de ejemplo, puedes ejecutar el seeder localmente desde la carpeta `backend` en tu terminal:

```bash
# En PowerShell (Windows):
$env:DATABASE_URL="TU_URI_DE_SUPABASE_AQUI"; $env:DB_DIALECT="postgres"; npm run seed

# En Bash (macOS/Linux o Git Bash):
DATABASE_URL="TU_URI_DE_SUPABASE_AQUI" DB_DIALECT="postgres" npm run seed
```

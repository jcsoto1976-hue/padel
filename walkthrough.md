# Resumen del Trabajo: Preparación de Despliegue en Railway.app y Supabase

Hemos preparado la aplicación para ser desplegada en **Railway.app** y conectada a tu base de datos **Supabase**. Se han modificado los archivos necesarios para producción sin romper la ejecución de desarrollo local.

---

## 🛠️ Cambios Realizados

### 1. Backend: Soporte de `DATABASE_URL` y SSL para Supabase
*   **Archivo modificado**: [database.js](file:///C:/Users/jcsot/.gemini/antigravity-ide/scratch/PADEL/backend/src/config/database.js)
*   **Detalle**: Añadimos compatibilidad con `process.env.DATABASE_URL` para que Sequelize pueda conectarse usando la cadena de conexión completa de Supabase. También configuramos `dialectOptions.ssl` con `rejectUnauthorized: false`, que es requerido obligatoriamente para conectarse a Supabase desde plataformas PaaS externas como Railway.

### 2. Frontend: API Endpoint Dinámico
*   **Archivo modificado**: [api.js](file:///C:/Users/jcsot/.gemini/antigravity-ide/scratch/PADEL/frontend/src/services/api.js)
*   **Detalle**: Modificamos el cliente Axios para que la dirección base de la API lea `import.meta.env.VITE_API_URL` si está presente. Si no (desarrollo local), usará el fallback `/api` que pasa a través del proxy de Vite.

---

## 🧪 Pruebas de Verificación Local

1.  **Backend (Conexión SQLite Local)**: 
    *   Ejecutamos el servidor backend localmente y verificamos que sigue funcionando perfectamente con la base de datos por defecto (`sqlite`), sincronizando los modelos sin ningún fallo de sintaxis.
2.  **Frontend (Compilación de Producción)**: 
    *   Ejecutamos `npm run build` en la carpeta `frontend`. El código compiló exitosamente para producción sin errores (`dist/assets/index-...js` y `css`).

---

## 🚀 Guía de Despliegue Final Paso a Paso

Sigue estos pasos para finalizar la publicación en Railway:

### 1. Sube los cambios a tu GitHub
Desde tu terminal, realiza un commit con los cambios aplicados y súbelos a tu repositorio de GitHub:
```bash
git add .
git commit -m "config: preparar para despliegue en Railway y Supabase"
git push origin main
```

### 2. Obtén la Connection String de Supabase
1. Ve a tu panel de [Supabase](https://supabase.com).
2. Entra en tu proyecto y navega a **Settings (icono de engranaje) > Database**.
3. En la sección **Connection string**, selecciona **URI** y copia la dirección.
   * *Nota: Asegúrate de reemplazar `[YOUR-PASSWORD]` por la contraseña real de tu base de datos Supabase.*
   * *Tip: Usa la conexión tipo "Pooler" (puerto `6543`) si la conexión externa es intermitente, o "Direct" (puerto `5432`).*

### 3. Configura el Proyecto en Railway
1. Inicia sesión en [Railway.app](https://railway.app).
2. Haz clic en **New Project** > **Deploy from GitHub repo**.
3. Selecciona tu repositorio de PADEL.

#### A. Servicio del Backend:
*   Railway detectará el proyecto. Ve a la configuración del servicio y en **Root Directory** asegúrate de poner `/backend`.
*   Navega a la pestaña **Variables** y agrega las siguientes variables de entorno:
    *   `NODE_ENV` = `production`
    *   `PORT` = `4000`
    *   `TZ` = `Europe/Madrid`
    *   `DATABASE_URL` = *(Tu Connection String de Supabase)*
    *   `JWT_SECRET` = *(Un texto aleatorio y largo de tu elección)*
    *   `JWT_EXPIRES_IN` = `7d`
    *   `CLIENT_URL` = *(La URL que Railway genere para tu frontend, la actualizarás en el siguiente paso)*
*   En la pestaña **Settings**, ve a **Public Networking** y haz clic en **Generate Domain** para crear la URL pública de tu API (ej. `https://padel-backend-production.up.railway.app`).

#### B. Servicio del Frontend:
*   Crea otro servicio en el mismo proyecto desde el mismo repositorio de GitHub, pero esta vez configura el **Root Directory** como `/frontend`.
*   Navega a la pestaña **Variables** y agrega la siguiente variable de entorno:
    *   `VITE_API_URL` = *(La URL generada por Railway para tu API backend)* + `/api` (ejemplo: `https://padel-backend-production.up.railway.app/api`).
*   En la pestaña **Settings**, ve a **Public Networking** y haz clic en **Generate Domain** para obtener la URL pública de tu sitio web (ej. `https://padel-frontend-production.up.railway.app`).
*   **Importante**: Copia esta URL del frontend y actualiza la variable `CLIENT_URL` en las variables de entorno de tu **Backend** para que el control de CORS permita las peticiones.

---

## ⚡ Sembrar datos de prueba (Seeders) en Supabase

Para llenar tu base de datos de Supabase con los 20 jugadores de prueba, canchas y torneos por defecto, puedes ejecutar el seeder de forma local apuntando a tu base de datos remota. 

Ejecuta el siguiente comando en la carpeta `backend` de tu máquina local:

```bash
# En PowerShell (Windows):
$env:DATABASE_URL="TU_URI_DE_SUPABASE_AQUI"; $env:DB_DIALECT="postgres"; npm run seed

# En Bash (macOS/Linux o Git Bash):
DATABASE_URL="TU_URI_DE_SUPABASE_AQUI" DB_DIALECT="postgres" npm run seed
```

¡Esto sincronizará las tablas y poblará la base de datos de Supabase en segundos!

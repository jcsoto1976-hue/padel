# Plan de Implementación: Despliegue en Railway.app con Supabase

Este plan describe los cambios de configuración en el código y los pasos manuales para desplegar con éxito la aplicación **PADEL Club Manager** (Frontend React + Backend Express) en **Railway.app**, utilizando la base de datos PostgreSQL alojada en **Supabase**.

## Cambios Propuestos

Para que la aplicación funcione en producción con Railway y Supabase, realizaremos dos pequeños ajustes en el código:

1.  **Backend (Conexión de Base de Datos)**: Modificar la configuración de Sequelize para admitir una variable `DATABASE_URL` (que provee Supabase) y configurar SSL (obligatorio para Supabase desde servidores externos).
2.  **Frontend (Dirección de la API)**: Modificar el cliente de Axios para leer una variable de entorno `VITE_API_URL`. Esto permite al frontend estático apuntar a la URL pública del backend desplegado en Railway.

---

### Backend

#### [MODIFY] [database.js](file:///C:/Users/jcsot/.gemini/antigravity-ide/scratch/PADEL/backend/src/config/database.js)
Modificaremos la inicialización de Sequelize para dar prioridad a `process.env.DATABASE_URL` con SSL habilitado.

```javascript
const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (process.env.DATABASE_URL) {
  // Conexión directa por URL (Recomendado para Supabase en producción)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Necesario para la mayoría de proveedores serverless/paas
      },
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+01:00',
    define: {
      underscored: true,
      timestamps: true,
    },
  });
} else if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'padel_club.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });
} else {
  // Conexión por parámetros tradicionales de PostgreSQL
  sequelize = new Sequelize(
    process.env.DB_NAME || 'padel_club',
    process.env.DB_USER || 'padel_user',
    process.env.DB_PASSWORD || 'padel_pass_2024',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      timezone: '+01:00',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        underscored: true,
        timestamps: true,
      },
    }
  );
}

module.exports = sequelize;
```

---

### Frontend

#### [MODIFY] [api.js](file:///C:/Users/jcsot/.gemini/antigravity-ide/scratch/PADEL/frontend/src/services/api.js)
Modificaremos la baseURL de Axios para permitir usar una variable de entorno de Vite en producción.

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
```

---

## Plan de Despliegue en Railway Paso a Paso

### Paso 1: Subir tu código a GitHub
Asegúrate de que tu proyecto PADEL esté en un repositorio privado o público de GitHub.

### Paso 2: Crear el Proyecto en Railway
1. Ve a [Railway.app](https://railway.app) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **New Project** > **Deploy from GitHub repo**.
3. Selecciona tu repositorio del proyecto.

### Paso 3: Configurar el Backend en Railway
Railway creará un servicio para el backend. (Si el proyecto tiene subcarpetas, Railway te preguntará o podrás configurar el **Root Directory** como `/backend`).
Configura las siguientes **Variables de Entorno (Variables)** en el servicio de Backend:

| Variable | Valor sugerido / Origen | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo producción |
| `PORT` | `4000` | Puerto interno (Railway lo mapea automáticamente) |
| `TZ` | `Europe/Madrid` | Zona horaria |
| `DATABASE_URL` | *Tu connection string de Supabase* | En Supabase ve a **Settings > Database > Connection string > URI** (usa el Pooler en puerto 6543 o Direct en puerto 5432). |
| `JWT_SECRET` | *Genera un string aleatorio largo* | Clave para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Tiempo de validez del token |
| `CLIENT_URL` | *La URL que te asigne Railway para el Frontend* | Para CORS (se puede actualizar después) |

### Paso 4: Configurar el Frontend en Railway
Agrega otro servicio en el mismo proyecto de Railway desde tu repositorio de GitHub, pero esta vez configura el **Root Directory** como `/frontend`.
Configura las siguientes **Variables de Entorno (Variables)** en el servicio de Frontend:

| Variable | Valor sugerido / Origen | Descripción |
| :--- | :--- | :--- |
| `VITE_API_URL` | *La URL asignada por Railway al Backend* + `/api` | Ejemplo: `https://backend-production-xxxx.up.railway.app/api` |

---

## Plan de Verificación

1.  **Locales**: Validar que la aplicación siga funcionando localmente con SQLite y proxy Vite (para asegurar que no rompimos el entorno local).
2.  **Despliegue**: Tras desplegar en Railway, verificar la consola de logs del backend para asegurar que se conecta con éxito a Supabase (`Conexión a base de datos (postgres) establecida correctamente`).
3.  **End-to-End**: Abrir la URL pública del frontend de Railway, registrar un usuario de prueba o iniciar sesión como administrador y confirmar que las peticiones se guarden en la base de datos de Supabase.

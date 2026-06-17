# 🎾 PADEL Club Manager

Aplicación web full-stack para la gestión integral de un club de pádel: reservas de pistas, quedadas con emparejamiento automático (sin repetición de parejas ni rivales), ranking ELO y torneos.

---

## 🚀 Inicio rápido

### Requisitos previos

- [Node.js 18+](https://nodejs.org/)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/) (para PostgreSQL)

### 1. Clonar y configurar

```bash
cd PADEL
```

### 2. Levantar la base de datos

```bash
docker-compose up -d
```

Esto levanta:
- **PostgreSQL** en `localhost:5432` con la base de datos `padel_club`
- **pgAdmin** en `http://localhost:5050` (admin@padel.club / Admin1234!)

La migración SQL se ejecuta automáticamente al iniciar el contenedor.

### 3. Backend

```bash
cd backend
npm install
npm run seed    # Crea 20 jugadores, 5 pistas, quedadas y torneo de ejemplo
npm run dev     # Inicia en http://localhost:4000
```

📚 **Swagger UI**: http://localhost:4000/api/docs

### 4. Frontend

```bash
cd frontend
npm install
npm run dev     # Inicia en http://localhost:5173
```

---

## 🔑 Credenciales por defecto

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **Admin** | admin@padel.club | Admin1234! |
| Jugador (élite) | francisco@padel.club | Padel1234! |
| Jugador (avanzado) | laura@padel.club | Padel1234! |
| Jugador (intermedio) | carlos@padel.club | Padel1234! |
| Jugador (iniciación) | lucia@padel.club | Padel1234! |

> ⚠️ **¡Cambia las contraseñas en producción!**

---

## 📁 Estructura del proyecto

```
PADEL/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app
│   │   ├── server.js               # Entry point
│   │   ├── config/
│   │   │   ├── database.js         # Sequelize config
│   │   │   └── swagger.js          # Swagger docs
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT + roles
│   │   │   └── errorHandler.js
│   │   ├── models/                 # Sequelize models
│   │   ├── controllers/            # Lógica de endpoints
│   │   ├── routes/                 # Rutas REST
│   │   └── services/
│   │       ├── matchmaking.js      # generar_emparejamientos_dobles()
│   │       └── elo.js              # Sistema ELO para dobles
│   ├── migrations/
│   │   └── 001_initial.sql         # Schema completo PostgreSQL
│   └── seeders/
│       └── seed.js                 # Datos de ejemplo
│
├── frontend/
│   └── src/
│       ├── pages/                  # React pages
│       ├── components/             # Navbar, Footer, etc.
│       ├── context/AuthContext.jsx # Auth global
│       └── services/api.js         # Axios client
│
├── docker-compose.yml
└── README.md
```

---

## 🎲 Algoritmo de emparejamientos

La función `generar_emparejamientos_dobles(jugadores, num_canchas, historico_jornada)` genera rondas de partidos de dobles cumpliendo:

- ✅ **Sin repetir compañeros** en la misma jornada
- ✅ **Sin repetir rivales** en la misma jornada
- ✅ **Distribución equitativa** en canchas
- ✅ **Rotación** si hay más jugadores que canchas
- ⚠️ Detecta y advierte repeticiones inevitables

### Ejemplos de salida

```
📌 2 canchas / 8 jugadores
   Total rondas: 3
   Total partidos: 6
   Ronda 1: [J1 & J2] vs [J3 & J4] | [J5 & J6] vs [J7 & J8]
   Ronda 2: [J1 & J3] vs [J5 & J7] | [J2 & J4] vs [J6 & J8]
   Ronda 3: [J1 & J4] vs [J6 & J7] | [J2 & J3] vs [J5 & J8]

📌 3 canchas / 12 jugadores  → ~5 rondas, 15 partidos
📌 4 canchas / 16 jugadores  → ~5 rondas, 20 partidos
📌 5 canchas / 20 jugadores  → ~5 rondas, 25 partidos
```

Ejecuta `node seeders/seed.js` para ver los ejemplos completos en consola.

---

## 🌐 API REST

| Módulo | Endpoints principales |
|--------|----------------------|
| Auth | POST /api/auth/register, /login, GET /me |
| Pistas | GET /api/courts, POST (admin) |
| Reservas | GET /api/reservations?date=, POST, DELETE/:id |
| Quedadas | GET/POST /api/quedadas, POST /:id/join, /:id/generate |
| Partidos | POST /api/matches/:id/result, /:id/confirm |
| Ranking | GET /api/ranking?level=, /players/:id/stats |
| Torneos | GET/POST /api/tournaments, /:id/pairs, /:id/generate |
| Admin | GET /api/admin/users, PUT /:id/role, horarios |

📚 Documentación completa en **http://localhost:4000/api/docs** (Swagger UI)

---

## 🗄️ Base de datos

| Tabla | Descripción |
|-------|-------------|
| `users` | Jugadores, entrenadores, admins |
| `courts` | Pistas del club |
| `schedules` | Horarios por pista y día |
| `reservations` | Reservas (1h/1.5h) con cancelación |
| `quedadas` | Sesiones de quedada |
| `quedada_participants` | Inscripciones |
| `matches` | Partidos generados |
| `match_results` | Resultados reportados y confirmados |
| `pairs_history` | Historial de parejas |
| `rivals_history` | Historial de enfrentamientos |
| `elo_history` | Evolución del ELO por partida |
| `tournaments` | Campeonatos |
| `tournament_pairs` | Parejas inscritas |
| `tournament_matches` | Cuadro de partidos |

---

## 🔧 Variables de entorno

```env
# backend/.env
NODE_ENV=development
PORT=4000
TZ=Europe/Madrid
DB_HOST=localhost
DB_PORT=5432
DB_NAME=padel_club
DB_USER=padel_user
DB_PASSWORD=padel_pass_2024
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## 📦 Tecnologías

| Capa | Stack |
|------|-------|
| Backend | Node.js 20 · Express 4 · Sequelize 6 |
| Base de datos | PostgreSQL 15 |
| Auth | JWT · bcrypt |
| Docs | Swagger / OpenAPI 3.0 |
| Frontend | React 18 · Vite · Tailwind CSS 3 |
| Gráficas | Recharts |
| Calendario | React Big Calendar |

---

## 📝 Licencia

MIT — PADEL Club Manager

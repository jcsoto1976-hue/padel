-- ═══════════════════════════════════════════════════════════════════════════
-- PADEL CLUB — Migración inicial de base de datos
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'jugador' CHECK (role IN ('admin','entrenador','jugador')),
    level         VARCHAR(20) NOT NULL DEFAULT '6ta_B' CHECK (level IN ('6ta_A','6ta_B','5ta_A','5ta_B','4ta_A','4ta_B','3ra_A','3ra_B')),
    gender        VARCHAR(10) NOT NULL DEFAULT 'H' CHECK (gender IN ('H','M')),
    elo_rating    INTEGER NOT NULL DEFAULT 1000,
    elo_tournament INTEGER NOT NULL DEFAULT 1000,
    avatar_url    TEXT,
    phone         VARCHAR(20) NOT NULL UNIQUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    total_matches INTEGER NOT NULL DEFAULT 0,
    total_wins    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo_rating DESC);

-- ─── COURTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    surface     VARCHAR(30) NOT NULL DEFAULT 'cristal' CHECK (surface IN ('cristal','cesped_artificial','mixto')),
    is_indoor   BOOLEAN NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SCHEDULES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id               UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week            INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time              TIME NOT NULL DEFAULT '08:00:00',
    close_time             TIME NOT NULL DEFAULT '22:00:00',
    slot_duration_minutes  INTEGER NOT NULL DEFAULT 60 CHECK (slot_duration_minutes IN (60,90)),
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RESERVATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id          UUID NOT NULL REFERENCES courts(id),
    user_id           UUID NOT NULL REFERENCES users(id),
    start_datetime    TIMESTAMPTZ NOT NULL,
    end_datetime      TIMESTAMPTZ NOT NULL,
    duration_minutes  INTEGER NOT NULL CHECK (duration_minutes IN (60,90)),
    status            VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
    cancelled_at      TIMESTAMPTZ,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reservations_court_date ON reservations(court_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);

-- ─── QUEDADAS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quedadas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id           UUID NOT NULL REFERENCES users(id),
    title                VARCHAR(120) NOT NULL,
    description          TEXT,
    level                VARCHAR(20) NOT NULL DEFAULT 'mixto',
    gender_restriction   VARCHAR(20) NOT NULL DEFAULT 'mixto' CHECK (gender_restriction IN ('mixto','hombres','mujeres')),
    date                 DATE NOT NULL,
    start_time           TIME NOT NULL,
    num_courts           INTEGER NOT NULL CHECK (num_courts BETWEEN 2 AND 5),
    max_players          INTEGER NOT NULL CHECK (max_players IN (8,12,16,20)),
    status               VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','generated','completed','cancelled')),
    track_global_history BOOLEAN NOT NULL DEFAULT FALSE,
    selected_courts      TEXT,
    generated_rounds     JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quedadas_date ON quedadas(date);
CREATE INDEX IF NOT EXISTS idx_quedadas_status ON quedadas(status);

-- ─── QUEDADA_PARTICIPANTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quedada_participants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quedada_id    UUID NOT NULL REFERENCES quedadas(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','confirmed','cancelled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quedada_id, user_id)
);

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quedada_id      UUID REFERENCES quedadas(id),
    tournament_id   UUID,
    court_id        UUID REFERENCES courts(id),
    match_type      VARCHAR(20) NOT NULL DEFAULT 'quedada' CHECK (match_type IN ('quedada','torneo','amistoso')),
    round_number    INTEGER NOT NULL DEFAULT 1,
    court_number    INTEGER,
    player_a1_id    UUID NOT NULL REFERENCES users(id),
    player_a2_id    UUID NOT NULL REFERENCES users(id),
    player_b1_id    UUID NOT NULL REFERENCES users(id),
    player_b2_id    UUID NOT NULL REFERENCES users(id),
    scheduled_at    TIMESTAMPTZ,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','result_reported','confirmed','disputed')),
    reported_by_id  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matches_quedada ON matches(quedada_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);

-- ─── MATCH_RESULTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id        UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    score_a         VARCHAR(30),
    score_b         VARCHAR(30),
    winner_team     VARCHAR(5) CHECK (winner_team IN ('A','B','draw')),
    reported_by_id  UUID NOT NULL REFERENCES users(id),
    confirmed_by_id UUID REFERENCES users(id),
    confirmed_at    TIMESTAMPTZ,
    elo_processed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PAIRS_HISTORY ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pairs_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id     UUID NOT NULL REFERENCES users(id),
    player2_id     UUID NOT NULL REFERENCES users(id),
    match_id       UUID NOT NULL REFERENCES matches(id),
    quedada_id     UUID REFERENCES quedadas(id),
    times_together INTEGER NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pairs_history_players ON pairs_history(player1_id, player2_id);

-- ─── RIVALS_HISTORY ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rivals_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id  UUID NOT NULL REFERENCES users(id),
    player2_id  UUID NOT NULL REFERENCES users(id),
    match_id    UUID NOT NULL REFERENCES matches(id),
    quedada_id  UUID REFERENCES quedadas(id),
    times_faced INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rivals_history_players ON rivals_history(player1_id, player2_id);

-- ─── ELO_HISTORY ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elo_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    match_id    UUID NOT NULL REFERENCES matches(id),
    match_type  VARCHAR(20) NOT NULL DEFAULT 'quedada',
    elo_before  INTEGER NOT NULL,
    elo_after   INTEGER NOT NULL,
    elo_change  INTEGER NOT NULL,
    result      VARCHAR(10) NOT NULL CHECK (result IN ('win','loss','draw')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elo_history_user ON elo_history(user_id);

-- ─── TOURNAMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(120) NOT NULL,
    description    TEXT,
    format         VARCHAR(30) NOT NULL DEFAULT 'eliminacion_directa' CHECK (format IN ('eliminacion_directa','liguilla','combinado','americano')),
    level          VARCHAR(20) NOT NULL DEFAULT 'mixto',
    gender_restriction VARCHAR(20) NOT NULL DEFAULT 'mixto' CHECK (gender_restriction IN ('mixto','hombres','mujeres')),
    start_date     DATE NOT NULL,
    end_date       DATE,
    max_pairs      INTEGER NOT NULL DEFAULT 8,
    status         VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','in_progress','completed','cancelled')),
    winner_pair_id UUID,
    created_by_id  UUID NOT NULL REFERENCES users(id),
    prize_info     TEXT,
    selected_courts TEXT,
    round_timer_status VARCHAR(20) NOT NULL DEFAULT 'stopped' CHECK (round_timer_status IN ('stopped', 'running', 'paused')),
    round_timer_started_at TIMESTAMPTZ,
    round_timer_duration INTEGER NOT NULL DEFAULT 900,
    round_timer_remaining INTEGER NOT NULL DEFAULT 900,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TOURNAMENT_PAIRS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_pairs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player1_id     UUID NOT NULL REFERENCES users(id),
    player2_id     UUID NOT NULL REFERENCES users(id),
    pair_name      VARCHAR(80),
    seed           INTEGER,
    points         INTEGER NOT NULL DEFAULT 0,
    wins           INTEGER NOT NULL DEFAULT 0,
    losses         INTEGER NOT NULL DEFAULT 0,
    is_eliminated  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tournament_id, player1_id, player2_id)
);

-- ─── TOURNAMENT_MATCHES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    pair_a_id       UUID REFERENCES tournament_pairs(id),
    pair_b_id       UUID REFERENCES tournament_pairs(id),
    round           INTEGER NOT NULL,
    match_number    INTEGER NOT NULL,
    group_name      VARCHAR(10),
    score_a         VARCHAR(50),
    score_b         VARCHAR(50),
    winner_pair_id  UUID REFERENCES tournament_pairs(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','walkover')),
    scheduled_at    TIMESTAMPTZ,
    court_id        UUID REFERENCES courts(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    price         DECIMAL(10, 2) NOT NULL,
    stock         INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CASH TRANSACTIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type              VARCHAR(20) NOT NULL CHECK (type IN ('income_court', 'income_product', 'expense')),
    amount            DECIMAL(10, 2) NOT NULL,
    description       VARCHAR(255),
    payment_method    VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
    reservation_id    UUID REFERENCES reservations(id) ON DELETE SET NULL,
    product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
    product_quantity  INTEGER CHECK (product_quantity >= 1),
    date              DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reservation ON cash_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_product ON cash_transactions(product_id);

-- ─── CASH CLOSINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_closings (
    date              DATE PRIMARY KEY,
    closed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_by_id      UUID NOT NULL REFERENCES users(id),
    court_income      DECIMAL(10, 2) NOT NULL,
    product_income    DECIMAL(10, 2) NOT NULL,
    expenses          DECIMAL(10, 2) NOT NULL,
    net_balance       DECIMAL(10, 2) NOT NULL,
    cash_total        DECIMAL(10, 2) NOT NULL,
    card_total        DECIMAL(10, 2) NOT NULL,
    transfer_total    DECIMAL(10, 2) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: seasons
CREATE TABLE IF NOT EXISTS seasons (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Table: push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  keys_p256dh VARCHAR(255) NOT NULL,
  keys_auth VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Table: reservation_participants
CREATE TABLE IF NOT EXISTS reservation_participants (
  id VARCHAR(36) PRIMARY KEY,
  reservation_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'joined',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(reservation_id, user_id)
);

-- Modify reservations
ALTER TABLE reservations ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE reservations ADD COLUMN public_level VARCHAR(20);

-- Modify matches
ALTER TABLE matches ADD COLUMN season_id VARCHAR(36) REFERENCES seasons(id) ON DELETE SET NULL;

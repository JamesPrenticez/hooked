// The recording library's SQLite handle (docs/SIMULATION.md §6). The only file
// that imports node:sqlite — experimental in Node 24, so if it ever bites,
// swapping to better-sqlite3 is a change to this file alone.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { config } from "./config.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recordings (
  id           INTEGER PRIMARY KEY,
  sim_version  INTEGER NOT NULL,
  source       TEXT    NOT NULL CHECK (source IN ('bot','human')),
  bot          TEXT,                    -- policy + params
  world_seed   INTEGER NOT NULL,
  multiplier   INTEGER NOT NULL,
  fish         TEXT    NOT NULL,        -- roster id caught = bucket key
  depth        TEXT    NOT NULL,        -- DepthId
  idx          INTEGER,                 -- dense per (sim_version, fish); assigned at freeze
  inputs       BLOB    NOT NULL,        -- run-length coded, canonical
  ticks        INTEGER NOT NULL,
  catch_tick   INTEGER NOT NULL,
  catch_meters REAL    NOT NULL,
  fish_count   INTEGER NOT NULL,
  path_len     REAL    NOT NULL,        -- Σ|Δx|, sim px
  sha256       TEXT    NOT NULL UNIQUE, -- over the canonical bytes
  created_at   INTEGER NOT NULL,
  UNIQUE (sim_version, fish, idx)
);`;

let db: DatabaseSync | undefined;

/** Opened on first use, not on import, so a test can point `config.dbPath` at ":memory:" first. */
export function getDb(): DatabaseSync {
	if (!db) {
		if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });
		db = new DatabaseSync(config.dbPath);
		db.exec("PRAGMA journal_mode = WAL");
		db.exec(SCHEMA);
	}
	return db;
}

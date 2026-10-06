import { buildSeed, SEED_VERSION } from "./seed";

const DB_KEY = "gp.mock.v1";
const SESSION_KEY = "gp.session";

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === SEED_VERSION) return parsed;
    }
  } catch {
    // fall through to a fresh seed
  }
  return buildSeed();
}

let db = load();

export const getDb = () => db;

export function commit() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // storage unavailable: keep working in memory
  }
}

export function resetDb() {
  db = buildSeed();
  commit();
  clearSession();
}

export function newId(prefix = "x") {
  db.counters.id += 1;
  return `${prefix}${Date.now().toString(36)}${db.counters.id.toString(36)}`;
}

export function nextMessageSeq() {
  db.counters.msg += 1;
  return db.counters.msg;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.response = { status, data: { error: message } };
  }
}

export const fail = (status, message) => {
  throw new ApiError(status, message);
};

export const delay = (ms = 110 + Math.random() * 160) => new Promise((resolve) => setTimeout(resolve, ms));

export const nowIso = () => new Date().toISOString();

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

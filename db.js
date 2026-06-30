const { Pool } = require('pg');

const LOCAL_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production');
    }

    return LOCAL_DATABASE_URL;
}

let pool;
let initPromise;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: getDatabaseUrl()
        });
    }

    return pool;
}

async function initDb() {
    if (!initPromise) {
        initPromise = getPool().query(`
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                date DATE NOT NULL,
                category TEXT NOT NULL,
                place TEXT NOT NULL,
                nb_participants INTEGER NOT NULL,
                image_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `).catch((error) => {
            initPromise = undefined;
            throw error;
        });
    }

    await initPromise;
}

async function query(text, params) {
    await initDb();
    return getPool().query(text, params);
}

async function closeDb() {
    if (initPromise) {
        await initPromise;
    }

    if (pool) {
        await pool.end();
    }

    pool = undefined;
    initPromise = undefined;
}

module.exports = {
    initDb,
    query,
    closeDb
};

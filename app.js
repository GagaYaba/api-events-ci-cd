const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Seules les images sont acceptees'));
        }
        cb(null, true);
    }
});

const EVENT_SELECT = `
    SELECT
        id,
        title,
        to_char(date, 'YYYY-MM-DD') AS date,
        category,
        place,
        nb_participants AS "nbParticipants",
        image_url AS "imageUrl"
    FROM events
`;

const REQUIRED_FIELDS_ERROR = 'Le titre, la date, la categorie, le lieu et le nombre de participants sont obligatoires';
const PAST_DATE_ERROR = 'La date ne peut pas etre dans le passe';
const PARTICIPANTS_ERROR = 'Le nombre de participants doit etre un entier strictement positif';
const NOT_FOUND_ERROR = 'Evenement introuvable';

function mapEvent(row) {
    return {
        id: row.id,
        title: row.title,
        date: row.date,
        category: row.category,
        place: row.place,
        nbParticipants: row.nbParticipants,
        imageUrl: row.imageUrl
    };
}

function isMissing(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

function parsePositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function parseEventId(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function validateEventPayload(payload) {
    if (
        isMissing(payload.title) ||
        isMissing(payload.date) ||
        isMissing(payload.category) ||
        isMissing(payload.place) ||
        isMissing(payload.nbParticipants)
    ) {
        return { error: REQUIRED_FIELDS_ERROR };
    }

    const nbParticipants = parsePositiveInteger(payload.nbParticipants);
    if (nbParticipants === null) {
        return { error: PARTICIPANTS_ERROR };
    }

    const eventDate = new Date(`${payload.date}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) {
        return { error: PAST_DATE_ERROR };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        return { error: PAST_DATE_ERROR };
    }

    return {
        event: {
            title: String(payload.title).trim(),
            date: payload.date,
            category: String(payload.category).trim(),
            place: String(payload.place).trim(),
            nbParticipants
        }
    };
}

function handleServerError(res, error) {
    console.error('Database operation failed:', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
}

app.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');

        res.status(200).json({
            status: 'ok',
            db: 'ok',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0'
        });
    } catch (error) {
        return handleServerError(res, error);
    }
});

app.get('/events', async (req, res) => {
    try {
        const result = await query(`${EVENT_SELECT} ORDER BY id ASC`);
        res.json(result.rows.map(mapEvent));
    } catch (error) {
        return handleServerError(res, error);
    }
});

// POST /events : Creer un nouvel evenement
app.post('/events', upload.single('image'), async (req, res) => {
    const validation = validateEventPayload(req.body);
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const result = await query(
            `
                INSERT INTO events (title, date, category, place, nb_participants, image_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING
                    id,
                    title,
                    to_char(date, 'YYYY-MM-DD') AS date,
                    category,
                    place,
                    nb_participants AS "nbParticipants",
                    image_url AS "imageUrl"
            `,
            [
                validation.event.title,
                validation.event.date,
                validation.event.category,
                validation.event.place,
                validation.event.nbParticipants,
                imageUrl
            ]
        );

        res.status(201).json(mapEvent(result.rows[0]));
    } catch (error) {
        return handleServerError(res, error);
    }
});

// PUT /events/:id : Modifier un evenement existant
app.put('/events/:id', upload.single('image'), async (req, res) => {
    const id = parseEventId(req.params.id);
    if (id === null) {
        return res.status(404).json({ error: NOT_FOUND_ERROR });
    }

    try {
        const existing = await query(`${EVENT_SELECT} WHERE id = $1`, [id]);
        if (existing.rowCount === 0) {
            return res.status(404).json({ error: NOT_FOUND_ERROR });
        }

        const validation = validateEventPayload(req.body);
        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }

        const currentEvent = mapEvent(existing.rows[0]);
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : currentEvent.imageUrl;

        const result = await query(
            `
                UPDATE events
                SET
                    title = $1,
                    date = $2,
                    category = $3,
                    place = $4,
                    nb_participants = $5,
                    image_url = $6
                WHERE id = $7
                RETURNING
                    id,
                    title,
                    to_char(date, 'YYYY-MM-DD') AS date,
                    category,
                    place,
                    nb_participants AS "nbParticipants",
                    image_url AS "imageUrl"
            `,
            [
                validation.event.title,
                validation.event.date,
                validation.event.category,
                validation.event.place,
                validation.event.nbParticipants,
                imageUrl,
                id
            ]
        );

        res.json(mapEvent(result.rows[0]));
    } catch (error) {
        return handleServerError(res, error);
    }
});

// DELETE /events/reset : Vider tous les evenements (tests uniquement)
app.delete('/events/reset', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Interdit en production' });
    }

    try {
        await query('TRUNCATE TABLE events RESTART IDENTITY');
        res.status(204).send();
    } catch (error) {
        return handleServerError(res, error);
    }
});

// DELETE /events/:id : Supprimer un evenement
app.delete('/events/:id', async (req, res) => {
    const id = parseEventId(req.params.id);
    if (id === null) {
        return res.status(404).json({ error: NOT_FOUND_ERROR });
    }

    try {
        const result = await query('DELETE FROM events WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: NOT_FOUND_ERROR });
        }

        res.status(204).send();
    } catch (error) {
        return handleServerError(res, error);
    }
});

// Export de l'app pour les tests unitaires sans lancer le serveur.
module.exports = app;

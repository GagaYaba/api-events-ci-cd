process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

const request = require('supertest');
const app = require('../app');
const { closeDb } = require('../db');

// Tests d'integration API avec Jest et Supertest.
beforeEach(async () => {
    await request(app).delete('/events/reset');
});

afterAll(async () => {
    await closeDb();
});

describe('GET /health', () => {
    it('doit retourner status ok avec code 200', async () => {
        const res = await request(app).get('/health');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.env).toBeDefined();
        expect(res.body.version).toBeDefined();
    });
});

describe('GET /events', () => {
    it('devrait retourner un tableau d\'evenements', async () => {
        const res = await request(app).get('/events');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('devrait retourner les evenements persistés en base', async () => {
        const created = await request(app)
            .post('/events')
            .send({ title: 'Evenement persiste', date: '2099-12-31', category: 'Musique', place: 'Lyon', nbParticipants: 200 });

        const res = await request(app).get('/events');

        expect(created.statusCode).toBe(201);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
            id: created.body.id,
            title: 'Evenement persiste',
            date: '2099-12-31',
            category: 'Musique',
            place: 'Lyon',
            nbParticipants: 200,
            imageUrl: null
        });
    });
});

describe('POST /events', () => {
    it('devrait retourner 400 si un champ obligatoire est manquant', async () => {
        const res = await request(app)
            .post('/events')
            .send({ date: '2099-12-31', category: 'Sport', place: 'Paris', nbParticipants: 50 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si la date est dans le passe', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Vieux evenement', date: '2000-01-01', category: 'Sport', place: 'Paris', nbParticipants: 50 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si le nombre de participants est invalide', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Evenement invalide', date: '2099-12-31', category: 'Sport', place: 'Paris', nbParticipants: 0 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait creer un evenement avec des donnees valides', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Nouvel evenement', date: '2099-12-31', category: 'Musique', place: 'Lyon', nbParticipants: 200 });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Nouvel evenement');
        expect(res.body.date).toBe('2099-12-31');
        expect(res.body.category).toBe('Musique');
        expect(res.body.place).toBe('Lyon');
        expect(res.body.nbParticipants).toBe(200);
        expect(res.body.imageUrl).toBeNull();
    });
});

describe('PUT /events/:id', () => {
    let eventId;

    beforeEach(async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Evenement a modifier', date: '2099-06-01', category: 'Sport', place: 'Paris', nbParticipants: 30 });
        eventId = res.body.id;
    });

    it('devrait retourner 404 si l\'id n\'existe pas', async () => {
        const res = await request(app)
            .put('/events/99999')
            .send({ title: 'Titre modifie', date: '2099-12-31', category: 'Sport', place: 'Paris', nbParticipants: 30 });
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si un champ obligatoire est manquant', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ date: '2099-12-31' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si la date est dans le passe', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ title: 'Titre modifie', date: '2000-01-01', category: 'Sport', place: 'Paris', nbParticipants: 30 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si le nombre de participants est invalide', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ title: 'Titre modifie', date: '2099-12-31', category: 'Sport', place: 'Paris', nbParticipants: -1 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait modifier un evenement existant', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ title: 'Titre modifie', date: '2099-12-31', category: 'Cinema', place: 'Bordeaux', nbParticipants: 100 });
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Titre modifie');
        expect(res.body.date).toBe('2099-12-31');
        expect(res.body.category).toBe('Cinema');
        expect(res.body.place).toBe('Bordeaux');
        expect(res.body.nbParticipants).toBe(100);
        expect(res.body.id).toBe(eventId);
    });
});

describe('DELETE /events/:id', () => {
    let eventId;

    beforeEach(async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Evenement a supprimer', date: '2099-06-01', category: 'Art', place: 'Marseille', nbParticipants: 10 });
        eventId = res.body.id;
    });

    it('devrait retourner 404 si l\'id n\'existe pas', async () => {
        const res = await request(app).delete('/events/99999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait supprimer un evenement existant et retourner 204', async () => {
        const res = await request(app).delete(`/events/${eventId}`);
        expect(res.statusCode).toBe(204);

        const list = await request(app).get('/events');
        expect(list.body.find(event => event.id === eventId)).toBeUndefined();
    });
});

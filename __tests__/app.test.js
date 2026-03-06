const request = require('supertest');
const app = require('../app');

describe('GET /events', () => {
    it('devrait retourner un tableau d\'événements', async () => {
        const res = await request(app).get('/events');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
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

    it('devrait retourner 400 si la date est dans le passé', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Vieux événement', date: '2000-01-01', category: 'Sport', place: 'Paris', nbParticipants: 50 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait créer un événement avec des données valides', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Nouvel événement', date: '2099-12-31', category: 'Musique', place: 'Lyon', nbParticipants: 200 });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Nouvel événement');
        expect(res.body.category).toBe('Musique');
        expect(res.body.place).toBe('Lyon');
        expect(res.body.nbParticipants).toBe(200);
    });
});

describe('PUT /events/:id', () => {
    let eventId;

    beforeEach(async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Événement à modifier', date: '2099-06-01', category: 'Sport', place: 'Paris', nbParticipants: 30 });
        eventId = res.body.id;
    });

    it('devrait retourner 404 si l\'id n\'existe pas', async () => {
        const res = await request(app)
            .put('/events/99999')
            .send({ title: 'Titre modifié', date: '2099-12-31', category: 'Sport', place: 'Paris', nbParticipants: 30 });
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

    it('devrait retourner 400 si la date est dans le passé', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ title: 'Titre modifié', date: '2000-01-01', category: 'Sport', place: 'Paris', nbParticipants: 30 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait modifier un événement existant', async () => {
        const res = await request(app)
            .put(`/events/${eventId}`)
            .send({ title: 'Titre modifié', date: '2099-12-31', category: 'Cinéma', place: 'Bordeaux', nbParticipants: 100 });
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Titre modifié');
        expect(res.body.category).toBe('Cinéma');
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
            .send({ title: 'Événement à supprimer', date: '2099-06-01', category: 'Art', place: 'Marseille', nbParticipants: 10 });
        eventId = res.body.id;
    });

    it('devrait retourner 404 si l\'id n\'existe pas', async () => {
        const res = await request(app).delete('/events/99999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait supprimer un événement existant et retourner 204', async () => {
        const res = await request(app).delete(`/events/${eventId}`);
        expect(res.statusCode).toBe(204);
    });
});

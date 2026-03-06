const request = require('supertest');
const app = require('../app');

describe('GET /events', () => {
    it('devrait retourner un message de bienvenue', async () => {
        const res = await request(app).get('/events');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

describe('POST /events', () => {
    it('devrait retourner 400 si le titre est manquant', async () => {
        const res = await request(app)
            .post('/events')
            .send({ date: '2099-12-31' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si la date est manquante', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Mon événement' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 si la date est dans le passé', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Vieux événement', date: '2000-01-01' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('devrait créer un événement avec des données valides', async () => {
        const res = await request(app)
            .post('/events')
            .send({ title: 'Nouvel événement', date: '2099-12-31' });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Nouvel événement');
    });
});

const express = require('express');
const app = express();
app.use(express.json()); // Pour lire le JSON dans le corps des requêtes

const events = [];

app.get('/events', (req, res) => {
    res.json({ message: "Bienvenue sur l'API Events !" });
});

// POST /events : Créer un nouvel événement
app.post('/events', (req, res) => {
    const newEvent = req.body;

    // --- LOGIQUE MÉTIER (À tester via CI/CD !) ---

    // 1. Validation basique
    if (!newEvent.title || !newEvent.date || !newEvent.category || !newEvent.place || !newEvent.nbParticipants) {
        return res.status(400).json({
            error: "Le titre, la date, la catégorie, le lieu et le nombre de participants sont obligatoires"
        });
    }

    // 2. Validation Logique : Pas d'événement dans le passé
    const eventDate = new Date(newEvent.date);
    const today = new Date();
    // On retire l'heure pour comparer uniquement les jours
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        return res.status(400).json({
            error: "La date ne peut pas être dans le passé"
        });
    }

    // --- FIN LOGIQUE ---

    // Ajout de l'événement (Simulation ID auto-incrémenté)
    newEvent.id = events.length + 1;
    events.push(newEvent);

    res.status(201).json(newEvent);
});

// PUT /events/:id : Modifier un événement existant
app.put('/events/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = events.findIndex(e => e.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "Événement introuvable" });
    }

    const updated = req.body;

    if (!updated.title || !updated.date || !updated.category || !updated.place || !updated.nbParticipants) {
        return res.status(400).json({ error: "Le titre, la date, la catégorie, le lieu et le nombre de participants sont obligatoires" });
    }

    const eventDate = new Date(updated.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        return res.status(400).json({ error: "La date ne peut pas être dans le passé" });
    }

    events[index] = { ...events[index], ...updated };
    res.json(events[index]);
});

// DELETE /events/:id : Supprimer un événement
app.delete('/events/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = events.findIndex(e => e.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "Événement introuvable" });
    }

    events.splice(index, 1);
    res.status(204).send();
});

// Export de l'app (nécessaire pour les tests unitaires sans lancer le serveur)
module.exports = app;
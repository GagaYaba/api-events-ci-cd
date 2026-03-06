const { test, expect } = require('@playwright/test');

const FUTURE_DATE = '2099-12-31';

// Réinitialise les événements côté serveur avant chaque test
test.beforeEach(async ({ request, page }) => {
    await request.delete('/events/reset');
    await page.goto('/');
});

// Helpers
async function fillAndSubmit(page, { title, date, category, place, nb }) {
    if (title !== undefined) await page.fill('#title', title);
    if (date !== undefined) await page.fill('#date', date);
    if (category !== undefined) await page.selectOption('#category', category);
    if (place !== undefined) await page.fill('#place', place);
    if (nb !== undefined) await page.fill('#nbParticipants', String(nb));
    await page.click('.btn-submit');
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

test('la page se charge et affiche le titre', async ({ page }) => {
    await expect(page).toHaveTitle('EVENTS.');
    await expect(page.locator('.logo')).toBeVisible();
});

test('affiche "Aucun événement planifié" au démarrage', async ({ page }) => {
    await expect(page.locator('.empty-state')).toBeVisible();
});

test('le compteur héro démarre à 0', async ({ page }) => {
    await expect(page.locator('#heroCount')).toHaveText('0');
});

// ── FORMULAIRE : VALIDATION ────────────────────────────────────────────────────

test('affiche une erreur si le titre est manquant', async ({ page }) => {
    await fillAndSubmit(page, { date: FUTURE_DATE, category: 'Sport', place: 'Paris', nb: 50 });
    await expect(page.locator('#createError')).toBeVisible();
});

test('affiche une erreur si la date est dans le passé', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Test', date: '2000-01-01', category: 'Sport', place: 'Paris', nb: 50 });
    await expect(page.locator('#createError')).toBeVisible();
});

// ── CRÉATION D'UN ÉVÉNEMENT ────────────────────────────────────────────────────

test('crée un événement et l\'affiche dans la grille', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Concert Test', date: FUTURE_DATE, category: 'Concert', place: 'Lyon', nb: 200 });
    await expect(page.locator('.event-card')).toBeVisible();
    await expect(page.locator('.event-title').first()).toContainText('Concert Test');
});

test('le compteur héro s\'incrémente après ajout', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Event Compteur', date: FUTURE_DATE, category: 'Culture', place: 'Nantes', nb: 100 });
    await expect(page.locator('#heroCount')).toHaveText('1');
});

test('le formulaire est vidé après création', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Event Vide', date: FUTURE_DATE, category: 'Sport', place: 'Bordeaux', nb: 30 });
    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#place')).toHaveValue('');
});

// ── FILTRES ────────────────────────────────────────────────────────────────────

test('le filtre par catégorie masque les événements non correspondants', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Event Sport', date: FUTURE_DATE, category: 'Sport', place: 'Paris', nb: 50 });
    await fillAndSubmit(page, { title: 'Event Concert', date: FUTURE_DATE, category: 'Concert', place: 'Lyon', nb: 100 });
    await page.selectOption('#filterCategory', 'Sport');
    const cards = page.locator('.event-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Event Sport');
});

test('le filtre par lieu fonctionne (recherche partielle)', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Event Paris', date: FUTURE_DATE, category: 'Sport', place: 'Paris', nb: 50 });
    await fillAndSubmit(page, { title: 'Event Lyon', date: FUTURE_DATE, category: 'Concert', place: 'Lyon', nb: 80 });
    await page.fill('#filterPlace', 'par');
    const cards = page.locator('.event-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Event Paris');
});

test('le bouton réinitialiser efface les filtres et affiche tout', async ({ page }) => {
    await fillAndSubmit(page, { title: 'A', date: FUTURE_DATE, category: 'Sport', place: 'Paris', nb: 10 });
    await expect(page.locator('.event-card')).toHaveCount(1);
    await fillAndSubmit(page, { title: 'B', date: FUTURE_DATE, category: 'Concert', place: 'Lyon', nb: 20 });
    await expect(page.locator('.event-card')).toHaveCount(2);
    await page.selectOption('#filterCategory', 'Sport');
    await expect(page.locator('.event-card')).toHaveCount(1);
    await page.click('.btn-reset-filters');
    await expect(page.locator('.event-card')).toHaveCount(2);
});

// ── MODALE D'ÉDITION ──────────────────────────────────────────────────────────

test('la modale d\'édition s\'ouvre au clic sur Modifier', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Edit Test', date: FUTURE_DATE, category: 'Culture', place: 'Marseille', nb: 60 });
    await page.click('.btn-icon.edit');
    await expect(page.locator('#editModal')).toHaveClass(/open/);
});

test('la modale se ferme avec le bouton Annuler', async ({ page }) => {
    await fillAndSubmit(page, { title: 'Close Test', date: FUTURE_DATE, category: 'Cinéma', place: 'Toulouse', nb: 40 });
    await page.click('.btn-icon.edit');
    await page.click('.btn-cancel');
    await expect(page.locator('#editModal')).not.toHaveClass(/open/);
});

// ── SUPPRESSION ───────────────────────────────────────────────────────────────

test('supprimer un événement le retire de la liste', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await fillAndSubmit(page, { title: 'A Supprimer', date: FUTURE_DATE, category: 'Sport', place: 'Paris', nb: 10 });
    await expect(page.locator('.event-card')).toHaveCount(1);
    await page.click('.btn-icon.del');
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('#heroCount')).toHaveText('0');
});

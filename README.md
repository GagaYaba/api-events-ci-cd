# API Events - CI/CD DevOps

## Présentation

API Events est une application Node.js / Express réalisée pour l'examen pratique CI/CD DevOps. Le projet expose une API REST, sert un frontend statique et applique progressivement les pratiques attendues : intégration continue, tests, sécurité, Docker, déploiement, observabilité et persistance PostgreSQL.

## Fonctionnalités de l'application

* Création, liste, modification et suppression d'événements.
* Filtres frontend par catégorie, lieu et date.
* Upload d'image avec Multer.
* Stockage persistant des événements dans PostgreSQL.
* Route de santé `/health` pour vérifier l'API et la base de données.

## Stack technique

* Node.js 20
* Express
* PostgreSQL avec `pg`
* Multer
* Jest + Supertest
* Playwright
* Docker et Docker Compose
* GitHub Actions
* GHCR
* Trivy
* Dependabot
* Render
* UptimeRobot

## Architecture simple

Express sert le frontend statique depuis `public/` et expose les routes API. Les événements sont stockés dans PostgreSQL via `db.js`, qui initialise automatiquement la table `events` si elle n'existe pas.

Le serveur démarre avec `server.js`, appelle `initDb()` avant `app.listen`, puis écoute sur `process.env.PORT || 3000`. La route `/health` vérifie aussi PostgreSQL et retourne `db: "ok"` quand la connexion fonctionne.

Sur Windows, `start.bat` simplifie le lancement local : il démarre PostgreSQL via Docker Compose, lance Node dans une fenêtre séparée et laisse un menu interactif disponible.

## Routes principales

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/health` | Vérifie l'état de l'API et de PostgreSQL. |
| `GET` | `/events` | Liste les événements depuis PostgreSQL. |
| `POST` | `/events` | Crée un événement. |
| `PUT` | `/events/:id` | Modifie un événement existant. |
| `DELETE` | `/events/:id` | Supprime un événement existant. |
| `DELETE` | `/events/reset` | Vide la table pour les tests hors production. |

`/events/reset` est réservé aux tests et renvoie `403` en production.

Format API des événements :

```json
{
  "id": 1,
  "title": "Concert",
  "date": "2099-12-31",
  "category": "Concert",
  "place": "Lyon",
  "nbParticipants": 200,
  "imageUrl": "/uploads/example.png"
}
```

En base, `nb_participants` est renvoyé côté API en `nbParticipants`, et `image_url` en `imageUrl`.

## Variables d'environnement

Ne jamais écrire de vraies valeurs sensibles dans le repo.

### Local

`start.bat` définit les valeurs locales suivantes :

```text
DATABASE_URL=postgresql://test:test@localhost:5432/test
NODE_ENV=development
API_PASSWORD=local-password
```

Ces valeurs sont réservées au développement local.

### CI GitHub Actions

La CI utilise un service PostgreSQL `postgres:16` et attend :

```text
API_PASSWORD
DATABASE_URL
NODE_ENV
```

Le script `scripts/check-env.sh` vérifie ces variables avant les tests backend.

### Render staging

Le service Render `api-events-staging` doit recevoir :

```text
DATABASE_URL=<internal-database-url>
NODE_ENV=production
API_PASSWORD=<staging-api-password>
```

Utiliser l'Internal Database URL lorsque la base PostgreSQL Render et le web service sont dans le même compte et la même région.

### GitHub Environment staging

Le déploiement staging via Render Deploy Hook utilise :

```text
RENDER_DEPLOY_HOOK=<render-deploy-hook-url>
```

## Lancement local

Double-cliquer sur `start.bat` pour ouvrir le menu local.

Commandes directes :

```bat
start.bat start
start.bat stop
start.bat restart
start.bat help
```

URLs utiles :

```text
http://localhost:3000
http://localhost:3000/health
http://localhost:3000/events
```

Le démarrage lance PostgreSQL via Docker Compose puis Node dans une fenêtre CMD séparée. Les événements restent présents après redémarrage de Node si le volume PostgreSQL est conservé.

## Commandes utiles

```bash
npm ci
npm test -- --coverage
npm run test:e2e
docker compose up -d postgres
docker compose down
```

Ne pas utiliser `docker compose down -v` sauf volonté explicite de supprimer le volume PostgreSQL.

## Tests

Les tests backend utilisent Jest + Supertest pour couvrir `/health`, `GET /events`, `POST /events`, `PUT /events/:id`, `DELETE /events/:id` et `/events/reset`.

Les tests frontend utilisent Playwright pour vérifier les principaux parcours navigateur : chargement de page, création, filtres, édition et suppression.

Depuis la phase PostgreSQL, une base PostgreSQL doit être disponible avant les tests. `/events/reset` nettoie la table hors production.

## CI/CD

### CI avancée

Le workflow `.github/workflows/ci.yml` lance les tests backend et frontend sur `push` et `pull_request`.

* `actions/setup-node@v4` avec Node.js 20 et cache npm.
* Installation avec `npm ci`.
* Service PostgreSQL `postgres:16` pour les tests backend.
* Service PostgreSQL `postgres:16` aussi pour Playwright, car `server.js` démarre avec PostgreSQL.
* Vérification des variables via `scripts/check-env.sh`.
* Tests backend avec `npm test -- --coverage`.
* Upload du dossier `coverage/` comme artifact `test-report-backend` avec `if: always()`.

### Docker / GHCR

Le workflow `.github/workflows/build-publish.yml` construit l'image Docker et la publie sur GHCR.

* Login GHCR avec `GITHUB_TOKEN`.
* Permission `packages: write`.
* Tag `latest` pour la dernière image publiée.
* Tag SHA pour identifier précisément une version de commit.
* Nom d'image converti en minuscules avant publication.

### DevSecOps

* Trivy scanne l'image Docker publiée.
* `exit-code: 0` laisse le scan remonter les résultats sans bloquer volontairement le push.
* Dependabot est configuré pour npm et GitHub Actions.
* Les secrets sont fournis par GitHub Actions ou Render, jamais écrits en dur.

### Déploiement

Le workflow `.github/workflows/deploy.yml` prévoit :

* déploiement staging via `RENDER_DEPLOY_HOOK` ;
* environnement GitHub `staging` ;
* job production dépendant du staging avec `needs: deploy-staging` ;
* environnement GitHub `production`, prévu pour une approbation manuelle via GitHub Environment.

## PostgreSQL sur Render staging

En staging Render, l'application doit être reliée à une base Render PostgreSQL, par exemple `api-events-staging-db`.

Configuration attendue sur le service `api-events-staging` :

```text
DATABASE_URL=<internal-database-url>
NODE_ENV=production
API_PASSWORD=<staging-api-password>
```

Après redéploiement, vérifier :

```text
https://api-events-staging.onrender.com/health
```

Réponse attendue :

```json
{
  "status": "ok",
  "db": "ok",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "env": "production",
  "version": "1.0.0"
}
```

Créer ensuite un événement, redémarrer le service Render, puis vérifier que l'événement est toujours présent pour confirmer la persistance PostgreSQL.

Checklist Render staging :

* [ ] Base PostgreSQL Render créée
* [ ] `DATABASE_URL` configurée avec l'Internal Database URL
* [ ] `NODE_ENV` configurée
* [ ] `API_PASSWORD` configurée
* [ ] Service staging redéployé
* [ ] `/health` répond 200 avec `db: "ok"`
* [ ] Un événement persiste après redémarrage du service

## Observabilité

La route `GET /health` permet de vérifier l'état de l'API et de PostgreSQL.

Elle retourne :

* `status`
* `db`
* `timestamp`
* `env`
* `version`

UptimeRobot doit surveiller l'URL staging avec un monitor HTTP(s) :

```text
https://<render-staging-url>/health
```

Configuration attendue :

* intervalle de 5 minutes ;
* alerte email activée ;
* dashboard en statut UP lorsque l'API répond.

## État actuel

* CI configurée sur la branche `feat/postgres-ui-local-run`.
* PostgreSQL local fonctionnel avec Docker Compose.
* Tests backend attendus avec couverture Jest.
* Tests Playwright attendus sur le frontend servi par Express.
* Render staging prêt à valider avec une base PostgreSQL Render et `/health` contenant `db: "ok"`.
* Aucun vrai secret ne doit être présent dans le repo.

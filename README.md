# API Events — CI/CD DevOps

Projet Node.js / Express réalisé dans le cadre de l’examen pratique CI/CD DevOps.

L’objectif du projet est de faire évoluer une API REST existante en ajoutant progressivement des bonnes pratiques DevOps : intégration continue, tests, sécurité, Docker, déploiement et observabilité.

## Phase 1 — CI avancée

La CI backend a été configurée de manière complète.

* ajout d’un service PostgreSQL `postgres:16` dans le job backend
* ajout d’un healthcheck PostgreSQL avec `pg_isready`
* ajout des variables d’environnement au niveau du job backend :

  * `API_PASSWORD`
  * `DATABASE_URL`
  * `NODE_ENV`
* lancement des tests Jest avec couverture :

  ```bash
  npm test -- --coverage
  ```
* upload du dossier `coverage/` comme artifact GitHub Actions nommé `test-report-backend`

## Phase 2 — Observabilité : route `/health`

Une route de vérification de santé de l’API a été ajoutée.

Route ajoutée :

```http
GET /health
```

Elle retourne un JSON contenant :

* `status`
* `timestamp`
* `env`
* `version`

Exemple de réponse :

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "env": "test",
  "version": "1.0.0"
}
```

Un test Supertest a également été ajouté pour vérifier que la route `/health` répond bien avec un code HTTP 200.

## Phase 3 — Vérification des variables d’environnement

Un script de vérification des variables d’environnement a été ajouté.

Fichier créé :

```bash
scripts/check-env.sh
```

Le script vérifie la présence des variables suivantes :

* `DATABASE_URL`
* `API_PASSWORD`
* `NODE_ENV`

Il est exécuté dans la CI avant les tests backend afin d’échouer rapidement si une variable importante est absente.

## Phase 4 — Docker / GHCR / Trivy / Dependabot

* Dockerfile présent à la racine du projet.
* Image Docker publiée sur GHCR avec les tags `latest` et SHA.
* Scan Trivy visible dans les logs du workflow `build-publish`.
* Dependabot configuré pour npm et GitHub Actions.

## Commandes utiles

Installer les dépendances :

```bash
npm ci
```

Lancer les tests :

```bash
npm test
```

Lancer les tests avec couverture :

```bash
npm test -- --coverage
```

## Types de tests

* Tests API : Jest + Supertest, tests d’intégration API sur les routes Express.
* Tests frontend : Playwright, tests end-to-end simulant les actions utilisateur dans le navigateur.

Tester le script de vérification d’environnement en local :

```bash
DATABASE_URL="<production-database-url>" API_PASSWORD="<api-password>" NODE_ENV="production" bash scripts/check-env.sh
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

L’option de démarrage lance PostgreSQL local, puis Node dans une fenêtre CMD séparée. Le menu reste disponible pour ouvrir l’application, redémarrer ou arrêter l’environnement.

Le frontend est disponible sur `http://localhost:3000` et la route santé sur `http://localhost:3000/health`.

L’application utilise PostgreSQL pour stocker les événements. En local, PostgreSQL peut être lancé avec le launcher `start.bat` ou directement avec :

```bash
docker compose up -d postgres
```

La variable `DATABASE_URL` est nécessaire. En développement local, `start.bat` définit :

```text
DATABASE_URL=postgresql://test:test@localhost:5432/test
```

En staging et production, `DATABASE_URL` doit être configurée dans l’environnement de déploiement. Les événements ne disparaissent plus au redémarrage de Node si le volume PostgreSQL est conservé.

## Phase 5 — Déploiement staging / production

Le workflow `.github/workflows/deploy.yml` configure deux jobs :

* `deploy-staging` : déclenche automatiquement le déploiement staging via un deploy hook Render.
* `deploy-production` : dépend du staging avec `needs: deploy-staging` et utilise l’environnement GitHub `production`.

La validation manuelle de la production est configurée dans GitHub via les règles de protection de l’environnement `production`.

Secrets et environnements à configurer dans GitHub :

* environnement `staging`
* secret `RENDER_DEPLOY_HOOK=<render-deploy-hook-url>`
* environnement `production`
* required reviewer activé

## Phase 6 — Observabilité avec UptimeRobot

La route `GET /health` permet de vérifier que l’API est disponible.

Elle retourne un JSON avec :

* `status`
* `timestamp`
* `env`
* `version`

Un monitor UptimeRobot doit être configuré manuellement sur l’URL staging de l’API, avec le chemin `/health`.

Exemple :

```text
https://<render-staging-url>/health
```

Le monitor doit être de type HTTP(s), avec un intervalle de 5 minutes et une alerte email.

Cette configuration permet de détecter automatiquement si l’API staging devient indisponible.

## Preuves de validation
Les captures d’écran ci-dessous présentent les éléments demandés lorsque le fichier PNG est disponible.

* Pipeline CI verte avec cache npm

  ![Pipeline CI](docs/screenshots/01-ci-success.png)
  ![Cache npm](docs/screenshots/02-ci-cache-npm.png)

* Service PostgreSQL visible dans la CI

  ![PostgreSQL](docs/screenshots/03-ci-postgres.png)
  Configuration PostgreSQL : `.github/workflows/ci.yml`

* Tests lancés avec coverage et artifact

  ![Coverage Artifact](docs/screenshots/04-ci-coverage-artifact.png)

* Image Docker publiée sur GHCR

  ![Docker](docs/screenshots/05-ghcr-package-tags.png)

* Scan Trivy

  ![Trivy](docs/screenshots/06-trivy-logs.png)

* Dependabot configuré

  Configuration Dependabot : `.github/dependabot.yml`
  Capture à ajouter si nécessaire : `docs/screenshots/07-dependabot.png`

* Secrets GitHub Actions créés

  ![Secrets](docs/screenshots/08-github-secrets.png)

* Workflow Deploy déclenché

  ![Workflow](docs/screenshots/09-deploy-workflow.png)

* Déploiement staging via Render Deploy Hook

  ![Render Deploy Hook](docs/screenshots/10-render-deploy-hook.png)

* Production bloquée en attente d’approbation

  ![Waiting approval](docs/screenshots/11-production-waiting-approval.png)

* Production validée manuellement

  ![Approved](docs/screenshots/12-production-approved.png)

* Route `/health` accessible sur Render

  ![Health](docs/screenshots/13-health-render.png)

* Dashboard UptimeRobot en statut UP
* Monitor UptimeRobot configuré sur `/health`

  ![UptimeRobot](docs/screenshots/14-uptimerobot-up.png)

## Variables d’environnement nécessaires

Pour que la CI et le déploiement fonctionnent correctement, ces valeurs doivent être configurées dans GitHub avec des placeholders, jamais de vraies valeurs dans le repo.

Secrets GitHub Actions :

```text
API_PASSWORD=<api-password>
DATABASE_URL=<production-database-url>
NODE_ENV=production
```

Secret d’environnement staging :

```text
RENDER_DEPLOY_HOOK=<render-deploy-hook-url>
```

Dans GitHub :

```text
Settings → Secrets and variables → Actions → New repository secret
```


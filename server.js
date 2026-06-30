const app = require('./app');
const { initDb } = require('./db');

const port = process.env.PORT || 3000;

async function startServer() {
    try {
        await initDb();

        app.listen(port, () => {
            console.log(`API Events demarree sur http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Impossible de demarrer API Events : PostgreSQL est inaccessible ou DATABASE_URL est invalide.');
        console.error(error.message);
        process.exit(1);
    }
}

startServer();

const js = require('@eslint/js');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'playwright-report/**',
            'test-results/**',
            'uploads/**',
            'public/uploads/**'
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                __dirname: 'readonly',
                console: 'readonly',
                exports: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
                describe: 'readonly',
                expect: 'readonly',
                it: 'readonly',
                jest: 'readonly'
            }
        }
    }
];

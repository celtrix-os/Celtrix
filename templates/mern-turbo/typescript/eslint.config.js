// Basic shared ESLint config for MERN Turborepo TypeScript template
export default [
    {
        ignores: ['dist', 'node_modules'],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                document: 'readonly',
                window: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'warn'
        }
    }
];

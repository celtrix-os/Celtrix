export default [
    {
        ignores: ['dist', 'node_modules']
    },
    {
        files: ['**/*.js', '**/*.jsx'],
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
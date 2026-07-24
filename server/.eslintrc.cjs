module.exports = {
  root: true,
  env: { node: true, es2020: true, jest: true },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': 'warn',
  },
}

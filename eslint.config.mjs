import astro from 'eslint-plugin-astro';

export default [
  ...astro.configs.recommended,
  { ignores: ['dist/**', '.astro/**', 'node_modules/**'], rules: { 'no-unused-vars': 'off', 'no-undef': 'off' } },
];

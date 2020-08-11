module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  plugins: [
    'disable',
    'max-len-2',
  ],
  extends: [
    'standard',
  ],
  globals: {
  },
  rules: {
    'no-var': 1,
    'no-debugger': 2,
    'spaced-comment': 1,
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'ignore',
    }],
    indent: ['error', 2],
    'max-len': [1, 80, { ignoreUrls: true, ignoreStrings: true }],
    'max-len-2/max-len-2': [2, 120, {
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreComments: true,
      ignoreRegExpLiterals: true,
      ignoreTemplateLiterals: true,
    }],
    'one-var': 1,
    'standard/computed-property-even-spacing': 1,
    'no-useless-escape': 1,
    'no-throw-literal': 1,
  },
}

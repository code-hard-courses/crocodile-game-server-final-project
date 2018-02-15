module.exports = {
  extends: 'google',
  parserOptions: {
    ecmaVersion: 6
  },
  rules: {
    'no-tabs': 'off',
    'max-len': [
      'error',
      {
        ignoreStrings: true,
        code: 120,
        tabWidth: 4
      }
    ],
    'linebreak-style': ['error', 'windows'],
    'require-jsdoc': ['error', {
      'require': {
          'FunctionDeclaration': false,
          'MethodDefinition': false,
          'ClassDeclaration': false,
          'ArrowFunctionExpression': false,
          'FunctionExpression': false
      }
  }]
  }
};

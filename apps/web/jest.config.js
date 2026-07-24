/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Resolve shared workspace packages to their TS source so babel-jest
    // transforms them (avoids the node_modules transform-ignore problem).
    '^@agri/api-client/(.*)$': '<rootDir>/../../packages/api-client/src/$1',
    '^@agri/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@agri/sensor-catalog$':
      '<rootDir>/../../packages/sensor-catalog/src/index.ts',
    '^@agri/i18n$': '<rootDir>/../../packages/i18n/src/index.ts',
    // next-intl ships ESM that jest's babel transform can't parse; stub it.
    '^next-intl$': '<rootDir>/__mocks__/nextIntlMock.js',
    '\\.(scss|css)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|webp|avif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { configFile: './babel.config.test.js' },
    ],
  },
  // react-markdown + remark-gfm (and their unified/micromark/mdast/hast/vfile
  // ESM dependency tree) ship pure ESM that jest's CommonJS runtime can't parse
  // as-is. node_modules are transform-ignored by default, so we allowlist that
  // ecosystem back into babel-jest's transform.
  transformIgnorePatterns: [
    '/node_modules/(?!(' +
      [
        'react-markdown',
        'remark-.*',
        'rehype-.*',
        'micromark.*',
        'mdast-util-.*',
        'unist-util-.*',
        'unified',
        'bail',
        'trough',
        'is-plain-obj',
        'vfile',
        'vfile-message',
        'hast-util-.*',
        'property-information',
        'space-separated-tokens',
        'comma-separated-tokens',
        'decode-named-character-reference',
        'character-entities.*',
        'character-reference-invalid',
        'trim-lines',
        'html-url-attributes',
        'zwitch',
        'longest-streak',
        'ccount',
        'escape-string-regexp',
        'markdown-table',
        'devlop',
        'estree-util-is-identifier-name',
        'stringify-entities',
      ].join('|') +
      ')/)',
  ],
  testMatch: ['<rootDir>/src/**/*.test.(ts|tsx)'],
};

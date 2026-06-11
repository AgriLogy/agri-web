module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Skip validation for commits that semantic-release creates: their bodies
  // and footers contain auto-generated changelog with long URLs that would
  // otherwise trip body/footer line-length rules.
  ignores: [(message) => /^chore\(release\):/m.test(message)],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'subject-case': [0],
    // Auto-generated changelog entries embed long markdown links; the human
    // subject is what matters here.
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};

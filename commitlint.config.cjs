/**
 * Commitlint config — enforces Conventional Commits on every commit message
 * (run by the husky `commit-msg` hook) so semantic-release can classify the
 * release bump. Without this file commitlint loads no rules and fails with
 * `empty-rules`, which is why commits previously needed `--no-verify`.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
};

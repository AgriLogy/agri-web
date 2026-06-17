import path from 'node:path';

const ROOT = process.cwd();

// Make absolute staged paths relative to the repo root, with forward slashes.
const toRepoRelative = (file) =>
  path.relative(ROOT, file).split(path.sep).join('/');

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const PRETTIER = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|yml|yaml)$/;

const WEB_PREFIX = 'apps/web/';

// Only apps/web ships an ESLint flat config; packages/* do not, so ESLint must
// not run there (it would abort with "couldn't find an eslint.config" file).
// We group staged files by workspace: web code files are linted from inside
// apps/web (so the Next.js plugin resolves its rootDir correctly), and every
// supported file is run through Prettier.
export default function lintStaged(allStagedFiles) {
  const files = allStagedFiles.map(toRepoRelative);

  const webCodeFiles = files
    .filter((f) => f.startsWith(WEB_PREFIX) && CODE.test(f))
    .map((f) => f.slice(WEB_PREFIX.length));
  const prettierFiles = files.filter((f) => PRETTIER.test(f));

  const commands = [];

  if (webCodeFiles.length > 0) {
    // `cd` into the workspace so ESLint auto-discovers apps/web/eslint.config.mjs
    // and the Next.js plugin uses the app as its root.
    commands.push(
      `sh -c 'cd apps/web && eslint --fix ${webCodeFiles
        .map((f) => JSON.stringify(f))
        .join(' ')}'`
    );
  }

  if (prettierFiles.length > 0) {
    commands.push(
      `prettier --write ${prettierFiles.map((f) => JSON.stringify(f)).join(' ')}`
    );
  }

  return commands;
}

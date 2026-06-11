/* Babel config used only by Jest. Next.js does not pick this file up
   because of the explicit `.test` infix — keeping it isolated avoids
   pulling Babel into the Next build pipeline. */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};

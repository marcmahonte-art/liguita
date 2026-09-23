/**
 * Liguita — configuration PostCSS.
 *
 * CommonJS volontairement : PostCSS et Tailwind chargent ce fichier au moment du build,
 * sans étape de compilation. Un `postcss.config.ts` exigerait `jiti` et échouerait sur
 * un `next build` en production.
 *
 * Le chemin de la configuration Tailwind est donné explicitement (`config`) plutôt que
 * laissé à la résolution automatique : `globals.css` vit dans `packages/ui`, donc dans
 * un autre paquet du monorepo, et la résolution implicite dépendrait du répertoire
 * courant du processus — un build qui passe en local et casse en CI.
 */
module.exports = {
  plugins: {
    tailwindcss: { config: './tailwind.config.cjs' },
    autoprefixer: {},
  },
};

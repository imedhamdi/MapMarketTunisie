import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('public/dist');

async function buildScripts() {
  await mkdir(distDir, { recursive: true });

  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch (error) {
    console.warn('esbuild indisponible, génération sans minification (%s)', error.message);
    await Promise.all([
      copyFile('public/js/app.js', path.join(distDir, 'app.min.js')),
      copyFile('public/js/profile-modal.js', path.join(distDir, 'profile-modal.min.js'))
    ]);
    return;
  }

  const { build } = esbuild;

  const commonOptions = {
    minify: true,
    bundle: false,
    target: 'es2019',
    legalComments: 'none',
    platform: 'browser',
    logLevel: 'info'
  };

  await Promise.all([
    build({
      entryPoints: ['public/js/app.js'],
      outfile: 'public/dist/app.min.js',
      format: 'iife',
      ...commonOptions
    }),
    build({
      entryPoints: ['public/js/profile-modal.js'],
      outfile: 'public/dist/profile-modal.min.js',
      format: 'iife',
      ...commonOptions
    })
  ]);
}

buildScripts().catch((error) => {
  console.error('Échec de la minification JS', error);
  process.exitCode = 1;
});

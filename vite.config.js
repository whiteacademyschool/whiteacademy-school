import { readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const pages = Object.fromEntries(
  readdirSync(rootDir)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [basename(file, '.html'), resolve(rootDir, file)]),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: pages,
    },
  },
});

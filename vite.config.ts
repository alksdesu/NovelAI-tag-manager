import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    solidPlugin(),
    // vite-plugin-monkey MUST be the last plugin
    monkey({
      entry: 'src/index.tsx',
      userscript: {
        name: 'NovelAI Tag Maestro',
        namespace: 'https://github.com/Alks0/NovelAI-tag-manager',
        version: '2.0.0',
        description: 'Premium tag management for NovelAI image generation',
        author: 'Alks',
        match: ['https://novelai.net/image*'],
        grant: [
          'GM_addStyle',
          'GM_xmlhttpRequest',
          'GM_registerMenuCommand',
          'GM_getValue',
          'GM_setValue',
          'GM_deleteValue',
        ],
        connect: [
          'translate.googleapis.com',
          'safebooru.donmai.us',
          'danbooru.donmai.us',
          'cdn.donmai.us',
          'raw.githubusercontent.com',
          'api.openai.com',
          'generativelanguage.googleapis.com',
          '127.0.0.1',
          '*',
        ],
      },
    }),
  ],
});

import { loader } from '@monaco-editor/react';

// Configure Monaco loader to use official jsDelivr CDN vs distribution
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs',
  },
});

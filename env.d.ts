/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // otras variables de entorno...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

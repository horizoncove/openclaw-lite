/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOW_OFFLINE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

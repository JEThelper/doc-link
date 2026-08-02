/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_KEEP_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

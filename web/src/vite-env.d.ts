interface ImportMetaEnv {
  /** `off` turns the development mock API off; `on` builds it in (the e2e build only). */
  readonly VITE_API_MOCKS?: 'on' | 'off';
  /** OAuth web client ID from Google Cloud (project PeopleMap). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** True when the mock API is built in (development, e2e). Defined in vite.config.ts. */
declare const __API_MOCKS__: boolean;

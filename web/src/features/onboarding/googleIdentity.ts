/**
 * Google Identity Services (the "Sign in with Google" button). Google's script renders its own
 * button and hands back an ID token (JWT); the server verifies it at POST /auth/google.
 * No redirect and no client secret: the page only ever sees the token.
 */

interface CredentialResponse {
  credential: string;
}

interface ButtonOptions {
  type: 'standard';
  theme: 'outline' | 'filled_black';
  size: 'large';
  shape: 'pill';
  text: 'continue_with';
  width: number;
}

interface GoogleId {
  initialize(options: { client_id: string; callback: (response: CredentialResponse) => void }): void;
  renderButton(parent: HTMLElement, options: ButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const scriptUrl = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleId> | undefined;

/** Loads Google's script once; later calls share the same promise. */
export function loadGoogleIdentity(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts.id;
      if (id) resolve(id);
      else reject(new Error('Google sign-in did not load'));
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Google sign-in did not load'));
    };
    document.head.append(script);
  });
  return loading;
}

/** Google's button tops out at 400px wide. */
export const maxButtonWidth = 400;

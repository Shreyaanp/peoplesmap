import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens/fonts.css';
import './tokens/tokens.css';
import './tokens/motion.css';
import './app/global.css';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

/** In development the mock API answers /api/v1 until the Spring Boot server exists. */
async function startMocks(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKS === 'off') return;
  const { startMockApi } = await import('./mocks/browser');
  await startMockApi();
}

void startMocks().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens/fonts.css';
import './tokens/tokens.css';
import './tokens/motion.css';
import './app/global.css';
import { App } from './app/App';
import { mocksEnabled } from './app/config';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

/** In development (and the e2e build) the mock API answers /api/v1 until the Spring Boot server exists. */
async function startMocks(): Promise<void> {
  if (!mocksEnabled) return;
  const { startMockApi } = await import('@mocks');
  await startMockApi();
}

void startMocks().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

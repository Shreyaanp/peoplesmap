import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens/fonts.css';
import './tokens/tokens.css';
import './tokens/motion.css';
import './app/global.css';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

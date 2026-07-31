import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './i18n';
import './lib/settings';
import './index.css';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost, so a crash anywhere still renders a recovery card. */}
    <ErrorBoundary>
      {/* HashRouter keeps deep links working on static hosts with no server. */}
      <AuthProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

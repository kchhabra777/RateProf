import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Toaster } from 'sonner';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';
import { setupServiceWorker } from './pwa';

setupServiceWorker();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bWFueS1saW9uZmlzaC03NDE3LmNsZXJrLmFjY291bnRzLmRldiQ';

const CLERK_LOCALIZATION = {
  signIn: {
    start: {
      subtitle: 'Official @thapar.edu university accounts only',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={CLERK_LOCALIZATION}>
        <AuthProvider>
          <App />
          <Toaster theme="dark" richColors closeButton position="bottom-right" />
          <SpeedInsights />
        </AuthProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthGate } from './AuthModule.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      {({ user, onLogout }) => <App currentUser={user} onLogout={onLogout} />}
    </AuthGate>
  </StrictMode>,
);

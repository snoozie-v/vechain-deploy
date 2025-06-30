import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { VeChainContextProvider } from './context/VeChainContextProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VeChainContextProvider>
      <App />
    </VeChainContextProvider>
  </StrictMode>,
);

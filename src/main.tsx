import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // L'application est prête pour une utilisation hors-ligne sur le terrain
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);

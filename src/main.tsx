import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Early global Google Maps Platform Case A Quota Defense listeners
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

function dispatchGmpQuotaExceeded(reason: string): void {
  window.dispatchEvent(
    new CustomEvent('gmp-quota-exceeded', {
      detail: { reason },
    })
  );
}

window.gm_authFailure = () => {
  dispatchGmpQuotaExceeded('gm_authFailure');
};

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  try {
    const joined = args
      .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : String(a)))
      .join(' ');
    if (
      joined.includes('OverQuotaMapError') ||
      joined.includes('QuotaExceededError') ||
      joined.includes('OVER_QUERY_LIMIT')
    ) {
      dispatchGmpQuotaExceeded(joined);
    }
  } catch {
    // Ignore listener parsing errors
  }
  originalConsoleError(...args);
};

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // L'application est prête pour une utilisation hors-ligne sur le terrain
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);

import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import App from './App';

// Buttons that are busy or unavailable use aria-disabled instead of disabled:
// a disabled button drops the keyboard focus (WCAG 2.4.3). They stay
// focusable, so their clicks, keyboard ones included, stop here.
document.addEventListener(
  'click',
  (event) => {
    if (event.target instanceof Element && event.target.closest('[aria-disabled="true"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(<App />);

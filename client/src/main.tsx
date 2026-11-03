import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './alerts';
import './breaks';

createRoot(document.getElementById('root')!).render(<App />);

// handy for debugging in the browser console and for automated tests (dev only: keeps the first download small)
import { useStore } from './store';
(window as any).__pw = useStore;
if (import.meta.env.DEV) import('./net').then((net) => { (window as any).__pwNet = net; });

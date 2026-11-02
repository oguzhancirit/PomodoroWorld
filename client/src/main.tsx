import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// handy for debugging in the browser console and for automated tests
import { useStore } from './store';
(window as any).__pw = useStore;
import * as net from './net';
(window as any).__pwNet = net;

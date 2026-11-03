import { useEffect, lazy, Suspense } from 'react';
import { useStore } from './store';
import { SafeCanvas } from './ui/SafeCanvas';
import { refreshWallet } from './economy';
import { startScreen } from './account';
import { Login } from './ui/Login';

// the sign-in page must open fast: the 3D room, the character screen and the study room load only when needed
const Lobby = lazy(() => import('./ui/Lobby').then((m) => ({ default: m.Lobby })));
const HomeRoom = lazy(() => import('./home/HomeRoom').then((m) => ({ default: m.HomeRoom })));
const StudyRoom = lazy(() => import('./StudyRoom').then((m) => ({ default: m.StudyRoom })));
const visitHome = (c: string) => import('./net').then((m) => m.visitHome(c));
// pick the first screen before the first draw (signed in: your room, a new player: the film then the character
// screen; otherwise the sign-in page), so nothing heavy starts loading for a screen that is never shown
if (new URLSearchParams(location.search).has('home')) useStore.getState().set({ screen: 'home' }); else startScreen();

/** while a screen is still downloading: the same dark background with a small pulsing dot */
const Loading = () => <div className="screen-loading" role="status" aria-label="Yükleniyor"><span /></div>;

// an invite link (#oda-CODE) opens the friend's room once you are in the game
let pendingInvite = '';
const takeInvite = () => { if (location.hash.startsWith('#oda-')) { pendingInvite = location.hash.slice(5); history.replaceState(null, '', location.pathname + location.search); } };

export function App() {
  useEffect(() => {
    refreshWallet();
    takeInvite();
    const onHash = () => { takeInvite(); if (pendingInvite && useStore.getState().screen === 'home') { visitHome(pendingInvite); pendingInvite = ''; } };
    addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash);
  }, []);
  const screen = useStore((s) => s.screen);
  useEffect(() => { if (screen === 'home' && pendingInvite) { const c = pendingInvite; pendingInvite = ''; setTimeout(() => visitHome(c), 300); } }, [screen]);
  if (screen === 'login') return <Login />;
  return (
    <Suspense fallback={<Loading />}>
      {screen === 'home' ? <SafeCanvas label="Odan bu cihazda açılamadı (3D desteklenmiyor)."><HomeRoom /></SafeCanvas>
        : screen === 'room' ? <StudyRoom /> : <Lobby />}
    </Suspense>
  );
}

import { useEffect } from 'react';
import { useStore } from './store';
import { Lobby } from './ui/Lobby';
import { RoomUI } from './ui/RoomUI';
import { StudyScene } from './scene/StudyScene';
import { TagLayer } from './ui/Tags';
import { SafeCanvas } from './ui/SafeCanvas';
import { refreshWallet } from './economy';
import { HomeRoom } from './home/HomeRoom';
import { visitHome } from './net';
import { startScreen } from './account';
import { Login } from './ui/Login';

// an invite link (#oda-CODE) opens the friend's room once you are in the game
let pendingInvite = '';
const takeInvite = () => { if (location.hash.startsWith('#oda-')) { pendingInvite = location.hash.slice(5); history.replaceState(null, '', location.pathname + location.search); } };

export function App() {
  useEffect(() => {
    // signed in: your room (a new player: the film, then the character screen); otherwise the sign-in page
    if (new URLSearchParams(location.search).has('home')) useStore.getState().set({ screen: 'home' }); else startScreen();
    refreshWallet();
    takeInvite();
    const onHash = () => { takeInvite(); if (pendingInvite && useStore.getState().screen === 'home') { visitHome(pendingInvite); pendingInvite = ''; } };
    addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash);
  }, []);
  const screen = useStore((s) => s.screen);
  useEffect(() => { if (screen === 'home' && pendingInvite) { const c = pendingInvite; pendingInvite = ''; setTimeout(() => visitHome(c), 300); } }, [screen]);
  if (screen === 'login') return <Login />;
  if (screen === 'home') return <SafeCanvas label="Odan bu cihazda açılamadı (3D desteklenmiyor)."><HomeRoom /></SafeCanvas>;
  return screen === 'room' ? (
    <div className="room-screen">
      <SafeCanvas label="3D oda bu cihazda açılamadı. Sayaç ve sohbet çalışmaya devam ediyor."><StudyScene /></SafeCanvas>
      <TagLayer />
      <RoomUI />
    </div>
  ) : <Lobby />;
}

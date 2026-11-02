import { useEffect } from 'react';
import { useStore } from './store';
import { Lobby } from './ui/Lobby';
import { RoomUI } from './ui/RoomUI';
import { StudyScene } from './scene/StudyScene';
import { TagLayer } from './ui/Tags';
import { SafeCanvas } from './ui/SafeCanvas';
import { refreshWallet } from './economy';
import { HomeRoom } from './home/HomeRoom';

export function App() {
  useEffect(() => {
    if (new URLSearchParams(location.search).has('home')) useStore.getState().set({ screen: 'home' });
    refreshWallet();
  }, []);
  const screen = useStore((s) => s.screen);
  if (screen === 'home') return <SafeCanvas label="Odan bu cihazda açılamadı (3D desteklenmiyor)."><HomeRoom /></SafeCanvas>;
  return screen === 'room' ? (
    <div className="room-screen">
      <SafeCanvas label="3D oda bu cihazda açılamadı. Sayaç ve sohbet çalışmaya devam ediyor."><StudyScene /></SafeCanvas>
      <TagLayer />
      <RoomUI />
    </div>
  ) : <Lobby />;
}

import { useStore } from './store';
import { Lobby } from './ui/Lobby';
import { RoomUI } from './ui/RoomUI';
import { StudyScene } from './scene/StudyScene';
import { TagLayer } from './ui/Tags';
import { SafeCanvas } from './ui/SafeCanvas';

export function App() {
  const screen = useStore((s) => s.screen);
  return screen === 'room' ? (
    <div className="room-screen">
      <SafeCanvas label="3D oda bu cihazda açılamadı. Sayaç ve sohbet çalışmaya devam ediyor."><StudyScene /></SafeCanvas>
      <TagLayer />
      <RoomUI />
    </div>
  ) : <Lobby />;
}

import { useStore } from './store';
import { Lobby } from './ui/Lobby';
import { RoomUI } from './ui/RoomUI';
import { StudyScene } from './scene/StudyScene';
import { TagLayer } from './ui/Tags';

export function App() {
  const screen = useStore((s) => s.screen);
  return screen === 'room' ? (
    <div className="room-screen">
      <StudyScene />
      <TagLayer />
      <RoomUI />
    </div>
  ) : <Lobby />;
}

// The old shared study room screen (3D scene + name tags + timer/chat), split off so it loads only when used.
import { RoomUI } from './ui/RoomUI';
import { StudyScene } from './scene/StudyScene';
import { TagLayer } from './ui/Tags';
import { SafeCanvas } from './ui/SafeCanvas';

export function StudyRoom() {
  return (
    <div className="room-screen">
      <SafeCanvas label="3D oda bu cihazda açılamadı. Sayaç ve sohbet çalışmaya devam ediyor."><StudyScene /></SafeCanvas>
      <TagLayer />
      <RoomUI />
    </div>
  );
}

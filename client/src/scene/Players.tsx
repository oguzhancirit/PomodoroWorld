import { Suspense, memo } from 'react';
import { STUDY_ROOM } from '@pw/shared';
import { Avatar, type Motion } from '../avatar/Avatar';
import { useStore, type PlayerView } from '../store';


export function Players() {
  const players = useStore((s) => s.players);
  return <>{Object.values(players).map((p) => <SeatedPlayer key={p.id} p={p} />)}</>;
}

const SeatedPlayer = memo(function SeatedPlayer({ p }: { p: PlayerView }) {
  const phase = useStore((s) => s.timer.phase);
  const seat = STUDY_ROOM.seats[p.seatIndex];
  if (!seat) return null;
  // what the body does: desk work while the room focuses, chatting or relaxing in breaks
  const motion: Motion = phase === 'focus' ? (p.activity as Motion) : p.bubble ? 'talk' : 'sit';
  return (
    <group position={seat.pos} rotation-y={seat.rotY}>
      <Suspense fallback={null}>
        <Avatar code={p.avatar} motion={motion} ghost={!p.connected} />
      </Suspense>
    </group>
  );
});

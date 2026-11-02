// Name tags and chat bubbles live in ONE plain DOM layer over the canvas (cheaper than a React root per
// player). The 3D side only projects each seat's head position to the screen every frame.
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { STUDY_ROOM } from '@pw/shared';
import { useStore } from '../store';

export const tagEls = new Map<string, HTMLElement>();
const v = new THREE.Vector3();

export function TagProjector() {
  const { camera, size } = useThree();
  useFrame(() => {
    const players = useStore.getState().players;
    for (const [id, el] of tagEls) {
      const p = players[id]; const seat = p && STUDY_ROOM.seats[p.seatIndex];
      if (!seat) { el.style.display = 'none'; continue; }
      v.set(seat.pos[0], seat.pos[1] + 1.42, seat.pos[2]).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.display = visible ? '' : 'none';
      if (!visible) continue;
      const x = (v.x * 0.5 + 0.5) * size.width, y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.zIndex = String(1000 - Math.round(v.z * 900));
    }
  });
  return null;
}

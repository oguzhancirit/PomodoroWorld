import { use, useMemo, useState } from 'react';
import * as THREE from 'three';
import { STUDY_ROOM, DESK } from '@pw/shared';
import { loadFurniture, piece } from '../avatar/assets';
import { fitTo, plankTexture, plasterTexture } from './util';

const W = STUDY_ROOM.size.w, D = STUDY_ROOM.size.d, H = 3.4;

/** Floor, walls, windows and decoration of the shared study room (KayKit Furniture Bits, CC0). */
export function RoomShell() {
  const g = use(loadFurniture());
  const floorTex = useMemo(() => { const t = plankTexture(); t.repeat.set(W / 2.2, D / 2.2); return t; }, []);
  const wallTex = useMemo(() => { const t = plasterTexture(); t.repeat.set(4, 1.5); return t; }, []);
  const decor = useMemo(() => {
    const out: THREE.Object3D[] = [];
    const put = (name: string, pos: [number, number, number], rotY = 0, size: [number | null, number | null, number | null] = [null, null, null]) => {
      const o = fitTo(piece(g, name), ...size); o.position.set(...pos); o.rotation.y = rotY; out.push(o);
    };
    // shelves and plants along the side walls
    put('shelf_B_large_decorated', [-W / 2 + 0.02, 1.25, -3.0], Math.PI / 2, [1.8, null, null]);
    put('shelf_B_large_decorated', [-W / 2 + 0.02, 1.25, 0.2], Math.PI / 2, [1.8, null, null]);
    put('shelf_B_small_decorated', [W / 2 - 0.02, 1.3, -3.0], -Math.PI / 2, [1.0, null, null]);
    put('cabinet_medium_decorated', [W / 2 - 0.3, 0, -0.4], -Math.PI / 2, [1.4, null, null]);
    put('cactus_medium_A', [-W / 2 + 0.55, 0, 2.2], 0, [null, 0.85, null]);
    put('cactus_medium_A', [W / 2 - 0.55, 0, -4.9], 0, [null, 0.9, null]);
    put('lamp_standing', [W / 2 - 0.6, 0, 1.6], 0, [null, 1.9, null]);
    put('lamp_standing', [-W / 2 + 0.6, 0, -5.0], 0, [null, 1.9, null]);
    put('couch_pillows', [W / 2 - 0.6, 0, 3.4], -Math.PI / 2, [2.4, null, null]);
    put('table_low', [W / 2 - 1.75, 0, 3.4], Math.PI / 2, [1.1, 0.4, 0.7]);
    put('rug_rectangle_stripes_A', [0, 0.003, 0.9], 0, [11.0, 0.02, 8.2]);
    put('pictureframe_large_A', [-W / 2 + 0.06, 1.8, 3.6], Math.PI / 2, [null, 0.9, null]);
    put('pictureframe_large_B', [W / 2 - 0.06, 1.9, -2.0], -Math.PI / 2, [null, 0.8, null]);
    return out;
  }, [g]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floorTex} roughness={0.78} />
      </mesh>
      {/* back wall with three tall windows */}
      <BackWall tex={wallTex} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, H / 2, 0]} rotation-y={-s * Math.PI / 2} receiveShadow>
          <planeGeometry args={[D, H]} />
          <meshStandardMaterial map={wallTex} color="#efe4d4" roughness={0.95} />
        </mesh>
      ))}
      {/* skirting boards */}
      {[[0, -D / 2 + 0.03, 0, W], [-W / 2 + 0.03, 0, Math.PI / 2, D], [W / 2 - 0.03, 0, Math.PI / 2, D]].map(([x, z, r, len], i) => (
        <mesh key={i} position={[x as number, 0.06, z as number]} rotation-y={r as number} castShadow>
          <boxGeometry args={[len as number, 0.12, 0.04]} />
          <meshStandardMaterial color="#6e4b33" roughness={0.6} />
        </mesh>
      ))}
      {decor.map((o, i) => <primitive key={i} object={o} />)}
    </group>
  );
}

function BackWall({ tex }: { tex: THREE.Texture }) {
  const wins = [-4, 0, 4];
  const shape = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.lineTo(-W / 2, 0);
    for (const x of wins) { const h = new THREE.Path(); h.moveTo(x - 1.1, 0.95); h.lineTo(x + 1.1, 0.95); h.lineTo(x + 1.1, 2.75); h.lineTo(x - 1.1, 2.75); h.lineTo(x - 1.1, 0.95); s.holes.push(h); }
    return s;
  }, []);
  return (
    <group position={[0, 0, -D / 2]}>
      <mesh receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial map={tex} color="#f1e7d8" roughness={0.95} />
      </mesh>
      {wins.map((x) => (
        <group key={x} position={[x, 1.85, 0]}>
          {/* sky behind the glass */}
          <mesh position={[0, 0, -0.6]}><planeGeometry args={[3.2, 2.6]} /><meshBasicMaterial color="#bfe0f5" toneMapped={false} /></mesh>
          <mesh position={[0, -0.5, -0.55]}><planeGeometry args={[3.2, 1.0]} /><meshBasicMaterial color="#9cc58a" toneMapped={false} /></mesh>
          {/* frame */}
          {[[0, 0.92, 2.3, 0.08], [0, -0.92, 2.4, 0.12], [-1.12, 0, 0.08, 1.9], [1.12, 0, 0.08, 1.9], [0, 0, 0.05, 1.8], [0, 0.1, 2.2, 0.04]].map(([fx, fy, w, h], i) => (
            <mesh key={i} position={[fx, fy, 0.03]} castShadow><boxGeometry args={[w, h, 0.08]} /><meshStandardMaterial color="#f7f3ec" roughness={0.5} /></mesh>
          ))}
          <mesh position={[0, -0.97, 0.12]}><boxGeometry args={[2.5, 0.05, 0.26]} /><meshStandardMaterial color="#f7f3ec" roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Desk + chair + lamp for every seat. Props on the desk depend on what the sitter works on. */
export function Desks({ occupied, onPick }: { occupied: Record<number, string>; onPick: (seat: number) => void }) {
  const g = use(loadFurniture());
  const models = useMemo(() => STUDY_ROOM.seats.map(() => ({
    desk: fitTo(piece(g, 'table_medium'), DESK.w, DESK.h, DESK.d),
    chair: fitTo(piece(g, 'chair_A_wood'), null, 0.92, null),
    lamp: fitTo(piece(g, 'lamp_table'), null, 0.42, null),
    books: fitTo(piece(g, 'book_set'), null, 0.2, null),
  })), [g]);
  return (
    <>
      {STUDY_ROOM.seats.map((s, i) => (
        <group key={i}>
          <group position={s.desk}>
            <primitive object={models[i].desk} />
            <primitive object={models[i].lamp} position={[DESK.w / 2 - 0.16, DESK.h, -DESK.d / 2 + 0.14]} />
            <primitive object={models[i].books} position={[-DESK.w / 2 + 0.16, DESK.h, -DESK.d / 2 + 0.16]} rotation-y={0.3} />
            <DeskProp kind={occupied[i] ?? ''} />
          </group>
          <group position={s.pos} rotation-y={s.rotY}>
            <primitive object={models[i].chair} position={[0, 0, -0.1]} />
            {!occupied[i] && <SeatPicker onPick={() => onPick(i)} />}
          </group>
        </group>
      ))}
    </>
  );
}

function SeatPicker({ onPick }: { onPick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); onPick(); }}>
      <ringGeometry args={[0.32, 0.42, 40]} />
      <meshBasicMaterial color={hover ? '#ff8466' : '#ffffff'} transparent opacity={hover ? 0.9 : 0.25} />
    </mesh>
  );
}

/** laptop for typing, notebook + pencil for writing, open book for reading (desk local space, sitter on +Z side) */
function DeskProp({ kind }: { kind: string }) {
  const z = DESK.d / 2 - 0.2, y = DESK.h;
  if (kind === 'type') return (
    <group position={[0, y, z]}>
      <mesh position={[0, 0.01, 0]} castShadow><boxGeometry args={[0.34, 0.02, 0.24]} /><meshStandardMaterial color="#b9bec8" metalness={0.4} roughness={0.35} /></mesh>
      <mesh position={[0, 0.13, -0.12]} rotation-x={-0.25} castShadow><boxGeometry args={[0.34, 0.24, 0.015]} /><meshStandardMaterial color="#9aa0aa" metalness={0.4} roughness={0.35} /></mesh>
      <mesh position={[0, 0.13, -0.111]} rotation-x={-0.25}><planeGeometry args={[0.31, 0.2]} /><meshBasicMaterial color="#7fb6ff" toneMapped={false} /></mesh>
    </group>
  );
  if (kind === 'write') return (
    <group position={[0, y + 0.006, z]}>
      <mesh rotation-y={0.12} receiveShadow><boxGeometry args={[0.24, 0.012, 0.32]} /><meshStandardMaterial color="#f8f5ee" roughness={0.9} /></mesh>
      <mesh position={[0.06, 0.012, 0.02]} rotation={[0, 0.6, Math.PI / 2]}><cylinderGeometry args={[0.006, 0.006, 0.16, 6]} /><meshStandardMaterial color="#f2c14e" /></mesh>
    </group>
  );
  if (kind === 'read') return (
    // an open book held up between the hands, tilted toward the reader's face
    <group position={[0, y + 0.17, DESK.d / 2 - 0.12]} rotation-x={-1.05}>
      {[-1, 1].map((sd) => (
        <group key={sd} rotation-y={sd * 0.18}>
          <mesh position={[sd * 0.075, 0, 0]} castShadow><boxGeometry args={[0.15, 0.2, 0.012]} /><meshStandardMaterial color="#fbf7ee" roughness={0.9} /></mesh>
          <mesh position={[sd * 0.075, 0, -0.008]}><boxGeometry args={[0.155, 0.205, 0.006]} /><meshStandardMaterial color="#3e7cb1" roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
  return null;
}

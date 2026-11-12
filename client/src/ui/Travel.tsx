// Leaving a room (user, 2026-11-03): your own character walks over a small turning planet while the next place
// loads, so going out into the world feels like a trip, not a page swap.
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { encodeAvatar } from '@pw/shared';
import { Avatar } from '../avatar/Avatar';
import { useStore } from '../store';

export const useTravel = create<{ to: string | null }>(() => ({ to: null }));
if (new URLSearchParams(location.search).has('trip')) (window as unknown as { __travel: unknown }).__travel = useTravel; // screenshots only
const MIN_MS = 1700;

/** show the trip while `job` runs (at least long enough to see the walk); returns the job's result */
export async function travel<T>(to: string, job: Promise<T>): Promise<T> {
  useTravel.setState({ to });
  const t0 = Date.now();
  try {
    const r = await job;
    const wait = MIN_MS - (Date.now() - t0);
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    return r;
  } finally { useTravel.setState({ to: null }); }
}

/** oceans, land and a few towns, painted once */
function planetTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3d8fd1'; g.fillRect(0, 0, 512, 256);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const blob = (x: number, y: number, r: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, rr = r * (0.7 + rnd() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
    g.fill();
  };
  for (let i = 0; i < 14; i++) { const x = rnd() * 512, y = 40 + rnd() * 176, r = 18 + rnd() * 34; blob(x, y, r, '#5dbb63'); blob(x + 6, y + 4, r * 0.6, '#4aa553'); if (rnd() > 0.5) blob(x - 4, y - 2, r * 0.3, '#e9d79a'); }
  g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

function Planet() {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(planetTexture, []);
  // little trees and houses that roll past
  const props = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2 + (i % 3) * 0.1, z: ((i * 37) % 7) / 10 - 0.3, kind: i % 3 })), []);
  useFrame((_, dt) => { if (g.current) g.current.rotation.z += dt * 0.32; });
  return (
    <group ref={g} position={[0, -2.05, 0]}>
      <mesh receiveShadow><sphereGeometry args={[2, 48, 32]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
      {props.map((p, i) => (
        <group key={i} rotation={[0, 0, p.a]}>
          <group position={[0, 2, p.z]}>
            {p.kind === 0 && <><mesh position={[0, 0.12, 0]}><coneGeometry args={[0.1, 0.26, 7]} /><meshStandardMaterial color="#2f8a4a" /></mesh><mesh position={[0, -0.01, 0]}><cylinderGeometry args={[0.025, 0.025, 0.06]} /><meshStandardMaterial color="#7a5233" /></mesh></>}
            {p.kind === 1 && <><mesh position={[0, 0.06, 0]}><boxGeometry args={[0.16, 0.12, 0.14]} /><meshStandardMaterial color="#f2e6d0" /></mesh><mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.13, 0.09, 4]} /><meshStandardMaterial color="#c9553d" /></mesh></>}
            {p.kind === 2 && <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#5dbb63" /></mesh>}
          </group>
        </group>
      ))}
    </group>
  );
}

export function TravelScreen() {
  const to = useTravel((s) => s.to);
  const avatar = useStore((s) => s.profile.avatar);
  if (!to) return null;
  return (
    <div className="travel" role="status" aria-live="polite">
      <div className="travel-stage">
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0.9, 4.2], fov: 34 }} onCreated={({ gl, camera }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; camera.lookAt(0, 0.35, 0); }}>
          <hemisphereLight args={['#fff4e6', '#3b3f6b', 1.5]} />
          <directionalLight position={[2, 4, 3]} intensity={2.2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#ffb3a1" />
          <Planet />
          <Suspense fallback={null}>
            {/* walks to the right, the planet turns under the feet */}
            <group rotation={[0, Math.PI / 2, 0]} position={[0, -0.05, 0]} scale={0.62}><Avatar code={encodeAvatar(avatar)} motion="walk" /></group>
          </Suspense>
        </Canvas>
      </div>
      <p className="travel-to">{to}</p>
      <span className="travel-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

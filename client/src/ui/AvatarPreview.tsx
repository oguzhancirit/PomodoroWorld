import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar, type Motion } from '../avatar/Avatar';

/** drag the character round, all the way (user 2026-11-04: "360 dönebilsin"); left alone it sways gently, face to you */
const spin = { angle: 0, dragging: false, touched: 0 };
function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    // a few seconds after letting go it eases back to the front and sways again
    if (!spin.dragging && clock.elapsedTime - spin.touched > 3) {
      const front = Math.round(spin.angle / (Math.PI * 2)) * Math.PI * 2 + Math.sin(clock.elapsedTime * 0.5) * 0.45;
      spin.angle += (front - spin.angle) * Math.min(1, dt * 2.5);
    }
    if (spin.dragging) spin.touched = clock.elapsedTime;
    g.current.rotation.y = spin.angle;
  });
  return <group ref={g}>{children}</group>;
}

/** pointer handlers for the box around the canvas: horizontal drag turns the character */
export function useSpinDrag() {
  const last = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { last.current = e.clientX; spin.dragging = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { if (last.current == null) return; spin.angle += (e.clientX - last.current) * 0.012; last.current = e.clientX; },
    onPointerUp: () => { last.current = null; spin.dragging = false; },
    onPointerCancel: () => { last.current = null; spin.dragging = false; },
  };
}

/** Live 3D preview of the avatar being designed in the lobby. */
export function AvatarPreview({ code, motion }: { code: string; motion: Motion }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 1.05, 4.0], fov: 32 }} shadows
      onCreated={({ gl, camera }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; camera.lookAt(0, 0.9, 0); }}>
      <hemisphereLight args={['#fff4e6', '#5b4a66', 1.6]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={1.1} color="#ffb3a1" />
      <Suspense fallback={null}>
        <Turntable><Avatar code={code} motion={motion} /></Turntable>
      </Suspense>
      <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={4} blur={2.2} far={1.5} />
    </Canvas>
  );
}

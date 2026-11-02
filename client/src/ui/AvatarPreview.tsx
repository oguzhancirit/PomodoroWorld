import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar, type Motion } from '../avatar/Avatar';

function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.35; });
  return <group ref={g}>{children}</group>;
}

/** Live 3D preview of the avatar being designed in the lobby. */
export function AvatarPreview({ code, motion }: { code: string; motion: Motion }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 1.15, 3.4], fov: 32 }} shadows
      onCreated={({ gl, camera }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; camera.lookAt(0, 0.85, 0); }}>
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

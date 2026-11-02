import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoomShell, Desks } from './Room';
import { Players } from './Players';
import { TagProjector } from './tags';
import { useStore } from '../store';
import { sendSit } from '../net';

/** soft indoor reflections without downloading an HDR file */
function LocalEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env; scene.environmentIntensity = 0.35;
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Lights() {
  const sun = useMemo(() => {
    const l = new THREE.DirectionalLight('#fff1dc', 2.4);
    l.position.set(-3, 7, -9); l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.03;
    Object.assign(l.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: 1, far: 30 });
    l.target.position.set(0, 0, 1); return l;
  }, []);
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#7a6450', 1.15]} />
      <primitive object={sun} /><primitive object={sun.target} />
      <pointLight position={[0, 2.9, 1]} intensity={6} distance={12} color="#ffd9a8" />
    </>
  );
}

// light mode for weak devices (and automated tests): no shadows, 1x pixel ratio
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const LITE = Q.has('lite');
// ?cam=x,y,z,tx,ty,tz places the camera (used for screenshots while developing)
const CAM = (Q.get('cam') || '').split(',').map(Number);
// portrait phones need a higher, farther camera to fit the 3 rows of desks
const NARROW = typeof innerWidth !== 'undefined' && innerWidth / innerHeight < 0.8;
const CAM_POS: [number, number, number] = CAM.length === 6 ? [CAM[0], CAM[1], CAM[2]] : NARROW ? [2.5, 13, 14] : [7.5, 7, 10.5];
const CAM_TGT: [number, number, number] = CAM.length === 6 ? [CAM[3], CAM[4], CAM[5]] : [0, 0.8, 0.6];

export function StudyScene() {
  const players = useStore((s) => s.players);
  const occupied = useMemo(() => Object.fromEntries(Object.values(players).map((p) => [p.seatIndex, p.activity])), [players]);
  return (
    <Canvas shadows={!LITE} dpr={LITE ? 1 : [1, 1.75]} camera={{ position: CAM_POS, fov: 38 }} gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
      <color attach="background" args={['#1b1828']} />
      <fog attach="fog" args={['#1b1828', 22, 40]} />
      <LocalEnvironment />
      <Lights />
      <Suspense fallback={null}>
        <RoomShell />
        <Desks occupied={occupied} onPick={(i) => sendSit(i)} />
      </Suspense>
      <Players />
      <TagProjector />
      {!LITE && <ContactShadows position={[0, 0.01, 0.8]} scale={[14, 11]} opacity={0.35} blur={2.4} far={2} resolution={512} />}
      <OrbitControls target={CAM_TGT} maxPolarAngle={Math.PI / 2.25} minPolarAngle={0.35} minDistance={CAM.length === 6 ? 0.5 : 4} maxDistance={NARROW ? 24 : 17} enablePan={false} />
    </Canvas>
  );
}

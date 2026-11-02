import { use, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { decodeAvatar } from '@pw/shared';
import { loadRig, buildAvatar, disposeAvatar } from './assets';

export type Motion = 'idle' | 'walk' | 'wave' | 'sit' | 'talk' | 'type' | 'write' | 'read' | 'dance';
const CLIP: Record<Motion, string> = { idle: 'Idle', walk: 'Walk', wave: 'Wave', sit: 'Sit', talk: 'SitTalk', type: 'SitType', write: 'SitWrite', read: 'SitRead', dance: 'Dance' };

/** One animated character. `code` is the short avatar code from the room state. */
export function Avatar({ code, motion, ghost = false }: { code: string; motion: Motion; ghost?: boolean }) {
  const g = decodeAvatar(code).g;
  const rig = use(loadRig(g));
  const built = useMemo(() => buildAvatar(rig, code), [rig, code]);
  const mixer = useMemo(() => new THREE.AnimationMixer(built.root), [built]);
  const current = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => () => { mixer.stopAllAction(); disposeAvatar(built.root); }, [mixer, built]);

  useEffect(() => {
    const clip = rig.clips[CLIP[motion]] ?? rig.clips.Sit; if (!clip) return;
    const next = mixer.clipAction(clip);
    if (current.current === next) return;
    next.reset().setEffectiveWeight(1);
    // different players should not move in lockstep
    next.time = Math.random() * clip.duration;
    next.fadeIn(0.35).play();
    current.current?.fadeOut(0.35);
    current.current = next;
  }, [motion, mixer, rig]);

  useEffect(() => {
    built.root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => { x.transparent = ghost; x.opacity = ghost ? 0.45 : 1; }); });
  }, [ghost, built]);

  useFrame((_, dt) => mixer.update(Math.min(dt, 0.1)));
  return <primitive object={built.root} />;
}

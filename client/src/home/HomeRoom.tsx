import { useEffect, useRef } from 'react';
import { PW } from '../legacy';

/** The personal room, drawn by the original room engine. */
export function HomeRoom() {
  const host = useRef<HTMLDivElement>(null), tags = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const w = new PW.World(host.current, tags.current, { quality: new URLSearchParams(location.search).has('lite') ? 'low' : 'high' });
    (window as any).__world = w;
    const def = { ...PW.DEFAULT_ROOM(), items: [
      { id: 'f_desk_wood', x: 0.2, z: -1.15, r: 0 }, { id: 'f_chair_wood', x: 0.2, z: -1.9, r: 0 }, { id: 'f_bookshelf', x: -3.25, z: -0.8, r: 1 },
      { id: 'f_rug_round', x: 0.2, z: -1.3, r: 0 }, { id: 'd_lamp', x: -0.3, z: -0.95, r: 2 }, { id: 'f_monstera', x: -2.9, z: -2.9, r: 0 }, { id: 'f_lamp_floor', x: 2.9, z: -2.9, r: 0 },
    ] };
    w.loadRoom(def);
    w.addAvatar('me', PW.defaultAvatar('f'), { name: 'Deneme', level: 3, isMe: true });
    w.sitAvatar('me', 0);
    return () => { w.renderer.dispose(); w.renderer.domElement.remove(); };
  }, []);
  return (
    <div className="home-room">
      <div ref={host} className="home-canvas" />
      <div ref={tags} className="home-tags" />
    </div>
  );
}

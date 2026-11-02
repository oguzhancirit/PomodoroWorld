// Compact animation format for the avatar clips: every track is sampled at a fixed frame rate and
// stored as base64 int16 (quaternions ×32767, positions in millimetres). ~5x smaller than JSON clips.
import * as THREE from 'three';

const b64ToI16 = (s) => {
  const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Int16Array(u8.buffer);
};
const i16ToB64 = (a) => {
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
  let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s);
};

/** frames: number of samples; tracks: [{ name: 'Bone.quaternion' | 'Bone.position', values: number[] }] */
export function encodeClip(name, duration, fps, frames, tracks) {
  return {
    n: name, d: +duration.toFixed(4), f: fps, k: frames,
    t: tracks.map((tr) => {
      const q = tr.name.endsWith('.quaternion');
      const s = q ? 32767 : 1000, w = q ? 4 : 3;
      // a bone that holds still for the whole clip is stored once (it is still a pose, e.g. sitting legs)
      let still = true; for (let i = w; i < tr.values.length && still; i++) if (Math.abs(tr.values[i] - tr.values[i % w]) > 1e-3) still = false;
      const vals = still ? tr.values.slice(0, w) : tr.values;
      return [tr.name, i16ToB64(Int16Array.from(vals, (v) => Math.max(-32768, Math.min(32767, Math.round(v * s)))))];
    }),
  };
}

export function decodeClip(c) {
  const times = new Float32Array(c.k); for (let i = 0; i < c.k; i++) times[i] = Math.min(c.d, i / c.f);
  const tracks = c.t.map(([name, b64]) => {
    const q = name.endsWith('.quaternion');
    const raw = b64ToI16(b64), s = q ? 32767 : 1000;
    const vals = Float32Array.from(raw, (v) => v / s);
    if (q) { for (let i = 0; i < vals.length; i += 4) { const l = Math.hypot(vals[i], vals[i + 1], vals[i + 2], vals[i + 3]) || 1; vals[i] /= l; vals[i + 1] /= l; vals[i + 2] /= l; vals[i + 3] /= l; } }
    const tt = vals.length === (q ? 4 : 3) ? [0] : times;
    return q ? new THREE.QuaternionKeyframeTrack(name, tt, vals) : new THREE.VectorKeyframeTrack(name, tt, vals);
  });
  return new THREE.AnimationClip(c.n, c.d, tracks);
}

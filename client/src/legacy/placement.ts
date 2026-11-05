// Easy build mode (user 2026-11-04: "putting things in the room must be comfortable and never force you").
// The old editor said a red "no" when a spot was taken, needed the pointer exactly on a desk or a wall, could only
// move a piece through the "Taşı" button, and on a phone a tap placed at once while a drag moved the camera AND the
// piece. Now:
//  - a piece slides to the nearest free spot (shared `freeSpot`), red only when the whole neighbourhood is full;
//  - desk things jump onto the nearest desk, big pieces back onto a wall, chairs turn to their table;
//  - wall pieces can be aimed at the floor in front of a wall;
//  - placed pieces are simply dragged to a new place (a tap still selects);
//  - phones: the piece appears in the middle, a tap moves it there, dragging it and letting go places it;
//  - a green / red footprint under the piece shows where it will stand.
import { rectOf, freeSpot, onSurface, againstWall, faceTable, wallFromFloor, type Rect } from '@pw/shared';

const PW = (window as any).PW, T = (window as any).THREE, W = PW.World.prototype;
const WALL_T = 0.16;
type Item = { id: string; x?: number; z?: number; r?: number; w?: string; [k: string]: unknown };
type Def = { id: string; wall?: number; top?: number; rug?: number; surface?: number; seat?: number; sub?: string; fp?: number[]; ww?: number; wy?: number };

/** pieces that belong against a wall */
const BACKED = new Set(['f_piano', 'f_fireplace', 'f_aquarium', 'f_record', 'f_console', 'f_sofa', 'f_sofa_l', 'f_desk_wood', 'f_desk_white', 'f_desk_standing', 'f_desk_gaming']);
const backed = (d: Def) => BACKED.has(d.id) || ['Depolama', 'Yatak', 'Mutfak'].includes(d.sub ?? '') || (d as { back?: number }).back === 1;
const isChair = (d: Def) => d.sub === 'Sandalye';
const fpOf = (d: Def): [number, number] => [d.fp?.[0] ?? 0.5, d.fp?.[1] ?? 0.5];
const solid = (d?: Def) => !!d && !d.wall && !d.rug && !d.top;

function others(w: any): Item[] { return (w.items ?? []).filter((_: Item, i: number) => i !== w.edit.skip); }
function tables(w: any) {
  return others(w).flatMap((it) => { const d: Def = PW.ITEM[it.id]; return d?.surface ? [{ ...rectOf(it.x ?? 0, it.z ?? 0, fpOf(d), it.r ?? 0), h: d.surface }] : []; });
}
function blocks(w: any): Rect[] {
  return others(w).flatMap((it) => { const d: Def = PW.ITEM[it.id]; return solid(d) ? [rectOf(it.x ?? 0, it.z ?? 0, fpOf(d), it.r ?? 0)] : []; });
}

/** the green / red footprint under the piece */
function plate(g: any, d: Def) {
  if (d.wall) return null;
  if (!g.userData.plate) {
    const [fw, fd] = fpOf(d);
    const m = new T.Mesh(new T.PlaneGeometry(fw, fd), new T.MeshBasicMaterial({ color: '#2BC46B', transparent: true, opacity: 0.32, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 3; m.castShadow = false; m.userData.isPlate = true;
    g.add(m); g.userData.plate = m;
  }
  return g.userData.plate;
}
function tint(g: any, d: Def, ok: boolean) {
  const p = plate(g, d); if (p) p.material.color.set(ok ? '#2BC46B' : '#E5483B');
  if (g.userData.tint === ok) return; g.userData.tint = ok;
  g.traverse((o: any) => { if (o.isMesh && !o.userData.isPlate && o.material?.emissive) { o.material.emissive.set(ok ? '#2BC46B' : '#E5483B'); o.material.emissiveIntensity = ok ? 0.22 : 0.55; } });
}

/** put the ghost where the pointer (or `at`, a floor point) says, with all the helpers */
function aim(this: any, force = false, at?: { x: number; z: number }) {
  const g = this.edit.ghost, d: Def = this.edit.ghostDef; if (!g || !d) return;
  if (this._touchCam && !force) return; // a finger turning the camera does not drag the piece along
  PW.measureFp?.(d.id); for (const it of this.items ?? []) PW.measureFp?.(it.id);
  const h = this.half, extra = this.edit.extra || {};
  if (d.wall) {
    let k: string | null = null, u = 0;
    if (!at) {
      this.ray.setFromCamera(this.ptr, this.camera);
      let best: { k: string; dist: number; p: any } | null = null;
      for (const [kk, wg] of Object.entries<any>(this.wallGroups)) { if (!wg.userData.tall.visible) continue; const hit = this.ray.intersectObject(wg.userData.tall, true)[0]; if (hit && (!best || hit.distance < best.dist)) best = { k: kk, dist: hit.distance, p: hit.point }; }
      if (best) { k = best.k; const p = best.p; u = k === 'w0' ? p.x : k === 'w2' ? -p.x : k === 'w1' ? -p.z : p.z; }
    }
    if (!k) {
      const p = at ?? this.floorHit(); if (!p) { g.visible = false; this.edit.pos = null; return; }
      const shown = Object.keys(this.wallGroups).filter((kk) => this.wallGroups[kk].userData.tall.visible);
      const wf = wallFromFloor(p.x, p.z, h, shown.length ? shown : Object.keys(this.wallGroups)); if (!wf) return;
      k = wf.w; u = wf.u;
    }
    const half = (d.ww || 1) / 2;
    u = Math.round(Math.max(-h + half + 0.1, Math.min(h - half - 0.1, u)) * 4) / 4;
    const wg = this.wallGroups[k]; const v = new T.Vector3(u, d.wy || 1.6, WALL_T / 2 + 0.03); wg.localToWorld(v);
    g.visible = true; g.position.copy(v); g.rotation.y = wg.rotation.y;
    this.edit.pos = Object.assign({}, extra, { id: d.id, w: k, x: u }); this.edit.valid = true; tint(g, d, true);
    return;
  }
  const p = at ?? this.floorHit(); if (!p) return;
  const fp = fpOf(d);
  let x = Math.round(p.x * 4) / 4, z = Math.round(p.z * 4) / 4, r = this.edit.rot || 0, y = 0, ok = true;
  if (d.top) {
    const s = onSurface(p.x, p.z, tables(this));
    if (s) { x = s.x; z = s.z; y = s.h; } else { const l = h - 0.2; x = Math.max(-l, Math.min(l, x)); z = Math.max(-l, Math.min(l, z)); }
  } else if (d.rug) {
    const [w, dd] = r % 2 ? [fp[1], fp[0]] : fp; x = Math.max(-h + w / 2, Math.min(h - w / 2, x)); z = Math.max(-h + dd / 2, Math.min(h - dd / 2, z));
  } else {
    if (!this.edit.userRot) {
      if (isChair(d)) { const f = faceTable(p.x, p.z, tables(this)); if (f != null) r = f; }
      else if (backed(d)) { const a = againstWall(p.x, p.z, fp, h); if (a) { x = a.x; z = a.z; r = a.r; } }
    }
    const s = freeSpot(x, z, fp, r, blocks(this), h);
    if (s) { x = s.x; z = s.z; } else ok = false;
  }
  this.edit.rot = r;
  g.visible = true; g.position.set(x, y, z); g.rotation.y = (r * Math.PI) / 2;
  this.edit.pos = Object.assign({}, extra, { id: d.id, x, z, r }); this.edit.valid = ok; tint(g, d, ok);
}
W.moveGhost = function (this: any) { aim.call(this); };
W.aimGhost = function (this: any, at?: { x: number; z: number }) { aim.call(this, true, at); };

const oldStart = W.startGhost, oldRotate = W.rotateGhost, oldCancel = W.cancelGhost, oldClick = W.handleClick;
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
W.startGhost = function (this: any, id: string, rot = 0, extra = {}) {
  this.edit.userRot = false; this.edit.skip = this.edit.skip ?? null;
  oldStart.call(this, id, rot, extra);
  // on a phone the pointer is wherever the last tap was: start in the middle of what you are looking at
  if (!this.edit.dragging && (this._lastPtr === 'touch' || (this._lastPtr == null && coarse()))) {
    const t = this.cam?.tTarget; aim.call(this, true, { x: t?.x ?? 0, z: t?.z ?? 0 });
  }
};
W.rotateGhost = function (this: any) { const ok = oldRotate.call(this); if (ok) this.edit.userRot = true; return ok; };
W.cancelGhost = function (this: any) {
  oldCancel.call(this);
  // a dragged piece that was not put down comes back where it was
  if (this.edit.skip != null) { const g = this.itemGroups?.[this.edit.skip]; if (g) g.visible = true; this.edit.skip = null; }
  this.edit.dragging = false;
};
W.handleClick = function (this: any) {
  // a tap on a phone moves the piece there; a click with a mouse puts it down (the piece already follows the mouse)
  if (this.edit.ghost && this._lastPtr === 'touch') { aim.call(this, true); return; }
  return oldClick.call(this);
};

/* ---------- dragging: placed pieces in build mode, and the piece being placed ---------- */
const worlds = new Set<any>();
const oldSetup = W.setupInput;
W.setupInput = function (this: any) { oldSetup.call(this); worlds.add(this); };

function hitItem(w: any): number {
  w.ray.setFromCamera(w.ptr, w.camera);
  const hits = w.ray.intersectObjects(w.itemGroups.filter((g: any) => g.visible && g.parent && g.parent.visible), true);
  for (const h of hits) { let o = h.object; while (o && o.userData.itemIndex == null) o = o.parent; if (o) return o.userData.itemIndex; }
  return -1;
}
function hitGhost(w: any): boolean {
  const g = w.edit.ghost; if (!g || !g.visible) return false;
  w.ray.setFromCamera(w.ptr, w.camera); return w.ray.intersectObject(g, true).length > 0;
}
type Grab = { w: any; id: number; x: number; y: number; idx: number; ghost: boolean; moved: boolean };
let grab: Grab | null = null;
const worldOf = (e: Event) => { for (const w of worlds) { if (!w.renderer?.domElement?.isConnected) { worlds.delete(w); continue; } if (e.target === w.renderer.domElement) return w; } return null; };

addEventListener('pointerdown', (e) => {
  const w = worldOf(e); if (!w) return;
  w._lastPtr = e.pointerType;
  if (!w.edit.on || e.button > 0) return;
  w.updatePtr(e);
  if (w.edit.ghost) {
    if (hitGhost(w)) { grab = { w, id: e.pointerId, x: e.clientX, y: e.clientY, idx: -1, ghost: true, moved: false }; e.stopImmediatePropagation(); }
    else if (e.pointerType === 'touch') w._touchCam = true;
    return;
  }
  const idx = hitItem(w); if (idx < 0) return;
  grab = { w, id: e.pointerId, x: e.clientX, y: e.clientY, idx, ghost: false, moved: false };
  e.stopImmediatePropagation(); // pressing a piece does not turn the camera
}, true);

addEventListener('pointermove', (e) => {
  if (!grab || e.pointerId !== grab.id) return;
  const { w } = grab; w.updatePtr(e);
  if (!grab.moved && Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < 7) return;
  if (!grab.moved) {
    grab.moved = true;
    if (!grab.ghost) {
      // pick the piece up: hide it and carry a see-through copy with all its own settings
      const it: Item = w.items[grab.idx], g = w.itemGroups[grab.idx];
      const { id, x: _x, z: _z, r, w: _w, ...extra } = it; void _x; void _z; void _w;
      w.select(-1); w.edit.skip = grab.idx; w.edit.dragging = true; if (g) g.visible = false;
      w.startGhost(id, r ?? 0, extra); // keeps the way it faces, unless a wall or a table close by helps
    }
  }
  aim.call(w, true);
}, true);

const release = (e: PointerEvent) => {
  if (!grab || e.pointerId !== grab.id) { for (const w of worlds) w._touchCam = false; return; }
  const g = grab; grab = null; const { w } = g; w._touchCam = false;
  e.stopImmediatePropagation();
  if (e.type === 'pointercancel') { if (!g.ghost) w.cancelGhost(); return; }
  if (g.ghost) { w.updatePtr(e); if (g.moved) aim.call(w, true); w.placeGhost(); return; } // drag the piece and let go = put it there; a tap on it too
  if (!g.moved) { w.select(g.idx); w.onClick?.({ type: 'edit-select', index: g.idx }); return; }
  const pos = w.edit.pos, ok = w.edit.valid !== false, idx = g.idx;
  w.edit.skip = null; w.edit.dragging = false; oldCancel.call(w);
  if (pos && ok && w.onMoveItem) w.onMoveItem(idx, pos);
  else { const grp = w.itemGroups[idx]; if (grp) grp.visible = true; if (!ok) w.onInvalidPlace?.(); }
};
addEventListener('pointerup', release, true);
addEventListener('pointercancel', release, true);

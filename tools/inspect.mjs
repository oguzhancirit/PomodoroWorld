import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
export async function load(file) {
  const buf = fs.readFileSync(file); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((res, rej) => l.parse(ab, '', res, rej));
}
if (process.argv[2]) {
  const g = await load(process.argv[2]);
  const tree = (o, d = 0) => { if (d < 12 && (o.isBone || o.children.some((c) => c.isBone) || d < 3)) console.log(' '.repeat(d) + o.type + ' ' + o.name + ' s=' + o.scale.toArray().map((v) => v.toFixed(2)) + ' q=' + o.quaternion.toArray().map((v) => v.toFixed(2)) + ' p=' + o.position.toArray().map((v) => v.toFixed(2))); o.children.forEach((c) => { if (c.isBone || c.children.some((x) => x.isBone) || d < 2) tree(c, d + 1); }); };
  tree(g.scene);
  const box = new THREE.Box3().setFromObject(g.scene); console.log('box', box.min.toArray(), box.max.toArray());
}

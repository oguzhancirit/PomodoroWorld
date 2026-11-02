// Packs the KayKit Furniture Bits (CC0, Kay Lousberg) pieces we use into one small GLB.
// Every piece stays a separately named node so the client can clone it by name.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, unpartition, prune, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

export const PIECES = ['table_medium', 'table_medium_long', 'table_small', 'chair_A', 'chair_A_wood', 'chair_B', 'chair_B_wood', 'chair_C', 'lamp_table', 'lamp_standing',
  'shelf_A_big', 'shelf_B_large_decorated', 'shelf_B_small_decorated', 'cabinet_medium_decorated', 'cactus_medium_A', 'cactus_small_A', 'cactus_small_B', 'book_set', 'book_single',
  'rug_rectangle_A', 'rug_rectangle_stripes_A', 'rug_oval_A', 'pictureframe_large_A', 'pictureframe_large_B', 'pictureframe_medium', 'couch_pillows', 'armchair_pillows', 'table_low', 'pillow_A'];
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(`furniture-src/${PIECES[0]}.gltf`);
const name0 = (d, n) => { const s = d.getRoot().listScenes()[0]; s.listChildren().forEach((c) => c.setName(n)); };
name0(doc, PIECES[0]);
const scene = doc.getRoot().listScenes()[0];
for (const p of PIECES.slice(1)) {
  const other = await io.read(`furniture-src/${p}.gltf`); name0(other, p);
  const map = mergeDocuments(doc, other);
  const s2 = map.get(other.getRoot().listScenes()[0]);
  for (const c of s2.listChildren()) scene.addChild(c);
  s2.dispose();
}
await doc.transform(unpartition(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const out = '../client/public/models/furniture.glb';
fs.mkdirSync('../client/public/models', { recursive: true });
await io.write(out, doc);
fs.copyFileSync('furniture-src/LICENSE-KayKit.txt', '../client/public/models/LICENSE-KayKit-Furniture.txt');
console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', scene.listChildren().map((c) => c.getName()).join(','));

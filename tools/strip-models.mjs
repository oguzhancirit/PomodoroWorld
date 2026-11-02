// Makes the avatar model files small: removes the 24 built-in animation clips (we ship our own
// compact clips) and unused data, then re-compresses geometry with meshoptimizer.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync('../client/public/avatars', { recursive: true });
for (const [src, dst] of [['men', 'm'], ['women', 'f']]) {
  const doc = await io.read(`avatar-src/${src}.glb`);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(prune(), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = `../client/public/avatars/body-${dst}.glb`;
  await io.write(out, doc);
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}

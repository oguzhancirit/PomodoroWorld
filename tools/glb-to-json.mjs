// Claude artifacts serve neither .glb files nor fetches of data: URIs, so the artifact build ships each
// model as {"glb": "<base64 of the .glb>"} in a .json file; the client decodes it and parses it in memory.
// Usage: node glb-to-json.mjs <in.glb> <out.glb.json>
import fs from 'node:fs';
const [src, dst] = process.argv.slice(2);
fs.writeFileSync(dst, JSON.stringify({ glb: fs.readFileSync(src).toString('base64') }));
console.log(dst, (fs.statSync(dst).size / 1024).toFixed(0) + ' KB');

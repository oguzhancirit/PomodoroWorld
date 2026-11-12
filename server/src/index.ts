import { server } from './app.config';
import { profiles } from './profiles';
import { postgresBackend } from './db';
import { startKeepAwake } from './keepAwake';
import { sessions } from './sessions';

const port = Number(process.env.PORT) || 2567;
const url = process.env.DATABASE_URL;

async function start() {
  // players are loaded before anyone can join, so nobody starts over by mistake
  if (url) { await profiles.attach(await postgresBackend(url)); console.log('profiles: database'); }
  await server.listen(port);
  console.log(`Pomodoro World server listening on :${port}`);
  // Render sets RENDER_EXTERNAL_URL; 4 minutes stays well inside its 15-minute sleep
  startKeepAwake({ url: process.env.RENDER_EXTERNAL_URL, everyMs: 4 * 60_000, busy: () => sessions.count > 0, knock: (u) => fetch(u) });
}
start().catch((e) => { console.error('could not start', e); process.exit(1); });

// the host stops the server on every update: write the last changes first
for (const sig of ['SIGTERM', 'SIGINT'] as const) process.once(sig, () => {
  profiles.flush().catch((e) => console.error('last save failed', e)).finally(() => process.exit(0));
});

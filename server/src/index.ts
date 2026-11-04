import { server } from './app.config';
import { profiles } from './profiles';

const port = Number(process.env.PORT) || 2567;
// never open the doors before saved profiles are loaded: an empty start would let anyone take an old player id
profiles.ready.then(
  () => server.listen(port).then(() => console.log(`Pomodoro World server listening on :${port}`)),
  (e) => { console.error('could not load profiles, not starting', e); process.exit(1); },
);
// a deploy or restart stops the server: Colyseus waits for this before exiting, so nothing waiting is lost
server.onShutdown(() => profiles.flush());

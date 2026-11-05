// The public server keeps players in Postgres (a free Neon database), because the free host forgets its files
// on every restart. One row per player: the id and the whole profile as JSON. Set DATABASE_URL to use it.
import pg from 'pg';
import type { Profile, ProfileBackend } from './profiles';

export async function postgresBackend(url: string): Promise<ProfileBackend> {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new pg.Pool({ connectionString: url, max: 3, ssl: local ? undefined : { rejectUnauthorized: true } });
  await pool.query('create table if not exists profiles (pid text primary key, data jsonb not null, updated timestamptz not null default now())');
  return {
    async load() {
      const r = await pool.query('select data from profiles');
      return r.rows.map((x: { data: Profile }) => x.data);
    },
    async write(list) {
      const pids = list.map((p) => p.pid), data = list.map((p) => JSON.stringify(p));
      await pool.query(
        `insert into profiles (pid, data) select * from unnest($1::text[], $2::jsonb[])
         on conflict (pid) do update set data = excluded.data, updated = now()`, [pids, data]);
    },
  };
}

// Messages the client may send to a study room. The server validates each one with these schemas.
import { z } from 'zod';
import { CHAT_MAX } from './chat';

/** what the avatar does at the desk while focusing */
export const ACTIVITIES = ['type', 'write', 'read'] as const;
export type Activity = (typeof ACTIVITIES)[number];
export const ActivityEnum = z.enum(ACTIVITIES);

/** work categories shown on the start screen → desk animation */
export const CATEGORIES: readonly [string, string, Activity][] = [
  ['Ders', 'Ders', 'write'], ['Okuma', 'Okuma', 'read'], ['Kodlama', 'Kodlama', 'type'], ['Proje', 'Proje / İş', 'type'],
  ['Yazı', 'Yazı', 'write'], ['Dil', 'Dil', 'read'], ['Diğer', 'Diğer', 'type'],
];
export function activityFor(category: string): Activity {
  return CATEGORIES.find((c) => c[0] === category)?.[2] ?? 'type';
}

export const JoinOptions = z.object({
  name: z.string().max(40).optional(),
  avatar: z.string().max(60).optional(),
  preset: z.string().max(8).optional(),
  activity: ActivityEnum.optional(),
});
export type JoinOptions = z.infer<typeof JoinOptions>;

/** Lenient version for the server: one bad field falls back to its default instead of dropping all options. */
export function parseJoin(input: unknown): JoinOptions {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const pick = <T>(schema: z.ZodType<T>, v: unknown): T | undefined => { const r = schema.safeParse(v); return r.success ? r.data : undefined; };
  return {
    name: pick(z.string().max(40), o.name),
    avatar: pick(z.string().max(60), o.avatar),
    preset: pick(z.string().max(8), o.preset),
    activity: pick(ActivityEnum, o.activity),
  };
}

export const ChatMsg = z.object({ text: z.string().min(1).max(CHAT_MAX * 2) });
export const EmoteMsg = z.object({ e: z.enum(['wave', 'clap', 'cheer', 'heart', 'coffee']) });
export const SitMsg = z.object({ seatIndex: z.number().int().min(0).max(63) });
export const ActivityMsg = z.object({ activity: ActivityEnum });

export const EMOTES = EmoteMsg.shape.e.options;

import { useEffect, useState } from 'react';
import { CATALOG, ACHIEVEMENTS, BUNDLES, ACCESSORIES, decodeAvatar, bundlePrice, bundleLevel, encodeAvatar, levelFromXP, titleFor, owns, isFree, partName, type Item, type Slot } from '@pw/shared';
import { useStore } from '../store';
import { buyItem, demoBoost } from '../economy';
import { DEMO_ONLY } from '../config';
import { thumb } from '../home/engine';
import { usePartThumb } from '../avatar/partThumb';

const COIN = <svg className="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" /><path d="M10 5.5v9M7.5 8h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></svg>;

export function WalletChip() {
  const w = useStore((s) => s.wallet);
  if (!w) return null;
  const li = levelFromXP(w.xp);
  return (
    <div className="wallet" title={`${titleFor(li.level)} · sonraki seviyeye ${li.need - li.into} XP`}>
      <span className="lv">{li.level}</span>
      <span className="xpbar" aria-label={`XP ${li.into} / ${li.need}`}><i style={{ width: `${Math.round((li.into / li.need) * 100)}%` }} /></span>
      <span className="coins">{COIN}<b>{w.coins.toLocaleString('tr-TR')}</b></span>
      <button className="ghost sm" onClick={() => useStore.getState().set({ shop: true })}>Mağaza</button>
    </div>
  );
}

/** an outfit part shown on the player's own character (a soft placeholder until the photo is ready) */
export function PartPic({ it, base }: { it: Item; base: string }) {
  // an accessory: the player's own head wearing it (the photo is framed on the head)
  const acc = it.sub === 'Aksesuar' ? ACCESSORIES.indexOf(it.part as typeof ACCESSORIES[number]) : -1;
  const me = decodeAvatar(base);
  const shown = acc > 0 ? { ...it, id: `${it.id}.${me.g}`, g: me.g, slot: 'head' as const, part: me.head } : it;
  const url = usePartThumb(shown, acc > 0 ? encodeAvatar({ ...me, acc }) : base);
  return url ? <img alt="" src={url} /> : <span className="pic-wait" aria-hidden="true" />;
}

/** things added in the big shop update (user 2026-11-03), shown with a "Yeni" badge */
const NEW_IDS = new Set(['f_console', 'w_neon_text', 'w_poster_art', 'w_garland', 'f_doormat', 'f_flower_vase', 'f_bird_paradise', 'f_succulents', 'f_lamp_mushroom', 'f_lantern', 'f_skateboard', 'f_vase_tall', 'f_easel', 'f_yoga_mat', 'f_camera', 'f_bunny', 'f_fishbowl', 'f_parrot', 'f_hammock', 'f_pouf', 'f_rug_shag', 'f_rug_checker', 'f_rug_rainbow', 'w_ivy', 'w_moon', 'w_star_lights', 'w_hoop', 'w_vinyl', 'w_polaroid', 'w_mirror', 'd_hourglass', 'd_crystal', 'd_photo', 'd_headphones']);
/** what you can make your own on a room item: colour, own text, a design */
const touchesOf = (it: Item) => { const f = it as Item & { tint?: number; text?: number; vars?: number }; return { tint: !!f.tint, text: !!f.text, vars: !!f.vars }; };
const isPersonal = (it: Item) => { const t = touchesOf(it); return t.tint || t.text || t.vars; };

const SLOT_LABEL: Record<Slot, string> = { head: 'Saç ve yüz', body: 'Üst', legs: 'Alt', feet: 'Ayakkabı' };
const FURN_SUBS = [...new Set(CATALOG.filter((i) => i.cat === 'furn').map((i) => i.sub!))];

export function ShopModal() {
  const open = useStore((s) => s.shop), w = useStore((s) => s.wallet), g = useStore((s) => s.profile.avatar.g);
  const want = useStore((s) => s.shopTab);
  const base = encodeAvatar(useStore((s) => s.profile.avatar));
  const [tab, setTab] = useState<'avatar' | 'furn' | 'room' | 'ach'>('avatar');
  const [sub, setSub] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!open) setMsg(''); else setTab((want as typeof tab) || 'avatar'); }, [open, want]);
  if (!open || !w) return null;
  const level = levelFromXP(w.xp).level;
  const close = () => useStore.getState().set({ shop: false, shopTab: 'avatar' });
  const doBuy = async (it: Item) => { setMsg(''); const err = await buyItem(it.id); setMsg(err ?? `Satın alındı: ${it.name}`); };
  const card = (it: Item) => {
    const have = owns(w, it.id), count = w.owned[it.id] ?? 0, locked = level < it.lvl;
    const once = it.cat !== 'furn';
    return (
      <article key={it.id} className={`shop-card ${have && once ? 'own' : ''} ${locked ? 'locked' : ''} pic`}>
        {it.cat === 'avatar' ? <PartPic it={it} base={base} /> : <img alt="" loading="lazy" src={thumb(it.id)} />}
        {NEW_IDS.has(it.id) && <span className="new-badge">Yeni</span>}
        <b>{it.name}</b>
        <span className="meta">{it.cat === 'avatar' ? (it.slot ? SLOT_LABEL[it.slot] : 'Aksesuar') : it.cat === 'furn' ? (count ? `${count} adet sende` : it.sub) : it.cat === 'theme' ? 'Hazır tema' : it.cat === 'view' ? 'Pencere manzarası' : 'Oda boyutu'}</span>
        {it.cat === 'furn' && isPersonal(it) && <span className="touch-badges">{touchesOf(it).tint && <i title="Rengini sen seçersin">🎨</i>}{touchesOf(it).text && <i title="Üstüne kendi yazını yazarsın">✍️</i>}{touchesOf(it).vars && <i title="Desenini sen seçersin">🖼️</i>}</span>}
        {once && have ? <span className="tag ok">{isFree(it) ? 'Ücretsiz' : 'Sende'}</span>
          : locked ? <span className="tag">Seviye {it.lvl}</span>
          : <button className="buy" disabled={w.coins < it.price} onClick={() => doBuy(it)}>{it.price ? <>{COIN}{it.price}</> : 'Ücretsiz al'}</button>}
      </article>
    );
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shop-t" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet">
        <header><div><h2 id="shop-t">Mağaza</h2><p>Odaklandıkça jeton kazanırsın. Seviye atladıkça yeni parçalar açılır.</p></div>
          <div className="row">{DEMO_ONLY && <button className="ghost sm demo-boost" title="Sadece demoda: her şeyi denemek için" onClick={() => { demoBoost(); setMsg('Deneme paketi: +3000 jeton ve seviye 10. Hepsini dene!'); }}>🎁 Deneme paketi</button>}<WalletInline /><button className="x" aria-label="Kapat" onClick={close}>×</button></div></header>
        <div className="tabs">
          <button className={tab === 'avatar' ? 'on' : ''} onClick={() => setTab('avatar')}>Karakter</button>
          <button className={tab === 'furn' ? 'on' : ''} onClick={() => setTab('furn')}>Eşyalar</button>
          <button className={tab === 'room' ? 'on' : ''} onClick={() => setTab('room')}>Tema ve manzara</button>
          <button className={tab === 'ach' ? 'on' : ''} onClick={() => setTab('ach')}>Başarımlar</button>
        </div>
        {msg && <p className="shop-msg">{msg}</p>}
        {tab === 'avatar' && <section><h4>Aksesuar · gözlük, şapka, taç…</h4><div className="shop-grid">{CATALOG.filter((i) => i.sub === 'Aksesuar').map(card)}</div></section>}
        {tab === 'avatar' && (['head', 'body', 'legs', 'feet'] as Slot[]).map((slot) => (
          <section key={slot}><h4>{SLOT_LABEL[slot]}</h4><div className="shop-grid">{CATALOG.filter((i) => i.cat === 'avatar' && i.g === g && i.slot === slot).map(card)}</div></section>
        ))}
        {tab === 'furn' && <>
          <p className="note">Aldığın eşyaları <b>Odam → Odayı düzenle</b> ile istediğin yere koyarsın. Eşyalardan istediğin kadar alabilirsin.</p>
          {!q && (sub === '' || sub === '*new') && (
            <section className="bundles"><h4>Hazır köşe setleri · %20 indirim</h4>
              <div className="bundle-grid">{BUNDLES.map((b) => {
                const full = b.items.reduce((a, id) => a + (CATALOG.find((i) => i.id === id)?.price ?? 0), 0), price = bundlePrice(b), lv = bundleLevel(b), locked = level < lv;
                return (
                  <article key={b.id} className={`bundle ${locked ? 'locked' : ''}`}>
                    <div className="b-pics">{b.items.slice(0, 4).map((id) => <img key={id} alt="" loading="lazy" src={thumb(id)} />)}</div>
                    <b>{b.name}</b><span className="meta">{b.desc}</span>
                    <div className="b-buy">{locked ? <span className="tag">Seviye {lv}</span> : <button className="buy" disabled={w.coins < price} onClick={() => doBuy({ id: b.id, name: b.name, cat: 'furn', price, lvl: lv })}>{COIN}{price} · Seti al</button>}<s>{full}</s></div>
                  </article>
                );
              })}</div>
            </section>
          )}
          <div className="shop-find"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Eşya ara: lamba, halı, kedi…" aria-label="Eşya ara" /></div>
          <div className="chips subs"><button className={!sub ? 'on' : ''} onClick={() => setSub('')}>Hepsi</button><button className={sub === '*new' ? 'on' : ''} onClick={() => setSub('*new')}>✨ Yeni</button><button className={sub === '*mine' ? 'on' : ''} onClick={() => setSub('*mine')}>🎨 Kişiselleştirilebilir</button>{FURN_SUBS.map((x) => <button key={x} className={sub === x ? 'on' : ''} onClick={() => setSub(x)}>{x}</button>)}</div>
          {(() => {
            const needle = q.trim().toLocaleLowerCase('tr');
            const ok = (i: Item) => i.cat === 'furn' && (!needle || i.name.toLocaleLowerCase('tr').includes(needle) || (i.sub ?? '').toLocaleLowerCase('tr').includes(needle))
              && (sub === '*new' ? NEW_IDS.has(i.id) : sub === '*mine' ? isPersonal(i) : true);
            const groups = FURN_SUBS.filter((x) => sub.startsWith('*') || !sub || x === sub).map((x) => [x, CATALOG.filter((i) => i.sub === x && ok(i))] as const).filter(([, l]) => l.length);
            return groups.length ? groups.map(([x, l]) => <section key={x}><h4>{x}</h4><div className="shop-grid">{l.map(card)}</div></section>) : <p className="note">Böyle bir eşya bulamadık. Başka bir kelime dene.</p>;
          })()}
        </>}
        {tab === 'room' && ([['theme', 'Hazır temalar'], ['view', 'Pencere manzarası'], ['size', 'Oda boyutu']] as const).map(([c, t]) => (
          <section key={c}><h4>{t}</h4><div className="shop-grid">{CATALOG.filter((i) => i.cat === c).map(card)}</div></section>
        ))}
        {tab === 'ach' && <ul className="ach">{ACHIEVEMENTS.map((a) => <li key={a.id} className={w.ach[a.id] ? 'got' : ''}><b>{a.name}</b><span>{a.desc}</span><em>{COIN}{a.coin}</em></li>)}</ul>}
      </div>
    </div>
  );
}
function WalletInline() { const w = useStore((s) => s.wallet); return w ? <span className="coins big">{COIN}<b>{w.coins.toLocaleString('tr-TR')}</b></span> : null; }

/** shown after a focus ends: what you earned */
export function RewardToast() {
  const r = useStore((s) => s.reward);
  const [show, setShow] = useState(false);
  useEffect(() => { if (!r) return; setShow(true); const t = setTimeout(() => setShow(false), 6500); return () => clearTimeout(t); }, [r]);
  if (!r || !show) return null;
  return (
    <div className="reward" role="status">
      {r.levelUp ? <div className="lvup">Seviye {r.levelUp}! <span>{titleFor(r.levelUp)}</span></div> : null}
      <b>+{r.xp} XP · +{r.coins} jeton</b>
      <ul>{r.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}

export { partName };

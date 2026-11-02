import { useEffect, useState } from 'react';
import { CATALOG, ACHIEVEMENTS, levelFromXP, titleFor, owns, isFree, partName, type Item, type Slot } from '@pw/shared';
import { useStore } from '../store';
import { buyItem } from '../economy';

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

const SLOT_LABEL: Record<Slot, string> = { head: 'Saç ve yüz', body: 'Üst', legs: 'Alt', feet: 'Ayakkabı' };

export function ShopModal() {
  const open = useStore((s) => s.shop), w = useStore((s) => s.wallet), g = useStore((s) => s.profile.avatar.g);
  const [tab, setTab] = useState<'avatar' | 'furn' | 'ach'>('avatar');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!open) setMsg(''); }, [open]);
  if (!open || !w) return null;
  const level = levelFromXP(w.xp).level;
  const close = () => useStore.getState().set({ shop: false });
  const doBuy = async (it: Item) => { setMsg(''); const err = await buyItem(it.id); setMsg(err ?? `Satın alındı: ${it.name}`); };
  const card = (it: Item) => {
    const have = owns(w, it.id), count = w.owned[it.id] ?? 0, locked = level < it.lvl;
    return (
      <article key={it.id} className={`shop-card ${have && it.cat === 'avatar' ? 'own' : ''} ${locked ? 'locked' : ''}`}>
        <b>{it.name}</b>
        <span className="meta">{it.cat === 'avatar' ? SLOT_LABEL[it.slot!] : count ? `${count} adet sende` : 'Odaya eşya'}</span>
        {it.cat === 'avatar' && have ? <span className="tag ok">{isFree(it) ? 'Ücretsiz' : 'Sende'}</span>
          : locked ? <span className="tag">Seviye {it.lvl}</span>
          : <button className="buy" disabled={w.coins < it.price} onClick={() => doBuy(it)}>{COIN}{it.price}</button>}
      </article>
    );
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shop-t" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet">
        <header><div><h2 id="shop-t">Mağaza</h2><p>Odaklandıkça jeton kazanırsın. Seviye atladıkça yeni parçalar açılır.</p></div>
          <div className="row"><WalletInline /><button className="x" aria-label="Kapat" onClick={close}>×</button></div></header>
        <div className="tabs">
          <button className={tab === 'avatar' ? 'on' : ''} onClick={() => setTab('avatar')}>Karakter</button>
          <button className={tab === 'furn' ? 'on' : ''} onClick={() => setTab('furn')}>Eşyalar</button>
          <button className={tab === 'ach' ? 'on' : ''} onClick={() => setTab('ach')}>Başarımlar</button>
        </div>
        {msg && <p className="shop-msg">{msg}</p>}
        {tab === 'avatar' && (['head', 'body', 'legs', 'feet'] as Slot[]).map((slot) => (
          <section key={slot}><h4>{SLOT_LABEL[slot]}</h4><div className="shop-grid">{CATALOG.filter((i) => i.cat === 'avatar' && i.g === g && i.slot === slot).map(card)}</div></section>
        ))}
        {tab === 'furn' && <><p className="note">Aldığın eşyaları kendi odana yerleştirme bir sonraki adımda geliyor; aldıkların kaybolmaz.</p><div className="shop-grid">{CATALOG.filter((i) => i.cat === 'furn').map(card)}</div></>}
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

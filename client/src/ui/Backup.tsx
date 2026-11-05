// Step 5: "Yedek" (v1 Profil → Yedeği indir / Yedekten yükle). The file holds your account key: keep it safe.
import { useEffect, useRef, useState } from 'react';
import { makeBackup, readBackup, BACKUP_KEYS } from '@pw/shared';
import { useStore } from '../store';
import { useAccount, googleReady, mountGoogleButton, signOut } from '../account';
import { DEMO_ONLY } from '../config';

const REASON: Record<string, string> = {
  json: 'Bu dosya okunamadı.', app: 'Bu bir Pomodoro World yedeği değil.', size: 'Dosya çok büyük.',
  old: 'Bu eski sürümün yedeği. Jeton ve seviye artık sunucuda tutuluyor, bu yüzden eski yedek yüklenemez.',
  identity: 'Yedekteki hesap anahtarı bozuk.',
};

export function BackupBox() {
  const file = useRef<HTMLInputElement>(null);
  const flash = useStore((s) => s.flash);
  const download = () => {
    const store: Record<string, string | null> = {};
    try { for (const k of BACKUP_KEYS) store[k] = localStorage.getItem(k); } catch { return flash('Tarayıcı depolamasına ulaşılamadı.', 4000); }
    const day = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([makeBackup(store, Date.now())], { type: 'application/json' }));
    a.download = `pomodoro-world-yedek-${day}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    flash('Yedek indirildi. İçinde hesap anahtarın var: kimseyle paylaşma.', 5000);
  };
  const load = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = readBackup(String(r.result ?? ''));
      if (!res.ok) return flash(REASON[res.reason], 6000);
      if (!confirm('Bu yedek, bu tarayıcıdaki hesabın yerine geçecek. Devam edilsin mi?')) return;
      try { for (const k of BACKUP_KEYS) localStorage.removeItem(k); for (const [k, v] of Object.entries(res.data)) localStorage.setItem(k, v); } catch { return flash('Yedek yazılamadı (tarayıcı depolaması kapalı).', 5000); }
      location.reload();
    };
    r.readAsText(f);
  };
  return (
    <div className="backup-box">
      <div><b>Yedek</b><small>Hesabını başka cihazda açmak ya da korumak için.</small></div>
      <div className="row">
        <button type="button" className="ghost" onClick={download}>Yedeği indir</button>
        <button type="button" className="ghost" onClick={() => file.current?.click()}>Yedekten yükle</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
}

/** v1 "Tanıtımı izle": play the intro film again, back in your room */
export function IntroButton() {
  return (
    <div className="backup-box">
      <div><b>Tanıtım filmi</b><small>Oyunu bir dakikada anlatan kısa film.</small></div>
      <div className="row"><button type="button" className="ghost" onClick={() => { useStore.getState().setProfile({ introSeen: false }); useStore.getState().set({ screen: 'home' }); }}>Tanıtımı izle</button></div>
    </div>
  );
}

/** v1 settings "Bildirimler": a desktop notice when a focus or break ends while you are in another tab */
export function NotifyToggle() {
  const on = useStore((s) => s.profile.notify);
  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
  const flip = () => {
    const v = !on; useStore.getState().setProfile({ notify: v });
    if (v) try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
  };
  return (
    <div className="backup-box">
      <div><b>Bildirimler</b><small>{denied ? 'Tarayıcın bildirimleri engelliyor; adres çubuğundaki kilitten açabilirsin.' : 'Başka sekmedeyken mola ve odak bitince haber verir.'}</small></div>
      <div className="row"><button type="button" className={on ? 'ghost on' : 'ghost'} role="switch" aria-checked={on} onClick={flip}>{on ? 'Açık' : 'Kapalı'}</button></div>
    </div>
  );
}

/** your account (step 6): a guest can link Google (progress moves over); a Google player sees who is signed in and can sign out */
export function AccountBox() {
  const account = useAccount((s) => s.account);
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const guest = account?.kind !== 'google';
  useEffect(() => {
    if (!guest || !googleReady() || !ref.current) return;
    mountGoogleButton(ref.current, (err, moved) => setMsg(err || (moved ? 'Bağlandı! Jetonların, seviyen ve odan hesabına taşındı.' : 'Bağlandı! Hesabındaki ilerleme yüklendi.')), 260).catch(() => setMsg('Google girişi yüklenemedi.'));
  }, [guest]);
  if (!guest) return (
    <div className="backup-box acct">
      <div className="acct-who">{account?.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" /> : <span className="acct-av">{(account?.name || 'G')[0]}</span>}
        <div><b>{account?.name || 'Google hesabın'}</b><small>Google ile girdin. Karakterin ve odan her cihazda seni bekler.</small></div></div>
      <div className="row"><button type="button" className="ghost" onClick={() => { if (confirm('Bu cihazda çıkış yapılsın mı? İlerlemen hesabında kalır.')) signOut(); }}>Çıkış yap</button></div>
    </div>
  );
  return (
    <div className="backup-box acct">
      <div><b>Misafir olarak oynuyorsun</b><small>Google ile bağlarsan jetonların, seviyen ve odan hesabına taşınır; başka cihazdan da girebilirsin.</small></div>
      <div className="row">{googleReady() ? <div ref={ref} /> : <button type="button" className="ghost" onClick={() => setMsg(DEMO_ONLY ? 'Demoda Google bağlama kapalı. Gerçek sürümde tek dokunuşla bağlanır.' : 'Google girişi bu sürümde henüz açık değil.')}>Google ile bağla</button>}</div>
      {msg && <small className="acct-msg" role="status">{msg}</small>}
    </div>
  );
}

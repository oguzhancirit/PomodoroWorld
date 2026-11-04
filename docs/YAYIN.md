# Yayına alma (arkadaş denemesi, bedava)

Karar (2026-11-04): önce bedava, önce arkadaşlar, adres şimdilik `oguzhancirit.github.io/PomodoroWorld`.

| Parça | Nerede | Ücret |
| --- | --- | --- |
| Site (telefonda açılan kısım) | GitHub Pages, `gh-pages` dalı | bedava |
| Oyun sunucusu (Colyseus) | Render.com, `render.yaml` | bedava, kimse yokken uyur |
| Oyuncu kayıtları | Neon (Postgres), `DATABASE_URL` | bedava, 0.5 GB |

## Oğuzhan'ın yapacakları (şifreleri sadece sen girersin)

1. **Neon (kayıt dolabı):** neon.tech → GitHub ile kayıt ol → yeni proje: ad `pomodoroworld`, bölge **AWS Europe Central (Frankfurt)**.
   Proje açılınca "Connect" düğmesinden **bağlantı adresini** kopyala (`postgresql://...` ile başlar).
   Bu adres bir şifre içerir: sohbete yapıştırma, sadece 2. adımda Render'a yapıştır.
2. **Render (sunucu):** render.com → GitHub ile kayıt ol → **New → Blueprint** → `oguzhancirit/PomodoroWorld` deposunu seç,
   dal olarak `claude/adoring-newton-vfiiyb` seç. Render `render.yaml` dosyasını okur ve iki şey sorar:
   - `DATABASE_URL` → 1. adımda kopyaladığın Neon adresini yapıştır.
   - `GOOGLE_CLIENT_ID` → şimdilik boş bırak.
   "Apply / Deploy" de. Birkaç dakika sonra yeşil "Live" yazar.
3. Render'daki sunucu sayfasının üstünde **`https://pomodoro-world-server-….onrender.com`** gibi bir adres var.
   Bu adres gizli değil: bana gönder.

## Claude'un yapacakları (adres gelince)

- Siteyi `VITE_SERVER_URL=wss://<render adresi>` ile yeniden kurup `gh-pages`'e gönderir.
- İki tarayıcıyla gerçek sunucuda dener: aynı odada görünme, coin'in sunucu yeniden başlayınca kalması.

## Nasıl çalışıyor

- Sunucu açılırken bütün oyuncuları veritabanından okur (`server/src/db.ts`, tablo `profiles`: oyuncu kimliği + profil JSON).
  Değişen oyuncular 1 saniye içinde geri yazılır; yazma başarısız olursa 5 saniye sonra tekrar dener; kapanırken (SIGTERM) son değişiklikleri yazar.
- `DATABASE_URL` yoksa eskisi gibi `data/profiles.json` dosyası kullanılır (yerel geliştirme, testler).
- Site ilk istekten önce `/health` adresini çalar (`client/src/wake.tsx`). Sunucu 1,5 saniyede cevap vermezse üstte
  "Sunucu uyanıyor…" şeridi çıkar; 2,5 dakikada cevap yoksa "Sunucuya ulaşılamadı" + Yenile.

## Sonra (herkese açmadan önce)

- Google ile giriş: Google Cloud'dan istemci kimliği (`GOOGLE_CLIENT_ID` + siteye `VITE_GOOGLE_CLIENT_ID`).
- Şikâyet et / engelle, küfür süzgeci, gizlilik metni (KVKK).
- Hep uyanık sunucu (Render Starter, aylık ~7 $) ve istenirse özel adres.

## Durum (2026-11-04, oturum devri)

- Oğuzhan Neon'da `pomodoroworld` organizasyonunu açtı (`org-frosty-sun-33643492`), ortam ayarlarına `NEON_API_KEY` ekledi
  ve ağ izin listesine `neon.com` + `console.neon.tech` ekledi. Anahtar yalnızca yeni oturumda görünür.
- ✔ Neon projesi açıldı (REST API ile, CLI yok): `pomodoroworld`, kimlik `odd-truth-90319479`, **aws-eu-central-1 (Frankfurt)**,
  Postgres 17, veritabanı `neondb`, rol `neondb_owner`. Bağlantı adresi sohbete ve repoya yazılmadı;
  Oğuzhan onu Neon'daki **Connect** düğmesinden alıp Render'daki `DATABASE_URL` kutusuna yapıştırır.
  Bu bulut ortamı veritabanına doğrudan bağlanamaz (yalnız HTTPS izinli, DNS yok); bağlantıyı Render dener.
- Sırada: Render Blueprint (yukarıdaki 2. adım, dal `claude/adoring-newton-vfiiyb`) → Render adresi gelince siteyi
  `VITE_SERVER_URL=wss://<adres>` ile kurup `gh-pages`'e gönder (dalın `.git`'i korunur, `.nojekyll` olur), iki tarayıcıyla canlı dene.

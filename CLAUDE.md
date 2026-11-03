# Pomodoro World — Claude Code için devir notu

Bu dosyayı Claude Code her oturumda otomatik okur. Kullanıcı (Oğuzhan) Türkçe konuşur; ona **sade Türkçe**, "10 yaşında bir çocuğa anlatır gibi" yaz. Sürekli izin istemeden ilerle, ama aşağıdaki kurallara uy.

## Proje
Odakoo benzeri, Sanalika/Sims havasında 3D, çok oyunculu pomodoro uygulaması. Repo: `oguzhancirit/PomodoroWorld`.
- **v1 (eski sürüm):** kökteki `index.html` + `js/*.js` (three r128 tarzı, global `window.PW`). İçerik zengini burada: oda motoru, 66 parçalık karakter, görevler, sesler, istatistik, sosyal alanlar, tanıtım filmi, yedekleme.
- **v2 (yeni sürüm):** npm workspaces → `shared/` (kurallar, saf TS), `server/` (Colyseus 0.18 + express), `client/` (Vite + React 19 + R3F + zustand).
- **Ana ilke (kullanıcının açık isteği):** Eski emek boşa gitmeyecek. Önce eski her şeyi *tam* taşı, sonra üstüne kalite ekle. Baştan yeni bir şey icat etme.

## Taşıma sırası ve durum
1. Ekonomi ve mağaza ✔ (sunucu XP/jeton verir)
2. Kişisel oda (Odam) ve eşya yerleştirme ✔ — eski motor `client/src/legacy/` köprüsüyle çalışıyor
3. Görevler, yapılacaklar, sesler, istatistikler ← **sıradaki**
4. Dünya'daki sosyal alanlar ve arkadaşlar
5. Tanıtım filmi ve **yedekleme** (yedekleme şart; internetsiz çalışma/PWA **istenmiyor**)

Odam'da eksik kalanlar: oda ayarları (ad, açıklama, kategori, açık/kapalı, davet bağlantısı, yasaklı listesi — eski `js/ui.js` "roomset"), telefonda kamera biraz yakın, Odam'da solo sayaç/odak.

## Kullanıcıya sorulmuş, cevap bekleyen karar
Odam'da şu an **eski** karakter (`PW.defaultAvatar(g)`) oturuyor; çalışma odasında **yeni** Quaternius karakterleri var. Seçenekler: (a) eski karakteri her yerde kullan → 66 kıyafet/aksesuar geri gelir, (b) yeni karakteri Odam'a taşı (eski `PW.Avatar` arayüzünü taklit eden bir adaptör: root, setState, setAct, update, headWorld). Cevabı almadan büyük karakter işi yapma.

## Önemli dosyalar
- `shared/src/economy.ts` — ECON, seviye, ödül, CATALOG (avatar parçaları + eski oda kataloğu), `buy`, `sanitizeWallet` (eski KayKit `furn.*` eşyaları jeton olarak iade edilir).
- `shared/src/roomCatalog.ts` — **üretilmiş dosya**, elle düzenleme: `node tools/extract-room-catalog.mjs` eski `js/data.js`'ten üretir.
- `shared/src/room.ts` — oda formatı, `sanitizeRoom`, `roomAllowedFor` (sahip olunan eşya + seviye kilidi).
- `server/src/http.ts` — `/api/profile`, `/api/buy`, `/api/room`, `/health`. `server/src/profiles.ts` — JSON dosyada profil (yalnız `sha256('pw:'+secret)` saklanır).
- `server/src/rooms/StudyRoom.ts` — ortak çalışma odası (aynı sayaç, odakta sohbet kapalı).
- `client/src/legacy/shim.ts` — eski r128 kodunu three r186'da çalıştırır: ışıklar ×π (legacy birimler), point light decay 0 + menzil ×0.5, sahne `environmentIntensity = 0.3`, `encoding`→`colorSpace`, çok örnekli render target, `SAOPass` kapalı. `js/world.js` içinde composer'a ACES ton eşleme pass'i eklendi (yalnız `THREE.OutputPass` varsa, v1'i bozmaz).
- `client/src/home/` — `HomeRoom.tsx` (Odam ekranı), `EditBar.tsx` (eski düzenleyici: Stiller, Eşyalar, Duvar, Zemin, Atmosfer, Manzara, Hazır tema, Boyut; geri al/yinele, duvar modu, kuşbakışı, döndür/taşı/kopyala/kaldır, renk), `engine.ts` (ROOM_STYLES, thumb, undo geçmişi).
- `client/src/economy.ts` — cüzdan/oda yükleme ve kaydetme (demo modda localStorage `pw2.wallet`, `pw2.room`; çevrimiçi HTTP + tarayıcıda yedek kopya).
- `client/src/config.ts` — `DEMO_ONLY`: sunucu adresi yoksa ve yerel değilse (ör. Claude artifact) botlu demo modu.

## Komutlar
- Kurulum: `npm install --ignore-scripts --legacy-peer-deps` (npm 10.9 `edgesOut` hatası yüzünden `--legacy-peer-deps` şart)
- Test: `npm test` (shared 68 + server 24 test geçiyor)
- Geliştirme: `npm run dev:server` ve `npm run dev:client` (istemci 5173, sunucu 2567). Odam'a doğrudan: `/?home`, demo için `?demo`, hafif grafik `?lite`.
- Artifact derlemesi: `npm run build:artifact` (modeller base64 JSON olarak paketlenir)
- Deneme bağlantısı (Claude artifact): https://claude.ai/artifact/2tQrEgaG6KtSWz5RdVRqMz
- Sunucu: Render ücretsiz plan (`render.yaml`), Node 22.

## Çalışma kuralları
- Oyun mantığında **TDD**: önce test, sonra kod (`shared/test`, `server/test`).
- Hata düzeltmeden önce **kök nedeni** bul. "Bitti" demeden önce **taze kanıt** (test/derleme/ekran görüntüsü).
- Küçük commit'ler. Commit mesajı sonuna:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- Push'tan önce kullanıcıya neyin gideceğini kısaca söyle.
- Yeni bağımlılık: lisans MIT olmalı (değilse kullanıcıya sor — TypeScript Apache-2.0 olduğu için kurulmadı, yani `tsc` yok; Vite derlemesi + testler kontrol yerine geçiyor), bakımı sürüyor olmalı, `curl|sh` yok, sırlar commit edilmez, `.env` gitignore'da. Paket sürümü en az iki haftalık olsun.
- Şifre/kimlik bilgisi girme; giriş işlerini kullanıcı yapar. Yıkıcı git komutlarından (`reset --hard`, force push) kaçın.
- Tarayıcı testi: Playwright Chromium + swiftshader yavaş (adım başı ~40–90 sn); `?lite` kullan.

# Güvenlik bulguları — 2026-11-04

Yöntem: `.claude/skills/pomodoro-world-guvenlik/SKILL.md`. Kapsam: `server/src`, `shared/src`, `client/src` (XSS ve sır taraması), v1 yedek içe alma. Kanıtlar yerel deneme testiyle (`@colyseus/testing`) alındı, test sonra silindi. Canlı sunucuya dokunulmadı.

## Orta

### 1. ✅ DÜZELTİLDİ — Aynı hesapla çok sekme = çok ödül (jeton/XP hilesi)
- **Düzeltme:** `server/src/sessions.ts` — bir hesap aynı anda tek sekmede/odada; yeni sekme eskisini 4001 koduyla kapatır, eski sekmeye yeniden bağlanma hakkı verilmez. Testler: `server/test/sessions.test.ts`, `studyRoom.test.ts`.
- **Yer:** `server/src/rooms/StudyRoom.ts:81` (`onJoin`) ve `:162-179` (`payFocus`).
- **Ne oluyor:** Aynı `pid`/`secret` ile 5 sekme açan kişi, bir odakta 5 kez ödül alıyor. Ayrıca kendi sekmeleri birbirini "diğer oyuncu" sayıyor → +%30 birlikte çalışma bonusu tek kişiye gidiyor. Farklı odalarda (25/5 ve 50/10) da aynı hesapla aynı anda ödül toplanabilir.
- **Kanıt:** Tek sekme: `pomos 1`, `+35 jeton`. Beş sekme aynı odakta: `pomos 5`, toplam `+95 jeton`, günlük hedef bonusu (+40) tek odakta açıldı.
- **Etki:** Seviye/jeton ekonomisi (mağaza, seviye kilitleri, sıralama) bozulur. Başkasının hesabına zarar yok.
- **En küçük düzeltme:** Kural: "bir `pid` aynı anda tek oturum". `onJoin`'de aynı `pid` başka oturumda varsa eski oturumu çıkar (veya yeniyi reddet); süreci tüm odalar için `profiles` üzerinde tutan bir "aktif oturum" haritası ile yap. `payFocus`'ta `others` sayımında aynı `pid` sayılmasın. Önce düşen test.

### 2. ⏸ BEKLİYOR (herkese açmadan önce) — Kimliksiz sınırsız profil açma (disk/hafıza doldurma)
- **Yer:** `server/src/profiles.ts:25`, `server/src/http.ts:19`.
- **Ne oluyor:** `/api/profile`'a rastgele `pid` ile gelen her istek yeni profil yaratıp diske yazıyor; hız sınırı yok. Her kayıtta bütün dosya baştan yazılıyor.
- **Kanıt:** 300 profil 288 ms'de açıldı, hepsi kabul edildi.
- **Etki:** Bir kişi döngüyle milyonlarca profil açıp sunucunun hafızasını/diskini doldurabilir → oyun herkes için durur.
- **En küçük düzeltme:** IP başına hız sınırı (`/api/*` için küçük bir `RateLimiter`, zaten `shared/src/chat.ts`'de var) + toplam profil üst sınırı; profil yalnızca ilk gerçek odakta/oyun girişinde yaratılsın.

## Düşük

### 3. v1 yedek dosyası içinden betik çalıştırma (self-XSS)
- **Yer:** `js/app.js:31` (`validSave` sadece şekle bakıyor), `js/ui.js:574` (`R.wall` `innerHTML` içine yazılıyor).
- **Ne oluyor:** Biri "hazır oda yedeği" diye kötü bir dosya paylaşır, kurban içe alırsa duvar rengi alanındaki HTML/JS tarayıcısında çalışır.
- **Etki:** Şimdilik sadece v1 ve yalnızca dosyayı kendisi yükleyen kişi. **Port adım 5 (backup) için uyarı:** v2'de içe alınan her alan `sanitizeRoom`/`sanitizeWallet` gibi sunucu kurallarından geçmeli, `innerHTML` kullanılmamalı. Yedek `secret` içerir: kullanıcıya "yedeğini kimseyle paylaşma" yazılmalı.

## Doğrulanmalı (koddan görünüyor, hosting bilgisi gerekli)

### 4. Render ücretsiz planda profiller kaybolabilir
- **Yer:** `render.yaml` (free plan, disk tanımı yok), `server/src/profiles.ts:42` (`data/profiles.json`).
- Render'ın ücretsiz planında dosya sistemi kalıcı değilse, her yeniden başlatma/deploy herkesin jeton ve eşyalarını siler. Render panelinden "Persistent Disk" var mı bakılmalı; yoksa kalıcı depo (disk veya veritabanı) gerekir.

### 5. ⏸ BEKLİYOR (herkese açmadan önce) — Tek kişinin sınırsız oda/bağlantı açması
- **Yer:** `server/src/app.config.ts:11`.
- **Kanıt:** Bir istemci `create('study_room', { preset: 'x1'... })` ile 20 ayrı oda açtı. Her oda açık bir bağlantı ister ve boşalınca kapanır; ama IP başına bağlantı sınırı yok. Etkisi barındırma ortamının sınırlarına bağlı.
- **Öneri:** `onAuth`'ta IP başına bağlantı sınırı; `preset` bilinmeyen değerse reddet.

## Temiz çıkanlar
- Fiyat sunucu kataloğundan geliyor (`buy`), istemci sadece eşya kimliği söylüyor. ✔
- Sırlar düz değil, hash olarak saklanıyor; `timingSafeEqual` kullanılıyor. ✔
- Mesajlar zod ile doğrulanıyor; sohbet hız sınırlı ve sansürlü; isimde HTML temizleniyor. ✔
- v2 istemcide `innerHTML`/`dangerouslySetInnerHTML`/`eval` yok; repoda `.env`/anahtar yok. ✔
- Oda düzeni (`roomAllowedFor`) sadece sahip olunan eşyaları ve seviyeye uygun yüzeyleri kabul ediyor; anahtarlar katalogla süzülüyor (`__proto__` geçmiyor). ✔
- CORS `*`: çerez kullanılmadığı ve kimlik gövdede olduğu için tek başına açık değil.

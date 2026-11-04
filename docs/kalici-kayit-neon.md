# Kayıtlar kalıcı olsun (ücretsiz): Neon kurulumu

Sunucu, `DATABASE_URL` verilirse oyuncu kayıtlarını (jeton, XP, eşya, oda) Postgres veritabanında tutar.
Verilmezse eskisi gibi `data/profiles.json` dosyasına yazar. Ücretsiz Render'da bu dosya her yeniden başlatmada silinebilir.

Neon ücretsiz planı (neon.com/pricing, 2026-10-31): kalıcı (deneme değil), kredi kartı istemez, 1 GB yer,
kullanılmasa da veriyi silmez; boşta kalınca uyur, ilk istekte birkaç saniyede uyanır.

## Oğuzhan'ın yapacakları (şifreyi Claude'a yazma)
1. neon.com → ücretsiz hesap aç → yeni proje (bölge: Frankfurt).
2. "Connection string"i kopyala (`postgresql://...neon.tech/...?sslmode=require`). Bu bir şifre gibidir: kimseyle paylaşma, repoya koyma.
3. Render → pomodoro-world-server → Environment → `DATABASE_URL` alanına yapıştır → Save. Render sunucuyu yeniden başlatır.
4. Render "Logs"ta `Pomodoro World server listening` görünmeli. `could not load profiles, not starting` görünürse bağlantı metni yanlıştır.

## Nasıl korunuyor
- Sunucu, kayıtları yüklemeden kapıyı açmaz (yükleyemezse hiç başlamaz). Boş başlarsa birisi eski bir oyuncunun kimliğini kapabilirdi.
- Bir satırı sadece aynı gizli anahtarın sahibi değiştirebilir (`ON CONFLICT ... WHERE hash`).
- Kapanırken (deploy/yeniden başlatma) bekleyen kayıtlar önce yazılır (`server.onShutdown`).
- Gizli anahtarın kendisi saklanmaz, sadece özeti (hash) saklanır.

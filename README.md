# Pomodoro World

3D sanal odalarda arkadaşlarınla birlikte pomodoro yaptığın, odaklandıkça XP ve jeton kazanıp karakterini ve odanı tasarladığın sosyal bir çalışma oyunu. [Odakoo](https://odakoo.com)'nun "birlikte çalışma" fikrini Sanalika tarzı, kişiye özel odalardan oluşan bir dünyaya taşır.

**Canlı:** https://oguzhancirit.github.io/PomodoroWorld/

## Akış

1. **Karşılama** → **Karakter oluşturma** (vücut, boy, yüz, göz, kaş, ağız, allık/çil, saç, sakal, 66 kıyafet ve aksesuar parçası, desen ve renkler) → **İsim ve oda adı**.
2. Kamera kendi odana süzülür, maskot **Domi** 8 adımlık animasyonlu bir turla uygulamayı anlatır.
3. Tur bitince **Odak ekranı** açılır: günün zaman çizelgesi, en verimli saat, görev ve kategori seçimi, Odak / Mola / Uzun mola, büyük sayaç, Başlat, 25/5 · 50/10 · 90/20 · özel süre, çalışma stili (laptop, defter, kitap), tur noktaları.

## Odalar

- **Kendi odan**: Herkesin kendi kurduğu oda. Adını, açıklamasını ve kategorisini değiştir; **Açık** (Dünya'da listelenir) ya da **Kapalı** (sadece davet linki/koduyla girilir) yap. Kapalı odada davet linkini yenileyerek eski linki iptal edebilirsin.
- **Dünya**: Sadece sosyal alanlar (Meydan Kafe, Çatı Terası, Oyun Salonu) + şu an açık olan oyuncu odaları ve kişi sayıları + davet kodu ile giriş.
- Odaya giren herkes boş sandalyelere oturur; sayaç çalışınca karakteri çalışma animasyonu yapar, sohbete yazınca karakterinin üstünde konuşma balonu çıkar.

## Oda tasarımı

- 67 eşya (mobilya, bitki, aydınlatma, dekor, duvar eşyası); her eşyanın kumaş rengi ve ahşap tonu ayrı ayrı değiştirilebilir.
- Duvar rengi + 11 duvar deseni (çizgili, çiçekli, tuğla, lambri, çini…), süpürgelik rengi, 8 zemin tipi + renk, perde rengi.
- **Atmosfer**: Gün ışığı, Altın saat, Gece lambası, Mum ışığı (titreşen), Neon — ışık, pencere ışık huzmesi, toz zerreleri ve bloom ile.
- 11 pencere manzarası (Boğaz, Kapadokya balonları, kuzey ışıkları, yağmurlu gece, yörünge…), 11 hazır tema, 3 oda boyutu.

## Oyunlaştırma

- Her odak dakikası **+1 XP, +1 jeton**; seviye, unvan ve haftalık lig.
- **Görevler**: 7 günlük giriş ödülleri, günlük/haftalık görevler, "Kendine söz ver" taahhüdü (25–90 dk × 3–30 gün).
- Başarımlar, profil grafiği, çevrimiçi haftalık sıralama.

## Teknik

- Saf HTML/CSS/JS + Three.js r128 (prosedürel modeller, ACES ton eşleme, renk yönetimi, bloom, PMREM ortam ışığı). Derleme adımı yok.
- Gerçek zamanlı katman (`js/net.js`): claude.ai artifact olarak açıldığında `room` yeteneği, GitHub Pages'te Trystero (WebRTC P2P), bunlar yoksa aynı tarayıcıdaki sekmeler arası BroadcastChannel.
- İlerleme `localStorage`'da tutulur.

```
index.html      arayüz ve stiller
js/util.js      yardımcılar, renk yönetimi, malzemeler
js/data.js      katalog, ekonomi, görevler, odalar
js/models.js    3D mobilya ve manzaralar
js/avatar.js    karakter modeli ve animasyonları
js/world.js     sahne, ışık atmosferi, kamera, editör, önizleme
js/net.js       gerçek zamanlı bağlantı
js/app.js       oyun mantığı (sayaç, XP, görevler, odalar, davet)
js/ui.js        arayüz (odak ekranı, karşılama, tur, gardırop, mağaza…)
build.py        tek dosyalık sürüm üretir (dist/)
```

Yerelde çalıştırmak için: `python3 -m http.server` ve `http://localhost:8000`.

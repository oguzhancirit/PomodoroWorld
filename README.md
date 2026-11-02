# Pomodoro World

3D sanal odalarda arkadaşlarınla birlikte pomodoro yaptığın, odaklandıkça XP ve jeton kazanıp karakterini ve odanı tasarladığın sosyal bir çalışma oyunu. [Odakoo](https://odakoo.com)'nun "birlikte çalışma" fikrini Sanalika tarzı, kişiye özel odalardan oluşan bir dünyaya taşır.

**Canlı:** https://oguzhancirit.github.io/PomodoroWorld/

## Akış

1. **Karşılama**: yazı yerine dört animasyonlu kart (Odaklan → Kazan → Odanı kur → Birlikte).
2. **Karakter oluşturma**: vücut, boy, tavır (yürüyüş/duruş), yüz, saç, sakal, 66 kıyafet ve aksesuar parçası, desen ve renkler. Zar düğmesi yalnızca seçili kategoriyi rastgele değiştirir.
3. **İsim ve oda adı** → kamera odana süzülür → 6 adımlık, kısa başlıklı ve animasyonlu tur.
4. **Odak ekranı**: tek halka, süre ve tek bir Başlat düğmesi. Süre, çalışma şekli ve kategori küçük bir menünün içinde.

## The Sims serisinden alınanlar

- **Ruh hâli (moodlet)**: Hazır / Odaklı / Akışta / Yorgun / Dinç / Gururlu. Karakterin duruşu da buna göre değişir: yorgunken omuzları düşer, mutluyken başı dik ve adımları hafif olur.
- **Tavır**: Neşeli, Sakin ya da Enerjik karakterlerin yürüyüşü ve boşta duruşu farklıdır.
- **Durum taşı**: karakterinin üstünde dönen ve odak/mola durumuna göre renk değiştiren bir kristal.
- **Yapı modu**: geri al/yinele (Ctrl+Z / Ctrl+Y), eşyanın sığmadığı yerde kırmızı uyarı, Kopyala (aynı eşyadan bir tane daha), duvarlar kesik/açık/alçak, kuşbakışı (T), tek tıkla 9 hazır oda stili.
- **Görüntü**: ekran-uzayı ortam gölgesi (SAO), eşya altı temas gölgeleri, duvar-zemin köşe gölgeleri, karakterlerde kenar ışığı, kumaşlarda parlaklık, yüzeylerde kabartma.

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

- Saf HTML/CSS/JS + Three.js r128 (prosedürel modeller, ACES ton eşleme, sRGB renk yönetimi, bloom, SAO, PMREM ortam ışığı). Derleme adımı yok.
- Performans: sabit eşyalar ve karakter parçaları malzemeye göre birleştirilir (çizim çağrısı yaklaşık yarıya iner). Yavaş cihazlarda önce ortam gölgesi, sonra çözünürlük, en son bloom kapatılır. Odak ekranında 30 FPS sınırı uygulanır.
- Gerçek zamanlı katman (`js/net.js`): claude.ai artifact olarak açıldığında `room` yeteneği, GitHub Pages'te Trystero (WebRTC P2P), bunlar yoksa aynı tarayıcıdaki sekmeler arası BroadcastChannel.
- İlerleme `localStorage`'da tutulur.

```
index.html      arayüz ve stiller
js/util.js      yardımcılar, renk yönetimi, malzemeler
js/data.js      katalog, ekonomi, görevler, odalar
js/models.js    3D mobilya ve manzaralar
js/avatar.js    karakter modeli ve animasyonları
js/world.js     sahne, ışık atmosferi, kamera, editör, önizleme
js/render.js    görüntü kalitesi (AO, temas gölgeleri, kenar ışığı), birleştirme, kare hızı yönetimi, yerleştirme kontrolü
js/net.js       gerçek zamanlı bağlantı
js/app.js       oyun mantığı (sayaç, XP, görevler, odalar, davet)
js/ui.js        arayüz (odak ekranı, karşılama, tur, gardırop, mağaza…)
build.py        tek dosyalık sürüm üretir (dist/)
```

Yerelde çalıştırmak için: `python3 -m http.server` ve `http://localhost:8000`.

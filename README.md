# Pomodoro World

3D sanal odalarda arkadaşlarınla birlikte pomodoro yaptığın, odaklandıkça XP ve jeton kazanıp karakterini ve odanı tasarladığın sosyal bir çalışma oyunu. [Odakoo](https://odakoo.com)'nun "birlikte çalışma" fikrini Sanalika tarzı, kişiye özel odalardan oluşan bir dünyaya taşır.

**Canlı:** https://oguzhancirit.github.io/PomodoroWorld/

## Pomodoro World v2 (yapım aşamasında): gerçek sunucu + React 3D

Yeni sürüm eski uygulamanın yanında, ayrı klasörlerde büyüyor. Eski sürüm (kökteki `index.html` ve `js/`) olduğu gibi çalışmaya devam ediyor.

| Klasör | Ne işe yarar |
| --- | --- |
| `shared/` | Oyunun kuralları: pomodoro aşamaları, sohbet temizliği, koltuklar, karakter kodu. Sunucu ve tarayıcı aynı kuralları kullanır. |
| `server/` | Colyseus 0.18 oyun sunucusu, yani "hakem". Ortak sayacı, sohbetin açık/kapalı olmasını, koltukları ve yeniden bağlanmayı yönetir. |
| `client/` | Vite + React + three.js (React Three Fiber). 3D çalışma odası, karakter oluşturma, sohbet balonları. |
| `tools/` | Karakter modellerini küçülten ve animasyonları uyarlayan araçlar. |

**Neler var:**

- **Ortak çalışma odası:** Aynı süreyi (25/5, 50/10…) seçenler aynı odaya düşer; oda en fazla 12 kişi alır. Sayacı sunucu tutar, herkes aynı saniyeyi görür (saat farkı otomatik düzeltilir).
- **Sohbet kuralı:** Odakta sohbet kapalıdır, molada açılır. Mesajlar temizlenir, küfür maskelenir, en fazla 3 saniyede bir mesaj atılabilir. Mesaj karakterin üstünde balon olarak görünür.
- **Yeniden bağlanma:** İnternet koparsa koltuğun 30 saniye korunur, bağlantı dönünce kaldığın yerden devam edersin.
- **Yeni karakterler:** Quaternius "Ultimate Modular Men/Women" (CC0). Kafa/saç, üst, alt ve ayakkabı parça parça seçilir; ten, saç ve kıyafet rengi değiştirilebilir.
- **Gerçek hareketler:** Quaternius "Universal Animation Library" (CC0) oturma ve konuşma hareketleri bu karakterlere uyarlandı (`tools/retarget.mjs`). Bunlardan masada **yazı yazma, klavyede çalışma ve kitap okuma** hareketleri türetildi. Molada karakterler rahatlar, mesaj yazınca konuşur.
- **Oda eşyaları:** KayKit Furniture Bits (CC0): masa, sandalye, lamba, raf, bitki, halı, koltuk.

**Bilgisayarında çalıştırmak:**

```
npm install --legacy-peer-deps
npm run dev:server      # oyun sunucusu  → ws://localhost:2567
npm run dev:client      # oyun ekranı    → http://localhost:5173
npm test                # kurallar ve sunucu testleri
```

Sunucuyu hızlı denemek için `PW_TIME_SCALE=30 npm run dev:server` yaz: 25 dakika 50 saniyeye iner. Bu ayar yalnızca deneme içindir.

**İnternete açmak:**

- Sunucu: `render.yaml` hazır (Render.com ücretsiz plan, kimse yokken uyur).
- Ekran: `VITE_SERVER_URL=wss://<sunucu-adresi> npm run build -w client`; çıkan `client/dist` herhangi bir statik barındırmaya konabilir (GitHub Pages dahil).

**Lisanslar:** Kod MIT. Modeller ve animasyonlar CC0 (Quaternius, Kay Lousberg); ayrıntılar `client/public/avatars/LICENSE-Quaternius.txt` ve `client/public/models/LICENSE-KayKit-Furniture.txt` dosyalarında.

## Akış

1. **Tanıtım filmi (ilk açılışta bir kez)**: Oyunun kendi 3D motorunda oynanır.
   - Arkadaşın Elif seni odasına çağırır; içeri girip masaya oturursun, "Birlikte başlat" ile sayaçlarınız eşitlenir.
   - Molada Dünya'dan Meydan Kafe'ye gidip sohbete yazarsın; diğerleri cevap verir.
   - Hızlandırılmış bölüm: Günler akarken (gündüz → akşam → gece) XP ve jeton toplanır, seviye atlanır. Jetonlar harcandıkça boş oda adım adım dolar: halı, lamba, kitaplık, bitki, duvar kâğıdı, parke, puf, fotoğraflar ve Boğaz manzarası eklenir.
   - İlk iki bölüm hızlı akar (yaklaşık 1,6 kat), son bölüm kendi ritmindedir.
   - Film "Karakterimi oluştur" ile biter. İstenirse "Geç" ile atlanabilir, Profil'den tekrar izlenebilir.
2. **Karakter oluşturma**: vücut, boy, tavır (yürüyüş/duruş), yüz, saç, sakal, 66 kıyafet ve aksesuar parçası, desen ve renkler. Zar düğmesi yalnızca seçili kategoriyi rastgele değiştirir.
3. **İsim ve oda adı** → kamera odana süzülür. Yeni oda boştur: yalnızca bir masa ve sandalye. Pomodoro kendiliğinden açılmaz; "Odaklan" ile sen açarsın.
4. **Odak ekranı** (Odakoo'daki gibi yazı yazdırmadan):
   - **Ne çalışacaksın?**: Ders, Okuma, Kodlama, Proje / İş, Yazı, Dil, Diğer. Seçim karakterin masadaki hareketini de belirler (okuma → kitap, ders/yazı → not alma, kodlama → klavye).
   - **Süre (odak / mola)**: 15/3 Isınma, 25/5 Dengeli, 50/10 Derin, 90/20 Maraton, 45/15 Etüt ve "Sana özel" (odak 5–180 dk, mola 1–60 dk).
   - Tek "Başlat" düğmesi. Sayaç çalışırken seçim paneli gizlenir, halkada yalnızca kalan süre ve seçilen tür kalır.

## The Sims serisinden alınanlar

- **Ruh hâli (moodlet)**: Hazır / Odaklı / Akışta / Yorgun / Dinç / Gururlu. Karakterin duruşu da buna göre değişir: yorgunken omuzları düşer, mutluyken başı dik ve adımları hafif olur.
- **Tavır**: Neşeli, Sakin ya da Enerjik karakterlerin yürüyüşü ve boşta duruşu farklıdır.
- **Durum taşı**: karakterinin üstünde dönen ve odak/mola durumuna göre renk değiştiren bir kristal.
- **Yapı modu**: geri al/yinele (Ctrl+Z / Ctrl+Y), eşyanın sığmadığı yerde kırmızı uyarı, Kopyala (aynı eşyadan bir tane daha), duvarlar kesik/açık/alçak, kuşbakışı (T), tek tıkla 9 hazır oda stili.
- **Görüntü**: ekran-uzayı ortam gölgesi (SAO), eşya altı temas gölgeleri, duvar-zemin köşe gölgeleri, karakterlerde kenar ışığı, kumaşlarda parlaklık, yüzeylerde kabartma.

## Arayüz düzeni (telefon / tablet / masaüstü)

- Tüm paneller aynı yüzeyi, kenarlığı, köşe yuvarlaklığını (18 px), iç boşluğu (14 px) ve aralığı (12 px) kullanır.
- **Masaüstü (≥1100 px)**: Profil kartı, oda kartı ve "Odadakiler" sol sütunda aynı genişlikte (300 px) hizalanır. Sohbet sağda aynı genişlikte ayna sütundur. Alt çubuk iki sütunun arasındaki boşlukta durur, hiçbir panelle çakışmaz.
- **Tablet (720–1099 px)**: Sol sütun 280 px. Alt çubuk ekran boyunca uzanır, sohbet onun üstünde sağdadır.
- **Telefon (<720 px)**: Üstte tek satırlık profil, altında tam genişlikte oda kartı (yatay kaydırılan düğmeler) ve "Odadakiler". Altta sırasıyla sohbet, sayaç çubuğu ve menü bulunur.
- **Görsel dil**: Outfit (başlık ve rakamlar) ile Plus Jakarta Sans (arayüz) yazı tipleri kullanılır. Paneller ince üst ışıklı katmanlı cam yüzeylerdir. Tüm düğmelerin üzerine gelme, basma ve klavye odağı durumları vardır. Sohbet mesaj balonu biçimindedir; kişiler listesinde baş harf ve durum noktası, menüde bulunduğun yerin vurgusu yer alır. Hareket ikonları emoji yerine çizim ikonlardır.
- **Renk paleti**: tek koyu nötr yüzey ailesi. Turuncu-kırmızı yalnızca ana eylemler için, yeşil mola ve çevrimiçi durumu için, altın yalnızca ödül (jeton, seviye) için kullanılır.

## v4: beş büyük özellik

1. **Birlikte (ortak seans)**: Odada "Birlikte başlat" dersen odadakilere davet gider. Katılanların sayacı seninkine eşitlenir; molaya birlikte girersiniz. Bir oyuncunun üstüne tıklayıp "sayacına katıl" da diyebilirsin.
2. **Yapılacaklar**: İşleri kaç pomodoro süreceği tahminiyle ekle. Odak ekranında bir işi seç; odaklandıkça dakikası ve pomodorosu o işe yazılır. Tahmin dolunca "bitti mi?" diye sorar.
3. **Ortam sesleri**: Yağmur, kafe, şömine, orman, dalgalar ve odak gürültüsü. Hepsi cihazda üretilir, dosya indirmez. İstersen yalnızca odak sırasında çalar; manzarana uygun karışımı tek tıkla önerir.
4. **Arkadaşlar**: Kodunla arkadaş ekle. Dünya ekranında kimin çevrimiçi olduğunu ve nerede olduğunu görür, yanına gidersin. Arkadaşın odana girince haber verir.
5. **İçgörüler**: 6 aylık odak takvimi, son 30 günün kategori dağılımı, günün saatlerine göre verim ve tamamlanan işler.

## Herkese açık kullanım için önlemler

- **Güvenli veri**: Diğer oyunculardan gelen her veri boyut, tür ve aralık açısından denetlenir. Bozuk, aşırı büyük ya da hileli veri oyunu kilitleyemez; isimler HTML olarak işlenmez.
- **Moderasyon**:
  - Sohbette küfür filtresi (Türkçe + İngilizce, leetspeak dahil) ve uygunsuz isim engeli
  - Kişi başı mesaj sınırı ve tekrar eden mesajların süzülmesi
  - Engelle; oda sahibi için "Odamdan çıkar" (çıkarılan kişiyi odadaki herkes gizler)
- **Gizlilik**: Görev metni varsayılan olarak paylaşılmaz. Ayarlardan açılabilir.
- **Ölçek**: Sosyal alanlar 16 kişilik salonlara bölünür. Dünya dizinine yalnızca açık oda sahipleri ve dizine bakanlar bağlanır; böylece P2P ağı kalabalıkta çökmez.
- **Sayaç**: Gerçek saate bağlıdır. Arka plan sekmesi, uyku modu ve sayfa yenileme süreyi bozmaz, seans kaldığı yerden devam eder. Arka plandayken bildirim gönderir.
- **Kayıt güvenliği**:
  - Aynı tarayıcıda tek etkin sekme (iki sekme ilerlemeyi ezemez, süreyi iki kez sayamaz)
  - Günlük yedek kopya: bozuk kayıt otomatik kurtarılır
  - Yedeği dosya olarak indirip başka cihaza taşıma
  - Depolama dolarsa uyarı
  - Eski sürümden, bozuk yedekten ya da elle değiştirilmiş kayıttan gelen her alan yüklenirken onarılır (tür, aralık, bilinmeyen eşyalar)
- **Hile**: Hız ayarı kaldırıldı (yalnızca `?dev` ile açılır). Haftalık sıralamada imkânsız XP değerleri kırpılır. Sunucu olmadığı için tam doğrulama mümkün değil (aşağıya bak).
- **Kararlılık**:
  - Oda her yeniden kurulduğunda eski 3D veri GPU'dan silinir
  - Grafik bağlamı kaybolursa sahne yeniden kurulur
  - WebGL yoksa anlaşılır bir uyarı çıkar
  - "Hareketi azalt" tercihine uyulur
- **Uygulama olarak yükleme (PWA)**: GitHub Pages'te ana ekrana eklenebilir. İnternet yokken de tek başına pomodoro ve oda tasarımı çalışır.

- **Test**: Her sürüm Playwright ile otomatik denenir:
  - Sayaç (tüm süreler, mola, uzun mola, duraklatma), ekonomi, editör, görevler, sohbet
  - Bozuk kayıtlar, ilk açılış ve davet akışı, iki oyunculu oda, kötü niyetli veri
  - Erişilebilirlik: her pencere gerçek bir diyalog (odak içeri taşınır, Tab dışarı kaçmaz, kapanınca odak geri döner), adsız düğme ya da etiketsiz alan yok
  - Ortam sesleri, yedek indir/yükle, film atlama ve tekrar izleme, internetsiz açılış (PWA)
  - 7 ekran boyutunda (360×640 telefondan yatay telefona ve 1440×900 masaüstüne) her ekranın taşma, çakışma ve dokunma alanı denetimi

**Bilinen sınır**: Sunucusuz (P2P) bir yapıda ilerleme oyuncunun kendi cihazında tutulur. Bu yüzden sıralama yalnızca makul olmayan değerleri eleyebilir, kesin hile koruması sağlayamaz. Gerçek bir genel sıralama ve hesap senkronu için küçük bir arka uç (ör. Supabase/Firebase) gerekir.

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
- İlerleme `localStorage`'da tutulur (günlük yedek kopyası ve dosyaya dışa aktarma ile).

```
index.html      arayüz ve stiller
js/util.js      yardımcılar, renk yönetimi, malzemeler
js/data.js      katalog, ekonomi, görevler, odalar
js/models.js    3D mobilya ve manzaralar
js/avatar.js    karakter modeli ve animasyonları
js/world.js     sahne, ışık atmosferi, kamera, editör, önizleme
js/render.js    görüntü kalitesi (AO, temas gölgeleri, kenar ışığı), birleştirme, kare hızı yönetimi, yerleştirme kontrolü
js/net.js       gerçek zamanlı bağlantı (boyut sınırlı)
js/safety.js    gelen verinin denetimi, küfür filtresi, hız sınırları, makullük sınırları
js/sound.js     prosedürel ortam sesleri
js/app.js       oyun mantığı (sayaç, XP, görevler, odalar, davet)
js/ui.js        arayüz (odak ekranı, karşılama, tur, gardırop, mağaza…)
js/cinema.js    ilk açılış tanıtım filmi (gerçek 3D motorda, atlanabilir)
js/features.js  ortak seans, yapılacaklar, ses karıştırıcı, arkadaşlar, içgörüler, kişi kartı, yedek
sw.js, manifest.webmanifest, icons/   uygulama olarak yükleme ve çevrimdışı çalışma
build.py        tek dosyalık sürüm üretir (dist/)
```

Yerelde çalıştırmak için: `python3 -m http.server` ve `http://localhost:8000`.

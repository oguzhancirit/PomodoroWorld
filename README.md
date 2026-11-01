# Pomodoro World

3D sanal odalarda birlikte pomodoro yaptığın, odaklandıkça XP ve jeton kazanıp karakterini ve odanı dekore ettiğin sosyal bir çalışma oyunu. [Odakoo](https://odakoo.com)'nun "birlikte çalışma odası" fikrini Sanalika tarzı bir dünyaya taşır.

## Neler var?

- **Çalışma odaları**: Sessiz Kütüphane, Gece Kafe, Boğaz Manzaralı Masa, Kapadokya Kampı, Yörünge İstasyonu. Odaya girdiğinde karakterin masaya oturur; sayaç çalışınca defter, laptop ya da kitapla çalışma animasyonu yapar.
- **Sosyal odalar**: Meydan Kafe, Çatı Terası, Oyun Salonu. Yere tıklayıp yürü, koltuklara otur, el salla, alkışla, dans et.
- **Sohbet balonları**: yazdığın her mesaj karakterinin başının üstünde balon olarak çıkar.
- **Pomodoro**: 25/5, 50/10, 90/20 ve özel süre; 4 turda bir uzun mola; arka planda doğru sayan zamanlayıcı; ekran uyanık kalma isteği.
- **Ekonomi ve seviye**:

  | Kaynak | Ödül |
  | --- | --- |
  | Her odak dakikası | +1 XP, +1 jeton |
  | Tamamlanan pomodoro | +10 XP, +5 jeton |
  | 4'lü set bonusu | +25 XP, +15 jeton |
  | Günlük hedef (4 pomodoro) | +40 jeton |
  | Günün ilk turu | +2 jeton × seri günü (en çok 30) |
  | Birlikte odak | odadaki her gerçek kişi için +%10 (en çok %30) |

  Seviye eşiği: `60 × L^1.35` XP. Unvanlar Çaylak'tan Efsane'ye; haftalık XP ile Bronz → Gümüş (300) → Altın (900) → Platin (1800) → Elmas (3000) lig. 13 başarım.
- **Mağaza (150 eşya, 16 renkle binlerce kombinasyon)**
  - Karakter: kadın ve erkek havuzları, 15 saç, 5 sakal, 14 üst (elbise, kimono, pilot montu…), 7 alt, 6 ayakkabı, 18 aksesuar (gözlük, kulaklık, bere, pilot şapkası, taç, melek kanatları, odak halesi…), 16 kumaş rengi, 8 ten, 12 saç rengi.
  - Oda: 60 mobilya ve dekor (masalar, koltuklar, yataklar, kitaplıklar, lambalar, bitkiler, kilim, akvaryum, şömine, teleskop, uçak maketi, piyano, pikap, kedi ve köpek, duvar süsleri, neon tabela…), masa üstü eşyalar masanın üstüne oturur.
  - 11 oda teması (Tuğla Loft, Japon Tatami, İznik Çini, Uzay İstasyonu…), 11 pencere manzarası (İstanbul Boğazı, Kapadokya balonları, yağmurlu gece, kuzey ışıkları, yörüngeden Dünya…), 3 oda boyutu.
- **Oda düzenleyici**: yerleştir, döndür (R), taşı, kaldır (Del); tema, manzara, boyut değiştir.
- **Arkadaşlarla**: özel grup kodu ile aynı masada buluş, çevrimiçi oyuncuların odalarını gez. Oda boşken gri "NPC" etiketli sanal çalışma arkadaşları eşlik eder.

## Teknik yapı

Derleme adımı olmayan, saf HTML + JavaScript. 3D için [three.js r128](https://threejs.org) (CDN); tüm modeller, karakterler, dokular ve manzaralar kodla üretilir, dış görsel yoktur.

```
index.html      arayüz ve stiller
js/util.js      yardımcılar, geometri ve materyal fabrikaları
js/data.js      katalog, ekonomi, odalar, NPC metinleri
js/models.js    mobilyalar, duvar/zemin dokuları, pencere manzaraları
js/avatar.js    karakter oluşturma, kıyafetler, animasyonlar
js/world.js     sahne, kamera, oda kurulumu, oturma yerleri, editör, önizleme, küçük resimler
js/net.js       gerçek zamanlı katman (3 taşıyıcı)
js/app.js       oyun çekirdeği: kayıt, ekonomi, pomodoro, odalar, presence, NPC
js/ui.js        HUD, sayaç, sohbet, mağaza, gardırop, profil, editör
build.py        claude.ai Artifact için tek dosyalık sürüm üretir (dist/)
```

**Gerçek zamanlı bağlantı** (`js/net.js`) aynı arayüzle üç yoldan birini seçer:

1. **claude.ai Artifact** içinde: platformun `room` yeteneği (presence + olaylar).
2. **GitHub Pages** veya herhangi bir sunucuda: [Trystero](https://github.com/dmotz/trystero) ile sunucusuz WebRTC (Nostr sinyalleşmesi).
3. Bağlantı yoksa: aynı tarayıcının sekmeleri arasında `BroadcastChannel`.

İlerleme tarayıcıda `localStorage`'da tutulur.

## Çalıştırma

```bash
python3 -m http.server 8000
# http://localhost:8000
```

GitHub Pages: Settings → Pages → Branch: `main`, klasör `/ (root)`.

## Yol haritası

- Hesap ve bulut kayıt (Supabase/Firebase) ile cihazlar arası ilerleme
- Sunucu taraflı XP doğrulama ve global haftalık lig
- Sesli sohbet, ortam sesleri (yağmur, kafe, lo-fi)
- Odak bahçesi, günlük görevler, sezonluk eşyalar

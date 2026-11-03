# Context ve token kullanımı — araştırma ve kurallar

Bu projede Claude Code ile çalışırken bağlam penceresini (context) temiz tutmak ve token harcamasını azaltmak için ne yaptığımızı ve neye dayandığını anlatır. **Kural: tasarruf, işin kalitesini düşürmeyecek.** Kaliteyi düşüren hiçbir yöntem alınmadı.

## Kaynaklar (3 Kasım 2026, GitHub)

Seçim şartları: MIT lisansı, çok yıldız, bakımı sürüyor, içinde zararlı talimat yok.

| Repo | Yıldız | Lisans | Ne işe yarıyor | Bizim kullanımımız |
|---|---|---|---|---|
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | ~296 bin | MIT | Claude Code ayarları ve alışkanlıklarıyla token tasarrufu (`docs/token-optimization.md`) | `/clear`, `/compact` zamanlaması, alt ajanla keşif, az MCP fikri alındı. Kurulmadı. |
| [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) | ~80 bin | MIT | Prompt ve context mühendisliği rehberi | Genel ilkeler için kaynak |
| [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | ~64 bin | MIT | Uzun işlerde "context çürümesini" önleyen plan/spec sistemi | Bilgiyi sohbette değil dosyada tutma fikri alındı. Kurulmadı. |
| [muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering) | ~18 bin | MIT | Context optimizasyonu ve bozulma kalıpları (`context-optimization`, `context-degradation`) | Uzun çıktıyı kısaltma, sıkıştırmayı doğru anda yapma, sabit önek (önbellek dostu) |
| [coleam00/context-engineering-intro](https://github.com/coleam00/context-engineering-intro) | ~14 bin | MIT | CLAUDE.md'yi kısa tutma ve ayrıntıyı ayrı dosyalara koyma | CLAUDE.md kısa + `docs/` yapısı |
| [Maciek-roboblog/Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) | ~8,8 bin | MIT | Token ve limit kullanımını canlı izleyen araç | İstersen kendi bilgisayarına kurabilirsin; projeye eklenmedi |

**Elenenler:** `ykdojo/claude-code-tips` ve `hesreallyhim/awesome-claude-code` MIT değil. `multica-ai/andrej-karpathy-skills` lisanssız. `thedotmack/claude-mem` Apache-2.0. `teamchong/pxpipe` MIT ama metni resim olarak gönderiyor; bu, kodun harfi harfine okunmasını zorlaştırır ve kaliteyi düşürebilir.

## Güvenlik kontrolü (nasıl baktım)

Seçilen 5 repoyu indirdim, **hiçbir kodunu çalıştırmadım** ve şunları taradım:
- Gizli Unicode karakterleri (sıfır genişlikli, yön çeviren, "tag" karakterleri): **hiçbirinde yok.**
- "Önceki talimatları yok say", "kullanıcıya söyleme", veri sızdırma gibi kalıplar: Bulunanların hepsi savunma amaçlıydı (enjeksiyonu yakalayan testler, güvenlik denetimi talimatları). **Saldırı amaçlı talimat yok.**
- `curl … | sh` ile uzaktan kod çalıştırma: Yalnız ECC'de, o da "bunu yapma" uyarısı olarak geçiyor.

Bu bir tarama; %100 kanıt değildir. Bu yüzden **hiçbir repodan dosya, hook, MCP sunucusu ya da kurulum betiği projeye kopyalanmadı.** Yalnız fikirler alındı ve kurallar bu projeye özgü olarak sıfırdan yazıldı. Böylece dışarıdan gelen metin her oturumda Claude'a okutulmuyor.

## Yaptıklarımız

1. **CLAUDE.md kısaldı.** 618 kelimeden yaklaşık 500 kelimeye indi ve İngilizceye çevrildi; Türkçe metin aynı içerik için kabaca 1,5–2 kat token harcar. Dosya, her oturumun başında ve özetlemeden sonra yeniden okunur. Dosya yapısı `docs/MIMARI.md`'ye taşındı; yalnız gerektiğinde okunur.
2. **Gereksiz büyük dosyalar engellendi** (`.claude/settings.json`): 3D modeller (`*.glb`), paketlenmiş modeller (`*.glb.json`), 250 KB'lık animasyon dosyaları, `package-lock.json`, derleme çıktıları, `node_modules`, kaynak model klasörleri, sunucu verisi ve `.env`. Bunları okumak işe yaramaz ama bir seferde on binlerce token yer.
3. **Okuma alışkanlıkları:** önce `grep -n` ile yeri bul, sonra yalnız o satırları oku. Test ve derleme çıktısını `tail`/`grep` ile kısalt. Ekran görüntülerini küçük al.
4. **Alt ajan:** Birçok dosyayı tarayan keşif işleri ayrı bir ajana verilir; o yalnız kısa bir özet döndürür.
5. **Sıkıştırma zamanı:** `/compact` bir adım bitip commit edildikten sonra yapılır, değişikliğin ortasında yapılmaz. Birbiriyle ilgisiz işlerin arasında `/clear` kullanılır. Saklanması gereken bilgi sohbette kalmaz, dosyaya yazılır.
6. **Önbellek dostu:** CLAUDE.md'de tarih veya sürekli değişen bilgi yok. Bu sayede dosyanın başı hep aynı kalır ve önbellekten okunabilir.

## Bilerek yapmadıklarımız (performans için)

- **Model küçültmedik.** ECC varsayılan modeli Sonnet'e, alt ajanları Haiku'ya indirmeyi öneriyor. Bu ucuzlatır ama işin kalitesini düşürebilir. Model seçimi senin kararın.
- **Agresif otomatik sıkıştırma ve çıktı gizleme hook'ları kurmadık.** Hata ayıklarken gerekli hata mesajlarını silebilirler.
- **Metni resme çeviren araçları kullanmadık** (pxpipe). Kayıplıdır.

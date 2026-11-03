// The one host bot of each social space in the demo (kept tiny and separate: the sign-in page counts them).
import type { Gender } from '@pw/shared';

export const HOSTS: Record<string, { name: string; g: Gender; hello: string; lines: string[] }> = {
  meydan: { name: 'Kafeci Deniz', g: 'm', hello: 'Hoş geldin {name}! Burası Meydan Kafe: molada uğrayıp sohbet edilen yer.', lines: [
    'Burada sohbet hep açık, istediğin zaman yazabilirsin.', 'Boş bir koltuğa tıklarsan oturursun.', 'Arkadaşlarının nerede olduğunu Dünya’dan görebilirsin.', 'Mola bitince odana dönüp yeni tura başlamayı unutma.'] },
  teras: { name: 'Bahçıvan Ece', g: 'f', hello: 'Selam {name}! Çatı Terası’na hoş geldin; şehrin manzarası eşliğinde nefeslen.', lines: [
    'Uzun molada biraz gökyüzüne bakmak iyi gelir.', 'Burada herkes molada; sohbet açık.', 'Bir arkadaşını görürsen kartına tıkla, arkadaş ekleyebilirsin.', 'Gün batımında burası çok güzel olur.'] },
  oyun: { name: 'Oyuncu Kerem', g: 'm', hello: 'Hoş geldin {name}! Oyun Salonu molada kafa dağıtma yeri. Konsolda Pomo Canavarları var, bir dene!', lines: [
    'TV’nin altındaki konsolda Pomo Canavarları oynanıyor; alttaki “Konsolda oyna” ya bas.', 'Ateş yaprağı, yaprak suyu, su ateşi yener. Unutma!',
    'Burada sohbet açık; molanı tatlı geçir.', 'Kutlamak için sol alttaki gülen yüze bas.', 'Mola bitince odana dön, sayacın seni bekliyor.', 'Yeni eşyaları jetonlarla mağazadan alabilirsin.'] },
};

/** how many demo bots are around (the sign-in page's "focusing now" line in the demo) */
export const DEMO_PEOPLE = Object.keys(HOSTS).length + 1;

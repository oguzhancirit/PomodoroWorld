/* Pomodoro World — catalog, economy, rooms */
(function () {
  const PW = window.PW;

  PW.SKIN = ['#F3CDB3', '#EAB592', '#DB9E76', '#C6865B', '#AA6B44', '#8A5233', '#683C23', '#472918'];
  PW.HAIRC = ['#1E1714', '#3B2418', '#5C3920', '#8A5A2E', '#C08A4A', '#E3C07A', '#B8432F', '#D9D3CC', '#4D6FB8', '#D46A9C', '#6A4FA3', '#3E8E6A'];
  PW.CLOTH = ['#F6F4EF', '#2A2B33', '#5B6270', '#C7432F', '#E8803A', '#F2C14E', '#7FB069', '#2F7D5B', '#3E7CB1', '#22406E', '#8E6CC1', '#E58BB0', '#B5835A', '#6B4630', '#A3C4D9', '#D9B8A0'];
  PW.EYEC = ['#2B1B10', '#5A3A1E', '#3D6A3A', '#3A5F8F', '#6B6B6B'];

  // ---------- Avatar catalog ----------
  // g: m = erkek havuzu, f = kadın havuzu, u = herkes
  const A = [];
  const av = (id, slot, name, price, lvl, g, extra = {}) => A.push(Object.assign({ id, cat: 'avatar', slot, name, price, lvl, g }, extra));
  // hair
  av('h_short', 'hair', 'Kısa Kesim', 0, 1, 'u');
  av('h_side', 'hair', 'Yan Taralı', 0, 1, 'm');
  av('h_buzz', 'hair', 'Asker Tıraşı', 0, 1, 'm');
  av('h_bald', 'hair', 'Kel', 0, 1, 'm');
  av('h_long', 'hair', 'Uzun Düz', 0, 1, 'f');
  av('h_pony', 'hair', 'At Kuyruğu', 0, 1, 'f');
  av('h_bob', 'hair', 'Küt Bob', 60, 1, 'f');
  av('h_curly', 'hair', 'Kıvırcık', 80, 2, 'u');
  av('h_bun_m', 'hair', 'Man Bun', 120, 3, 'm');
  av('h_wavy', 'hair', 'Uzun Dalgalı', 140, 3, 'u');
  av('h_buns', 'hair', 'Çift Topuz', 150, 4, 'f');
  av('h_afro', 'hair', 'Afro', 160, 4, 'u');
  av('h_braid', 'hair', 'Örgü Saç', 180, 5, 'f');
  av('h_spiky', 'hair', 'Diken Diken', 110, 2, 'm');
  av('h_mohawk', 'hair', 'Mohawk', 220, 6, 'm');
  av('h_space', 'hair', 'Yüksek Topuz', 260, 7, 'f');
  // facial hair
  av('fh_none', 'beard', 'Sakalsız', 0, 1, 'm');
  av('fh_stubble', 'beard', 'Kirli Sakal', 0, 1, 'm');
  av('fh_mustache', 'beard', 'Bıyık', 70, 2, 'm');
  av('fh_beard', 'beard', 'Gür Sakal', 90, 2, 'm');
  av('fh_goatee', 'beard', 'Keçi Sakal', 110, 3, 'm');
  // tops
  av('t_tee', 'top', 'Tişört', 0, 1, 'u');
  av('t_blouse', 'top', 'Bluz', 0, 1, 'f');
  av('t_hoodie', 'top', 'Kapüşonlu', 120, 1, 'u');
  av('t_shirt', 'top', 'Gömlek', 100, 2, 'u');
  av('t_crop', 'top', 'Crop Top', 90, 2, 'f');
  av('t_sweater', 'top', 'Örgü Kazak', 150, 3, 'u');
  av('t_turtle', 'top', 'Balıkçı Yaka', 140, 3, 'u');
  av('t_dress', 'top', 'Elbise', 180, 3, 'f', { full: true });
  av('t_jacket', 'top', 'Kot Ceket', 220, 4, 'u');
  av('t_overall', 'top', 'Salopet', 200, 4, 'u');
  av('t_varsity', 'top', 'Kolej Ceketi', 260, 5, 'u');
  av('t_blazer', 'top', 'Blazer', 300, 6, 'u');
  av('t_kimono', 'top', 'Kimono', 420, 8, 'u');
  av('t_pilot', 'top', 'Pilot Montu', 600, 10, 'u');
  // bottoms
  av('b_jeans', 'bottom', 'Kot Pantolon', 0, 1, 'u');
  av('b_jogger', 'bottom', 'Eşofman', 0, 1, 'u');
  av('b_skirt', 'bottom', 'Etek', 0, 1, 'f');
  av('b_shorts', 'bottom', 'Şort', 60, 1, 'u');
  av('b_chino', 'bottom', 'Kumaş Pantolon', 110, 2, 'u');
  av('b_pleated', 'bottom', 'Pileli Etek', 120, 3, 'f');
  av('b_cargo', 'bottom', 'Kargo Pantolon', 150, 4, 'u');
  // shoes
  av('s_sneaker', 'shoes', 'Spor Ayakkabı', 0, 1, 'u');
  av('s_slipper', 'shoes', 'Ev Terliği', 50, 1, 'u');
  av('s_boots', 'shoes', 'Bot', 120, 2, 'u');
  av('s_loafer', 'shoes', 'Loafer', 140, 3, 'u');
  av('s_heels', 'shoes', 'Topuklu', 160, 4, 'f');
  av('s_hightop', 'shoes', 'Basketbol Botu', 200, 5, 'u');
  // accessories (sub = which body spot, one per spot)
  av('a_glasses_round', 'acc', 'Yuvarlak Gözlük', 60, 1, 'u', { sub: 'face' });
  av('a_glasses_square', 'acc', 'Kare Gözlük', 60, 1, 'u', { sub: 'face' });
  av('a_flower', 'acc', 'Saç Çiçeği', 70, 1, 'f', { sub: 'hairacc' });
  av('a_beanie', 'acc', 'Bere', 90, 2, 'u', { sub: 'head' });
  av('a_cap', 'acc', 'Kep Şapka', 100, 2, 'u', { sub: 'head' });
  av('a_earrings', 'acc', 'Küpe', 80, 2, 'u', { sub: 'ears' });
  av('a_bowtie', 'acc', 'Papyon', 90, 2, 'u', { sub: 'neck' });
  av('a_scarf', 'acc', 'Atkı', 110, 2, 'u', { sub: 'neck' });
  av('a_headphones', 'acc', 'Kulaklık', 180, 3, 'u', { sub: 'ears' });
  av('a_catears', 'acc', 'Kedi Kulağı Taç', 140, 3, 'u', { sub: 'head' });
  av('a_necklace', 'acc', 'Kolye', 130, 3, 'f', { sub: 'neck' });
  av('a_backpack', 'acc', 'Sırt Çantası', 160, 3, 'u', { sub: 'back' });
  av('a_sunglasses', 'acc', 'Güneş Gözlüğü', 150, 4, 'u', { sub: 'face' });
  av('a_watch', 'acc', 'Akıllı Saat', 170, 4, 'u', { sub: 'wrist' });
  av('a_pilotcap', 'acc', 'Pilot Şapkası', 800, 12, 'u', { sub: 'head' });
  av('a_crown', 'acc', 'Altın Taç', 1500, 15, 'u', { sub: 'head' });
  av('a_wings', 'acc', 'Melek Kanatları', 2000, 18, 'u', { sub: 'back' });
  av('a_halo', 'acc', 'Odak Halesi', 2600, 20, 'u', { sub: 'aura' });

  // ---------- Room catalog ----------
  const R = [];
  const it = (id, sub, name, price, lvl, extra = {}) => R.push(Object.assign({ id, cat: 'furn', sub, name, price, lvl }, extra));
  // desks & tables (surface = top height)
  it('f_desk_wood', 'Masa', 'Ahşap Çalışma Masası', 0, 1, { tint: 1, surface: 0.76, fp: [1.4, 0.7] });
  it('f_desk_white', 'Masa', 'Beyaz Minimal Masa', 120, 1, { tint: 1, surface: 0.76, fp: [1.4, 0.7] });
  it('f_table_round', 'Masa', 'Yuvarlak Kafe Masası', 200, 3, { tint: 1, surface: 0.76, fp: [1.1, 1.1] });
  it('f_desk_standing', 'Masa', 'Ayarlı Masa', 300, 5, { surface: 0.76, fp: [1.5, 0.75] });
  it('f_desk_gaming', 'Masa', 'RGB Oyuncu Masası', 450, 6, { surface: 0.76, fp: [1.6, 0.75] });
  it('f_table_long', 'Masa', 'Uzun Kütüphane Masası', 520, 7, { tint: 1, surface: 0.76, fp: [3.2, 1.2] });
  // chairs (seat)
  it('f_chair_wood', 'Sandalye', 'Ahşap Sandalye', 0, 1, { tint: 1, seat: 1, fp: [0.5, 0.5] });
  it('f_stool', 'Sandalye', 'Tabure', 60, 1, { seat: 1, fp: [0.4, 0.4] });
  it('f_chair_office', 'Sandalye', 'Ofis Koltuğu', 150, 2, { tint: 1, seat: 1, fp: [0.6, 0.6] });
  it('f_beanbag', 'Sandalye', 'Armut Koltuk', 180, 3, { tint: 1, seat: 1, low: 1, fp: [0.8, 0.8] });
  it('f_chair_gaming', 'Sandalye', 'Oyuncu Koltuğu', 400, 6, { seat: 1, fp: [0.65, 0.65] });
  // seating
  it('f_armchair', 'Oturma', 'Berjer', 220, 3, { tint: 1, seat: 1, fp: [0.9, 0.85] });
  it('f_sofa', 'Oturma', 'İkili Kanepe', 350, 4, { tint: 1, seat: 2, fp: [1.8, 0.85] });
  it('f_sofa_l', 'Oturma', 'L Koltuk', 600, 8, { tint: 1, seat: 3, fp: [2.4, 1.6] });
  // beds
  it('f_bed_single', 'Yatak', 'Tek Kişilik Yatak', 250, 2, { tint: 1, fp: [1.1, 2.1] });
  it('f_bed_double', 'Yatak', 'Çift Kişilik Yatak', 500, 7, { tint: 1, fp: [1.7, 2.2] });
  // storage
  it('f_bookshelf', 'Depolama', 'Kitaplık', 200, 2, { fp: [1.1, 0.4] });
  it('f_dresser', 'Depolama', 'Şifonyer', 180, 3, { fp: [1.0, 0.5] });
  it('f_shelf_tall', 'Depolama', 'Tavan Kitaplığı', 300, 4, { fp: [1.4, 0.4] });
  // lights
  it('f_lamp_floor', 'Aydınlatma', 'Lambader', 140, 2, { tint: 1, fp: [0.4, 0.4], light: 1 });
  it('f_lava', 'Aydınlatma', 'Lav Lambası', 220, 5, { fp: [0.3, 0.3], light: 1 });
  // plants
  it('f_cactus', 'Bitki', 'Kaktüs', 50, 1, { fp: [0.35, 0.35] });
  it('f_monstera', 'Bitki', 'Deve Tabanı', 90, 1, { fp: [0.6, 0.6] });
  it('f_bonsai', 'Bitki', 'Bonsai', 260, 5, { fp: [0.5, 0.5] });
  it('f_olive', 'Bitki', 'Saksıda Zeytin Ağacı', 320, 6, { fp: [0.7, 0.7] });
  // rugs
  it('f_rug_round', 'Halı', 'Yuvarlak Halı', 100, 1, { rug: 1, fp: [1.8, 1.8] });
  it('f_rug_rect', 'Halı', 'Çizgili Halı', 120, 2, { rug: 1, fp: [2.4, 1.6] });
  it('f_rug_kilim', 'Halı', 'Anadolu Kilimi', 280, 5, { rug: 1, fp: [2.6, 1.7] });
  // decor
  it('f_globe', 'Dekor', 'Dünya Küresi', 150, 3, { fp: [0.4, 0.4] });
  it('f_plane_model', 'Dekor', 'Uçak Maketi', 450, 7, { fp: [0.6, 0.6] });
  it('f_telescope', 'Dekor', 'Teleskop', 500, 8, { fp: [0.6, 0.6] });
  it('f_aquarium', 'Dekor', 'Akvaryum', 700, 9, { fp: [1.2, 0.5] });
  it('f_rocket', 'Dekor', 'Roket Maketi', 520, 9, { fp: [0.5, 0.5] });
  it('f_trophy', 'Dekor', 'Odak Kupası', 400, 10, { fp: [0.4, 0.4] });
  it('f_fireplace', 'Dekor', 'Şömine', 900, 11, { fp: [1.4, 0.5], light: 1 });
  // music / kitchen / tech
  it('f_guitar', 'Hobi', 'Gitar', 300, 4, { fp: [0.5, 0.4] });
  it('f_record', 'Hobi', 'Pikap', 280, 5, { fp: [0.6, 0.5] });
  it('f_piano', 'Hobi', 'Dijital Piyano', 650, 8, { fp: [1.4, 0.5] });
  it('f_console', 'Hobi', 'Oyun Konsolu ve TV', 900, 6, { fp: [1.5, 0.55] });
  it('f_coffee', 'Mutfak', 'Kahve Köşesi', 200, 3, { fp: [0.8, 0.5] });
  it('f_fridge', 'Mutfak', 'Mini Buzdolabı', 260, 4, { fp: [0.6, 0.6] });
  // tabletop (top: placed on desks if possible)
  // shop expansion (user 2026-11-03: a room that shows your own style) — many take your colour (c)
  it('f_flower_vase', 'Bitki', 'Çiçekli Vazo', 110, 2, { fp: [0.35, 0.35], tint: 1 });
  it('f_bird_paradise', 'Bitki', 'Cennet Kuşu Bitkisi', 300, 6, { fp: [0.7, 0.7] });
  it('f_succulents', 'Bitki', 'Sukulent Tepsisi', 80, 1, { fp: [0.5, 0.3] });
  it('f_lamp_mushroom', 'Aydınlatma', 'Mantar Lamba', 160, 3, { fp: [0.35, 0.35], light: 1, tint: 1 });
  it('f_lantern', 'Aydınlatma', 'Fener', 130, 2, { fp: [0.3, 0.3], light: 1 });
  it('f_skateboard', 'Dekor', 'Kaykay', 180, 3, { fp: [0.8, 0.25], tint: 1 });
  it('f_vase_tall', 'Dekor', 'Uzun Seramik Vazo', 140, 2, { fp: [0.3, 0.3], tint: 1 });
  it('f_easel', 'Hobi', 'Şövale ve Tuval', 320, 4, { fp: [0.7, 0.6], vars: 8 });
  it('f_yoga_mat', 'Hobi', 'Yoga Matı', 120, 2, { fp: [1.8, 0.65], rug: 1, tint: 1 });
  it('f_camera', 'Hobi', 'Kamera Tripodu', 260, 4, { fp: [0.6, 0.6] });
  it('f_bunny', 'Evcil', 'Beyaz Tavşan', 380, 5, { fp: [0.4, 0.5], text: 1 });
  it('f_fishbowl', 'Evcil', 'Balık Fanusu', 220, 3, { fp: [0.4, 0.4], text: 1 });
  it('f_parrot', 'Evcil', 'Muhabbet Kuşu Kafesi', 450, 6, { fp: [0.5, 0.5], text: 1 });
  it('f_hammock', 'Oturma', 'Askılı Salıncak Koltuk', 520, 7, { fp: [1, 1], tint: 1 });
  it('f_pouf', 'Oturma', 'Örgü Puf', 110, 2, { fp: [0.5, 0.5], tint: 1 });
  it('f_rug_shag', 'Halı', 'Peluş Halı', 150, 2, { rug: 1, fp: [2, 1.4], tint: 1 });
  it('f_rug_checker', 'Halı', 'Damalı Halı', 170, 3, { rug: 1, fp: [2, 2], tint: 1 });
  it('f_rug_rainbow', 'Halı', 'Gökkuşağı Halı', 220, 4, { rug: 1, fp: [2.2, 1.2] });
  it('f_doormat', 'Halı', 'Yazılı Paspas', 90, 1, { rug: 1, fp: [1, 0.6], text: 1, tint: 1 });
  it('d_laptop', 'Masaüstü', 'Dizüstü Bilgisayar', 0, 1, { top: 1, fp: [0.4, 0.3] });
  it('d_lamp', 'Masaüstü', 'Masa Lambası', 0, 1, { tint: 1, top: 1, fp: [0.25, 0.25], light: 1 });
  it('d_books', 'Masaüstü', 'Kitap Yığını', 40, 1, { top: 1, fp: [0.3, 0.25] });
  it('d_plant', 'Masaüstü', 'Küçük Saksı', 40, 1, { top: 1, fp: [0.2, 0.2] });
  it('d_mug', 'Masaüstü', 'Kahve Kupası', 30, 1, { top: 1, fp: [0.15, 0.15] });
  it('d_monitor', 'Masaüstü', 'Çift Monitör', 380, 5, { top: 1, fp: [0.9, 0.3] });
  it('d_tomato', 'Masaüstü', 'Domates Zamanlayıcı', 120, 2, { top: 1, fp: [0.15, 0.15] });
  it('d_hourglass', 'Masaüstü', 'Kum Saati', 120, 2, { top: 1, fp: [0.15, 0.15] });
  it('d_crystal', 'Masaüstü', 'Kristal Küre', 240, 5, { top: 1, fp: [0.2, 0.2] });
  it('d_photo', 'Masaüstü', 'Çerçeveli Fotoğraf', 60, 1, { top: 1, fp: [0.2, 0.15] });
  it('d_headphones', 'Masaüstü', 'Kulaklık', 120, 2, { top: 1, fp: [0.25, 0.2], tint: 1 });
  it('f_candles', 'Aydınlatma', 'Mum Seti', 90, 2, { fp: [0.4, 0.3], light: 1 });
  it('f_pendant', 'Aydınlatma', 'Sarkıt Lamba', 240, 4, { tint: 1, fp: [0.5, 0.5], light: 1, hang: 1 });
  it('f_cushion', 'Oturma', 'Yer Minderi', 120, 2, { tint: 1, seat: 1, low: 1, fp: [0.6, 0.6] });
  it('f_teddy', 'Dekor', 'Peluş Ayı', 160, 3, { fp: [0.3, 0.3] });
  // pets
  it('f_cat', 'Evcil', 'Tekir Kedi', 800, 6, { pet: 'cat', fp: [0.5, 0.3], text: 1 });
  it('f_dog', 'Evcil', 'Golden Köpek', 900, 8, { pet: 'dog', fp: [0.7, 0.4], text: 1 });
  // wall items
  const w = (id, name, price, lvl, extra = {}) => R.push(Object.assign({ id, cat: 'furn', sub: 'Duvar', name, price, lvl, wall: 1 }, extra));
  w('w_clock', 'Duvar Saati', 90, 1, { ww: 0.5, wy: 2.3 });
  w('w_poster_space', 'Uzay Posteri', 80, 1, { ww: 0.7, wy: 1.8 });
  w('w_poster_plane', 'Havacılık Posteri', 120, 2, { ww: 0.7, wy: 1.8 });
  w('w_shelf', 'Duvar Rafı', 110, 2, { ww: 1.0, wy: 1.6 });
  w('w_whiteboard', 'Yazı Tahtası', 150, 3, { ww: 1.4, wy: 1.6 });
  w('w_fairy', 'Peri Işıkları', 160, 3, { ww: 2.0, wy: 2.6, light: 1 });
  w('w_painting', 'Soyut Tablo', 200, 4, { ww: 1.0, wy: 1.7 });
  w('w_worldmap', 'Dünya Haritası', 220, 4, { ww: 1.4, wy: 1.7 });
  w('w_neon', 'Neon "ODAK" Tabelası', 380, 6, { ww: 1.2, wy: 2.0, light: 1 });
  // personal wall pieces (user 2026-11-03): your own neon words, a poster whose design you pick, a letter garland
  w('w_neon_text', 'Kendi Neon Yazın', 450, 4, { ww: 1.3, wy: 1.75, text: 1, tint: 1 });
  w('w_poster_art', 'Desenli Poster', 120, 1, { ww: 0.62, wy: 1.5, vars: 8 });
  w('w_garland', 'Harfli Flama', 180, 2, { ww: 1.4, wy: 2.05, text: 1 });
  w('w_ivy', 'Sarkan Sarmaşık', 150, 3, { ww: 0.6, wy: 2.1 });
  w('w_moon', 'Ay Lambası', 240, 4, { ww: 0.5, wy: 1.8, light: 1 });
  w('w_star_lights', 'Yıldız Perdesi', 200, 3, { ww: 1.4, wy: 1.8 });
  w('w_hoop', 'Basket Potası', 350, 5, { ww: 0.7, wy: 1.95 });
  w('w_vinyl', 'Plak Duvarı', 160, 3, { ww: 1.1, wy: 1.6 });
  w('w_polaroid', 'Polaroid İpi', 140, 2, { ww: 1.2, wy: 1.55 });
  w('w_mirror', 'Yuvarlak Ayna', 200, 3, { ww: 0.6, wy: 1.5, tint: 1 });
  w('w_tv', 'Duvar TV', 500, 7, { ww: 1.4, wy: 1.5 });
  w('w_diploma', 'Çerçeveli Diploma', 300, 9, { ww: 0.6, wy: 1.8 });
  w('w_frames', 'Fotoğraf Duvarı', 140, 2, { ww: 1.0, wy: 1.7 });
  w('w_cork', 'Mantar Pano', 110, 2, { ww: 1.0, wy: 1.6 });
  w('w_plantshelf', 'Bitkili Raf', 200, 4, { ww: 0.9, wy: 1.9 });

  // ---------- Themes / views / sizes ----------
  const T = [
    { id: 'th_wood', name: 'Ahşap Stüdyo', price: 0, lvl: 1, wall: '#E9DCC8', wall2: '#D8C6AA', floor: '#B07D52', floor2: '#8F6140', pat: 'plank', trim: '#7A5233' },
    { id: 'th_white', name: 'Beyaz Minimal', price: 150, lvl: 2, wall: '#F2F1EE', wall2: '#E4E2DD', floor: '#D9D2C7', floor2: '#C9C0B2', pat: 'tile', trim: '#BFB8AC' },
    { id: 'th_pastel', name: 'Pastel Rüya', price: 250, lvl: 3, wall: '#F4D9E2', wall2: '#E9C3D2', floor: '#E8DCCB', floor2: '#D7C6AF', pat: 'herring', trim: '#C98FA6' },
    { id: 'th_navy', name: 'Gece Mavisi', price: 300, lvl: 4, wall: '#2D3E63', wall2: '#24334F', floor: '#6E4F3A', floor2: '#553B2B', pat: 'plank', trim: '#1A2640' },
    { id: 'th_sage', name: 'Adaçayı Yeşili', price: 320, lvl: 4, wall: '#B9C9AE', wall2: '#A5B898', floor: '#C69C6D', floor2: '#A97F55', pat: 'herring', trim: '#7E9470' },
    { id: 'th_brick', name: 'Tuğla Loft', price: 400, lvl: 5, wall: '#A8553E', wall2: '#8E4331', floor: '#5D5550', floor2: '#4B4440', pat: 'concrete', trim: '#3A3330', wallpat: 'brick' },
    { id: 'th_tatami', name: 'Japon Tatami', price: 500, lvl: 7, wall: '#EFE6D2', wall2: '#D9CDB3', floor: '#C8C08A', floor2: '#ACA36E', pat: 'tatami', trim: '#5B4330', wallpat: 'shoji' },
    { id: 'th_cabin', name: 'Orman Kulübesi', price: 550, lvl: 8, wall: '#8C5B37', wall2: '#734828', floor: '#6B4428', floor2: '#55341E', pat: 'plank', trim: '#4A2E19', wallpat: 'logs' },
    { id: 'th_library', name: 'Eski Kütüphane', price: 650, lvl: 9, wall: '#33513F', wall2: '#2A4434', floor: '#5A3A26', floor2: '#47291A', pat: 'herring', trim: '#C9A35A', wallpat: 'wainscot' },
    { id: 'th_cini', name: 'İznik Çini', price: 800, lvl: 10, wall: '#F1F4F7', wall2: '#DCE5EE', floor: '#B65B3E', floor2: '#9B4A31', pat: 'tile', trim: '#1F5FA8', wallpat: 'cini' },
    { id: 'th_space', name: 'Uzay İstasyonu', price: 1200, lvl: 14, wall: '#C9CED6', wall2: '#AEB5C0', floor: '#4C5563', floor2: '#3B434F', pat: 'panel', trim: '#2BB3C9', wallpat: 'panel' },
  ].map((x) => Object.assign({ cat: 'theme' }, x));

  const V = [
    { id: 'v_city_day', name: 'Şehir — Gündüz', price: 0, lvl: 1 },
    { id: 'v_city_night', name: 'Şehir — Gece', price: 120, lvl: 2 },
    { id: 'v_mountain', name: 'Dağ Gölü', price: 250, lvl: 3 },
    { id: 'v_bosphorus', name: 'İstanbul Boğazı', price: 350, lvl: 4 },
    { id: 'v_beach', name: 'Sahilde Gün Batımı', price: 300, lvl: 5 },
    { id: 'v_cappadocia', name: 'Kapadokya Balonları', price: 450, lvl: 6 },
    { id: 'v_snow', name: 'Karlı Orman', price: 400, lvl: 7 },
    { id: 'v_rain', name: 'Yağmurlu Gece', price: 500, lvl: 8 },
    { id: 'v_clouds', name: 'Bulutların Üstü', price: 700, lvl: 9 },
    { id: 'v_aurora', name: 'Kuzey Işıkları', price: 900, lvl: 11 },
    { id: 'v_space', name: 'Yörüngeden Dünya', price: 1500, lvl: 15 },
  ].map((x) => Object.assign({ cat: 'view' }, x));

  const S = [
    { id: 'sz_s', name: 'Küçük Oda (7×7)', price: 0, lvl: 1, size: 7 },
    { id: 'sz_m', name: 'Stüdyo (9×9)', price: 500, lvl: 5, size: 9 },
    { id: 'sz_l', name: 'Loft (11×11)', price: 1500, lvl: 12, size: 11 },
  ].map((x) => Object.assign({ cat: 'size' }, x));

  PW.CATALOG = [...A, ...R, ...T, ...V, ...S];
  PW.ITEM = Object.fromEntries(PW.CATALOG.map((x) => [x.id, x]));
  PW.AVATAR_ITEMS = A; PW.ROOM_ITEMS = R; PW.THEMES = T; PW.VIEWS = V; PW.SIZES = S;

  // ---------- Economy ----------
  PW.ECON = {
    xpPerMin: 1, coinPerMin: 1,
    pomoXP: 10, pomoCoin: 5,
    setBonusXP: 25, setBonusCoin: 15, // every 4th
    groupBonusPer: 0.1, groupBonusMax: 0.3, // +10% per other real person, max +30%
    dailyGoal: 4, dailyGoalCoin: 40,
    startCoins: 150,
  };
  // XP needed to go from level L to L+1
  PW.xpStep = (L) => Math.round(60 * Math.pow(L, 1.35));
  PW.levelFromXP = (xp) => {
    let L = 1, need = PW.xpStep(1), rest = xp;
    while (rest >= need && L < 99) { rest -= need; L++; need = PW.xpStep(L); }
    return { level: L, into: rest, need };
  };
  PW.TITLES = [
    [1, 'Çaylak'], [3, 'Tomurcuk'], [5, 'Odak Çırağı'], [7, 'Masa Kurdu'], [9, 'Derin Odak'],
    [12, 'Zaman Bükücü'], [15, 'Pomodoro Ustası'], [18, 'Odak Bilgesi'], [22, 'Efsane'],
  ];
  PW.titleFor = (L) => { let t = PW.TITLES[0][1]; for (const [l, n] of PW.TITLES) if (L >= l) t = n; return t; };
  PW.LEAGUES = [
    { id: 'bronz', name: 'Bronz Lig', min: 0, color: '#C98B5A' },
    { id: 'gumus', name: 'Gümüş Lig', min: 300, color: '#B9C2CC' },
    { id: 'altin', name: 'Altın Lig', min: 900, color: '#E9C04F' },
    { id: 'platin', name: 'Platin Lig', min: 1800, color: '#7FD3C8' },
    { id: 'elmas', name: 'Elmas Lig', min: 3000, color: '#9DB7FF' },
  ];
  PW.leagueFor = (wxp) => { let l = PW.LEAGUES[0]; for (const x of PW.LEAGUES) if (wxp >= x.min) l = x; return l; };

  PW.ACHIEVEMENTS = [
    { id: 'first', name: 'İlk Domates', desc: 'İlk pomodoronu tamamla', coin: 30, test: (s) => s.stats.pomos >= 1 },
    { id: 'p10', name: 'Onluk', desc: '10 pomodoro tamamla', coin: 60, test: (s) => s.stats.pomos >= 10 },
    { id: 'p50', name: 'Elli Domates', desc: '50 pomodoro tamamla', coin: 150, test: (s) => s.stats.pomos >= 50 },
    { id: 'p100', name: 'Domates Tarlası', desc: '100 pomodoro tamamla', coin: 300, test: (s) => s.stats.pomos >= 100 },
    { id: 'h10', name: '10 Saat Kulübü', desc: 'Toplam 10 saat odaklan', coin: 120, test: (s) => s.stats.focusMin >= 600 },
    { id: 's3', name: 'Isınma Turu', desc: '3 günlük seri yap', coin: 50, test: (s) => s.stats.streak >= 3 },
    { id: 's7', name: 'Haftalık Seri', desc: '7 günlük seri yap', coin: 140, test: (s) => s.stats.streak >= 7 },
    { id: 'night', name: 'Gece Kuşu', desc: 'Saat 23:00 sonrası bir pomodoro bitir', coin: 40, test: (s) => s.flags.night },
    { id: 'early', name: 'Erkenci', desc: 'Saat 07:00 öncesi bir pomodoro bitir', coin: 40, test: (s) => s.flags.early },
    { id: 'social', name: 'Sosyal Kelebek', desc: '20 sohbet mesajı gönder', coin: 40, test: (s) => s.stats.msgs >= 20 },
    { id: 'decor', name: 'İç Mimar', desc: 'Odana 12 eşya yerleştir', coin: 80, test: (s) => s.room.items.length >= 12 },
    { id: 'collect', name: 'Koleksiyoncu', desc: '30 farklı eşyaya sahip ol', coin: 150, test: (s) => Object.keys(s.owned).length >= 30 },
    { id: 'deep', name: 'Derin Dalış', desc: '90 dakikalık bir oturum tamamla', coin: 80, test: (s) => s.flags.deep },
  ];

  PW.TIMER_PRESETS = [
    { id: 'p15', name: '15 / 3', focus: 15, brk: 3, long: 10, hint: 'Isınma' },
    { id: 'p25', name: '25 / 5', focus: 25, brk: 5, long: 15, hint: 'Dengeli' },
    { id: 'p50', name: '50 / 10', focus: 50, brk: 10, long: 20, hint: 'Derin' },
    { id: 'p90', name: '90 / 20', focus: 90, brk: 20, long: 30, hint: 'Maraton' },
    { id: 'p45', name: '45 / 15', focus: 45, brk: 15, long: 25, hint: 'Etüt' },
  ];

  // ---------- Public rooms ----------
  // layout items: [id, x, z, rotY]  (rot in quarter turns)
  function longTableRoom(n) {
    const items = [['f_table_long', 0, 0, 0]];
    const xs = n >= 8 ? [-1.2, -0.4, 0.4, 1.2] : [-1, 0, 1];
    xs.forEach((x) => { items.push(['f_chair_wood', x, -0.95, 0]); items.push(['f_chair_wood', x, 0.95, 2]); });
    return items;
  }
  PW.PUBLIC_ROOMS = [
    {
      id: 'meydan', kind: 'social', name: 'Meydan Kafe', desc: 'Moladayken uğra, sohbet et, tanış.', theme: 'th_wood', view: 'v_city_day', mood: 'golden', size: 11, npc: 6,
      items: [['f_sofa', -3, -4.6, 0], ['f_sofa', 2.6, -4.6, 0], ['f_sofa_l', -3.4, 2.8, 0], ['f_armchair', 0, -2.4, 0], ['f_table_round', 2.8, 1.2, 0], ['f_chair_wood', 2.8, 0.4, 0], ['f_chair_wood', 2.8, 2.0, 2], ['f_coffee', 4.8, -4.7, 0], ['f_fridge', 4.0, -4.75, 0], ['f_record', -5, -1, 1], ['f_piano', 5, 3.4, 3], ['f_monstera', -5, -4.8, 0], ['f_olive', 5, 5, 0], ['f_rug_round', 0, 0, 0], ['f_cat', 0.6, 0.8, 1], ['w_neon', 'w1', 0, 0], ['w_fairy', 'w0', 0, 0], ['w_painting', 'w3', 0, 0]],
    },
    {
      id: 'teras', kind: 'social', name: 'Çatı Terası', desc: 'Gün batımında sohbet köşesi.', theme: 'th_sage', view: 'v_beach', size: 11, npc: 5,
      items: [['f_beanbag', -2, 1.5, 0], ['f_beanbag', -1, 2.4, 2], ['f_beanbag', 1.2, 2.0, 3], ['f_sofa', 0, -4.6, 0], ['f_armchair', -4.4, -3.6, 1], ['f_table_round', 3, -1.5, 0], ['f_stool', 3, -2.3, 0], ['f_stool', 3.8, -1.5, 3], ['f_stool', 2.2, -1.5, 1], ['f_olive', -5, 5, 0], ['f_olive', 5, -5, 0], ['f_bonsai', 5, 5, 0], ['f_rug_kilim', -0.6, 1.8, 0], ['f_guitar', -4.8, 0.5, 1], ['f_dog', 1.4, 0.2, 2], ['w_fairy', 'w0', 0, 0], ['w_fairy', 'w1', 0, 0]],
    },
    {
      id: 'oyun', kind: 'social', name: 'Oyun Salonu', desc: 'Neonlar, pikap ve dans pisti.', theme: 'th_navy', view: 'v_aurora', mood: 'neon', size: 11, npc: 4,
      items: [['f_sofa_l', 3, 3, 3], ['f_beanbag', -3, 3, 1], ['f_beanbag', -2, 4, 2], ['f_desk_gaming', -3.5, -4.4, 0], ['f_chair_gaming', -3.5, -3.6, 2], ['f_desk_gaming', 0, -4.4, 0], ['f_chair_gaming', 0, -3.6, 2], ['f_record', 4.8, -4.5, 0], ['f_lava', 5, -3, 0], ['f_lava', -5, -1, 0], ['f_rug_round', 0, 0.5, 0], ['f_aquarium', -5, 0.5, 1], ['d_monitor', -3.5, -4.45, 0], ['d_monitor', 0, -4.45, 0], ['w_neon', 'w1', 0, 0], ['w_tv', 'w3', 0, 0], ['f_console', 0.6, 3.0, 1]],
    },
  ];

  PW.DEFAULT_ROOM = () => ({
    name: 'Odam', desc: 'Birlikte odaklanalım.', cat: 'Genel', open: true, token: Math.random().toString(36).slice(2, 8),
    theme: 'th_wood', view: 'v_city_day', size: 7, mood: 'golden', wall: '#E9DCC8', wallPat: 'plain', floorT: 'plank', floorC: '#B07D52', curtain: '#C98FA6',
    // a new player starts with an empty room: just a desk and its chair; everything else is earned
    items: [
      { id: 'f_desk_wood', x: 0.2, z: -1.15, r: 0 },
      { id: 'f_chair_wood', x: 0.2, z: -1.9, r: 0 },
    ],
  });
  PW.ROOM_CATS = ['Genel', 'YKS', 'LGS', 'KPSS', 'ALES/YDS', 'Üniversite', 'Yazılım', 'Dil', 'Sanat & Tasarım', 'İş'];
  PW.TASK_CATS = [['Ders', '#E8553D'], ['Proje', '#8FB8FF'], ['Okuma', '#F2C14E'], ['Kodlama', '#6CBF6A'], ['Dil', '#E58BB0'], ['Yazı', '#B48AFF'], ['Diğer', '#C9C2DA']];
  PW.LOGIN_REWARDS = [15, 20, 25, 30, 40, 50, 80];
  PW.QUESTS = {
    daily: [
      { id: 'd_login', name: 'Günlük Giriş', desc: 'Uygulamaya giriş yap', goal: 1, xp: 10, coin: 0 },
      { id: 'd_pomo', name: 'Isınma Turu', desc: '1 pomodoro tamamla', goal: 1, xp: 10, coin: 5 },
      { id: 'd_together', name: 'Birlikte Çalışalım', desc: 'Başkasıyla aynı odada 1 pomodoro tamamla', goal: 1, xp: 15, coin: 10 },
      { id: 'd_social', name: 'Sosyal Kelebek', desc: 'Sosyal alanda 3 mesaj gönder', goal: 3, xp: 10, coin: 5 },
      { id: 'd_min', name: 'Derin Nefes', desc: 'Bugün 50 dakika odaklan', goal: 50, xp: 20, coin: 10 },
    ],
    weekly: [
      { id: 'w_min', name: 'Odaklanma Maratonu', desc: '600 dakika odaklan', goal: 600, xp: 80, coin: 30 },
      { id: 'w_days', name: 'Seri Ustası', desc: '5 gün üst üste giriş yap', goal: 5, xp: 70, coin: 20 },
      { id: 'w_balance', name: 'Dengeli Hafta', desc: '5 farklı gün en az 25 dakika odaklan', goal: 5, xp: 70, coin: 30 },
      { id: 'w_decor', name: 'İç Mimar', desc: 'Odana 3 eşya yerleştir', goal: 3, xp: 40, coin: 20 },
    ],
  };
  PW.PLEDGE_MIN = [25, 45, 60, 90];
  PW.PLEDGE_DAYS = [[3, 2, 60], [5, 4, 110], [7, 6, 175], [30, 30, 800]];
  PW.STARTER_OWNED = ['h_short', 'h_side', 'h_buzz', 'h_bald', 'h_long', 'h_pony', 'h_bob', 'fh_none', 'fh_stubble', 't_tee', 't_blouse', 't_hoodie', 'b_jeans', 'b_jogger', 'b_skirt', 's_sneaker', 'th_wood', 'v_city_day', 'sz_s'];
  // premium surfaces (level gates); everything else is free to recolor
  PW.SURFACE_LVL = { brick: 3, wainscot: 4, shoji: 5, logs: 5, cini: 6, panel: 8, floral: 2, wave: 2, tatami: 5, checker: 3, concrete: 4, carpet: 2, herring: 2, stars: 3, clouds: 2, plaid: 3, geo: 4, terrazzo: 3, hex: 4, marble: 6 };
  PW.MOOD_LVL = { day: 1, golden: 1, night: 1, candle: 3, neon: 5 };

  PW.NPC_NAMES = ['Ece', 'Mert', 'Zeynep', 'Kerem', 'Elif', 'Can', 'Defne', 'Arda', 'Selin', 'Emir', 'Nehir', 'Baran', 'Ada', 'Deniz', 'Lara', 'Yiğit', 'İpek', 'Kaan', 'Asya', 'Efe'];
  PW.NPC_TOPICS = ['YKS matematik', 'KPSS tarih', 'Tez yazımı', 'React projesi', 'İngilizce kelime', 'Fizik ödevi', 'Sunum hazırlığı', 'Organik kimya', 'Python kursu', 'ALES sayısal', 'Roman okuma', 'Tasarım işi'];
  PW.NPC_LINES_BREAK = ['Mola! Herkes su içsin.', 'Bir pomodoro daha bitti, iyi gidiyoruz.', 'Kahve alan var mı?', 'Bu turda 12 soru çözdüm.', 'Gözlerimi dinlendiriyorum biraz.', 'Sonraki turda kaldığım yerden devam.', 'Biraz esneme hareketi yaptım, iyi geldi.', 'Molada şu manzaraya bakmak güzel.'];
  PW.NPC_LINES_SOCIAL = ['Selam herkese!', 'Bugün kaç pomodoro yaptınız?', 'Yeni halımı aldım, odama çok yakıştı.', 'Kütüphane odası bu akşam dolu.', 'Seviye 5 oldum sonunda!', 'Kapadokya manzarası efsane.', 'Birazdan çalışma odasına geçiyorum.', 'Kedim masanın üstünde uyuyor :)', 'Kim YKS\'ye hazırlanıyor?', 'Müzik önerisi olan?'];
})();

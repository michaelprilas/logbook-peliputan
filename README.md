# Portal Peliputan Pimpinan 2026
**Biro Komunikasi Publik • Kementerian Perumahan dan Kawasan Permukiman (PKP)**

Aplikasi web interaktif untuk memonitor, mencari, dan mengelola database dokumentasi & peliputan pimpinan Kementerian PKP tahun 2026.

---

## ✨ Fitur Utama

1. **Dashboard Eksekutif & Analisis Tren**
   - KPI Ringkasan: Total Kegiatan, Rasio Publikasi Berita (`pkp.go.id`), Rasio Publikasi Video Media/Reels, dan Jumlah Personel.
   - Grafik Tren Bulanan: Fluktuasi kegiatan dan publikasi per bulan sepanjang 2026.
   - Peta & Sebaran Wilayah: 5 provinsi dengan intensitas peliputan tertinggi.

2. **Pencarian Cepat & Filter Multi-Kriteria**
   - Instant search judul kegiatan, topik (Rusun, BSPS, Kunker), lokasi kota/provinsi, atau nama petugas.
   - Filter dropdown dinamis: Bulan, Status Berita, Status Video, Provinsi, dan Petugas Peliput.
   - Tampilan ganda: **Tampilan Kartu (Cards)** dan **Tampilan Tabel Ringkas**.

3. **Salin Laporan WhatsApp (1-Klik)**
   - Format otomatis siap kirim ke grup pimpinan / tim dokumentasi via WhatsApp.

4. **Leaderboard Tim Peliput**
   - Rekap beban penugasan seluruh personel lapangan (Ilham, Fitrah, Bintang, Wahyu, Michael, dll.).
   - Klik nama petugas langsung menyaring seluruh riwayat penugasan orang tersebut.

5. **Sinkronisasi Data Otomatis ke Google Sheet**
   - Jalankan `npm run sync` kapan saja untuk memperbarui data langsung dari Google Sheet resmi tanpa perlu input manual ulang.

---

## 🚀 Panduan Menjalankan Proyek

### 1. Masuk ke Direktori
```bash
cd /Users/michael/.gemini/antigravity/scratch/portal-peliputan-pkp
```

### 2. Jalankan Server Lokal
```bash
npm run dev
```
Aplikasi dapat dibuka di browser pada: **`http://localhost:3000`**

### 3. Sinkronisasi Data Terbaru dari Google Sheet
Setiap kali ada pembaruan di Google Sheet pimpinan, cukup jalankan:
```bash
npm run sync
```

### 4. Build untuk Produksi
```bash
npm run build
```
Hasil build siap dideploy ada di folder `dist/`.

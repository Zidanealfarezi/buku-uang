# Buku Uang

Pencatat uang pribadi berbentuk web app, dioptimalkan untuk iPhone, di-hosting di Vercel.

## Fitur
- Catat uang keluar, masuk, dan pindah saldo antar akun (Cash, ShopeePay, DANA, dll.)
- Akun "titip" (uang di orang lain) dipisah dari uang siap pakai
- Strip tanggal per minggu, statistik pengeluaran 7 hari, rincian per kategori
- Daftar hutang/cicilan dengan tombol Bayar (otomatis tercatat sebagai pengeluaran)
- Foto struk → terisi otomatis (opsional, butuh `ANTHROPIC_API_KEY`)
- Dikunci PIN; data tersinkron di semua perangkat
- Mode terang dan gelap mengikuti perangkat

## Arsitektur
- `index.html` — seluruh tampilan
- `api/data.js` — baca/tulis data (GET, POST ops)
- `api/auth.js` — buat/cek PIN (hash scrypt, disimpan di Blob)
- `api/scan.js` — baca foto struk lewat Claude API
- Database: **Vercel Blob (private)**, satu file `bukuuang/data.json`

## Environment variables (Vercel)
| Nama | Wajib | Keterangan |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | ya | otomatis saat Blob store dihubungkan ke project |
| `INITIAL_DATA` | tidak | JSON data awal, dipakai hanya jika database masih kosong |
| `ANTHROPIC_API_KEY` | tidak | mengaktifkan fitur Foto struk |
| `SCAN_MODEL` | tidak | model untuk Foto struk (default `claude-sonnet-5-5`) |

## Lupa PIN
Hapus file `bukuuang/auth.json` dari Blob store di dashboard Vercel (Storage → Blob), lalu buka web lagi untuk membuat PIN baru. Data tidak ikut terhapus.

## Buka cepat di iPhone (Back Tap)
1. App Shortcuts → shortcut baru → aksi **Open URLs** → isi link Vercel.
2. Settings → Accessibility → Touch → Back Tap → Double Tap → pilih shortcut tadi.

# Buku Uang

Pencatat uang pribadi berbentuk web app, dioptimalkan untuk iPhone, di-hosting di Vercel.

## Fitur
- Catat uang keluar, masuk, dan pindah saldo antar akun (Cash, ShopeePay, DANA, dll.)
- Akun "titip" (uang di orang lain) dipisah dari uang siap pakai
- Strip tanggal per minggu, statistik pengeluaran 7 hari, rincian per kategori
- Daftar hutang/cicilan dengan tombol Bayar (otomatis tercatat sebagai pengeluaran)
- Lampirkan foto struk/nota ke transaksi (disimpan di Blob); pembacaan otomatis opsional dengan `ANTHROPIC_API_KEY`
- Akun sendiri (daftar & masuk dengan username + password); data tiap akun terpisah dan tersinkron di semua perangkat
- Mode terang dan gelap mengikuti perangkat

## Arsitektur
- `index.html` — seluruh tampilan
- `api/data.js` — baca/tulis data (GET, POST ops)
- `api/auth.js` — daftar & masuk (password di-hash scrypt, sesi token HMAC 60 hari)
- `api/scan.js` — baca foto struk lewat Claude API (opsional)
- `api/media.js` — simpan & tampilkan foto lampiran (private, per akun)
- Database: **Vercel Blob (private)** — `bukuuang/users/<username>.json` dan `bukuuang/data/<username>.json`

## Environment variables (Vercel)
| Nama | Wajib | Keterangan |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | ya | otomatis saat Blob store dihubungkan ke project |
| `INITIAL_DATA` | tidak | JSON data awal untuk akun pertama yang didaftarkan |
| `ALLOW_SIGNUP` | tidak | isi `0` untuk menutup pendaftaran akun baru |
| `SESSION_SECRET` | tidak | kunci tanda tangan sesi (default diturunkan dari token Blob) |
| `ANTHROPIC_API_KEY` | tidak | mengaktifkan fitur Foto struk |
| `SCAN_MODEL` | tidak | model untuk Foto struk (default `claude-sonnet-5-5`) |

## Lupa password
Hapus file `bukuuang/users/<username>.json` dari Blob store (dashboard Vercel → Storage → Blob), lalu daftar ulang dengan username yang sama. Data di `bukuuang/data/<username>.json` tidak ikut terhapus.

## Buka cepat di iPhone (Back Tap)
1. App Shortcuts → shortcut baru → aksi **Open URLs** → isi link Vercel.
2. Settings → Accessibility → Touch → Back Tap → Double Tap → pilih shortcut tadi.

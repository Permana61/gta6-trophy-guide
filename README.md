[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Permana61/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Permana61/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Platinum Tracker — GTA 6 Trophy Guide

Panduan dan pelacak trofi Grand Theft Auto VI untuk PlayStation 5 yang berjalan sepenuhnya offline di browser. Isinya lengkap 55 trofi — 1 platinum, 2 gold, 6 silver, dan 46 bronze (28 di antaranya hidden di PSN) — masing-masing dengan nama, deskripsi, dan grade resmi seperti yang diterbitkan PlayStation, plus panduan langkah-demi-langkah yang ditulis dengan kata-kata sendiri dan mencantumkan sumbernya di samping tiap panduan.

Yang baru di round 2: dua trofi yang dulu belum terkonfirmasi kini sudah jelas pemicunya — **Bad Luck, I Guess** (rampok lagi toko Payday Loans di Little Cuba sebagai Lucia sendirian, lalu kabur jalan kaki) dan **Ten Pin** (tendang 10 pejalan kaki dari motor dalam 60 detik) — keduanya menurut PowerPyx setelah peluncuran. **Fair Game** kini membawa laporan satu sumber (Snapmatic Buck, menurut DamnModz) di samping questline Bret yang sudah terkonfirmasi, dan **Positive Mental Attitude** menegaskan satu-satunya trofi yang mungkin missable: meditasi balkon Chapter 1.

Bukan sekadar daftar: aplikasi ini tracker lengkap. Cincin progres besar menuju platinum, hitungan per grade dan per kategori, kartu "Selanjutnya" yang menunjuk trofi yang harus dikerjakan duluan (yang missable selalu didahulukan), roadmap 6 tahap yang bisa diklik untuk memfilter daftar, dan perencana sesi yang mengisi 30 menit sampai 3 jam main dengan trofi yang muat. Tiap trofi membawa estimasi waktu dan tingkat kesulitan, target PSN kalau ada, dan langkah-langkahnya. Ada pencarian, filter jenis (story, missable, collectibles, activities, online) dan grade, mode spoiler yang menyembunyikan nama dan deskripsi trofi story sampai diraih, export/import progress, shortcut keyboard (`/`, `s`, `p`, `e`, `?`), dan tampilan cetak yang ramah printer.

Panduan ini dibuat untuk bounty make.fun **gta6-trophy-guide-01** ($250, escrowed): aplikasi web statis tanpa build step, tanpa request jaringan saat berjalan, dan tanpa logo atau artwork resmi Rockstar Games. Perkiraan platinum: kesulitan 4/10, ±200 jam, satu playthrough, nol trofi online.

## Run it

```sh
node serve.ts
```

Lalu buka http://localhost:8080 di browser desktop. Atau tanpa server sama sekali: buka langsung `app/index.html` — tapi karena data trofi dimuat lewat `fetch` dari file lokal, sebagian browser memblokirnya dari `file://`, jadi cara yang disarankan tetap lewat `node serve.ts` (port lain: `node serve.ts --port 8123`).

## Isi repo

- `app/` — aplikasinya: `index.html`, `style.css`, `app.js`, `data.js`, `ui.js`, dan `app/data/trophies.json` (55 trofi beserta panduan, langkah, estimasi, dan sumbernya).
- `screenshots/` — 4 screenshot asli dari aplikasi yang berjalan di browser.
- `main.ts` — program penyerahan ke make.fun: menyalin `app/` dan `screenshots/` lalu menulis `dossier.json`.
- `serve.ts` — server statis kecil untuk mencoba aplikasi secara lokal.
- `vendor/makefun-frontend.ts` — pustaka dossier dari kit make.fun, tidak diubah.

## Lisensi

MIT — lihat `LICENSE`.

---

Masuk ke make.fun lewat referral ini: https://make.fun/r/3zcdv8qs

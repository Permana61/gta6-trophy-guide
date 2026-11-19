[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Permana61/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Permana61/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Guide — GTA 6

Panduan dan pelacak trofi Grand Theft Auto VI untuk PlayStation 5 yang berjalan sepenuhnya offline di browser. Isinya lengkap 55 trofi — 1 platinum, 2 gold, 6 silver, dan 46 bronze — masing-masing dengan nama, deskripsi, dan grade resmi seperti yang diterbitkan PlayStation, plus panduan langkah-demi-langkah yang ditulis dengan kata-kata sendiri dan mencantumkan sumbernya di samping tiap panduan.

Bukan sekadar daftar: aplikasi ini juga tracker. Centang trofi yang sudah diraih dan progress tersimpan di browser (localStorage), lengkap dengan progress bar menuju platinum, hitungan per grade, dan roadmap ke platinum dalam enam tahap — dari Chapter 1 sampai bersih-bersih setelah cerita tamat. Trofi yang bisa terlewat ditandai jelas, dan ada filter berdasarkan jenis (story, missable, collectibles, activities, online) plus pencarian nama trofi. Pengaturan spoiler menyembunyikan nama dan deskripsi trofi story sampai trofi itu dicentang, jadi cerita tetap aman dari bocoran. Progress bisa di-export ke file JSON dan di-import kembali di browser lain.

Panduan ini dibuat untuk bounty make.fun **gta6-trophy-guide-01** ($250, escrowed): aplikasi web statis tanpa build step, tanpa request jaringan saat berjalan, dan tanpa logo atau artwork resmi Rockstar Games.

## Run it

```sh
node serve.ts
```

Lalu buka http://localhost:8080 di browser desktop. Atau tanpa server sama sekali: buka langsung `app/index.html` — tapi karena data trofi dimuat lewat `fetch` dari file lokal, sebagian browser memblokirnya dari `file://`, jadi cara yang disarankan tetap lewat `node serve.ts` (port lain: `node serve.ts --port 8123`).

## Isi repo

- `app/` — aplikasinya: `index.html`, `style.css`, `app.js`, `data.js`, `ui.js`, dan `app/data/trophies.json` (55 trofi beserta panduan dan sumbernya).
- `screenshots/` — 4 screenshot asli dari aplikasi yang berjalan di browser.
- `main.ts` — program penyerahan ke make.fun: menyalin `app/` dan `screenshots/` lalu menulis `dossier.json`.
- `serve.ts` — server statis kecil untuk mencoba aplikasi secara lokal.
- `vendor/makefun-frontend.ts` — pustaka dossier dari kit make.fun, tidak diubah.

## Lisensi

MIT — lihat `LICENSE`.

---

Masuk ke make.fun lewat referral ini: https://make.fun/r/3zcdv8qs

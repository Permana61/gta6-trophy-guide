// Titik masuk panduan: muat data trofi, lalu hidupkan trackernya.
// Kalau data gagal dimuat (misalnya dibuka tanpa server), tampilkan pesan
// yang jelas di tempat progress, bukan halaman kosong.
import { loadTrophies } from './data.js';
import { createTracker } from './ui.js';

const progressText = document.getElementById('progressText');

try {
  const trophies = await loadTrophies();
  createTracker(trophies);
} catch (error) {
  progressText.textContent = 'Data trofi tidak bisa dimuat. Jalankan panduan ini lewat server statis (node serve.ts) lalu buka lagi.';
  console.error(error);
}

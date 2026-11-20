// Boot for the Leonida Platinum Tracker: load the trophy data, then
// start the tracker UI. If the data cannot load (for example the page was
// opened from file:// where fetch is blocked), show a clear message in
// the dashboard instead of a blank page.
import { loadTrophies } from './data.js';
import { createTracker } from './ui.js';

const metaLine = document.getElementById('metaLine');
const dashNote = document.getElementById('dashNote');

try {
  const trophies = await loadTrophies();
  window.leonidaTracker = createTracker(trophies);
} catch (error) {
  metaLine.textContent = 'Data trofi tidak bisa dimuat. Jalankan panduan ini lewat server statis (node serve.ts) lalu buka lagi.';
  dashNote.textContent = 'Pastikan app/data/trophies.json ada dan server berjalan.';
  console.error(error);
}

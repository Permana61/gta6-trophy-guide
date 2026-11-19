// Memuat dan menormalkan data trofi dari app/data/trophies.json.
//
// Tiap trofi di file itu membawa nama resmi, deskripsi resmi, grade, dan
// panduan. Kalau file sudah membawa kind, stage, missable, dan sources,
// nilai itu dipakai apa adanya. Kalau belum, modul ini menurunkannya dari
// deskripsi resmi — jadi tracker tetap berfungsi penuh dengan data starter
// maupun data lengkap. Tidak ada yang di sini menebak lokasi atau langkah:
// yang diturunkan hanya jenis, tahap roadmap, dan penanda missable.

const DATA_URL = 'data/trophies.json';

// Nama misi cerita yang disebut deskripsi resmi. Dipakai untuk mengenali
// trofi story dan menaruhnya di tahap roadmap yang benar.
const STORY_MISSIONS = [
  'Gone Fishing', 'Breakfast Run', 'The Cartel Heist', "Child's Play",
  'Headliners', 'VCIA Takedown', 'Operation Savage Glory',
];

// Pemberi misi stranger: trofi "final mission for X" dan strand stranger.
const STRANGER_GIVERS = ['Andy', 'Kenton', 'Billy', 'Randy', 'Tyrone'];

const KINDS = ['story', 'missable', 'collectibles', 'activities', 'online'];

export const KIND_LABELS = {
  all: 'Semua',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

// Tahap roadmap, berurutan dari awal permainan sampai platinum.
// Data trophies.json menomori tahap 1–6: 1–4 = Chapter 1–4, 5 = setelah
// cerita (bersih-bersih), 6 = platinum. deriveStage memetakan nomor itu
// ke id di bawah; kalau data belum bernomor, ia menurunkannya dari deskripsi.
export const ROADMAP_STAGES = [
  { id: 'chapter-1', number: 1, title: 'Chapter 1', hint: 'Misi pembuka Gone Fishing dan akhir Chapter 1. Trofi story mengalir sendiri.' },
  { id: 'chapter-2', number: 2, title: 'Chapter 2', hint: 'Misi cerita Chapter 2 plus aktivitas dan koleksi yang sudah terbuka.' },
  { id: 'chapter-3', number: 3, title: 'Chapter 3', hint: 'Misi cerita Chapter 3 dan trofi sekali coba di tengah cerita.' },
  { id: 'chapter-4', number: 4, title: 'Chapter 4', hint: 'Misi cerita Chapter 4 dan misi final — selesaikan cerita sampai tamat.' },
  { id: 'cleanup', number: 5, title: 'Setelah cerita — bersih-bersih', hint: 'Aktivitas, tantangan, koleksi, dan syarat 100% completion.' },
  { id: 'platinum', number: 6, title: 'Platinum', hint: 'Vice Got a Price! — terbuka otomatis saat 54 trofi lainnya diraih.' },
];

const STAGE_BY_NUMBER = Object.fromEntries(ROADMAP_STAGES.map((s) => [s.number, s.id]));
const STAGE_IDS = new Set(ROADMAP_STAGES.map((s) => s.id));

function textOf(value) {
  return typeof value === 'string' ? value : '';
}

function hasField(trophy, field) {
  return trophy[field] !== undefined && trophy[field] !== null && trophy[field] !== '';
}

// Jenis trofi dari deskripsi resmi. "Online" tidak muncul di daftar 55 ini,
// tapi filternya tetap disediakan sesuai spek — hasilnya kosong.
export function deriveKind(trophy) {
  if (hasField(trophy, 'kind')) return normalizeKinds(trophy.kind);
  const d = textOf(trophy.description);
  if (/complete chapter \d/i.test(d)) return ['story'];
  if (/complete (the final mission|gone fishing)/i.test(d)) return ['story'];
  if (STORY_MISSIONS.some((m) => d.includes(m))) return ['story'];
  if (/final mission for/i.test(d)) return ['story'];
  if (/stranger/i.test(d)) return ['story'];
  if (/collectible card|waink it|discover \d+ vehicles|explore all|garage propert|register \d+ vehicles/i.test(d)) return ['collectibles'];
  if (/stunt|shooting range|drone race|race|fishing challenge|arcade|meditate|bowl|challenge|hunt/i.test(d)) return ['activities'];
  return ['activities'];
}

// "kind" di data bisa berupa string ("story") atau daftar
// (["activities", "collectibles"], ["collectibles", "missable"]).
// Selalu kembalikan daftar jenis yang dikenal, tanpa duplikat.
export function normalizeKinds(rawKind) {
  const list = Array.isArray(rawKind) ? rawKind : [rawKind];
  const kinds = [];
  for (const entry of list) {
    const kind = String(entry ?? '').toLowerCase();
    if (KINDS.includes(kind) && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds.length > 0 ? kinds : ['activities'];
}

// Trofi missable: yang deskripsinya menuntut momen sekali coba atau
// rangkaian tanpa gagal (misalnya beruntun, tanpa ketahuan, sekali jalan).
// Trofi misi cerita biasa TIDAK ditandai missable: misi bisa diulang.
export function deriveMissable(trophy, kinds) {
  if (typeof trophy.missable === 'boolean') return trophy.missable;
  if (kinds.includes('missable')) return true;
  const d = textOf(trophy.description);
  return /back-to-back|without being detected|without losing|second time|unscheduled departure|melee drive-by/i.test(d);
}

export function deriveStage(trophy, kinds) {
  if (typeof trophy.stage === 'number' && STAGE_BY_NUMBER[trophy.stage]) return STAGE_BY_NUMBER[trophy.stage];
  if (typeof trophy.stage === 'string') {
    const asNumber = Number(trophy.stage);
    if (STAGE_BY_NUMBER[asNumber]) return STAGE_BY_NUMBER[asNumber];
    if (STAGE_IDS.has(trophy.stage)) return trophy.stage;
  }
  const d = textOf(trophy.description);
  if (trophy.grade === 'platinum') return 'platinum';
  if (/attain 100% completion/i.test(d)) return 'cleanup';
  const chapter = d.match(/complete chapter (\d)/i);
  if (chapter) return STAGE_BY_NUMBER[Math.min(Number(chapter[1]), 4)] ?? 'cleanup';
  if (/complete gone fishing/i.test(d)) return 'chapter-1';
  if (/complete the final mission/i.test(d)) return 'chapter-4';
  if (STORY_MISSIONS.some((m) => d.includes(m))) return 'chapter-4';
  if (/final mission for/i.test(d) || /stranger/i.test(d)) return 'cleanup';
  if (kinds.includes('collectibles')) return 'cleanup';
  if (kinds.includes('activities')) return 'cleanup';
  return 'cleanup';
}

function normalizeSources(trophy) {
  const raw = trophy.sources;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === 'string') return { name: s, url: '' };
      if (s && typeof s === 'object') return { name: textOf(s.name) || textOf(s.title) || 'Sumber', url: textOf(s.url) || textOf(s.link) };
      return null;
    })
    .filter((s) => s && s.name);
}

export function normalizeTrophy(raw, index) {
  const kinds = deriveKind(raw);
  // Jenis utama untuk label: yang pertama selain "missable" (missable
  // sudah punya lencananya sendiri).
  const kind = kinds.find((k) => k !== 'missable') ?? kinds[0];
  return {
    id: raw.id ?? index + 1,
    name: textOf(raw.name),
    description: textOf(raw.description),
    grade: String(raw.grade || 'bronze').toLowerCase(),
    guide: textOf(raw.guide),
    kind,
    kinds,
    stage: deriveStage(raw, kinds),
    missable: deriveMissable(raw, kinds),
    hidden: raw.hidden === true,
    sources: normalizeSources(raw),
  };
}

export async function loadTrophies() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('Gagal memuat data trofi');
  const doc = await response.json();
  const list = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(list)) throw new Error('Format data trofi tidak dikenal');
  return list.map((raw, index) => normalizeTrophy(raw, index));
}

export { KINDS };

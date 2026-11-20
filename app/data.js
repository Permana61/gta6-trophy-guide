// Data layer for the Leonida Platinum Tracker.
//
// Loads app/data/trophies.json (same-origin fetch, no network beyond the
// local server), normalises every trophy into one shape the UI can render
// without guessing, and holds the roadmap, grade/kind metadata, and the
// small pure helpers the tracker needs: per-category stats, the "next up"
// pick, and the session planner. Nothing here invents a location or a step:
// every fact the UI shows comes from the JSON file, whose guides cite
// their sources.

const DATA_URL = 'data/trophies.json';

export const KINDS = ['story', 'missable', 'collectibles', 'activities', 'online'];

export const KIND_LABELS = {
  all: 'Semua jenis',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

export const KIND_BLURBS = {
  story: 'Terbuka lewat misi utama dan chapter.',
  missable: 'Sekali coba atau berwaktu — baca sebelum terlewat.',
  collectibles: 'Koleksi dan hitungan yang bisa dilacak di menu Progress.',
  activities: 'Aktivitas, balapan, dan perampokan di dunia terbuka.',
  online: 'Tidak ada trofi online di daftar 55 ini.',
};

export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const GRADE_POINTS = { platinum: 4, gold: 3, silver: 2, bronze: 1 };

// The six roadmap stages, in play order. Stage numbers 1-6 in the JSON
// map straight onto these ids; a trophy without a stage falls back to the
// cleanup stage so the roadmap never loses a trophy.
export const ROADMAP_STAGES = [
  { id: 'stage-1', number: 1, title: 'Chapter 1 — Awal di Leonida', hours: '±5 jam', body: 'Misi pembuka Gone Fishing sampai akhir Chapter 1. Satu tugas tidak bisa ditunda: meditasi balkon rumah Jason setelah Down to Earth.' },
  { id: 'stage-2', number: 2, title: 'Chapter 2 — Dua karakter', hours: '±15 jam', body: 'Setelah Coffee Break kamu bisa berganti Jason dan Lucia. Questline Kenton, Billy, dan Bret terbuka; garasi dan Scooter Bros mulai bisa dibeli.' },
  { id: 'stage-3', number: 3, title: 'Chapter 3 — Vice City', hours: '±20 jam', body: 'Misi cerita Chapter 3 plus questline Andy, Randy, dan Tyrone. Payday Loans, Dye Pack Jammer, dan perampokan toko perhiasan terbuka di sini.' },
  { id: 'stage-4', number: 4, title: 'Chapter 4 — Menuju akhir', hours: '±20 jam', body: 'Misi cerita Chapter 4 dan misi finalnya. Perampokan brankas bank terbuka lewat misi opsional That\'s Where The Money Is….' },
  { id: 'stage-5', number: 5, title: 'Setelah cerita — bersih-bersih', hours: '±100 jam', body: 'Checklist 100% terbuka di Progress > Stats. Stunt, challenge, koleksi, balapan, drone, dan semua yang butuh hitungan penuh dikerjakan di free-roam.' },
  { id: 'stage-6', number: 6, title: 'Platinum', hours: 'otomatis', body: 'Vice Got a Price! terbuka sendiri begitu 54 trofi lainnya diraih. Tidak ada syarat online atau DLC.' },
];

const STAGE_BY_NUMBER = Object.fromEntries(ROADMAP_STAGES.map((s) => [s.number, s.id]));

function asText(value) {
  return typeof value === 'string' ? value : '';
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanKinds(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const entry of list) {
    const kind = String(entry ?? '').toLowerCase();
    if (KINDS.includes(kind) && !out.includes(kind)) out.push(kind);
  }
  return out.length ? out : ['activities'];
}

function cleanSources(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (typeof item === 'string' && item) {
      out.push({ name: item, url: '' });
    } else if (item && typeof item === 'object' && asText(item.name)) {
      out.push({ name: asText(item.name), url: asText(item.url) || asText(item.link) });
    }
  }
  return out;
}

function cleanSteps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => asText(s)).filter((s) => s.length > 0);
}

// One trophy, normalised: every field the UI touches exists, with a sane
// default, so a missing optional field can never break the render.
export function normaliseTrophy(raw, index) {
  const kinds = cleanKinds(raw.kind);
  const grade = String(raw.grade || 'bronze').toLowerCase();
  const stageNumber = asNumber(raw.stage, 5);
  return {
    id: asNumber(raw.id, index + 1),
    name: asText(raw.name),
    description: asText(raw.description),
    grade: GRADE_ORDER.includes(grade) ? grade : 'bronze',
    hidden: raw.hidden === true,
    count: raw.count === null || raw.count === undefined ? null : asNumber(raw.count, null),
    kind: kinds,
    kinds,
    mainKind: kinds.find((k) => k !== 'missable') ?? kinds[0],
    missable: raw.missable === true || kinds.includes('missable'),
    stage: STAGE_BY_NUMBER[stageNumber] ?? 'stage-5',
    stageNumber: STAGE_BY_NUMBER[stageNumber] ? stageNumber : 5,
    difficulty: Math.min(5, Math.max(1, asNumber(raw.difficulty, 2))),
    timeMinutes: Math.max(0, asNumber(raw.timeMinutes, 0)),
    guide: asText(raw.guide),
    steps: cleanSteps(raw.steps),
    sources: cleanSources(raw.sources),
  };
}

export async function loadTrophies() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('Gagal memuat data trofi: ' + response.status);
  const doc = await response.json();
  const list = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(list) || list.length === 0) throw new Error('Data trofi kosong');
  return list.map((raw, index) => normaliseTrophy(raw, index));
}

// "±45 mnt", "2 jam", "±3,5 jam", or "Otomatis" for story trophies with
// no extra time of their own.
export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return 'Otomatis';
  if (minutes < 60) return '±' + minutes + ' mnt';
  const hours = minutes / 60;
  const shown = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
  return '±' + shown + ' jam';
}

export function difficultyLabel(level) {
  return ['Sangat mudah', 'Mudah', 'Sedang', 'Sulit', 'Sangat sulit'][level - 1] ?? 'Sedang';
}

// Earned counts per grade, per kind, and per roadmap stage.
export function computeStats(trophies, earned) {
  const byGrade = {};
  for (const grade of GRADE_ORDER) {
    const all = trophies.filter((t) => t.grade === grade);
    byGrade[grade] = { total: all.length, done: all.filter((t) => earned.has(t.id)).length };
  }
  const byKind = {};
  for (const kind of KINDS) {
    const all = trophies.filter((t) => t.kinds.includes(kind));
    byKind[kind] = { total: all.length, done: all.filter((t) => earned.has(t.id)).length };
  }
  const byStage = {};
  for (const stage of ROADMAP_STAGES) {
    const all = trophies.filter((t) => t.stage === stage.id);
    byStage[stage.id] = { total: all.length, done: all.filter((t) => earned.has(t.id)).length };
  }
  const remaining = trophies.filter((t) => !earned.has(t.id));
  const remainingMinutes = remaining.reduce((sum, t) => sum + t.timeMinutes, 0);
  return {
    total: trophies.length,
    done: earned.size,
    byGrade,
    byKind,
    byStage,
    remainingMinutes,
  };
}

// "Next up": the earliest-roadmap unearned trophy, preferring the one
// missable trophy first (it is the only one that can be lost), then the
// lowest stage, then the shortest time. Returns null when all are done.
export function suggestNext(trophies, earned) {
  const todo = trophies.filter((t) => !earned.has(t.id));
  if (todo.length === 0) return null;
  const missable = todo.find((t) => t.missable);
  if (missable) return { trophy: missable, reason: 'Satu-satunya trofi yang bisa terlewat — kerjakan sebelum Chapter 1 berakhir.' };
  const sorted = [...todo].sort((a, b) => {
    if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
    if (a.timeMinutes !== b.timeMinutes) return a.timeMinutes - b.timeMinutes;
    return a.id - b.id;
  });
  const pick = sorted[0];
  return {
    trophy: pick,
    reason: pick.stageNumber <= 4
      ? 'Trofi story/aktivitas paling awal yang belum diraih di roadmap.'
      : 'Trofi bersih-bersih paling cepat yang tersisa.',
  };
}

// Session planner: fill a session of `minutes` with unearned trophies in
// roadmap order, skipping the platinum itself and anything longer than the
// session. Returns the picked trophies and the summed estimate.
export function planSession(trophies, earned, minutes) {
  const pool = trophies
    .filter((t) => !earned.has(t.id) && t.grade !== 'platinum' && t.timeMinutes > 0 && t.timeMinutes <= minutes)
    .sort((a, b) => {
      if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
      if (a.timeMinutes !== b.timeMinutes) return a.timeMinutes - b.timeMinutes;
      return a.id - b.id;
    });
  const picked = [];
  let used = 0;
  for (const trophy of pool) {
    if (used + trophy.timeMinutes > minutes) continue;
    picked.push(trophy);
    used += trophy.timeMinutes;
    if (picked.length >= 8) break;
  }
  return { picked, usedMinutes: used, budgetMinutes: minutes };
}

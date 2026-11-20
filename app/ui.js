// Tracker UI: progress ring, grade bars, category stats, next-up pick,
// roadmap, session planner, checklist, filters, spoiler mode, detail
// panel, and progress save/load in localStorage.
//
// Earned progress is a Set of trophy ids. The spoiler rule hides the
// name and description of story trophies (kind "story") until they are
// earned — hidden (non-story) trophies are shown, since their names alone
// do not spoil the story. Export writes the same JSON shape import reads.

import {
  GRADE_LABELS,
  GRADE_ORDER,
  KIND_BLURBS,
  KIND_LABELS,
  KINDS,
  ROADMAP_STAGES,
  computeStats,
  difficultyLabel,
  formatMinutes,
  planSession,
  suggestNext,
} from './data.js';

const STORE_KEY = 'leonida-tracker-v2';
const SPOILER_STORE_KEY = 'leonida-spoiler-v2';

const RING_CIRCUMFERENCE = 2 * Math.PI * 68;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function readStoredIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => Number.isInteger(n));
  } catch {
    return [];
  }
}

function isHiddenBySpoiler(trophy, spoilerOn, earned) {
  return spoilerOn && trophy.kinds.includes('story') && !earned.has(trophy.id);
}

export function createTracker(trophies) {
  const earned = new Set(readStoredIds().filter((id) => trophies.some((t) => t.id === id)));
  let spoilerOn = localStorage.getItem(SPOILER_STORE_KEY) === '1';
  let kindFilter = 'all';
  let gradeFilter = 'all';
  let statusFilter = 'all';
  let missableOnly = false;
  let query = '';
  let activeStage = null;
  let sessionMinutes = 60;
  let selectedId = null;

  const $ = (id) => document.getElementById(id);
  const listEl = $('trophyList');
  const emptyEl = $('emptyMsg');
  const detailEl = $('detailPane');
  const countLine = $('countLine');
  const searchInput = $('q');
  const spoilerBox = $('spoilerBox');
  const missableBox = $('missableBox');

  function persist() {
    localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  }

  function persistSpoiler() {
    localStorage.setItem(SPOILER_STORE_KEY, spoilerOn ? '1' : '0');
  }

  function matchesFilters(trophy) {
    if (kindFilter === 'missable' && !trophy.missable) return false;
    if (kindFilter !== 'all' && kindFilter !== 'missable' && !trophy.kinds.includes(kindFilter)) return false;
    if (gradeFilter !== 'all' && trophy.grade !== gradeFilter) return false;
    if (statusFilter === 'done' && !earned.has(trophy.id)) return false;
    if (statusFilter === 'todo' && earned.has(trophy.id)) return false;
    if (missableOnly && !trophy.missable) return false;
    if (activeStage && trophy.stage !== activeStage) return false;
    if (query) {
      const hay = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function renderDashboard() {
    const stats = computeStats(trophies, earned);
    const pct = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
    $('earnedBig').textContent = stats.done + '/' + stats.total;
    $('pctBig').textContent = pct + '%';
    $('ringFg').style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100));
    $('ringFg').classList.toggle('complete', stats.done === stats.total);
    $('metaLine').textContent = stats.done === stats.total
      ? 'Platinum diraih! Vice Got a Price! — 55 dari 55 trofi.'
      : 'Kesulitan platinum 4/10 · ±200 jam · 0 trofi online · ' + (stats.total - stats.done) + ' trofi lagi menuju platinum.';
    $('dashNote').textContent = stats.done === stats.total
      ? 'Semua trofi diraih. Platinum milikmu.'
      : 'Centang trofi di daftar bawah — progres tersimpan otomatis di browser ini.';

    const bars = $('gradeBars');
    bars.replaceChildren();
    for (const grade of GRADE_ORDER) {
      const row = stats.byGrade[grade];
      const li = el('li', 'grade-row grade-' + grade);
      const head = el('div', 'grade-head');
      head.append(el('span', 'grade-name', GRADE_LABELS[grade]), el('b', null, row.done + '/' + row.total));
      const track = el('div', 'mini-track');
      const fill = el('div', 'mini-fill');
      fill.style.width = row.total === 0 ? '0%' : Math.round((row.done / row.total) * 100) + '%';
      track.append(fill);
      li.append(head, track);
      bars.append(li);
    }

    const cats = $('catStats');
    cats.replaceChildren();
    for (const kind of ['story', 'missable', 'collectibles', 'activities']) {
      const row = stats.byKind[kind];
      if (row.total === 0) continue;
      const li = el('li', 'cat-chip');
      li.append(el('b', null, row.done + '/' + row.total), document.createTextNode(' ' + KIND_LABELS[kind]));
      li.title = KIND_BLURBS[kind];
      cats.append(li);
    }

    $('estLine').textContent = 'Perkiraan sisa waktu bersih-bersih: ' + formatMinutes(stats.remainingMinutes) + ' (di luar misi cerita).';

    const next = suggestNext(trophies, earned);
    if (!next) {
      $('nextUpName').textContent = 'Platinum diraih!';
      $('nextUpWhy').textContent = 'Semua 55 trofi sudah dicentang.';
      $('nextUpMeta').replaceChildren();
      $('nextUpBtn').hidden = true;
    } else {
      const t = next.trophy;
      $('nextUpName').textContent = isHiddenBySpoiler(t, spoilerOn, earned) ? 'Trofi story tersembunyi' : t.name;
      $('nextUpWhy').textContent = next.reason;
      const meta = $('nextUpMeta');
      meta.replaceChildren();
      meta.append(el('span', 'tag grade-' + t.grade, GRADE_LABELS[t.grade]));
      meta.append(el('span', 'tag', difficultyLabel(t.difficulty)));
      meta.append(el('span', 'tag', formatMinutes(t.timeMinutes)));
      if (t.missable) meta.append(el('span', 'tag missable', 'Missable'));
      $('nextUpBtn').hidden = false;
      $('nextUpBtn').onclick = () => selectTrophy(t.id, true);
    }
  }

  function renderRoadmap() {
    const stats = computeStats(trophies, earned);
    const list = $('stageList');
    list.replaceChildren();
    for (const stage of ROADMAP_STAGES) {
      const row = stats.byStage[stage.id];
      const li = el('li');
      const btn = el('button', 'stage-card' + (activeStage === stage.id ? ' active' : '') + (row.total > 0 && row.done === row.total ? ' done' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(activeStage === stage.id));
      const top = el('div', 'stage-top');
      top.append(el('span', 'stage-no', row.total > 0 && row.done === row.total ? '✓' : String(stage.number)));
      top.append(el('h3', null, stage.title));
      top.append(el('span', 'stage-hours', stage.hours));
      const body = el('p', 'stage-body', stage.body);
      const count = el('p', 'stage-count', row.done + '/' + row.total + ' trofi diraih');
      btn.append(top, body, count);
      btn.addEventListener('click', () => {
        activeStage = activeStage === stage.id ? null : stage.id;
        renderAll();
      });
      li.append(btn);
      list.append(li);
    }
  }

  function renderPlanner() {
    const plan = planSession(trophies, earned, sessionMinutes);
    $('plannerTotal').textContent = plan.picked.length === 0
      ? 'Tidak ada trofi yang muat dalam durasi ini — coba durasi lebih panjang.'
      : 'Sesi ' + formatMinutes(plan.budgetMinutes) + ' · ' + plan.picked.length + ' trofi · estimasi ' + formatMinutes(plan.usedMinutes) + '.';
    const list = $('planList');
    list.replaceChildren();
    for (const trophy of plan.picked) {
      const li = el('li', 'plan-item');
      const btn = el('button', 'plan-btn');
      btn.type = 'button';
      btn.append(el('span', 'plan-name', trophy.name));
      btn.append(el('span', 'plan-meta', GRADE_LABELS[trophy.grade] + ' · ' + formatMinutes(trophy.timeMinutes) + ' · ' + difficultyLabel(trophy.difficulty)));
      btn.addEventListener('click', () => selectTrophy(trophy.id, true));
      li.append(btn);
      list.append(li);
    }
    document.querySelectorAll('.planner-controls .seg button').forEach((button) => {
      button.classList.toggle('on', Number(button.dataset.mins) === sessionMinutes);
    });
  }

  function renderChips() {
    const chips = $('kindChips');
    chips.replaceChildren();
    for (const kind of ['all', ...KINDS]) {
      const count = kind === 'all'
        ? trophies.length
        : kind === 'missable'
          ? trophies.filter((t) => t.missable).length
          : trophies.filter((t) => t.kinds.includes(kind)).length;
      const chip = el('button', 'chip' + (kindFilter === kind ? ' active' : ''));
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(kindFilter === kind));
      chip.textContent = KIND_LABELS[kind] + ' (' + count + ')';
      chip.title = KIND_BLURBS[kind] ?? '';
      chip.addEventListener('click', () => {
        kindFilter = kind;
        renderAll();
      });
      chips.append(chip);
    }
  }

  function trophyRow(trophy) {
    const li = el('li');
    const done = earned.has(trophy.id);
    const hidden = isHiddenBySpoiler(trophy, spoilerOn, earned);
    const row = el('div', 'trophy-row' + (done ? ' earned' : '') + (selectedId === trophy.id ? ' selected' : '') + (hidden ? ' spoiler-hidden' : ''));
    row.setAttribute('role', 'button');
    row.tabIndex = 0;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = done;
    check.setAttribute('aria-label', 'Tandai ' + trophy.name + ' sudah diraih');
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => {
      if (check.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      persist();
      renderAll();
    });

    const body = el('span', 'trophy-body');
    body.append(el('span', 'trophy-name', hidden ? 'Trofi story — tersembunyi (spoiler)' : trophy.name));
    body.append(el('span', 'trophy-desc', hidden ? 'Centang trofi ini untuk membuka nama dan deskripsinya.' : trophy.description));
    const meta = el('span', 'trophy-meta');
    meta.append(el('span', 'tag grade-' + trophy.grade, GRADE_LABELS[trophy.grade]));
    for (const kind of trophy.kinds) {
      if (kind === 'missable') continue;
      meta.append(el('span', 'tag', KIND_LABELS[kind]));
    }
    if (trophy.missable) meta.append(el('span', 'tag missable', 'Missable'));
    if (trophy.hidden) meta.append(el('span', 'tag dim', 'Hidden di PSN'));
    if (trophy.count !== null) meta.append(el('span', 'tag dim', 'Target: ' + trophy.count.toLocaleString('id-ID')));
    meta.append(el('span', 'tag dim', formatMinutes(trophy.timeMinutes)));
    body.append(meta);

    const right = el('span', 'trophy-side');
    right.append(el('span', 'diff', '★'.repeat(trophy.difficulty) + '☆'.repeat(5 - trophy.difficulty)));
    right.append(el('span', 'tag', 'Panduan ›'));
    row.append(check, body, right);

    const open = () => selectTrophy(trophy.id, false);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
    li.append(row);
    return li;
  }

  function renderList() {
    const shown = trophies.filter(matchesFilters);
    listEl.replaceChildren(...shown.map(trophyRow));
    emptyEl.hidden = shown.length !== 0;
    countLine.textContent = activeStage
      ? 'Menampilkan ' + shown.length + ' trofi — tahap roadmap aktif, klik tahapnya lagi untuk melepas filter.'
      : 'Menampilkan ' + shown.length + ' dari ' + trophies.length + ' trofi.';
  }

  function selectTrophy(id, scrollToDetail) {
    selectedId = id;
    const trophy = trophies.find((t) => t.id === id);
    if (trophy) renderDetail(trophy);
    renderList();
    if (scrollToDetail) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderDetail(trophy) {
    const done = earned.has(trophy.id);
    const hidden = isHiddenBySpoiler(trophy, spoilerOn, earned);
    detailEl.replaceChildren();

    const head = el('div', 'detail-head');
    head.append(el('span', 'tag grade-' + trophy.grade, GRADE_LABELS[trophy.grade]));
    if (trophy.missable) head.append(el('span', 'tag missable', 'Missable'));
    if (trophy.hidden) head.append(el('span', 'tag dim', 'Hidden di PSN'));
    detailEl.append(head);

    detailEl.append(el('h2', null, hidden ? 'Trofi story tersembunyi' : trophy.name));
    detailEl.append(el('p', 'detail-desc', hidden
      ? 'Nama dan deskripsi trofi ini disembunyikan oleh pengaturan spoiler. Centang trofi ini sebagai diraih untuk membukanya.'
      : trophy.description));

    const facts = el('dl', 'detail-facts');
    const factRows = [
      ['Kesulitan', difficultyLabel(trophy.difficulty) + ' (' + trophy.difficulty + '/5)'],
      ['Estimasi waktu', formatMinutes(trophy.timeMinutes)],
      ['Tahap roadmap', (ROADMAP_STAGES.find((s) => s.id === trophy.stage) ?? {}).title ?? trophy.stage],
      ['Jenis', trophy.kinds.map((k) => KIND_LABELS[k]).join(', ')],
    ];
    if (trophy.count !== null) factRows.push(['Target PSN', String(trophy.count.toLocaleString('id-ID'))]);
    for (const [term, value] of factRows) {
      facts.append(el('dt', null, term), el('dd', null, value));
    }
    detailEl.append(facts);

    if (trophy.missable) {
      const warn = el('p', 'detail-warning');
      const b = el('b', null, 'Missable — ');
      warn.append(b, document.createTextNode('trofi ini bisa terlewat. Baca panduan di bawah sebelum melewati momennya; kalau sudah lewat, satu-satunya jalan biasanya save lama atau playthrough baru.'));
      detailEl.append(warn);
    }

    detailEl.append(el('h3', null, 'Panduan'));
    detailEl.append(el('p', 'detail-guide', hidden ? 'Panduan baru tampil setelah trofi dibuka.' : (trophy.guide || 'Panduan untuk trofi ini belum ditulis.')));

    if (!hidden && trophy.steps.length > 0) {
      detailEl.append(el('h3', null, 'Langkah-langkah'));
      const steps = el('ol', 'detail-steps');
      for (const step of trophy.steps) steps.append(el('li', null, step));
      detailEl.append(steps);
    }

    detailEl.append(el('h3', null, 'Sumber yang dikutip'));
    if (trophy.sources.length === 0) {
      detailEl.append(el('p', 'detail-desc', 'Panduan ini disusun dari deskripsi resmi PlayStation dan daftar trofi Exophase / PSNProfiles.'));
    } else {
      const list = el('ul', 'source-list');
      for (const source of trophy.sources) {
        const item = el('li');
        if (source.url) {
          const a = document.createElement('a');
          a.href = source.url;
          a.textContent = source.name;
          a.target = '_blank';
          a.rel = 'noopener';
          item.append(a);
        } else {
          item.textContent = source.name;
        }
        list.append(item);
      }
      detailEl.append(list);
    }

    const actions = el('div', 'detail-actions');
    const toggle = el('button', 'btn', done ? 'Batalkan: belum diraih' : 'Tandai sudah diraih');
    toggle.type = 'button';
    toggle.addEventListener('click', () => {
      if (earned.has(trophy.id)) earned.delete(trophy.id);
      else earned.add(trophy.id);
      persist();
      renderAll();
    });
    actions.append(toggle);
    detailEl.append(actions);
  }

  function renderAll() {
    renderDashboard();
    renderRoadmap();
    renderPlanner();
    renderChips();
    renderList();
    if (selectedId !== null) {
      const selected = trophies.find((t) => t.id === selectedId);
      if (selected) renderDetail(selected);
    }
  }

  function exportProgress() {
    const payload = {
      app: 'leonida-platinum-tracker',
      version: 2,
      exportedAt: new Date().toISOString(),
      earned: [...earned].sort((a, b) => a - b),
      spoilerOn,
    };
    downloadText('gta6-trophy-progress.json', JSON.stringify(payload, null, 2));
  }

  async function importProgress(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const ids = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(ids)) throw new Error('File tidak berisi daftar trofi');
    const known = new Set(trophies.map((t) => t.id));
    const byName = new Map(trophies.map((t) => [t.name, t.id]));
    const valid = [];
    for (const entry of ids) {
      if (Number.isInteger(entry) && known.has(entry)) valid.push(entry);
      else if (typeof entry === 'string' && byName.has(entry)) valid.push(byName.get(entry));
    }
    earned.clear();
    for (const id of valid) earned.add(id);
    if (typeof parsed.spoilerOn === 'boolean') {
      spoilerOn = parsed.spoilerOn;
      spoilerBox.checked = spoilerOn;
      persistSpoiler();
    }
    persist();
    renderAll();
    return valid.length;
  }

  searchInput.addEventListener('input', () => {
    query = searchInput.value.trim().toLowerCase();
    renderList();
  });
  $('gradeSel').addEventListener('change', (event) => {
    gradeFilter = event.target.value;
    renderList();
  });
  $('statusSel').addEventListener('change', (event) => {
    statusFilter = event.target.value;
    renderList();
  });
  spoilerBox.checked = spoilerOn;
  spoilerBox.addEventListener('change', () => {
    spoilerOn = spoilerBox.checked;
    persistSpoiler();
    renderAll();
  });
  missableBox.addEventListener('change', () => {
    missableOnly = missableBox.checked;
    renderList();
  });
  document.querySelectorAll('.planner-controls .seg button').forEach((button) => {
    button.addEventListener('click', () => {
      sessionMinutes = Number(button.dataset.mins) || 60;
      renderPlanner();
    });
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const count = await importProgress(file);
      countLine.textContent = 'Progress diimpor: ' + count + ' trofi ditandai diraih.';
    } catch {
      countLine.textContent = 'File import tidak valid — progress tidak berubah.';
    }
    event.target.value = '';
  });
  $('printBtn').addEventListener('click', () => window.print());
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Hapus semua centang progress?')) return;
    earned.clear();
    selectedId = null;
    persist();
    renderAll();
  });

  document.addEventListener('keydown', (event) => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement;
    if (event.key === 'Escape') {
      selectedId = null;
      detailEl.replaceChildren(el('p', 'detail-hint', 'Klik salah satu trofi di daftar untuk membuka panduan lengkapnya.'));
      renderList();
      return;
    }
    if (typing) return;
    if (event.key === '/') {
      event.preventDefault();
      searchInput.focus();
    } else if (event.key === 's' || event.key === 'S') {
      spoilerOn = !spoilerOn;
      spoilerBox.checked = spoilerOn;
      persistSpoiler();
      renderAll();
    } else if (event.key === 'p' || event.key === 'P') {
      window.print();
    } else if (event.key === 'e' || event.key === 'E') {
      exportProgress();
    } else if (event.key === '?') {
      $('shortcutsBox').hidden = !$('shortcutsBox').hidden;
    }
  });

  renderAll();
  return { renderAll, selectTrophy };
}

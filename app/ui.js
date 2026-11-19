// Tracker dan tampilan: checklist, filter, pencarian, spoiler, roadmap,
// panel detail, dan simpan/muat progress di localStorage.
//
// Semua state progress hidup di sini: satu Set berisi nama trofi yang sudah
// diraih (nama resmi dipakai sebagai kunci karena stabil di seluruh data),
// plus pengaturan spoiler. Export menulis JSON yang sama dengan yang
// dibaca import, jadi progress bisa pindah antar browser.

import { KIND_LABELS, KINDS, ROADMAP_STAGES } from './data.js';

const STORAGE_KEY = 'gta6-trophy-tracker-v1';
const SPOILER_KEY = 'gta6-trophy-spoiler-v1';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_TOTALS = { platinum: 1, gold: 2, silver: 6, bronze: 46 };

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isSpoilerHidden(trophy, spoilerOn, earned) {
  return spoilerOn && trophy.kind === 'story' && !earned.has(trophy.name);
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export function createTracker(trophies) {
  const earned = new Set(loadStoredNames());
  let spoilerOn = localStorage.getItem(SPOILER_KEY) === '1';
  let activeKind = 'all';
  let query = '';
  let activeStage = null;
  let selectedName = null;

  const listEl = document.getElementById('trophyList');
  const emptyEl = document.getElementById('emptyState');
  const detailEl = document.getElementById('detailPanel');
  const progressFill = document.getElementById('progressFill');
  const progressTrack = document.getElementById('progressTrack');
  const progressText = document.getElementById('progressText');
  const gradeCountsEl = document.getElementById('gradeCounts');
  const resultCountEl = document.getElementById('resultCount');
  const roadmapEl = document.getElementById('roadmap');
  const kindChipsEl = document.getElementById('kindChips');
  const searchInput = document.getElementById('searchInput');
  const spoilerToggle = document.getElementById('spoilerToggle');

  function loadStoredNames() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
    } catch {
      return [];
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
  }

  function saveSpoiler() {
    localStorage.setItem(SPOILER_KEY, spoilerOn ? '1' : '0');
  }

  function visibleTrophies() {
    const q = query.trim().toLowerCase();
    return trophies.filter((t) => {
      if (activeKind === 'missable' && !t.missable) return false;
      if (activeKind !== 'all' && activeKind !== 'missable' && !t.kinds.includes(activeKind)) return false;
      if (activeStage && t.stage !== activeStage) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderProgress() {
    const total = trophies.length;
    const done = earned.size;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const remaining = total - done;
    progressFill.style.width = `${pct}%`;
    progressTrack.setAttribute('aria-valuenow', String(pct));
    progressText.textContent = done === total
      ? `Platinum diraih! ${done} dari ${total} trofi — Vice Got a Price!`
      : `${done} dari ${total} trofi diraih (${pct}%) — ${remaining} lagi menuju platinum.`;
    document.getElementById('platinumBadge').classList.toggle('earned', earned.has('Vice Got a Price!'));

    gradeCountsEl.replaceChildren();
    for (const grade of GRADE_ORDER) {
      const have = trophies.filter((t) => t.grade === grade && earned.has(t.name)).length;
      const li = document.createElement('li');
      li.className = `grade-${grade}`;
      const dot = document.createElement('span');
      dot.className = 'grade-dot';
      li.append(dot, document.createElement('b'));
      li.lastChild.textContent = `${gradeLabel(grade)} ${have}/${GRADE_TOTALS[grade] ?? trophies.filter((t) => t.grade === grade).length}`;
      gradeCountsEl.append(li);
    }
  }

  function renderRoadmap() {
    roadmapEl.replaceChildren();
    for (const stage of ROADMAP_STAGES) {
      const members = trophies.filter((t) => t.stage === stage.id);
      const done = members.filter((t) => earned.has(t.name)).length;
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'roadmap-step' + (activeStage === stage.id ? ' active' : '') + (members.length > 0 && done === members.length ? ' done' : '');
      button.setAttribute('aria-pressed', String(activeStage === stage.id));
      const no = document.createElement('span');
      no.className = 'step-no';
      no.textContent = members.length > 0 && done === members.length ? '✓' : String(ROADMAP_STAGES.indexOf(stage) + 1);
      const title = document.createElement('h3');
      title.textContent = stage.title;
      const hint = document.createElement('p');
      hint.textContent = stage.hint;
      const count = document.createElement('p');
      count.className = 'step-count';
      count.textContent = `${done}/${members.length} trofi`;
      button.append(no, title, hint, count);
      button.addEventListener('click', () => {
        activeStage = activeStage === stage.id ? null : stage.id;
        renderAll();
      });
      li.append(button);
      roadmapEl.append(li);
    }
  }

  function renderKindChips() {
    kindChipsEl.replaceChildren();
    for (const kind of ['all', ...KINDS]) {
      const count = kind === 'all'
        ? trophies.length
        : kind === 'missable'
          ? trophies.filter((t) => t.missable).length
          : trophies.filter((t) => t.kinds.includes(kind)).length;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (activeKind === kind ? ' active' : '');
      chip.setAttribute('aria-pressed', String(activeKind === kind));
      chip.textContent = `${KIND_LABELS[kind]} (${count})`;
      chip.addEventListener('click', () => {
        activeKind = kind;
        renderAll();
      });
      kindChipsEl.append(chip);
    }
  }

  function trophyRow(trophy) {
    const li = document.createElement('li');
    // Barisnya div biasa (bukan <button>): di dalamnya ada checkbox yang
    // juga bisa diklik, dan elemen interaktif di dalam <button> tidak valid.
    const row = document.createElement('div');
    row.className = 'trophy-row' + (earned.has(trophy.name) ? ' earned' : '') + (selectedName === trophy.name ? ' selected' : '');
    row.setAttribute('role', 'button');
    row.tabIndex = 0;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = earned.has(trophy.name);
    check.setAttribute('aria-label', `Tandai ${trophy.name} sudah diraih`);
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => {
      if (check.checked) earned.add(trophy.name);
      else earned.delete(trophy.name);
      saveProgress();
      renderAll();
    });

    const body = document.createElement('span');
    const hidden = isSpoilerHidden(trophy, spoilerOn, earned);
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = hidden ? 'Trofi story — tersembunyi (spoiler)' : trophy.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = hidden ? 'Centang trofi ini untuk membuka nama dan deskripsinya.' : trophy.description;
    const meta = document.createElement('span');
    meta.className = 'trophy-meta';
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag grade-${trophy.grade}`;
    gradeTag.textContent = gradeLabel(trophy.grade);
    meta.append(gradeTag);
    for (const kind of trophy.kinds) {
      if (kind === 'missable') continue; // missable punya lencana sendiri
      const kindTag = document.createElement('span');
      kindTag.className = 'tag';
      kindTag.textContent = KIND_LABELS[kind] ?? kind;
      meta.append(kindTag);
    }
    if (trophy.missable) {
      const miss = document.createElement('span');
      miss.className = 'tag missable';
      miss.textContent = 'Missable';
      meta.append(miss);
    }
    if (trophy.hidden) {
      const hid = document.createElement('span');
      hid.className = 'tag hidden-trophy';
      hid.textContent = 'Hidden di PSN';
      meta.append(hid);
    }
    body.append(name, desc, meta);
    if (hidden) row.classList.add('spoiler-hidden');

    const right = document.createElement('span');
    right.className = 'trophy-meta';
    const guideHint = document.createElement('span');
    guideHint.className = 'tag';
    guideHint.textContent = 'Panduan ›';
    right.append(guideHint);

    row.append(check, body, right);
    const openDetail = () => {
      selectedName = trophy.name;
      renderDetail(trophy);
      renderList();
    };
    row.addEventListener('click', openDetail);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetail();
      }
    });
    li.append(row);
    return li;
  }

  function renderList() {
    const shown = visibleTrophies();
    listEl.replaceChildren(...shown.map(trophyRow));
    emptyEl.hidden = shown.length !== 0;
    resultCountEl.textContent = activeStage
      ? `Menampilkan ${shown.length} trofi — tahap roadmap aktif, klik tahapnya lagi untuk melepas filter.`
      : `Menampilkan ${shown.length} dari ${trophies.length} trofi.`;
  }

  function renderDetail(trophy) {
    detailEl.replaceChildren();
    const hidden = isSpoilerHidden(trophy, spoilerOn, earned);

    const kindTag = document.createElement('span');
    kindTag.className = `tag grade-${trophy.grade}`;
    kindTag.textContent = gradeLabel(trophy.grade);
    const title = document.createElement('h2');
    title.textContent = hidden ? 'Trofi story tersembunyi' : trophy.name;
    const desc = document.createElement('p');
    desc.className = 'detail-desc';
    desc.textContent = hidden
      ? 'Nama dan deskripsi trofi ini disembunyikan oleh pengaturan spoiler. Centang trofi ini sebagai diraih untuk membukanya.'
      : trophy.description;

    detailEl.append(kindTag, title, desc);

    if (trophy.missable) {
      const warn = document.createElement('p');
      warn.className = 'detail-warning';
      const b = document.createElement('b');
      b.textContent = 'Missable — ';
      warn.append(b, document.createTextNode('trofi ini bisa terlewat. Baca panduan di bawah sebelum melewati momennya; kalau sudah lewat, satu-satunya jalan biasanya new game atau save lama.'));
      detailEl.append(warn);
    }

    const guideHead = document.createElement('h3');
    guideHead.textContent = 'Panduan';
    const guide = document.createElement('p');
    guide.className = 'detail-guide';
    guide.textContent = hidden ? 'Panduan baru tampil setelah trofi dibuka.' : (trophy.guide || 'Panduan untuk trofi ini belum ditulis.');
    detailEl.append(guideHead, guide);

    const srcHead = document.createElement('h3');
    srcHead.textContent = 'Sumber yang dikutip';
    detailEl.append(srcHead);
    if (trophy.sources.length === 0) {
      const none = document.createElement('p');
      none.className = 'detail-desc';
      none.textContent = 'Panduan ini disusun dari deskripsi resmi PlayStation dan daftar trofi Exophase / PSNProfiles.';
      detailEl.append(none);
    } else {
      const list = document.createElement('ul');
      list.className = 'source-list';
      for (const source of trophy.sources) {
        const li = document.createElement('li');
        if (source.url) {
          const a = document.createElement('a');
          a.href = source.url;
          a.textContent = source.name;
          a.target = '_blank';
          a.rel = 'noopener';
          li.append(a);
        } else {
          li.textContent = source.name;
        }
        list.append(li);
      }
      detailEl.append(list);
    }

    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn';
    toggleBtn.textContent = earned.has(trophy.name) ? 'Batalkan: belum diraih' : 'Tandai sudah diraih';
    toggleBtn.addEventListener('click', () => {
      if (earned.has(trophy.name)) earned.delete(trophy.name);
      else earned.add(trophy.name);
      saveProgress();
      renderAll(); // renderAll sudah menggambar ulang panel detail yang terpilih
    });
    actions.append(toggleBtn);
    detailEl.append(actions);

    const foot = document.createElement('p');
    foot.className = 'detail-foot';
    const stage = ROADMAP_STAGES.find((s) => s.id === trophy.stage);
    foot.textContent = `Tahap roadmap: ${stage ? stage.title : trophy.stage} · Jenis: ${KIND_LABELS[trophy.kind] ?? trophy.kind}`;
    detailEl.append(foot);
  }

  function renderAll() {
    renderProgress();
    renderRoadmap();
    renderKindChips();
    renderList();
    if (selectedName) {
      const selected = trophies.find((t) => t.name === selectedName);
      if (selected) renderDetail(selected);
    }
  }

  function exportProgress() {
    const payload = {
      app: 'gta6-trophy-guide',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: [...earned].sort(),
      spoilerOn,
    };
    downloadFile('gta6-trophy-progress.json', JSON.stringify(payload, null, 2));
  }

  async function importProgress(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names)) throw new Error('File tidak berisi daftar trofi');
    const known = new Set(trophies.map((t) => t.name));
    const valid = names.filter((n) => typeof n === 'string' && known.has(n));
    earned.clear();
    for (const name of valid) earned.add(name);
    if (typeof parsed.spoilerOn === 'boolean') {
      spoilerOn = parsed.spoilerOn;
      spoilerToggle.checked = spoilerOn;
      saveSpoiler();
    }
    saveProgress();
    renderAll();
    return valid.length;
  }

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    renderList();
  });
  spoilerToggle.checked = spoilerOn;
  spoilerToggle.addEventListener('change', () => {
    spoilerOn = spoilerToggle.checked;
    saveSpoiler();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const count = await importProgress(file);
      resultCountEl.textContent = `Progress diimpor: ${count} trofi ditandai diraih.`;
    } catch {
      resultCountEl.textContent = 'File import tidak valid — progress tidak berubah.';
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Hapus semua centang progress?')) return;
    earned.clear();
    selectedName = null;
    saveProgress();
    renderAll();
  });

  renderAll();
  return { renderAll };
}

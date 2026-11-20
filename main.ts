// Leonida Platinum Tracker — program penyerahan ke make.fun.
//
// Dijalankan di Node 22, standard library saja, tanpa jaringan. Program
// ini menyalin folder app/ dan screenshots/ dari samping file ini ke
// direktori keluaran, lalu menulis dossier.json di sana memakai
// buildDossier dari vendor/makefun-frontend.ts — pustaka vendored yang
// sama dipakai scorer untuk membangun ulang dossier dan membandingkannya
// byte per byte, jadi file vendor itu tidak boleh diubah.
//
// Di luar container grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Batas yang sama dengan yang dipakai scorer (lihat RULES.txt, "The gate"):
// paling banyak 4 screenshot @ 256 KiB, app/ paling banyak 993 entri dan
// 48 MiB, dan teks dossier dibatasi 160 KiB. Kalau entri melewati batas di
// sini, entri itu ditolak di sana — jadi buildDossier menolaknya lebih dulu.
const dossierText = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outputDir, 'dossier.json'), dossierText);

#!/usr/bin/env node
/**
 * 공지사항 Gist 자동 갱신 — 릴리즈 후 새 공지 객체를 배열 맨 앞에 prepend.
 *
 * 공지 Gist: gist.githubusercontent.com/ppsszero/01b338c3.../raw/stock-orbit-notice.json
 * 형식: [{ version, date, content }, ...]  (맨 앞 = 최신, useNoticeData가 data[0]을 최신으로 사용)
 *
 * 사용:
 *   node scripts/update-notice-gist.mjs "<content>" [version] [date]
 *   예) node scripts/update-notice-gist.mjs "NXT 장전 가격 / 트레이 투명도 수정"
 *       (version 생략 시 package.json, date 생략 시 오늘(Asia/Seoul))
 *
 * 토큰: 환경변수 GIST_TOKEN 우선, 없으면 GH_TOKEN. **gist 쓰기 스코프 필요**
 *   (릴리즈용 repo 토큰엔 보통 없음 — 별도 GIST_TOKEN 또는 GH_TOKEN에 gist 스코프 추가)
 *
 * 멱등(idempotent): 같은 version이 이미 있으면 prepend하지 않고 종료.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const GIST_ID = '01b338c3e822b3804411cdda5f9b1a3a';
const GIST_FILE = 'stock-orbit-notice.json';
const API = `https://api.github.com/gists/${GIST_ID}`;

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.GIST_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('Error: GIST_TOKEN 또는 GH_TOKEN 환경변수가 필요합니다 (gist 쓰기 스코프).');
  process.exit(1);
}

const content = process.argv[2];
if (!content) {
  console.error('Usage: node scripts/update-notice-gist.mjs "<content>" [version] [date]');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
const version = process.argv[3] || pkg.version;
const date = process.argv[4] || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'orbit-release',
};

const main = async () => {
  // 1. 현재 gist 읽기
  const getRes = await fetch(API, { headers });
  if (!getRes.ok) {
    console.error(`Error: gist 조회 실패 (HTTP ${getRes.status}). 토큰 권한 확인.`);
    process.exit(1);
  }
  const gist = await getRes.json();
  const file = gist.files?.[GIST_FILE];
  if (!file) {
    console.error(`Error: gist에 ${GIST_FILE} 파일이 없습니다.`);
    process.exit(1);
  }
  let arr;
  try {
    arr = JSON.parse(file.content);
    if (!Array.isArray(arr)) throw new Error('not an array');
  } catch {
    console.error('Error: gist 내용이 JSON 배열이 아닙니다.');
    process.exit(1);
  }

  // 2. 멱등 체크
  if (arr.some(n => n.version === version)) {
    console.log(`Skip: v${version}이(가) 이미 공지에 있습니다. (변경 없음)`);
    return;
  }

  // 3. prepend
  const next = [{ version, date, content }, ...arr];
  const body = JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(next, null, 2) } } });

  // 4. PATCH
  const patchRes = await fetch(API, { method: 'PATCH', headers, body });
  if (!patchRes.ok) {
    const msg = patchRes.status === 403 || patchRes.status === 404
      ? '토큰에 gist 쓰기 스코프가 없습니다 (GIST_TOKEN/GH_TOKEN에 gist 권한 추가 필요).'
      : `HTTP ${patchRes.status}`;
    console.error(`Error: gist PATCH 실패 — ${msg}`);
    process.exit(1);
  }
  console.log(`OK: 공지 prepend 완료 — v${version} (${date}) "${content}"`);
};

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

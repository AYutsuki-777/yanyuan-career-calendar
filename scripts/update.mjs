/**
 * 抓取北大就业网公开的宣讲会 / 招聘 / 实习信息，生成静态数据文件。
 *
 * 用法：
 *   node scripts/update.mjs            # 增量更新（推荐，每 6 小时跑一次）
 *   node scripts/update.mjs --full     # 首次全量抓取（翻更多页）
 *   node scripts/update.mjs --dry      # 只抓取和统计，不写文件
 *
 * 输出：data/events.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  fetchFairPage,
  fetchJobPage,
  parseCnTime,
  sleep,
} from './api.mjs';
import { inferTags, inferFunctions, inferCohort, inferCity } from './tags.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

const argv = process.argv.slice(2);
const FULL = argv.includes('--full');
const DRY = argv.includes('--dry');
const ENRICH = argv.includes('--enrich'); // 只给本地已有数据补算职能/届别/城市，不联网

const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

// 抓取深度：增量模式只看最近几页，全量模式多翻一些
const FAIR_MAX_PAGES = FULL ? 20 : 3;
const JOB_MAX_PAGES = FULL ? 40 : 4;
const PAGE_SIZE = 50;

// 过期清理
const JOB_POSTED_WINDOW = 120 * DAY; // 只抓最近四个月发布的职位
const JOB_NO_DEADLINE_KEEP = 45 * DAY; // 没有截止日期的职位最多保留 45 天

function isFairAlive(item, now = NOW) {
  if (!item.startMs) return false;
  return (item.endMs || item.startMs) >= now;
}

function isJobAlive(item, now = NOW) {
  if (item.endMs) return item.endMs >= now;
  return Boolean(item.publishedMs) && item.publishedMs >= now - JOB_NO_DEADLINE_KEEP;
}

const FAIR_TYPES = [
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
  { value: 3, label: '空中宣讲会' },
  { value: 4, label: '视频宣讲会' },
  { value: 5, label: '校外云宣讲' },
];

const POSITION_TYPES = [
  { value: 1, label: '招聘' },
  { value: 2, label: '实习' },
];

function cleanText(value) {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCst(ms) {
  const d = new Date(ms + 8 * HOUR);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

function displayTime(ms) {
  if (!ms) return '';
  const d = new Date(ms + 8 * HOUR);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())}`;
}

/** 从标题里提取届别 / 学历 / 招聘类型等可筛选信号 */
function extractAudience(title, company) {
  const text = `${title} ${company}`;
  const tags = [];
  if (/202[6-9]\s*届|20[2-9][0-9]\s*届/.test(text)) tags.push('校招');
  if (/实习|暑期|寒假|日常实习/.test(text)) tags.push('实习');
  if (/博士|postdoc/i.test(text)) tags.push('博士');
  else if (/硕士|研究生/.test(text)) tags.push('硕士');
  else if (/本科|学士/.test(text)) tags.push('本科');
  if (/管培生|管理培训生/.test(text)) tags.push('管培生');
  if (/选调|公务员|事业单位/.test(text)) tags.push('体制内');
  if (/博士后/.test(text)) tags.push('博士后');
  if (/宣讲/.test(text)) tags.push('宣讲');
  return [...new Set(tags)];
}

/** 给单条数据补算 职能 / 届别 / 城市（幂等，可反复执行） */
function enrichItem(item) {
  const functions = inferFunctions(item.title);
  const cohort = inferCohort(item.title);
  const city = inferCity(item.company, item.location, item.title);
  return { ...item, functions, cohort, city };
}

function normalizeFair(raw, typeLabel) {
  const startMs = parseCnTime(raw.startTime);
  const endMs = parseCnTime(raw.endTime);
  const title = cleanText(raw.title);
  const company = cleanText(raw.corporationinfo?.name || '');
  const location = cleanText(
    raw.fieldExport || raw.field?.name || raw.place || ''
  );
  return {
    id: `fair:${raw.id}`,
    kind: 'fair',
    subtype: typeLabel,
    title,
    company,
    startMs,
    endMs,
    publishedMs: null,
    location,
    nature: '',
    scale: '',
    positions: 0,
    functions: inferFunctions(title),
    cohort: inferCohort(title),
    city: inferCity(company, location, title),
    views: Number(raw.browseNumber) || 0,
    top: raw.topFlag === '1',
    url: raw.url ? `https://scc.pku.edu.cn${raw.url}` : '',
    tags: [...inferTags(company, title), ...extractAudience(title, company)].slice(0, 5),
  };
}

function normalizeJob(raw, typeLabel) {
  const publishedMs = parseCnTime(raw.startTime);
  const deadlineMs = parseCnTime(raw.endTime);
  const title = cleanText(raw.title);
  const company = cleanText(
    raw.corporationName || raw.corporationinfo?.name || ''
  );
  return {
    id: `job:${raw.id}`,
    kind: raw.positionType === '2' ? 'internship' : 'job',
    subtype: typeLabel,
    title,
    company,
    startMs: publishedMs,
    endMs: deadlineMs,
    publishedMs,
    location: '',
    nature: cleanText(raw.corporationinfo?.corporationNatureValue || ''),
    scale: cleanText(raw.corporationinfo?.corporationScaleValue || ''),
    positions: Number(raw.positionNum) || 0,
    functions: inferFunctions(title),
    cohort: inferCohort(title),
    city: inferCity(company, '', title),
    views: Number(raw.browseNumber) || 0,
    top: raw.topFlag === '1',
    url: raw.url ? `https://scc.pku.edu.cn${raw.url}` : '',
    tags: [...inferTags(company, title), ...extractAudience(title, company)].slice(0, 5),
  };
}

async function loadExisting() {
  try {
    const raw = await fs.readFile(EVENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function crawlFairs(deep) {
  const collected = [];
  const maxPages = deep ? FAIR_MAX_PAGES : Math.min(FAIR_MAX_PAGES, 3);
  for (const type of FAIR_TYPES) {
    let emptyStreak = 0;
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      let res;
      try {
        res = await fetchFairPage({
          fairType: type.value,
          pageNo,
          pageSize: PAGE_SIZE,
        });
      } catch (error) {
        console.warn(`  ! ${type.label} 第 ${pageNo} 页失败：${error.message}`);
        break;
      }
      const list = res?.object?.list || [];
      if (!list.length) {
        emptyStreak += 1;
        if (emptyStreak >= 2) break;
        continue;
      }
      const normalized = list
        .map((item) => normalizeFair(item, type.label))
        .filter((item) => isFairAlive(item));
      collected.push(...normalized);

      // 列表按举办时间倒序，翻到已经明显过期的数据就可以停
      const oldest = Math.min(
        ...list.map((item) => parseCnTime(item.startTime) || NOW)
      );
      if (oldest < NOW - 2 * DAY) break;
      await sleep(120);
    }
    console.log(`  · ${type.label}：${collected.filter((i) => i.subtype === type.label).length} 条`);
  }
  return collected;
}

async function crawlJobs(deep) {
  const collected = [];
  const maxPages = deep ? JOB_MAX_PAGES : Math.min(JOB_MAX_PAGES, 4);
  for (const type of POSITION_TYPES) {
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      let res;
      try {
        res = await fetchJobPage({
          positionType: type.value,
          pageNo,
          pageSize: PAGE_SIZE,
        });
      } catch (error) {
        console.warn(`  ! ${type.label}第 ${pageNo} 页失败：${error.message}`);
        break;
      }
      const list = res?.object?.list || [];
      if (!list.length) break;
      collected.push(...list.map((item) => normalizeJob(item, type.label)));

      const oldest = Math.min(
        ...list.map((item) => parseCnTime(item.startTime) || NOW)
      );
      if (oldest < NOW - JOB_POSTED_WINDOW) break;
      await sleep(120);
    }
    console.log(
      `  · ${type.label}：${collected.filter((i) => i.subtype === type.label).length} 条（含已过期）`
    );
  }
  return collected;
}

function isAlive(item) {
  return item.kind === 'fair' ? isFairAlive(item) : isJobAlive(item);
}

function mergeItems(oldItems, freshItems, initial) {
  const map = new Map();
  for (const item of oldItems) map.set(item.id, item);
  let added = 0;
  for (const item of freshItems) {
    const prev = map.get(item.id);
    if (prev) {
      // 保留首次收录时间，其余字段用最新抓取结果覆盖
      map.set(item.id, { ...prev, ...item, firstSeen: prev.firstSeen || prev.addedAt });
    } else {
      added += 1;
      // 首次全量抓取时，历史数据不标注 firstSeen，避免整页都是 NEW
      map.set(item.id, initial ? item : { ...item, firstSeen: new Date(NOW).toISOString() });
    }
  }
  const merged = [...map.values()].filter(isAlive);

  // 兜底：数据量异常时按时间截断，避免仓库无限膨胀
  const MAX_ITEMS = 4000;
  if (merged.length > MAX_ITEMS) {
    merged.sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
    return { items: merged.slice(-MAX_ITEMS), added };
  }
  return { items: merged, added };
}

function countKinds(items) {
  const counts = { fair: 0, job: 0, internship: 0 };
  for (const item of items) counts[item.kind] = (counts[item.kind] || 0) + 1;
  return counts;
}

function buildMeta(items, firstRun) {
  const counts = countKinds(items);
  return {
    generatedAt: new Date(NOW).toISOString(),
    generatedAtCst: formatCst(NOW),
    source: 'https://scc.pku.edu.cn',
    sourceName: '北京大学学生就业指导服务中心',
    note: '非官方页面，数据自动同步自就业网公开列表，请以原文为准。',
    firstRun: Boolean(firstRun),
    counts,
    total: items.length,
  };
}

function serialize(meta, items) {
  const rows = items.map((item) => `    ${JSON.stringify(item)}`);
  return `{\n  "meta": ${JSON.stringify(meta, null, 2)},\n  "items": [\n${rows.join(
    ',\n'
  )}\n  ]\n}\n`;
}

/** 只给已有数据补算派生字段，不联网、不改同步时间 */
async function enrichOnly() {
  const raw = JSON.parse(await fs.readFile(EVENTS_FILE, 'utf8'));
  const before = (Array.isArray(raw.items) ? raw.items : []).map(enrichItem);
  const items = before.filter(isAlive);
  const meta = { ...(raw.meta || {}), counts: countKinds(items), total: items.length };
  await fs.writeFile(EVENTS_FILE, serialize(meta, items), 'utf8');
  const withFn = items.filter((i) => i.functions?.length).length;
  const withCohort = items.filter((i) => i.cohort).length;
  const withCity = items.filter((i) => i.city).length;
  console.log(
    `已补算 ${items.length} 条（移除过期 ${before.length - items.length} 条）：` +
      `职能 ${withFn} / 届别 ${withCohort} / 城市 ${withCity}`
  );
}

async function main() {
  if (ENRICH) {
    console.log('\n只补算派生字段（不联网）…');
    await enrichOnly();
    return;
  }

  console.log(`\n北京大学就业信息抓取 ${FULL ? '(全量)' : '(增量)'}  ${formatCst(NOW)}`);
  const existing = await loadExisting();
  const deep = FULL || existing.length === 0;
  console.log(`本地已有 ${existing.length} 条${deep ? '（本次深度抓取）' : ''}`);

  console.log('抓取宣讲会 / 双选会…');
  const fairs = await crawlFairs(deep);
  console.log('抓取招聘 / 实习…');
  const jobs = await crawlJobs(deep);

  const { items: merged, added } = mergeItems(existing, [...fairs, ...jobs], existing.length === 0);
  // 老数据也顺手补上职能 / 届别 / 城市
  const items = merged.map(enrichItem);
  items.sort((a, b) => (a.startMs || 0) - (b.startMs || 0));

  const meta = buildMeta(items, existing.length === 0);
  console.log(
    `\n合并完成：新增 ${added} 条，当前保留 ${items.length} 条 ` +
      `(宣讲会 ${meta.counts.fair} / 招聘 ${meta.counts.job} / 实习 ${meta.counts.internship})`
  );

  if (DRY) {
    console.log('--dry 模式，未写入文件。示例：');
    console.log(JSON.stringify(items.slice(0, 3), null, 2));
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(EVENTS_FILE, serialize(meta, items), 'utf8');
  console.log(`已写入 ${path.relative(ROOT, EVENTS_FILE)}`);

  // GitHub Actions 里用来判断是否需要提交
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      `total=${items.length}\nadded=${added}\n`
    );
  }
}

main().catch((error) => {
  console.error('\n抓取失败：', error);
  process.exit(1);
});

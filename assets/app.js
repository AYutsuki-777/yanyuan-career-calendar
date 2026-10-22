/* ============================================================
   燕园求职日历 — 前端逻辑（零依赖）
   ============================================================ */

(() => {
  'use strict';

  const DATA_URL = 'data/events.json';
  const STORE_PREFS = 'yanyuan-career-prefs-v1';
  const STORE_FAVS = 'yanyuan-career-favs-v1';
  const STORE_AGENDA = 'yanyuan-career-agenda-v1';
  const CST = 'Asia/Shanghai';
  const PAGE_SIZE = 24;

  const TYPE_LABEL = { fair: '宣讲会', job: '招聘', internship: '实习' };
  const TYPE_COLOR = {
    fair: ['var(--red)', 'var(--red-soft)'],
    job: ['var(--teal)', 'var(--teal-soft)'],
    internship: ['var(--amber)', 'var(--amber-soft)'],
  };

  // 方向 = 行业 + 职能 + 代表企业的组合，点一下就能筛出该方向的机会
  const DIRECTIONS = [
    {
      id: 'consulting',
      name: '咨询/战略',
      keywords: [
        '咨询', '战略', '管理咨询', '麦肯锡', '波士顿', '贝恩', '罗兰贝格',
        '埃森哲', '凯捷', '德勤', '普华永道',
      ],
      tags: ['咨询/专业服务'],
      functions: ['咨询/战略'],
    },
    {
      id: 'finance',
      name: '金融/投融资',
      keywords: [
        '投行', '券商', '基金', '证券', '投资', '资管', '中金', '中信',
        '华泰', '招商', '高盛', '摩根', '银行',
      ],
      tags: ['金融/银行'],
      functions: ['投资/投研', '财务/审计'],
    },
    {
      id: 'tech',
      name: '科技/互联网',
      keywords: [
        '产品', '运营', '数据', '算法', '研发', '腾讯', '阿里', '字节',
        '美团', '京东', '百度', '华为', '小米', '网易', '滴滴', '快手',
      ],
      tags: ['互联网/科技'],
      functions: ['产品/运营', '数据分析', '技术/研发'],
    },
    {
      id: 'fmcg',
      name: '快消/零售',
      keywords: [
        '市场', '品牌', '营销', '管培', '宝洁', '联合利华', '玛氏',
        '欧莱雅', '雀巢', '可口可乐', '伊利', '蒙牛', '零售',
      ],
      tags: ['快消/零售'],
      functions: ['市场/品牌', '管培生', '销售/商务'],
    },
    {
      id: 'health',
      name: '医疗/健康',
      keywords: ['医药', '医疗', '生物', '制药', '器械', '辉瑞', '诺华', '药明', '恒瑞', '医院'],
      tags: ['医疗/生物'],
      functions: [],
    },
    {
      id: 'soe',
      name: '国企/央企',
      keywords: [
        '国企', '央企', '集团', '选调', '中字头', '国家电网', '中石油',
        '中石化', '中移动', '中国建筑', '中粮',
      ],
      tags: ['国企/事业单位', '政府/公共部门'],
      functions: [],
    },
    {
      id: 'manufacturing',
      name: '制造/能源',
      keywords: [
        '制造', '汽车', '能源', '新能源', '化工', '机械', '比亚迪',
        '宁德时代', '隆基', '一汽', '上汽',
      ],
      tags: ['制造/能源'],
      functions: [],
    },
  ];

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16.7 16.7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
    pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
    star: '<path d="m12 3.6 2.55 5.3 5.85.78-4.3 4.05 1.09 5.79L12 16.75 6.81 19.5 7.9 13.7 3.6 9.67l5.85-.78z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M3.5 10h17"/><path d="M8 14h2M14 14h2M8 17.2h2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    share: '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.3 10.7 7.4-3.9M8.3 13.3l7.4 3.9"/>',
    spark: '<path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9z"/><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    eye: '<path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>',
    building: '<path d="M4 20.5V5.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15"/><path d="M15 9.5h4a1 1 0 0 1 1 1v10"/><path d="M7.5 8.5h1M11 8.5h1M7.5 12h1M11 12h1M7.5 15.5h1M11 15.5h1M3 20.5h18"/>',
    people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 20c0-3.2 2.5-5.4 5.5-5.4s5.5 2.2 5.5 5.4"/><path d="M16 5.8a3.2 3.2 0 0 1 0 6.2M17.2 14.9c2.1.5 3.5 2.4 3.5 5.1"/>',
  };

  const icon = (name, cls = '') =>
    `<span class="ico${cls ? ` ${cls}` : ''}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg></span>`;

  // ---------- 工具 ----------

  const $ = (sel) => document.querySelector(sel);
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const dayKey = (ms) =>
    new Date(ms).toLocaleDateString('en-CA', { timeZone: CST }); // YYYY-MM-DD

  const todayKey = () => dayKey(Date.now());

  const keyToMs = (key) => Date.parse(`${key}T00:00:00+08:00`);

  const dayDiff = (ms) =>
    Math.round((keyToMs(dayKey(ms)) - keyToMs(todayKey())) / 86400000);

  const diffFromKey = (key) =>
    Math.round((keyToMs(key) - keyToMs(todayKey())) / 86400000);

  const monthDay = (ms) => {
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: CST,
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return { month: get('month'), day: get('day') };
  };

  const weekday = (ms) =>
    new Intl.DateTimeFormat('zh-CN', { timeZone: CST, weekday: 'short' }).format(new Date(ms));

  const timeHM = (ms) =>
    new Intl.DateTimeFormat('zh-CN', {
      timeZone: CST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(ms));

  const fmtDateTime = (ms) => {
    const { month, day } = monthDay(ms);
    return `${month}-${day} ${timeHM(ms)}`;
  };

  const isSameDay = (a, b) => dayKey(a) === dayKey(b);

  const nowMs = () => Date.now();

  // ---------- 状态 ----------

  const state = {
    q: '',
    type: 'all',
    range: 'all',
    tags: [],
    nature: '',
    dir: '',
    fn: '',
    cohort: '',
    city: '',
    sort: 'time',
    mine: false,
    favOnly: false,
    page: 1,
  };

  let meta = {};
  let items = [];
  let filtered = [];
  let prefs = { keywords: [], tags: [] };
  let favs = new Set();
  let agenda = new Set();
  let agendaSel = null;
  let pendingAgendaId = null;
  let tagCounts = new Map();
  let loadFailed = false;

  // ---------- 本地存储 ----------

  function loadLocal() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_PREFS) || '{}');
      prefs = {
        keywords: Array.isArray(p.keywords) ? p.keywords.filter(Boolean) : [],
        tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
      };
    } catch {
      prefs = { keywords: [], tags: [] };
    }
    try {
      const f = JSON.parse(localStorage.getItem(STORE_FAVS) || '[]');
      favs = new Set(Array.isArray(f) ? f : []);
    } catch {
      favs = new Set();
    }
    try {
      const a = JSON.parse(localStorage.getItem(STORE_AGENDA) || '[]');
      agenda = new Set(Array.isArray(a) ? a : []);
    } catch {
      agenda = new Set();
    }
  }

  const savePrefs = () => {
    try { localStorage.setItem(STORE_PREFS, JSON.stringify(prefs)); } catch {}
  };
  const saveFavs = () => {
    try { localStorage.setItem(STORE_FAVS, JSON.stringify([...favs])); } catch {}
  };
  const saveAgenda = () => {
    try { localStorage.setItem(STORE_AGENDA, JSON.stringify([...agenda])); } catch {}
  };

  // ---------- 数据加载 ----------

  async function loadData() {
    const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    meta = data.meta || {};
    items = (Array.isArray(data.items) ? data.items : []).filter(
      (it) => it && it.id && it.title && (it.startMs || it.endMs)
    );

    tagCounts = new Map();
    for (const it of items) {
      it.functions = Array.isArray(it.functions) ? it.functions : [];
      it.cohort = it.cohort || null;
      it.city = it.city || '';
      it._search = [
        it.title,
        it.company,
        it.location,
        it.nature,
        it.subtype,
        it.city,
        ...(it.tags || []),
        ...it.functions,
      ]
        .join(' ')
        .toLowerCase();
      it._firstSeenMs = Date.parse(it.firstSeen || '') || 0;
      it._dateMs = it.kind === 'fair' ? it.startMs : it.endMs || it.startMs;
      for (const t of it.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }

  // ---------- 匹配与排序 ----------

  function matchesType(it) {
    if (state.type === 'all') return true;
    return it.kind === state.type;
  }

  function matchesRange(it) {
    if (state.range === 'all') return true;
    const diff = dayDiff(it._dateMs);
    if (state.range === 'today') return diff === 0;
    if (state.range === '7d') return diff >= 0 && diff <= 7;
    if (state.range === '30d') return diff >= 0 && diff <= 30;
    if (state.range === 'soon') return diff >= 0 && diff <= 3;
    return true;
  }

  function matchesTags(it) {
    if (!state.tags.length) return true;
    return state.tags.some((t) => (it.tags || []).includes(t));
  }

  function matchesNature(it) {
    if (!state.nature) return true;
    return it.nature === state.nature;
  }

  function dirHit(dir, it) {
    const text = `${it.title} ${it.company} ${it.location}`.toLowerCase();
    return (
      dir.keywords.some((k) => text.includes(k.toLowerCase())) ||
      dir.tags.some((t) => (it.tags || []).includes(t)) ||
      dir.functions.some((f) => (it.functions || []).includes(f))
    );
  }

  function matchesDir(it) {
    if (!state.dir) return true;
    const dir = DIRECTIONS.find((d) => d.id === state.dir);
    return dir ? dirHit(dir, it) : true;
  }

  function matchesFn(it) {
    if (!state.fn) return true;
    return (it.functions || []).includes(state.fn);
  }

  function matchesCohort(it) {
    if (!state.cohort) return true;
    if (state.cohort === 'none') return !it.cohort;
    return String(it.cohort) === state.cohort;
  }

  function matchesCity(it) {
    if (!state.city) return true;
    if (state.city === '__none') return !it.city;
    return it.city === state.city;
  }

  function matchesSearch(it) {
    if (!state.q) return true;
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every((t) => it._search.includes(t));
  }

  function matchScore(it) {
    if (!prefs.keywords.length && !prefs.tags.length) return 0;
    let score = 0;
    const text = `${it.title} ${it.company} ${(it.tags || []).join(' ')}`.toLowerCase();
    for (const kw of prefs.keywords) {
      if (kw && text.includes(kw.toLowerCase())) score += 2;
    }
    for (const t of prefs.tags) {
      if ((it.tags || []).includes(t)) score += 1;
    }
    return score;
  }

  function matchesMine(it) {
    if (!state.mine) return true;
    return matchScore(it) > 0;
  }

  function matchesFav(it) {
    if (!state.favOnly) return true;
    return favs.has(it.id);
  }

  const matchesBase = (it) =>
    matchesRange(it) &&
    matchesTags(it) &&
    matchesNature(it) &&
    matchesDir(it) &&
    matchesFn(it) &&
    matchesCohort(it) &&
    matchesCity(it) &&
    matchesSearch(it) &&
    matchesMine(it) &&
    matchesFav(it);

  function sortItems(list) {
    const arr = list.slice();
    if (state.sort === 'new') {
      arr.sort((a, b) => {
        const av = a.publishedMs || a._firstSeenMs || a.startMs || 0;
        const bv = b.publishedMs || b._firstSeenMs || b.startMs || 0;
        return bv - av;
      });
      return arr;
    }

    if (state.sort === 'deadline') {
      arr.sort((a, b) => (a._dateMs || 0) - (b._dateMs || 0));
      return arr;
    }

    // 时间最近：未来按时间升序排前面，已经过去的沉到末尾
    const now = nowMs();
    arr.sort((a, b) => {
      const av = a._dateMs || 0;
      const bv = b._dateMs || 0;
      const aPast = av < now;
      const bPast = bv < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (aPast) return bv - av;
      return av - bv;
    });
    return arr;
  }

  function applyFilters() {
    filtered = sortItems(items.filter((it) => matchesBase(it) && matchesType(it)));
    return filtered;
  }

  // ---------- 渲染：统计 ----------

  function renderHero() {
    const now = nowMs();
    const fairs7 = items.filter(
      (it) => it.kind === 'fair' && it.startMs >= now && it.startMs <= now + 7 * 86400000
    ).length;
    const activeJobs = items.filter(
      (it) => it.kind !== 'fair' && (!it.endMs || it.endMs >= now)
    ).length;
    const todayCount = items.filter((it) => dayDiff(it._dateMs) === 0).length;

    const stats = $('#heroStats');
    if (!stats) return;
    const b = stats.querySelectorAll('.stat b');
    if (b[0]) b[0].textContent = fairs7;
    if (b[1]) b[1].textContent = activeJobs;
    if (b[2]) b[2].textContent = todayCount;
    if (b[3]) b[3].textContent = meta.generatedAtCst ? fmtDateTime(Date.parse(meta.generatedAt) || now) : '—';

    const updated = $('#updatedAt');
    if (updated) updated.textContent = meta.generatedAtCst ? meta.generatedAtCst.slice(5) : '—';

    $('#syncLabel').textContent = meta.generatedAtCst ? `更新于 ${meta.generatedAtCst.slice(5)}` : '自动同步';
    $('#aboutUpdated').textContent = meta.generatedAtCst || '—';
    $('#aboutCount').textContent = `${items.length} 条`;

    const todayDateEl = $('#todayDate');
    if (todayDateEl) {
      const { month, day } = monthDay(nowMs());
      todayDateEl.textContent = `${Number(month)}月${Number(day)}日 · ${weekday(nowMs())}`;
    }
  }

  // ---------- 渲染：筛选项 ----------

  function renderTabs() {
    const base = items.filter(matchesBase);
    const counts = { all: base.length, fair: 0, job: 0, internship: 0 };
    for (const it of base) counts[it.kind] = (counts[it.kind] || 0) + 1;
    for (const btn of document.querySelectorAll('#typeSeg button')) {
      const type = btn.dataset.type;
      btn.classList.toggle('active', state.type === type);
      const label = type === 'all' ? '全部' : TYPE_LABEL[type];
      btn.innerHTML = `${label}<span class="seg-count">${counts[type] || 0}</span>`;
      btn.setAttribute('aria-selected', state.type === type ? 'true' : 'false');
    }
  }

  function renderTagList() {
    // 标签数量跟随「当前类型 / 时间 / 搜索」变化（不含标签筛选本身）
    const base = items.filter(
      (it) =>
        matchesRange(it) &&
        matchesNature(it) &&
        matchesDir(it) &&
        matchesFn(it) &&
        matchesCohort(it) &&
        matchesCity(it) &&
        matchesSearch(it) &&
        matchesMine(it) &&
        matchesFav(it) &&
        matchesType(it)
    );
    const counts = new Map();
    for (const it of base) {
      for (const t of it.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }

    const tags = [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
    // 已选中的标签即使数量少也保留在列表里，方便取消
    for (const t of state.tags) {
      if (!tags.some(([name]) => name === t)) tags.push([t, counts.get(t) || 0]);
    }

    const el = $('#tagList');
    el.innerHTML = tags
      .map(
        ([tag, n]) =>
          `<button type="button" class="chip${state.tags.includes(tag) ? ' active' : ''}" data-tag="${esc(
            tag
          )}">${esc(tag)}<span class="count">${n}</span></button>`
      )
      .join('');
  }

  function renderDirList() {
    // 方向计数跟随「类型 / 时间 / 搜索 / 其他筛选」，但不含方向本身
    const base = items.filter(
      (it) =>
        matchesRange(it) &&
        matchesNature(it) &&
        matchesFn(it) &&
        matchesCohort(it) &&
        matchesCity(it) &&
        matchesSearch(it) &&
        matchesMine(it) &&
        matchesFav(it) &&
        matchesType(it)
    );
    const el = $('#dirList');
    if (!el) return;
    const chips = [
      `<button type="button" class="chip${state.dir ? '' : ' active'}" data-dir="">全部方向</button>`,
      ...DIRECTIONS.map((d) => {
        const n = base.filter((it) => dirHit(d, it)).length;
        return `<button type="button" class="chip${state.dir === d.id ? ' active' : ''}" data-dir="${
          d.id
        }">${esc(d.name)}<span class="count">${n}</span></button>`;
      }),
    ];
    el.innerHTML = chips.join('');
  }

  function renderNatureOptions() {
    const counts = new Map();
    for (const it of items) {
      if (it.nature) counts.set(it.nature, (counts.get(it.nature) || 0) + 1);
    }
    const options = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const select = $('#natureSelect');
    const current = state.nature;
    select.innerHTML =
      '<option value="">全部单位性质</option>' +
      options
        .map(([n, c]) => `<option value="${esc(n)}">${esc(n)}（${c}）</option>`)
        .join('');
    select.value = options.some(([n]) => n === current) ? current : '';
    if (select.value !== current) state.nature = select.value;
  }

  function renderFnOptions() {
    const counts = new Map();
    for (const it of items) {
      for (const f of it.functions || []) counts.set(f, (counts.get(f) || 0) + 1);
    }
    const options = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const select = $('#fnSelect');
    const current = state.fn;
    select.innerHTML =
      '<option value="">全部职能</option>' +
      options
        .map(([f, c]) => `<option value="${esc(f)}">${esc(f)}（${c}）</option>`)
        .join('');
    select.value = options.some(([f]) => f === current) ? current : '';
    if (select.value !== current) state.fn = select.value;
  }

  function renderCohortOptions() {
    const counts = new Map();
    let unknown = 0;
    for (const it of items) {
      if (it.cohort) counts.set(it.cohort, (counts.get(it.cohort) || 0) + 1);
      else unknown += 1;
    }
    const years = [...counts.entries()].sort((a, b) => b[0] - a[0]);
    const select = $('#cohortSelect');
    const current = state.cohort;
    select.innerHTML =
      '<option value="">全部届别 / 年份</option>' +
      years
        .map(([y, c]) => `<option value="${y}">${y} 届 / 年（${c}）</option>`)
        .join('') +
      (unknown ? `<option value="none">未标注（${unknown}）</option>` : '');
    const exists =
      years.some(([y]) => String(y) === current) || (current === 'none' && unknown);
    select.value = exists ? current : '';
    if (select.value !== current) state.cohort = select.value;
  }

  function renderCityOptions() {
    const counts = new Map();
    let unknown = 0;
    for (const it of items) {
      if (it.city) counts.set(it.city, (counts.get(it.city) || 0) + 1);
      else unknown += 1;
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
    const select = $('#citySelect');
    const current = state.city;
    select.innerHTML =
      '<option value="">全部城市</option>' +
      top
        .map(([c, n]) => `<option value="${esc(c)}">${esc(c)}（${n}）</option>`)
        .join('') +
      (unknown ? `<option value="__none">其他 / 未标注（${unknown}）</option>` : '');
    const exists =
      top.some(([c]) => c === current) || (current === '__none' && unknown);
    select.value = exists ? current : '';
    if (select.value !== current) state.city = select.value;
  }

  function syncControls() {
    $('#searchInput').value = state.q;
    $('#searchClear').hidden = !state.q;
    $('#sortSelect').value = state.sort;
    $('#fnSelect').value = state.fn;
    $('#cohortSelect').value = state.cohort;
    $('#citySelect').value = state.city;
    for (const btn of document.querySelectorAll('#rangeGroup .chip')) {
      btn.classList.toggle('active', btn.dataset.range === state.range);
    }
    $('#favToggle').classList.toggle('active', state.favOnly);
    $('#mineToggle').classList.toggle('active', state.mine);
    $('#resetBtn').hidden = !hasActiveFilters();
  }

  function hasActiveFilters() {
    return Boolean(
      state.q ||
        state.type !== 'all' ||
        state.range !== 'all' ||
        state.tags.length ||
        state.nature ||
        state.dir ||
        state.fn ||
        state.cohort ||
        state.city ||
        state.mine ||
        state.favOnly
    );
  }

  function renderActiveFilters() {
    const el = $('#activeFilters');
    const pills = [];
    if (state.type !== 'all') pills.push(['type', TYPE_LABEL[state.type]]);
    if (state.range !== 'all') {
      const label = {
        today: '今天',
        '7d': '未来 7 天',
        '30d': '未来 30 天',
        soon: '3 天内',
      }[state.range];
      pills.push(['range', label]);
    }
    if (state.q) pills.push(['q', `搜索：${state.q}`]);
    if (state.dir) {
      const d = DIRECTIONS.find((x) => x.id === state.dir);
      pills.push(['dir', `方向：${d ? d.name : state.dir}`]);
    }
    for (const t of state.tags) pills.push([`tag:${t}`, t]);
    if (state.fn) pills.push(['fn', `职能：${state.fn}`]);
    if (state.cohort) {
      pills.push([
        'cohort',
        state.cohort === 'none' ? '未标注届别/年份' : `${state.cohort} 届/年`,
      ]);
    }
    if (state.city) pills.push(['city', state.city === '__none' ? '其他城市' : state.city]);
    if (state.nature) pills.push(['nature', state.nature]);
    if (state.mine) pills.push(['mine', '适合我的']);
    if (state.favOnly) pills.push(['fav', '只看收藏']);

    el.hidden = pills.length === 0;
    el.innerHTML = pills
      .map(
        ([key, label]) =>
          `<span class="pill">${esc(label)}<button type="button" data-remove="${esc(
            key
          )}" aria-label="移除筛选">×</button></span>`
      )
      .join('');
  }

  // ---------- 渲染：卡片 ----------

  function kindAccent(it) {
    return TYPE_COLOR[it.kind] || TYPE_COLOR.fair;
  }

  function dateBox(it) {
    const ms = it._dateMs;
    const { month, day } = monthDay(ms);
    const isFair = it.kind === 'fair';
    const year = new Date(ms).toLocaleDateString('en-CA', { timeZone: CST }).slice(0, 4);
    const showYear = year !== String(new Date().getFullYear());
    return `<div class="card-date${isFair ? '' : ' deadline'}">
      <span class="d-mon">${month}月${showYear ? `<br>${year}` : ''}</span>
      <span class="d-day">${day}</span>
      <span class="d-week">${isFair ? weekday(ms) : '截止'}</span>
      <span class="d-tag">${isFair ? timeHM(ms) : ''}</span>
    </div>`;
  }

  function badges(it, score) {
    let out = '';
    if (it.top) out += '<span class="badge-top">置顶</span>';
    const isNew =
      !meta.firstRun &&
      (it.kind === 'fair'
        ? it._firstSeenMs && nowMs() - it._firstSeenMs < 36 * 3600 * 1000
        : it.publishedMs && nowMs() - it.publishedMs < 48 * 3600 * 1000);
    if (isNew) out += '<span class="badge-new">NEW</span>';
    if (state.mine && score > 0) out += '<span class="badge-match">匹配</span>';
    return out;
  }

  function metaRows(it) {
    if (it.kind === 'fair') {
      const start = timeHM(it.startMs);
      const end = it.endMs && isSameDay(it.startMs, it.endMs) ? `–${timeHM(it.endMs)}` : '';
      const rows = [`<span>${icon('clock')}${start}${end}</span>`];
      if (it.location) rows.push(`<span>${icon('pin')}${esc(it.location)}</span>`);
      if (it.views) rows.push(`<span>${icon('eye')}${it.views} 人关注</span>`);
      return rows.join('');
    }

    const diff = dayDiff(it._dateMs);
    const urgent = diff >= 0 && diff <= 3;
    const deadline = it.endMs
      ? `${monthDay(it.endMs).month}-${monthDay(it.endMs).day}`
      : '长期有效';
    const rows = [
      `<span class="${urgent ? 'urgent' : ''}">${icon('clock')}截止 ${deadline}${
        urgent ? `（${diff === 0 ? '今天' : `${diff} 天后`}）` : ''
      }</span>`,
    ];
    if (it.positions) rows.push(`<span>${icon('people')}${it.positions} 个岗位</span>`);
    if (it.nature) rows.push(`<span>${icon('building')}${esc(it.nature)}</span>`);
    if (it.scale) rows.push(`<span>${esc(it.scale)}</span>`);
    return rows.join('');
  }

  function cardHTML(it, score) {
    const [accent, accentSoft] = kindAccent(it);
    const title = esc(it.title);
    const company = it.company ? esc(it.company) : '';
    const subtype = it.kind === 'fair' ? it.subtype || '宣讲会' : TYPE_LABEL[it.kind];
    const tags = (it.tags || [])
      .slice(0, 4)
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join('');
    const fav = favs.has(it.id);
    const inAgenda = agenda.has(it.id);

    return `<article class="card" data-id="${esc(it.id)}" style="--accent:${accent};--accent-soft:${accentSoft}">
      ${dateBox(it)}
      <div class="card-main">
        <div class="card-title-row">
          <span class="kind-badge">${esc(subtype)}</span>
          ${badges(it, score)}
          <a class="card-title" href="${esc(it.url)}" target="_blank" rel="noopener">${title}</a>
        </div>
        ${company ? `<div class="card-company" title="${company}">${company}</div>` : ''}
        <div class="card-meta">${metaRows(it)}</div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
      <div class="card-side">
        <button type="button" class="icon-btn fav-btn${fav ? ' is-fav' : ''}" data-action="fav"
          aria-pressed="${fav}" aria-label="${fav ? '取消收藏' : '收藏'}" title="${fav ? '取消收藏' : '收藏'}">${icon('star')}</button>
        <button type="button" class="icon-btn agenda-btn${inAgenda ? ' is-agenda' : ''}" data-action="agenda"
          aria-pressed="${inAgenda}" aria-label="${inAgenda ? '移出日程' : '加入日程'}" title="${inAgenda ? '移出日程' : '加入日程'}">${icon('calendar')}</button>
        <a class="source-link" href="${esc(it.url)}" target="_blank" rel="noopener">原文${icon('external')}</a>
      </div>
    </article>`;
  }

  function groupHeadHTML(key, groupItems) {
    const diff = diffFromKey(key);
    const ms = keyToMs(key);
    const { month, day } = monthDay(ms);
    const rel =
      diff === 0 ? '今天' : diff === 1 ? '明天' : diff === 2 ? '后天' : diff === -1 ? '昨天' : '';
    const past = diff < 0;
    const dateLabel = rel || `${Number(month)}月${Number(day)}日`;
    const weekLabel = rel
      ? `${Number(month)}月${Number(day)}日 · ${weekday(ms)}`
      : weekday(ms);
    const fairs = groupItems.filter((it) => it.kind === 'fair').length;
    const deadlines = groupItems.length - fairs;
    const bits = [];
    if (fairs) bits.push(`${fairs} 场宣讲`);
    if (deadlines) bits.push(`${deadlines} 个截止`);
    return `<div class="group-head${past ? ' is-past' : ''}">
      <span class="g-date">${dateLabel}</span>
      <span class="g-week">${weekLabel}</span>
      ${past ? '<span class="g-past">已结束</span>' : ''}
      <span class="g-count">${bits.join(' · ')}</span>
    </div>`;
  }

  // ---------- 渲染：主列表 ----------

  function render() {
    if (loadFailed) return;
    const list = applyFilters();
    renderHero();
    renderTabs();
    renderDirList();
    renderTagList();
    syncControls();
    renderActiveFilters();
    renderResultHead(list);

    const listEl = $('#list');
    const empty = $('#emptyState');
    const more = $('#loadMore');

    if (!list.length) {
      listEl.innerHTML = '';
      empty.hidden = false;
      more.hidden = true;
      return;
    }
    empty.hidden = true;

    const visible = list.slice(0, state.page * PAGE_SIZE);
    const groups = [];
    let cur = null;
    for (const it of visible) {
      const key = dayKey(it._dateMs);
      if (!cur || cur.key !== key) {
        cur = { key, items: [] };
        groups.push(cur);
      }
      cur.items.push(it);
    }

    listEl.innerHTML = groups
      .map(
        (g) =>
          `<section class="date-group${diffFromKey(g.key) < 0 ? ' is-past' : ''}">${groupHeadHTML(
            g.key,
            g.items
          )}${g.items.map((it) => cardHTML(it, state.mine ? matchScore(it) : 0)).join('')}</section>`
      )
      .join('');

    const remaining = list.length - visible.length;
    more.hidden = remaining <= 0;
    more.textContent = remaining > 0 ? `加载更多（还有 ${remaining} 条）` : '';
  }

  function renderResultHead(list) {
    const label =
      state.type === 'all' ? '全部安排' : state.type === 'job' ? '招聘信息' : state.type === 'internship' ? '实习信息' : '宣讲会';
    $('#resultTitle').textContent = state.q ? `“${state.q}” 的搜索结果` : label;
    const parts = [`共 ${list.length} 条`];
    if (state.mine) parts.push('已按我的关注筛选');
    if (state.favOnly) parts.push('仅收藏');
    $('#resultSub').textContent = parts.join(' · ');
  }

  function renderSidebar() {
    renderPrefsSummary();
    renderAgenda();
  }

  // 未来 7 天：只显示已加入日程的日期，没有安排的日期不提示
  function renderWeekAgenda() {
    const el = $('#weekStrip');
    if (!el) return;
    const list = agendaItems();
    const { byId } = agendaConflicts(list);
    const byDay = new Map();
    for (const it of list) {
      const key = dayKey(beginMs(it));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(it);
    }

    const now = nowMs();
    const cells = [];
    for (let i = 0; i < 7; i += 1) {
      const ms = now + i * 86400000;
      const key = dayKey(ms);
      const dayItems = byDay.get(key) || [];
      const { month, day } = monthDay(ms);
      const wd = i === 0 ? '今天' : weekday(ms);
      const count = dayItems.length;
      if (!count) {
        cells.push(`<span class="cal-day is-empty${i === 0 ? ' is-today' : ''}"
          title="${Number(month)}月${Number(day)}日 ${wd}">
          <span class="cal-wd">${wd}</span>
          <span class="cal-date">${Number(day)}</span>
        </span>`);
        continue;
      }
      const conflict = dayItems.some((it) => (byId.get(it.id)?.conflicts.length || 0) > 0);
      const same = dayItems.some((it) => (byId.get(it.id)?.sameDay.length || 0) > 0);
      const tip = `${Number(month)}月${Number(day)}日 ${wd}：${count} 项\n${dayItems
        .slice(0, 3)
        .map((it) => it.title)
        .join('\n')}${count > 3 ? '\n…' : ''}`;
      cells.push(`<button class="cal-day has${i === 0 ? ' is-today' : ''}" type="button"
        data-day="${key}" title="${esc(tip)}">
        <span class="cal-wd">${wd}</span>
        <span class="cal-date">${Number(day)}</span>
        <span class="cal-marks">
          <i class="cal-dot${conflict ? ' conflict' : same ? ' same' : ''}"></i>
          <span class="cal-count">${count}</span>
        </span>
      </button>`);
    }
    el.innerHTML = cells.join('');
    for (const btn of el.querySelectorAll('[data-day]')) {
      btn.addEventListener('click', () => {
        const dayItems = byDay.get(btn.dataset.day) || [];
        if (dayItems.length) openAgenda(dayItems[0].id);
      });
    }
  }

  function openConflictModal(id, conflicts) {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    pendingAgendaId = id;
    $('#conflictDesc').innerHTML = `<b>${esc(item.title)}</b><br>
      <span class="conflict-sub">${esc(fairTimeRange(item))} · 与下面 ${conflicts.length} 条已加入日程时间重叠</span>`;
    $('#conflictList').innerHTML = conflicts
      .map(
        (c) => `<div class="conflict-row">
          <span class="cr-title">${esc(c.item.title)}</span>
          <span class="cr-meta">${esc(fairTimeRange(c.item))} · 重叠约 ${c.mins} 分钟</span>
        </div>`
      )
      .join('');
    $('#conflictModal').hidden = false;
  }

  function closeConflictModal() {
    pendingAgendaId = null;
    $('#conflictModal').hidden = true;
  }

  function confirmConflictAdd() {
    const id = pendingAgendaId;
    closeConflictModal();
    if (!id) return;
    toggleAgenda(id, '已加入日程，注意时间冲突');
  }

  function renderPrefsSummary() {
    const el = $('#prefsSummary');
    if (!el) return;
    const chips = [
      ...prefs.tags.map((t) => `<span class="tag">${esc(t)}</span>`),
      ...prefs.keywords.map((k) => `<span class="tag">${esc(k)}</span>`),
    ];
    el.innerHTML = chips.length
      ? chips.join('')
      : '<button class="chip chip-ghost" type="button" id="prefsEmptyBtn">＋ 设置关注方向</button>';
    el.classList.toggle('is-scroll', el.scrollWidth > el.clientWidth + 1);
    const emptyBtn = $('#prefsEmptyBtn');
    if (emptyBtn) emptyBtn.addEventListener('click', openPrefs);
  }

  // ---------- 我的日程 ----------

  function toggleAgenda(id, message) {
    if (agenda.has(id)) {
      agenda.delete(id);
      if (agendaSel === id) agendaSel = null;
      toast('已移出日程');
    } else {
      agenda.add(id);
      toast(message || '已加入日程，可在「我的日程」查看');
    }
    saveAgenda();
    renderAgenda();
    if (!$('#agendaModal').hidden) renderAgendaModal();
    syncAgendaButtons(id);
  }

  function syncAgendaButtons(id) {
    for (const btn of document.querySelectorAll('.card [data-action="agenda"]')) {
      const cardId = btn.closest('.card')?.dataset.id;
      if (id && cardId !== id) continue;
      const added = agenda.has(cardId);
      btn.classList.toggle('is-agenda', added);
      btn.setAttribute('aria-pressed', String(added));
      btn.title = added ? '移出日程' : '加入日程';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function beginMs(it) {
    if (it.kind === 'fair' && it.startMs) return it.startMs;
    return it._dateMs || 0;
  }

  function agendaItems() {
    const todayStart = keyToMs(todayKey());
    return items
      .filter((it) => agenda.has(it.id))
      .sort((a, b) => {
        const av = beginMs(a);
        const bv = beginMs(b);
        const ap = av < todayStart;
        const bp = bv < todayStart;
        if (ap !== bp) return ap ? 1 : -1;
        return ap ? bv - av : av - bv;
      });
  }

  function fairOverlapMins(a, b) {
    if (a.kind !== 'fair' || b.kind !== 'fair' || !a.startMs || !b.startMs) return 0;
    const as = a.startMs;
    const ae = a.endMs && a.endMs > as ? a.endMs : as + 3600000;
    const bs = b.startMs;
    const be = b.endMs && b.endMs > bs ? b.endMs : bs + 3600000;
    if (as >= be || bs >= ae) return 0;
    return Math.max(1, Math.round((Math.min(ae, be) - Math.max(as, bs)) / 60000));
  }

  // 添加前先查：只在宣讲会之间检查硬时间冲突
  function timeConflictsFor(candidate) {
    if (candidate.kind !== 'fair') return [];
    return agendaItems()
      .filter((it) => it.id !== candidate.id)
      .map((it) => ({ item: it, mins: fairOverlapMins(candidate, it) }))
      .filter((c) => c.mins > 0);
  }

  function sameDayPeers(candidate) {
    if (candidate.kind === 'fair' || !candidate._dateMs) return [];
    return agendaItems().filter(
      (it) =>
        it.id !== candidate.id &&
        it.kind !== 'fair' &&
        it._dateMs &&
        dayKey(it._dateMs) === dayKey(candidate._dateMs)
    );
  }

  function fairTimeRange(it) {
    if (it.kind !== 'fair' || !it.startMs) return '';
    const { month, day } = monthDay(it.startMs);
    const end = it.endMs && it.endMs > it.startMs ? `–${timeHM(it.endMs)}` : '';
    return `${Number(month)}-${day} ${timeHM(it.startMs)}${end}`;
  }

  // 宣讲会之间按起止时间算重叠；招聘/实习只做「同日截止」的轻提示
  function agendaConflicts(list) {
    const byId = new Map();
    let pairs = 0;
    const sameDayIds = new Set();
    const entry = (id) => {
      if (!byId.has(id)) byId.set(id, { conflicts: [], sameDay: [] });
      return byId.get(id);
    };
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        const aFair = a.kind === 'fair';
        const bFair = b.kind === 'fair';
        if (aFair && bFair) {
          const mins = fairOverlapMins(a, b);
          if (mins) {
            entry(a.id).conflicts.push(`与「${b.title}」时间重叠约 ${mins} 分钟`);
            entry(b.id).conflicts.push(`与「${a.title}」时间重叠约 ${mins} 分钟`);
            pairs += 1;
          }
        } else if (!aFair && !bFair && a._dateMs && b._dateMs) {
          if (dayKey(a._dateMs) === dayKey(b._dateMs)) {
            entry(a.id).sameDay.push(b.title);
            entry(b.id).sameDay.push(a.title);
            sameDayIds.add(a.id);
            sameDayIds.add(b.id);
          }
        }
      }
    }
    return { byId, pairs, sameDayCount: sameDayIds.size };
  }

  function agendaRowLevel(byId, id) {
    const e = byId.get(id);
    if (!e) return '';
    if (e.conflicts.length) return 'conflict';
    if (e.sameDay.length) return 'same';
    return '';
  }

  function agendaTimeLabel(it) {
    if (it.kind === 'fair' && it.startMs) {
      const { month, day } = monthDay(it.startMs);
      return `${Number(month)}-${day} ${timeHM(it.startMs)}`;
    }
    if (!it._dateMs) return '—';
    const { month, day } = monthDay(it._dateMs);
    return `截止 ${Number(month)}-${day}`;
  }

  function agendaRowHTML(it, active, level) {
    const title = level === 'conflict' ? '时间冲突' : level === 'same' ? '同日截止' : '';
    return `<button class="agenda-row${active ? ' active' : ''}" type="button" data-agenda-id="${esc(it.id)}">
      <span class="a-time">${esc(agendaTimeLabel(it))}</span>
      <span class="a-title">${esc(it.title)}</span>
      ${level ? `<span class="a-dot ${level}" title="${title}"></span>` : ''}
    </button>`;
  }

  function renderAgenda() {
    renderWeekAgenda();
    const list = agendaItems();
    const { byId, pairs, sameDayCount } = agendaConflicts(list);
    const countEl = $('#agendaCount');
    if (countEl) {
      countEl.hidden = !list.length;
      countEl.textContent = String(list.length);
    }
    const badge = $('#agendaConflict');
    if (badge) {
      const parts = [];
      if (pairs) parts.push(`${pairs} 处时间冲突`);
      if (sameDayCount) parts.push(`${sameDayCount} 条同日截止`);
      badge.hidden = !parts.length;
      badge.textContent = parts.join(' · ');
      badge.classList.toggle('is-soft', !pairs && Boolean(sameDayCount));
    }

    const preview = $('#agendaPreview');
    if (!preview) return;
    const foot = $('#agendaFoot');
    if (foot) foot.hidden = !list.length;
    if (!list.length) {
      preview.innerHTML =
        '<div class="agenda-empty">还没有加入日程。点卡片右侧的日历图标，就会在这里显示标题和截止时间。</div>';
      return;
    }
    const rows = list
      .slice(0, 2)
      .map((it) => agendaRowHTML(it, false, agendaRowLevel(byId, it.id)));
    if (list.length > 2) {
      rows.push(
        `<button class="agenda-more" type="button" id="agendaMore">还有 ${list.length - 2} 项，查看全部</button>`
      );
    }
    preview.innerHTML = rows.join('');
    const more = $('#agendaMore');
    if (more) more.addEventListener('click', () => openAgenda());
    for (const row of preview.querySelectorAll('[data-agenda-id]')) {
      row.addEventListener('click', () => openAgenda(row.dataset.agendaId));
    }
  }

  function openAgenda(selectId) {
    if (selectId) agendaSel = selectId;
    renderAgendaModal();
    $('#agendaModal').hidden = false;
  }

  function closeAgenda() {
    $('#agendaModal').hidden = true;
  }

  function renderAgendaModal() {
    const list = agendaItems();
    const { byId, pairs, sameDayCount } = agendaConflicts(list);
    const top = $('#agendaConflictTop');
    if (top) {
      const parts = [];
      if (pairs) parts.push(`${pairs} 处时间冲突`);
      if (sameDayCount) parts.push(`${sameDayCount} 条同日截止`);
      top.hidden = !parts.length;
      top.textContent = parts.join(' · ');
      top.classList.toggle('is-soft', !pairs && Boolean(sameDayCount));
    }
    const listEl = $('#agendaList');
    const detailEl = $('#agendaDetail');
    if (!list.length) {
      listEl.innerHTML =
        '<div class="agenda-empty">日程还是空的。回到列表，点卡片右侧的日历图标即可加入。</div>';
      detailEl.innerHTML = '';
      return;
    }
    if (!agendaSel || !agenda.has(agendaSel)) agendaSel = list[0].id;
    listEl.innerHTML = list
      .map((it) => agendaRowHTML(it, it.id === agendaSel, agendaRowLevel(byId, it.id)))
      .join('');
    renderAgendaDetail(agendaSel);
  }

  function renderAgendaDetail(id) {
    const it = items.find((x) => x.id === id);
    const detailEl = $('#agendaDetail');
    if (!it || !detailEl) return;
    const { byId } = agendaConflicts(agendaItems());
    const entry = byId.get(id) || { conflicts: [], sameDay: [] };
    const conflicts = entry.conflicts;
    const sameDay = entry.sameDay;
    const isFair = it.kind === 'fair';
    const timeText = isFair
      ? it.startMs
        ? `${fmtDateTime(it.startMs)}${
            it.endMs && it.endMs > it.startMs ? ` – ${timeHM(it.endMs)}` : ''
          }`
        : '时间待定'
      : it.endMs
        ? `截止 ${Number(monthDay(it.endMs).month)}月${Number(monthDay(it.endMs).day)}日`
        : '长期有效';
    const rows = [
      ['时间', timeText],
      it.company ? ['单位', it.company] : null,
      it.location ? ['地点', it.location] : null,
      it.city && it.city !== it.location ? ['城市', it.city] : null,
    ].filter(Boolean);

    detailEl.innerHTML = `
      <div class="ad-kind">${esc(TYPE_LABEL[it.kind] || '机会')}</div>
      <h4>${esc(it.title)}</h4>
      ${it.company ? `<div class="ad-company">${esc(it.company)}</div>` : ''}
      <dl class="ad-meta">
        ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      ${
        conflicts.length
          ? `<div class="ad-conflict"><b>时间冲突</b><ul>${conflicts
              .map((c) => `<li>${esc(c)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      ${
        sameDay.length
          ? `<div class="ad-sameday"><b>同日截止</b><ul>${sameDay
              .map((t) => `<li>与「${esc(t)}」同一天截止</li>`)
              .join('')}</ul></div>`
          : ''
      }
      ${
        !conflicts.length && !sameDay.length
          ? '<div class="ad-ok">✓ 暂无时间冲突</div>'
          : ''
      }
      <div class="ad-actions">
        <button class="chip" type="button" data-agenda-remove="${esc(it.id)}">移出日程</button>
        <button class="chip" type="button" data-agenda-ics="${esc(it.id)}">下载此条 .ics</button>
        <a class="chip" href="${esc(it.url)}" target="_blank" rel="noopener">查看原文</a>
      </div>`;
  }

  // ---------- 交互 ----------

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const type = p.get('type');
    const range = p.get('range');
    const sort = p.get('sort');
    state.q = p.get('q') || '';
    state.type = ['fair', 'job', 'internship'].includes(type) ? type : 'all';
    state.range = ['today', '7d', '30d', 'soon'].includes(range) ? range : 'all';
    state.sort = ['time', 'new', 'deadline'].includes(sort) ? sort : 'time';
    state.tags = (p.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean);
    state.nature = p.get('nature') || '';
    const dir = p.get('dir');
    state.dir = DIRECTIONS.some((d) => d.id === dir) ? dir : '';
    state.fn = p.get('fn') || '';
    state.cohort = p.get('cohort') || '';
    state.city = p.get('city') || '';
    state.mine = p.get('mine') === '1';
    state.favOnly = p.get('fav') === '1';
    state.page = 1;
  }

  let urlTimer;
  function syncUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.type !== 'all') p.set('type', state.type);
      if (state.range !== 'all') p.set('range', state.range);
      if (state.sort !== 'time') p.set('sort', state.sort);
      if (state.tags.length) p.set('tags', state.tags.join(','));
      if (state.nature) p.set('nature', state.nature);
      if (state.dir) p.set('dir', state.dir);
      if (state.fn) p.set('fn', state.fn);
      if (state.cohort) p.set('cohort', state.cohort);
      if (state.city) p.set('city', state.city);
      if (state.mine) p.set('mine', '1');
      if (state.favOnly) p.set('fav', '1');
      const qs = p.toString();
      history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
    }, 220);
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  function update({ resetPage = true } = {}) {
    if (resetPage) state.page = 1;
    syncUrl();
    render();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      return ok;
    }
  }

  // ---------- 日历导出 ----------

  const pad = (n) => String(n).padStart(2, '0');

  function icsDateUTC(ms) {
    const d = new Date(ms);
    return (
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
  }

  function icsDateOnly(ms) {
    const key = dayKey(ms);
    return key.replace(/-/g, '');
  }

  function icsEscape(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function buildICS(list) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yanyuan Career Calendar//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    const stamp = icsDateUTC(Date.now());

    for (const it of list.slice(0, 300)) {
      const isFair = it.kind === 'fair';
      const summary = isFair
        ? `【${it.subtype || '宣讲会'}】${it.title}${it.company ? ` — ${it.company}` : ''}`
        : `【${TYPE_LABEL[it.kind]}截止】${it.title}${it.company ? ` — ${it.company}` : ''}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${icsEscape(it.id)}@yanyuan-career`);
      lines.push(`DTSTAMP:${stamp}`);

      if (isFair) {
        const start = it.startMs;
        const end = it.endMs && it.endMs > start ? it.endMs : start + 3600000;
        lines.push(`DTSTART:${icsDateUTC(start)}`);
        lines.push(`DTEND:${icsDateUTC(end)}`);
        if (it.location) lines.push(`LOCATION:${icsEscape(it.location)}`);
      } else {
        const day = icsDateOnly(it._dateMs);
        const next = icsDateOnly(it._dateMs + 86400000);
        lines.push(`DTSTART;VALUE=DATE:${day}`);
        lines.push(`DTEND;VALUE=DATE:${next}`);
      }

      lines.push(`SUMMARY:${icsEscape(summary)}`);
      const desc = [
        it.company ? `单位：${it.company}` : '',
        isFair && it.location ? `地点：${it.location}` : '',
        !isFair && it.endMs ? `截止：${fmtDateTime(it.endMs)}` : '',
        isFair ? `开始：${fmtDateTime(it.startMs)}` : '',
        it.url ? `原文：${it.url}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
      if (it.url) lines.push(`URL:${it.url}`);

      if (isFair) {
        lines.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:宣讲会 30 分钟后开始', 'END:VALARM');
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadICS(list) {
    if (!list.length) {
      toast('当前筛选下没有可导出的安排');
      return;
    }
    const blob = new Blob([buildICS(list)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yanyuan-career-${todayKey()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`已导出 ${Math.min(list.length, 300)} 条到日历文件`);
  }

  // ---------- 关注设置 ----------

  function openPrefs() {
    const tags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    $('#prefsTags').innerHTML = tags
      .map(
        ([t]) =>
          `<button type="button" class="chip${prefs.tags.includes(t) ? ' active' : ''}" data-pref-tag="${esc(
            t
          )}">${esc(t)}</button>`
      )
      .join('');
    $('#prefsPresets').innerHTML = DIRECTIONS.map(
      (d) =>
        `<button type="button" class="chip" data-preset="${d.id}">${esc(d.name)}</button>`
    ).join('');
    $('#kwInput').value = prefs.keywords.join(', ');
    $('#prefsModal').hidden = false;
    setTimeout(() => $('#kwInput').focus(), 30);
  }

  function closePrefs() {
    $('#prefsModal').hidden = true;
  }

  function handleSavePrefs() {
    const keywords = $('#kwInput')
      .value.split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    const tags = [...document.querySelectorAll('#prefsTags .chip.active')].map(
      (b) => b.dataset.prefTag
    );
    prefs = { keywords, tags };
    savePrefs();
    closePrefs();
    renderPrefsSummary();
    if (state.mine && !prefs.keywords.length && !prefs.tags.length) {
      state.mine = false;
    }
    update();
    toast('已保存关注设置');
  }

  // ---------- 事件绑定 ----------

  function bind() {
    // 图标注入（静态 HTML 中的占位）
    for (const el of document.querySelectorAll('[data-icon]')) {
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[el.dataset.icon] || ''}</svg>`;
    }

    let searchTimer;
    $('#searchInput').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      $('#searchClear').hidden = !v;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = v;
        update();
      }, 160);
    });

    $('#searchClear').addEventListener('click', () => {
      $('#searchInput').value = '';
      state.q = '';
      $('#searchClear').hidden = true;
      update();
      $('#searchInput').focus();
    });

    $('#typeSeg').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-type]');
      if (!btn) return;
      state.type = btn.dataset.type;
      update();
    });

    $('#rangeGroup').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-range]');
      if (!btn) return;
      state.range = btn.dataset.range;
      update();
    });

    $('#tagList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tag]');
      if (!btn) return;
      const tag = btn.dataset.tag;
      state.tags = state.tags.includes(tag)
        ? state.tags.filter((t) => t !== tag)
        : [...state.tags, tag];
      update();
    });

    $('#dirList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-dir]');
      if (!btn) return;
      state.dir = btn.dataset.dir;
      update();
    });

    $('#fnSelect').addEventListener('change', (e) => {
      state.fn = e.target.value;
      update();
    });

    $('#cohortSelect').addEventListener('change', (e) => {
      state.cohort = e.target.value;
      update();
    });

    $('#citySelect').addEventListener('change', (e) => {
      state.city = e.target.value;
      update();
    });

    $('#natureSelect').addEventListener('change', (e) => {
      state.nature = e.target.value;
      update();
    });

    $('#sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      update();
    });

    $('#favToggle').addEventListener('click', () => {
      state.favOnly = !state.favOnly;
      update();
      if (state.favOnly && !favs.size) toast('还没有收藏，点卡片右侧的星标即可收藏');
    });

    $('#mineToggle').addEventListener('click', () => {
      if (!state.mine && !prefs.keywords.length && !prefs.tags.length) {
        openPrefs();
        toast('先设置一下你的关注领域或关键词');
        return;
      }
      state.mine = !state.mine;
      update();
    });

    $('#resetBtn').addEventListener('click', resetAll);
    $('#emptyReset').addEventListener('click', resetAll);

    $('#activeFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-remove]');
      if (!btn) return;
      const key = btn.dataset.remove;
      if (key.startsWith('tag:')) {
        const tag = key.slice(4);
        state.tags = state.tags.filter((t) => t !== tag);
      } else if (key === 'type') state.type = 'all';
      else if (key === 'range') state.range = 'all';
      else if (key === 'q') {
        state.q = '';
        $('#searchInput').value = '';
      } else if (key === 'nature') state.nature = '';
      else if (key === 'dir') state.dir = '';
      else if (key === 'fn') state.fn = '';
      else if (key === 'cohort') state.cohort = '';
      else if (key === 'city') state.city = '';
      else if (key === 'mine') state.mine = false;
      else if (key === 'fav') state.favOnly = false;
      update();
    });

    $('#loadMore').addEventListener('click', () => {
      state.page += 1;
      render();
    });

    $('#list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const card = btn.closest('.card');
      const id = card?.dataset.id;
      if (!id) return;
      const item = items.find((it) => it.id === id);
      if (!item) return;

      if (btn.dataset.action === 'fav') {
        if (favs.has(id)) favs.delete(id);
        else favs.add(id);
        saveFavs();
        btn.classList.toggle('is-fav', favs.has(id));
        btn.setAttribute('aria-pressed', String(favs.has(id)));
        btn.title = favs.has(id) ? '取消收藏' : '收藏';
        if (state.favOnly) render();
      } else if (btn.dataset.action === 'agenda') {
        if (agenda.has(id)) {
          toggleAgenda(id);
          return;
        }
        const conflicts = timeConflictsFor(item);
        if (conflicts.length) {
          openConflictModal(id, conflicts);
          return;
        }
        const peers = sameDayPeers(item);
        toggleAgenda(
          id,
          peers.length ? `已加入日程；另有 ${peers.length} 条同日截止` : undefined
        );
      }
    });

    $('#icsBtn').addEventListener('click', () => downloadICS(filtered || []));

    $('#openAgenda').addEventListener('click', () => openAgenda());
    $('#agendaIcsBtn').addEventListener('click', () => downloadICS(agendaItems()));
    $('#agendaIcsBtn2').addEventListener('click', () => downloadICS(agendaItems()));
    $('#clearAgenda').addEventListener('click', () => {
      if (!agenda.size) return;
      agenda.clear();
      agendaSel = null;
      saveAgenda();
      renderAgenda();
      renderAgendaModal();
      syncAgendaButtons();
      toast('已清空日程');
    });
    $('#agendaList').addEventListener('click', (e) => {
      const row = e.target.closest('[data-agenda-id]');
      if (!row) return;
      agendaSel = row.dataset.agendaId;
      for (const r of $('#agendaList').querySelectorAll('.agenda-row')) {
        r.classList.toggle('active', r.dataset.agendaId === agendaSel);
      }
      renderAgendaDetail(agendaSel);
    });
    $('#agendaDetail').addEventListener('click', (e) => {
      const rm = e.target.closest('[data-agenda-remove]');
      if (rm) {
        toggleAgenda(rm.dataset.agendaRemove);
        return;
      }
      const dl = e.target.closest('[data-agenda-ics]');
      if (dl) {
        const it = items.find((x) => x.id === dl.dataset.agendaIcs);
        if (it) downloadICS([it]);
      }
    });
    $('#agendaModal').addEventListener('click', (e) => {
      if (e.target.dataset.close) closeAgenda();
    });

    $('#conflictConfirm').addEventListener('click', confirmConflictAdd);
    $('#conflictModal').addEventListener('click', (e) => {
      if (e.target.dataset.close) closeConflictModal();
    });

    $('#shareBtn').addEventListener('click', async () => {
      syncUrl();
      const url = location.href;
      const ok = await copyText(url);
      toast(ok ? '链接已复制，发给同学就能打开当前筛选' : '复制失败，请手动复制地址栏链接');
    });

    $('#prefsBtn').addEventListener('click', openPrefs);
    $('#editPrefs').addEventListener('click', openPrefs);
    $('#savePrefs').addEventListener('click', handleSavePrefs);
    $('#clearPrefs').addEventListener('click', () => {
      $('#kwInput').value = '';
      for (const b of document.querySelectorAll('#prefsTags .chip')) b.classList.remove('active');
    });

    $('#prefsTags').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-pref-tag]');
      if (btn) btn.classList.toggle('active');
    });

    $('#prefsPresets').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-preset]');
      if (!btn) return;
      const dir = DIRECTIONS.find((d) => d.id === btn.dataset.preset);
      if (!dir) return;
      $('#kwInput').value = dir.keywords.slice(0, 8).join(', ');
      for (const b of document.querySelectorAll('#prefsTags .chip')) {
        b.classList.toggle('active', dir.tags.includes(b.dataset.prefTag));
      }
      for (const b of document.querySelectorAll('#prefsPresets .chip')) {
        b.classList.toggle('active', b === btn);
      }
      toast(`已套用「${dir.name}」，可继续调整后保存`);
    });

    $('#prefsModal').addEventListener('click', (e) => {
      if (e.target.dataset.close) closePrefs();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#prefsModal').hidden) closePrefs();
        if (!$('#agendaModal').hidden) closeAgenda();
        if (!$('#conflictModal').hidden) closeConflictModal();
      }
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        $('#searchInput').focus();
      }
    });

    window.addEventListener('popstate', () => {
      readUrl();
      render();
    });
  }

  function resetAll() {
    state.q = '';
    state.type = 'all';
    state.range = 'all';
    state.tags = [];
    state.nature = '';
    state.dir = '';
    state.fn = '';
    state.cohort = '';
    state.city = '';
    state.sort = 'time';
    state.mine = false;
    state.favOnly = false;
    state.page = 1;
    $('#searchInput').value = '';
    $('#searchClear').hidden = true;
    update();
  }

  // ---------- 启动 ----------

  async function init() {
    loadLocal();
    readUrl();
    bind();

    try {
      await loadData();
    } catch (error) {
      loadFailed = true;
      $('#list').innerHTML = `<div class="empty">
        <div class="empty-mark">燕</div>
        <h3>数据加载失败</h3>
        <p>如果你是直接双击打开 index.html，浏览器会拦截本地数据请求。<br>
        请在项目目录运行 <code>npm run dev</code>，然后访问 <code>http://localhost:5173</code>。</p>
      </div>`;
      $('#resultTitle').textContent = '无法加载数据';
      $('#resultSub').textContent = String(error.message || error);
      return;
    }

    renderNatureOptions();
    renderFnOptions();
    renderCohortOptions();
    renderCityOptions();

    let agendaChanged = false;
    for (const id of [...agenda]) {
      if (!items.some((it) => it.id === id)) {
        agenda.delete(id);
        agendaChanged = true;
      }
    }
    if (agendaChanged) saveAgenda();

    render();
    renderSidebar();
  }

  init();
})();

/* ============================================================
   燕园求职日历 — 前端逻辑（零依赖）
   ============================================================ */

(() => {
  'use strict';

  const DATA_URL = 'data/events.json';
  const STORE_PREFS = 'yanyuan-career-prefs-v1';
  const STORE_FAVS = 'yanyuan-career-favs-v1';
  const STORE_AGENDA = 'yanyuan-career-agenda-v1';
  const STORE_LANG = 'yanyuan-career-lang-v1';
  const CST = 'Asia/Shanghai';
  const PAGE_SIZE = 24;

  const TYPE_COLOR = {
    fair: ['var(--red)', 'var(--red-soft)'],
    job: ['var(--teal)', 'var(--teal-soft)'],
    internship: ['var(--amber)', 'var(--amber-soft)'],
  };

  // 方向 = 行业 + 职能 + 代表企业的组合，点一下就能筛出该方向的机会。
  // 标签筛选已下线；下面这些旧标签如果还留在分享链接里，会尽量映射成方向/类型/职能。
  const HIDDEN_TAGS = new Set([
    '国企/事业单位',
    '宣讲',
    '实习',
    '管培生',
    '互联网/科技',
    '金融/银行',
    '教育/科研',
    '医疗/生物',
    '制造/能源',
    '咨询/专业服务',
    '快消/零售',
    '文化/传媒',
    '政府/公共部门',
    '体制内',
  ]);

  // 旧分享链接里可能还带着行业标签，读 URL 时自动映射到对应方向
  const LEGACY_TAG_TO_DIR = {
    '咨询/专业服务': 'consulting',
    '金融/银行': 'finance',
    '互联网/科技': 'tech',
    '快消/零售': 'fmcg',
    '医疗/生物': 'health',
    '制造/能源': 'manufacturing',
    '教育/科研': 'education',
    '文化/传媒': 'culture',
    '国企/事业单位': 'soe',
    '政府/公共部门': 'government',
    体制内: 'government',
  };

  const DIRECTIONS = [
    {
      id: 'consulting',
      name: '咨询/专业服务',
      keywords: [
        '战略', '管理咨询', '战略咨询', '咨询顾问', '咨询岗',
        '麦肯锡', '波士顿', '贝恩', '罗兰贝格', '埃森哲', '凯捷',
        '德勤', '普华永道', '安永', '毕马威',
        '审计', '税务', '律所', '律师', '广告', '公关', '人力资源咨询',
      ],
      tags: ['咨询/专业服务'],
      functions: ['咨询/战略'],
    },
    {
      id: 'finance',
      name: '金融/投融资',
      keywords: [
        '投行', '券商', '基金', '证券', '投资', '资管', '保险', '信托',
        '期货', '私募', '公募', '中金', '中信', '华泰', '招商',
        '高盛', '摩根', '国泰君安', '银行',
      ],
      tags: ['金融/银行'],
      functions: ['投资/投研', '财务/审计'],
    },
    {
      id: 'tech',
      name: '科技/互联网',
      keywords: [
        '产品', '运营', '数据', '算法', '研发', '软件', '人工智能',
        '芯片', '半导体', '通信', '云计算', '游戏', '腾讯', '阿里',
        '字节', '美团', '京东', '百度', '华为', '小米', '网易',
        '滴滴', '快手',
      ],
      tags: ['互联网/科技'],
      functions: ['产品/运营', '数据分析', '技术/研发'],
    },
    {
      id: 'fmcg',
      name: '快消/零售',
      keywords: [
        '快消', '市场', '品牌', '营销', '食品', '饮料', '日化',
        '化妆品', '电商', '零售', '宝洁', '联合利华', '玛氏',
        '欧莱雅', '雀巢', '可口可乐', '伊利', '蒙牛',
      ],
      tags: ['快消/零售'],
      functions: ['市场/品牌', '管培生', '销售/商务'],
    },
    {
      id: 'health',
      name: '医疗/健康',
      keywords: [
        '医药', '医疗', '生物', '制药', '器械', '医学', '临床',
        '疫苗', '健康', '辉瑞', '诺华', '药明', '恒瑞', '医院',
      ],
      tags: ['医疗/生物'],
      functions: [],
    },
    {
      id: 'manufacturing',
      name: '制造/能源',
      keywords: [
        '制造', '汽车', '能源', '新能源', '化工', '机械', '电气',
        '电力', '重工', '装备', '自动化', '新材料', '船舶', '钢铁',
        '比亚迪', '宁德时代', '隆基', '一汽', '上汽', '中车',
      ],
      tags: ['制造/能源'],
      functions: [],
    },
    {
      id: 'education',
      name: '教育/科研',
      keywords: [
        '大学', '学院', '中学', '小学', '教育', '研究所', '研究院',
        '科学院', '实验室', '科研', '附属', '教师', '教研', '学校',
      ],
      tags: ['教育/科研'],
      functions: [],
    },
    {
      id: 'culture',
      name: '文化/传媒',
      keywords: [
        '传媒', '文化', '出版', '影视', '广播', '电视', '报社',
        '新闻', '艺术', '博物馆', '图书馆', '文旅', '文创',
      ],
      tags: ['文化/传媒'],
      functions: [],
    },
    {
      id: 'soe',
      name: '国企/央企',
      keywords: [
        '国企', '央企', '国有', '中字头', '国家电网', '中石油',
        '中石化', '中移动', '中国建筑', '中粮', '华能', '大唐',
        '华电', '三峡', '中核', '中船', '航天', '航空工业',
        '中国铁建', '中国中铁', '中交',
      ],
      tags: ['国企/事业单位'],
      functions: [],
    },
    {
      id: 'government',
      name: '政府/公共部门',
      keywords: [
        '人民政府', '政府', '公务员', '选调生', '选调', '党委',
        '组织部', '街道办', '管委会', '智库', '协会', '基金会',
      ],
      tags: ['政府/公共部门', '体制内'],
      functions: [],
    },
  ];

  const DIRECTION_EN = {
    consulting: 'Consulting / Professional Services',
    finance: 'Finance / Investment',
    tech: 'Tech / Internet',
    fmcg: 'Consumer / Retail',
    health: 'Healthcare',
    manufacturing: 'Manufacturing / Energy',
    education: 'Education / Research',
    culture: 'Culture / Media',
    soe: 'SOEs / Central Enterprises',
    government: 'Government / Public Sector',
  };

  const NATURE_EN = {
    '其他企业(含民营企业等)': 'Other enterprise (incl. private)',
    国有企业: 'State-owned enterprise',
    '中等、初等教育单位': 'Secondary / primary education',
    科研设计单位: 'Research & design institute',
    '其他(含社会组织、国际组织等)': 'Other (incl. NGOs, intl organizations)',
    机关: 'Government agency',
    外商投资企业: 'Foreign-invested enterprise',
    其他事业单位: 'Other public institution',
    高等教育单位: 'Higher education',
    医疗卫生单位: 'Healthcare institution',
    部队: 'Military',
    个体工商户: 'Self-employed',
  };

  const FUNCTION_EN = {
    '法务/合规': 'Legal / Compliance',
    数据分析: 'Data analysis',
    '技术/研发': 'Engineering / R&D',
    '人力/HR': 'HR',
    管培生: 'Management trainee',
    '投资/投研': 'Investment / Research',
    '咨询/战略': 'Consulting / Strategy',
    '产品/运营': 'Product / Operations',
    '财务/审计': 'Finance / Audit',
    '销售/商务': 'Sales / Business',
    '供应链/采购': 'Supply chain / Procurement',
    '市场/品牌': 'Marketing / Brand',
  };

  const CITY_EN = {
    北京: 'Beijing',
    广州: 'Guangzhou',
    上海: 'Shanghai',
    杭州: 'Hangzhou',
    深圳: 'Shenzhen',
    青岛: 'Qingdao',
    武汉: 'Wuhan',
    厦门: 'Xiamen',
    苏州: 'Suzhou',
    南京: 'Nanjing',
    天津: 'Tianjin',
    合肥: 'Hefei',
    成都: 'Chengdu',
    宁波: 'Ningbo',
    西安: "Xi'an",
    大连: 'Dalian',
    无锡: 'Wuxi',
    重庆: 'Chongqing',
    长沙: 'Changsha',
    郑州: 'Zhengzhou',
    东莞: 'Dongguan',
    济南: 'Jinan',
    香港: 'Hong Kong',
    福州: 'Fuzhou',
  };

  const SUBTYPE_EN = {
    宣讲会: 'Career talk',
    招聘: 'Job',
    实习: 'Internship',
  };

  const SCALE_EN = {
    '500-1000人': '500–1,000 employees',
    '200人-500人': '200–500 employees',
    '100人-200人': '100–200 employees',
    '50人-100人': '50–100 employees',
    '10人-50人': '10–50 employees',
    其他: 'Other',
    '1000人以上': '1,000+ employees',
  };

  const COMPANY_EN = window.COMPANY_EN || {};

  // 招聘平台/人才服务公司的名字里常带「咨询」，不能据此把银行、能源等职位归到咨询方向
  const AGENCY_COMPANY_RE = /网聘咨询|前锦网络|人力资源|人才服务|劳务派遣/;
  const CONSULTING_TITLE_RE = /咨询顾问|战略咨询|管理咨询|咨询岗|战略岗|审计|税务|律所|律师|广告|公关|人力资源咨询/;

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
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z"/>',
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
    new Intl.DateTimeFormat(state.lang === 'en' ? 'en-US' : 'zh-CN', {
      timeZone: CST,
      weekday: 'short',
    }).format(new Date(ms));

  const timeHM = (ms) =>
    new Intl.DateTimeFormat(state.lang === 'en' ? 'en-GB' : 'zh-CN', {
      timeZone: CST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(ms));

  const fmtDateTime = (ms) => {
    const { month, day } = monthDay(ms);
    return L(
      `${month}-${day} ${timeHM(ms)}`,
      `${monthShort(ms)} ${Number(day)} ${timeHM(ms)}`
    );
  };

  const isSameDay = (a, b) => dayKey(a) === dayKey(b);

  const nowMs = () => Date.now();

  function L(zh, en) {
    return state.lang === 'en' ? en : zh;
  }

  function typeLabel(kind, plural = false) {
    if (kind === 'fair') return L('宣讲会', plural ? 'Career talks' : 'Career talk');
    if (kind === 'job') return L('招聘', plural ? 'Jobs' : 'Job');
    if (kind === 'internship') return L('实习', plural ? 'Internships' : 'Internship');
    return L('机会', 'Opportunity');
  }

  function dirName(dir) {
    return state.lang === 'en' ? DIRECTION_EN[dir.id] || dir.name : dir.name;
  }

  function natureLabel(value) {
    return state.lang === 'en' ? NATURE_EN[value] || value : value;
  }

  function fnLabel(value) {
    return state.lang === 'en' ? FUNCTION_EN[value] || value : value;
  }

  function cityLabel(value) {
    return state.lang === 'en' ? CITY_EN[value] || value : value;
  }

  function scaleLabel(value) {
    return state.lang === 'en' ? SCALE_EN[value] || value : value;
  }

  function companyLabel(value) {
    return state.lang === 'en' ? COMPANY_EN[value] || value : value;
  }

  function subtypeLabel(it) {
    if (it.kind !== 'fair') return typeLabel(it.kind, false);
    return state.lang === 'en'
      ? SUBTYPE_EN[it.subtype] || it.subtype || 'Career talk'
      : it.subtype || '宣讲会';
  }

  const monthShort = (ms) =>
    new Intl.DateTimeFormat('en-US', { timeZone: CST, month: 'short' }).format(new Date(ms));

  const fmtMonthDay = (ms) => {
    const { month, day } = monthDay(ms);
    return L(`${Number(month)}月${Number(day)}日`, `${monthShort(ms)} ${Number(day)}`);
  };

  const fmtMonthDayShort = (ms) => {
    const { month, day } = monthDay(ms);
    return L(`${Number(month)}-${Number(day)}`, `${monthShort(ms)} ${Number(day)}`);
  };

  const fmtCount = (n) => L(`（${n}）`, ` (${n})`);

  // ---------- 状态 ----------

  const state = {
    lang: 'zh',
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
  let loadFailed = false;

  // ---------- 本地存储 ----------

  function loadLocal() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_PREFS) || '{}');
      prefs = {
        keywords: Array.isArray(p.keywords) ? p.keywords.filter(Boolean) : [],
        tags: [],
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
    try {
      const lang = localStorage.getItem(STORE_LANG);
      if (lang === 'en' || lang === 'zh') state.lang = lang;
    } catch {}
  }

  function saveLang() {
    try {
      localStorage.setItem(STORE_LANG, state.lang);
    } catch {}
  }

  function updateLangToggle() {
    const en = state.lang === 'en';
    const label = $('#langToggleLabel');
    if (label) label.textContent = en ? '中文' : 'EN';
    const btn = $('#langToggle');
    if (btn) {
      const text = en ? 'Switch to Chinese' : '切换为英文';
      btn.setAttribute('aria-label', text);
      btn.title = text;
    }
  }

  function applyStaticI18n() {
    const en = state.lang === 'en';
    document.documentElement.lang = en ? 'en' : 'zh-CN';

    for (const el of document.querySelectorAll('[data-zh]')) {
      const value = en ? el.dataset.en : el.dataset.zh;
      if (value !== undefined) el.textContent = value;
    }
    for (const el of document.querySelectorAll('[data-zh-placeholder]')) {
      el.placeholder = en ? el.dataset.enPlaceholder : el.dataset.zhPlaceholder;
    }
    for (const el of document.querySelectorAll('[data-zh-aria]')) {
      el.setAttribute('aria-label', en ? el.dataset.enAria : el.dataset.zhAria);
    }
    for (const el of document.querySelectorAll('[data-zh-title]')) {
      el.title = en ? el.dataset.enTitle : el.dataset.zhTitle;
    }

    document.title = en
      ? 'Yanyuan Career Calendar · PKU Career Talks, Jobs & Internships'
      : '燕园求职日历 · 北大宣讲会 / 招聘 / 实习';
    const description = en
      ? 'A curated page for PKU career talks, jobs and internships, with filters, favorites and calendar export. Synced automatically from public listings.'
      : '北京大学宣讲会、招聘与实习信息聚合页，支持按时间、类型、领域筛选，自动同步自北大就业网公开信息。';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', document.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    updateLangToggle();
  }

  function renderPrefsPresets() {
    const el = $('#prefsPresets');
    if (!el) return;
    el.innerHTML = DIRECTIONS.map(
      (d) => `<button type="button" class="chip" data-preset="${d.id}">${esc(dirName(d))}</button>`
    ).join('');
  }

  function setLang(lang) {
    const next = lang === 'en' ? 'en' : 'zh';
    if (state.lang === next) return;
    state.lang = next;
    saveLang();
    applyStaticI18n();
    if (items.length) {
      renderNatureOptions();
      renderFnOptions();
      renderCohortOptions();
      renderCityOptions();
    }
    render();
    renderSidebar();
    if (!$('#prefsModal').hidden) renderPrefsPresets();
    if (!$('#agendaModal').hidden) renderAgendaModal();
    if (!$('#conflictModal').hidden && pendingAgendaId) {
      const item = items.find((x) => x.id === pendingAgendaId);
      if (item) openConflictModal(pendingAgendaId, timeConflictsFor(item));
    }
    syncUrl();
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
    const now = Date.now();
    items = (Array.isArray(data.items) ? data.items : []).filter((it) => {
      if (!it || !it.id || !it.title || (!it.startMs && !it.endMs)) return false;
      if (it.kind === 'fair') return (it.endMs || it.startMs) >= now;
      if (it.endMs) return it.endMs >= now;
      const published = it.publishedMs || it.startMs;
      return !published || published >= now - 45 * 86400000;
    });

    for (const it of items) {
      it.functions = Array.isArray(it.functions) ? it.functions : [];
      it.cohort = it.cohort || null;
      it.city = it.city || '';
      it._search = [
        it.title,
        it.company,
        COMPANY_EN[it.company] || '',
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
    }
  }

  // ---------- 匹配与排序 ----------

  function matchesType(it) {
    if (state.type === 'all') return true;
    return it.kind === state.type;
  }

  function inDayRange(it, maxDays) {
    const diff = dayDiff(it._dateMs);
    return diff >= 0 && diff <= maxDays;
  }

  function matchesRange(it) {
    if (state.range === 'all') return true;
    if (state.range === 'today') return inDayRange(it, 0);
    if (state.range === '7d') return inDayRange(it, 7);
    if (state.range === '30d') return inDayRange(it, 30);
    if (state.range === 'soon') return inDayRange(it, 3);
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
    const agencyCompany = AGENCY_COMPANY_RE.test(it.company || '');
    const keywordHit = dir.keywords.some((k) => text.includes(k.toLowerCase()));
    const tagHit = dir.tags.some((t) => {
      if (!(it.tags || []).includes(t)) return false;
      // 平台代发的职位可能被误标「咨询/专业服务」，标题里没有专业服务信号时忽略
      if (
        dir.id === 'consulting' &&
        t === '咨询/专业服务' &&
        agencyCompany &&
        !CONSULTING_TITLE_RE.test(it.title || '')
      ) {
        return false;
      }
      return true;
    });
    return (
      keywordHit ||
      tagHit ||
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
    const text = `${it.title} ${it.company} ${COMPANY_EN[it.company] || ''} ${(it.tags || []).join(
      ' '
    )}`.toLowerCase();
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
    const next7 = items.filter((it) => inDayRange(it, 7));
    const next7Counts = { fair: 0, job: 0, internship: 0 };
    for (const it of next7) next7Counts[it.kind] = (next7Counts[it.kind] || 0) + 1;
    const today = items.filter((it) => inDayRange(it, 0));
    const todayCounts = { fair: 0, job: 0, internship: 0 };
    for (const it of today) todayCounts[it.kind] = (todayCounts[it.kind] || 0) + 1;

    const stats = $('#heroStats');
    if (!stats) return;
    const b = stats.querySelectorAll('.stat b');
    if (b[0]) b[0].textContent = next7.length;
    if (b[1]) b[1].textContent = items.length;
    if (b[2]) b[2].textContent = today.length;
    if (b[3]) b[3].textContent = meta.generatedAtCst ? fmtDateTime(Date.parse(meta.generatedAt) || now) : '—';

    const next7Breakdown = $('#next7Breakdown');
    if (next7Breakdown) {
      next7Breakdown.textContent = L(
        `宣讲 ${next7Counts.fair} · 招聘 ${next7Counts.job} · 实习 ${next7Counts.internship}`,
        `Talks ${next7Counts.fair} · Jobs ${next7Counts.job} · Internships ${next7Counts.internship}`
      );
    }
    const todayBreakdown = $('#todayBreakdown');
    if (todayBreakdown) {
      todayBreakdown.textContent = L(
        `宣讲 ${todayCounts.fair} · 截止 ${todayCounts.job + todayCounts.internship}`,
        `Talks ${todayCounts.fair} · Deadlines ${todayCounts.job + todayCounts.internship}`
      );
    }

    const updated = $('#updatedAt');
    if (updated) updated.textContent = meta.generatedAtCst ? meta.generatedAtCst.slice(5) : '—';

    $('#syncLabel').textContent = meta.generatedAtCst
      ? L(`更新于 ${meta.generatedAtCst.slice(5)}`, `Updated ${meta.generatedAtCst.slice(5)}`)
      : L('自动同步', 'Auto sync');
    $('#aboutUpdated').textContent = meta.generatedAtCst || '—';
    $('#aboutCount').textContent = L(`${items.length} 条`, `${items.length} listings`);

    const todayDateEl = $('#todayDate');
    if (todayDateEl) {
      const { month, day } = monthDay(nowMs());
      todayDateEl.textContent = L(
        `${Number(month)}月${Number(day)}日 · ${weekday(nowMs())}`,
        `${monthShort(nowMs())} ${Number(day)} · ${weekday(nowMs())}`
      );
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
      const label = type === 'all' ? L('全部', 'All') : typeLabel(type, true);
      btn.innerHTML = `${label}<span class="seg-count">${counts[type] || 0}</span>`;
      btn.setAttribute('aria-selected', state.type === type ? 'true' : 'false');
    }
  }

  function renderQuickList() {
    // 方向计数跟随「类型 / 时间 / 搜索 / 单位性质 / 职能」等，不含方向本身
    const dirBase = items.filter(
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

    const directions = DIRECTIONS.map((d) => ({
      dir: d,
      count: dirBase.filter((it) => dirHit(d, it)).length,
    })).sort(
      (a, b) =>
        b.count - a.count ||
        dirName(a.dir).localeCompare(dirName(b.dir), state.lang === 'en' ? 'en' : 'zh-CN')
    );

    const allActive = !state.dir && !state.tags.length;
    const chips = [
      `<button type="button" class="chip quick-all${allActive ? ' active' : ''}" data-quick-all="1" title="${L(
        '清除方向筛选',
        'Clear direction filter'
      )}">${L('全部', 'All')}</button>`,
      ...directions.map(
        ({ dir: d, count }) =>
          `<button type="button" class="chip dir-chip${state.dir === d.id ? ' active' : ''}" data-dir="${
            d.id
          }">${esc(dirName(d))}<span class="count">${count}</span></button>`
      ),
    ];

    const el = $('#quickList');
    if (el) el.innerHTML = chips.join('');
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
      `<option value="">${L('全部单位性质', 'All organization types')}</option>` +
      options
        .map(([n, c]) => `<option value="${esc(n)}">${esc(natureLabel(n))}${fmtCount(c)}</option>`)
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
      `<option value="">${L('全部职能', 'All functions')}</option>` +
      options
        .map(([f, c]) => `<option value="${esc(f)}">${esc(fnLabel(f))}${fmtCount(c)}</option>`)
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
      `<option value="">${L('全部年份', 'All years')}</option>` +
      years
        .map(([y, c]) => `<option value="${y}">${L(`${y} 年`, String(y))}${fmtCount(c)}</option>`)
        .join('') +
      (unknown
        ? `<option value="none">${L('未标注', 'Not specified')}${fmtCount(unknown)}</option>`
        : '');
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
      `<option value="">${L('全部城市', 'All cities')}</option>` +
      top
        .map(([c, n]) => `<option value="${esc(c)}">${esc(cityLabel(c))}${fmtCount(n)}</option>`)
        .join('') +
      (unknown
        ? `<option value="__none">${L('其他 / 未标注', 'Other / Not specified')}${fmtCount(
            unknown
          )}</option>`
        : '');
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
    if (state.type !== 'all') pills.push(['type', typeLabel(state.type, true)]);
    if (state.range !== 'all') {
      const label = {
        today: L('今天', 'Today'),
        '7d': L('未来 7 天', 'Next 7 days'),
        '30d': L('未来 30 天', 'Next 30 days'),
        soon: L('3 天内', 'Within 3 days'),
      }[state.range];
      pills.push(['range', label]);
    }
    if (state.q) pills.push(['q', L(`搜索：${state.q}`, `Search: ${state.q}`)]);
    if (state.dir) {
      const d = DIRECTIONS.find((x) => x.id === state.dir);
      pills.push(['dir', L(`方向：${d ? d.name : state.dir}`, `Direction: ${d ? dirName(d) : state.dir}`)]);
    }
    for (const t of state.tags) pills.push([`tag:${t}`, t]);
    if (state.fn) pills.push(['fn', L(`职能：${state.fn}`, `Function: ${fnLabel(state.fn)}`)]);
    if (state.cohort) {
      pills.push([
        'cohort',
        state.cohort === 'none'
          ? L('未标注年份', 'Year not specified')
          : L(`${state.cohort} 年`, `Year ${state.cohort}`),
      ]);
    }
    if (state.city) {
      pills.push([
        'city',
        state.city === '__none' ? L('其他城市', 'Other city') : cityLabel(state.city),
      ]);
    }
    if (state.nature) pills.push(['nature', natureLabel(state.nature)]);
    if (state.mine) pills.push(['mine', L('适合我的', 'For me')]);
    if (state.favOnly) pills.push(['fav', L('只看收藏', 'Starred only')]);

    el.hidden = pills.length === 0;
    el.innerHTML = pills
      .map(
        ([key, label]) =>
          `<span class="pill">${esc(label)}<button type="button" data-remove="${esc(
            key
          )}" aria-label="${L('移除筛选', 'Remove filter')}">×</button></span>`
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
    const monthLabel = state.lang === 'en' ? monthShort(ms) : `${Number(month)}月`;
    const dayLabel = state.lang === 'en' ? Number(day) : day;
    return `<div class="card-date${isFair ? '' : ' deadline'}">
      <span class="d-mon">${monthLabel}${showYear ? `<br>${year}` : ''}</span>
      <span class="d-day">${dayLabel}</span>
      <span class="d-week">${isFair ? weekday(ms) : L('截止', 'Due')}</span>
      <span class="d-tag">${isFair ? timeHM(ms) : ''}</span>
    </div>`;
  }

  function badges(it, score) {
    let out = '';
    if (it.top) out += `<span class="badge-top">${L('置顶', 'Pinned')}</span>`;
    const isNew =
      !meta.firstRun &&
      (it.kind === 'fair'
        ? it._firstSeenMs && nowMs() - it._firstSeenMs < 36 * 3600 * 1000
        : it.publishedMs && nowMs() - it.publishedMs < 48 * 3600 * 1000);
    if (isNew) out += '<span class="badge-new">NEW</span>';
    if (state.mine && score > 0) out += `<span class="badge-match">${L('匹配', 'Match')}</span>`;
    return out;
  }

  function metaRows(it) {
    if (it.kind === 'fair') {
      const start = timeHM(it.startMs);
      const end = it.endMs && isSameDay(it.startMs, it.endMs) ? `–${timeHM(it.endMs)}` : '';
      const rows = [`<span>${icon('clock')}${start}${end}</span>`];
      if (it.location) rows.push(`<span>${icon('pin')}${esc(it.location)}</span>`);
      if (it.views) rows.push(`<span>${icon('eye')}${it.views} ${L('人关注', 'views')}</span>`);
      return rows.join('');
    }

    const diff = dayDiff(it._dateMs);
    const urgent = diff >= 0 && diff <= 3;
    const deadline = it.endMs
      ? fmtMonthDayShort(it.endMs)
      : L('长期有效', 'Rolling');
    const rows = [
      `<span class="${urgent ? 'urgent' : ''}">${icon('clock')}${L(
        '截止',
        'Due'
      )} ${deadline}${
        urgent
          ? L(
              `（${diff === 0 ? '今天' : `${diff} 天后`}）`,
              ` (${diff === 0 ? 'today' : diff === 1 ? 'in 1 day' : `in ${diff} days`})`
            )
          : ''
      }</span>`,
    ];
    if (it.positions) {
      rows.push(
        `<span>${icon('people')}${it.positions} ${L('个岗位', 'positions')}</span>`
      );
    }
    if (it.nature) rows.push(`<span>${icon('building')}${esc(natureLabel(it.nature))}</span>`);
    if (it.scale) rows.push(`<span>${esc(scaleLabel(it.scale))}</span>`);
    return rows.join('');
  }

  function cardHTML(it, score) {
    const [accent, accentSoft] = kindAccent(it);
    const title = esc(it.title);
    const companyText = it.company ? esc(companyLabel(it.company)) : '';
    const companyTitle = it.company ? esc(it.company) : '';
    const subtype = subtypeLabel(it);
    const fav = favs.has(it.id);
    const inAgenda = agenda.has(it.id);
    const favLabel = fav ? L('取消收藏', 'Remove star') : L('收藏', 'Star');
    const agendaLabel = inAgenda ? L('移出日程', 'Remove from schedule') : L('加入日程', 'Add to schedule');

    return `<article class="card" data-id="${esc(it.id)}" style="--accent:${accent};--accent-soft:${accentSoft}">
      ${dateBox(it)}
      <div class="card-main">
        <div class="card-title-row">
          <span class="kind-badge">${esc(subtype)}</span>
          ${badges(it, score)}
          <a class="card-title" href="${esc(it.url)}" target="_blank" rel="noopener">${title}</a>
        </div>
        ${companyText ? `<div class="card-company" title="${companyTitle}">${companyText}</div>` : ''}
        <div class="card-meta">${metaRows(it)}</div>
      </div>
      <div class="card-side">
        <button type="button" class="icon-btn fav-btn${fav ? ' is-fav' : ''}" data-action="fav"
          aria-pressed="${fav}" aria-label="${favLabel}" title="${favLabel}">${icon('star')}</button>
        <button type="button" class="icon-btn agenda-btn${inAgenda ? ' is-agenda' : ''}" data-action="agenda"
          aria-pressed="${inAgenda}" aria-label="${agendaLabel}" title="${agendaLabel}">${icon('calendar')}</button>
        <a class="source-link" href="${esc(it.url)}" target="_blank" rel="noopener">${L(
          '原文',
          'Source'
        )}${icon('external')}</a>
      </div>
    </article>`;
  }

  function groupHeadHTML(key, groupItems) {
    const diff = diffFromKey(key);
    const ms = keyToMs(key);
    const { month, day } = monthDay(ms);
    const rel =
      diff === 0
        ? L('今天', 'Today')
        : diff === 1
          ? L('明天', 'Tomorrow')
          : diff === 2
            ? L('后天', 'In 2 days')
            : diff === -1
              ? L('昨天', 'Yesterday')
              : '';
    const past = diff < 0;
    const dateLabel = rel || fmtMonthDay(ms);
    const weekLabel = rel
      ? L(
          `${Number(month)}月${Number(day)}日 · ${weekday(ms)}`,
          `${monthShort(ms)} ${Number(day)} · ${weekday(ms)}`
        )
      : weekday(ms);
    const fairs = groupItems.filter((it) => it.kind === 'fair').length;
    const deadlines = groupItems.length - fairs;
    const bits = [];
    if (fairs) {
      bits.push(L(`${fairs} 场宣讲`, `${fairs} talk${fairs > 1 ? 's' : ''}`));
    }
    if (deadlines) {
      bits.push(L(`${deadlines} 个截止`, `${deadlines} deadline${deadlines > 1 ? 's' : ''}`));
    }
    return `<div class="group-head${past ? ' is-past' : ''}">
      <span class="g-date">${dateLabel}</span>
      <span class="g-week">${weekLabel}</span>
      ${past ? `<span class="g-past">${L('已结束', 'Ended')}</span>` : ''}
      <span class="g-count">${bits.join(' · ')}</span>
    </div>`;
  }

  // ---------- 渲染：主列表 ----------

  function render() {
    if (loadFailed) return;
    const list = applyFilters();
    renderHero();
    renderTabs();
    renderQuickList();
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
    more.textContent =
      remaining > 0
        ? L(`加载更多（还有 ${remaining} 条）`, `Load more (${remaining} left)`)
        : '';
  }

  function renderResultHead(list) {
    const label =
      state.type === 'all'
        ? L('全部收录', 'All listings')
        : state.type === 'job'
          ? L('招聘信息', 'Jobs')
          : state.type === 'internship'
            ? L('实习信息', 'Internships')
            : L('宣讲会', 'Career talks');
    $('#resultTitle').textContent = state.q
      ? L(`“${state.q}” 的搜索结果`, `Results for “${state.q}”`)
      : label;
    const parts = [L(`共 ${list.length} 条`, `${list.length} listings`)];
    if (state.mine) parts.push(L('已按我的关注筛选', 'Filtered by my interests'));
    if (state.favOnly) parts.push(L('仅收藏', 'Starred only'));
    $('#resultSub').textContent = parts.join(' · ');
  }

  // 让「我的关注」和「未来 7 天日程」在侧栏里保持等高。
  // 先清掉上一次的内联高度，再按两者自然高度的最大值统一设置。
  function equalizeSidebarCards() {
    const prefsEl = $('.panel-prefs');
    const weekEl = $('.panel-week');
    if (!prefsEl || !weekEl) return;
    prefsEl.style.minHeight = '';
    weekEl.style.minHeight = '';
    const height = Math.ceil(
      Math.max(
        prefsEl.getBoundingClientRect().height,
        weekEl.getBoundingClientRect().height
      )
    );
    if (height > 0) {
      prefsEl.style.minHeight = `${height}px`;
      weekEl.style.minHeight = `${height}px`;
    }
  }

  function renderSidebar() {
    renderPrefsSummary();
    renderAgenda();
    equalizeSidebarCards();
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
      const wd = i === 0 ? L('今天', 'Today') : weekday(ms);
      const dateTitle = L(
        `${Number(month)}月${Number(day)}日 ${wd}`,
        `${monthShort(ms)} ${Number(day)} ${wd}`
      );
      const count = dayItems.length;
      if (!count) {
        cells.push(`<span class="cal-day is-empty${i === 0 ? ' is-today' : ''}"
          title="${esc(dateTitle)}">
          <span class="cal-wd">${wd}</span>
          <span class="cal-date">${state.lang === 'en' ? Number(day) : day}</span>
        </span>`);
        continue;
      }
      const conflict = dayItems.some((it) => (byId.get(it.id)?.conflicts.length || 0) > 0);
      const same = dayItems.some((it) => (byId.get(it.id)?.sameDay.length || 0) > 0);
      const itemWord = L('项', count === 1 ? 'item' : 'items');
      const tip = `${dateTitle}：${count} ${itemWord}\n${dayItems
        .slice(0, 3)
        .map((it) => it.title)
        .join('\n')}${count > 3 ? '\n…' : ''}`;
      cells.push(`<button class="cal-day has${i === 0 ? ' is-today' : ''}" type="button"
        data-day="${key}" title="${esc(tip)}">
        <span class="cal-wd">${wd}</span>
        <span class="cal-date">${state.lang === 'en' ? Number(day) : day}</span>
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
      <span class="conflict-sub">${esc(fairTimeRange(item))} · ${L(
        `与下面 ${conflicts.length} 条已加入日程时间重叠`,
        `overlaps with ${conflicts.length} scheduled item${conflicts.length > 1 ? 's' : ''}`
      )}</span>`;
    $('#conflictList').innerHTML = conflicts
      .map(
        (c) => `<div class="conflict-row">
          <span class="cr-title">${esc(c.item.title)}</span>
          <span class="cr-meta">${esc(fairTimeRange(c.item))} · ${L(
            `重叠约 ${c.mins} 分钟`,
            `overlap ~${c.mins} min`
          )}</span>
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
    toggleAgenda(id, L('已加入日程，注意时间冲突', 'Added; note the time conflict'));
  }

  function renderPrefsSummary() {
    const el = $('#prefsSummary');
    if (!el) return;
    const chips = prefs.keywords.map((k) => `<span class="tag">${esc(k)}</span>`);
    el.innerHTML = chips.length
      ? chips.join('')
      : `<button class="chip chip-ghost" type="button" id="prefsEmptyBtn">＋ ${L(
          '设置关注方向',
          'Set interests'
        )}</button>`;
    el.classList.toggle('is-scroll', el.scrollWidth > el.clientWidth + 1);
    const emptyBtn = $('#prefsEmptyBtn');
    if (emptyBtn) emptyBtn.addEventListener('click', openPrefs);
    equalizeSidebarCards();
  }

  // ---------- 我的日程 ----------

  function toggleAgenda(id, message) {
    if (agenda.has(id)) {
      agenda.delete(id);
      if (agendaSel === id) agendaSel = null;
      toast(L('已移出日程', 'Removed from schedule'));
    } else {
      agenda.add(id);
      toast(message || L('已加入日程，可在「我的日程」查看', 'Added to your schedule'));
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
      btn.title = added ? L('移出日程', 'Remove from schedule') : L('加入日程', 'Add to schedule');
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
    return L(
      `${Number(month)}-${day} ${timeHM(it.startMs)}${end}`,
      `${monthShort(it.startMs)} ${Number(day)} ${timeHM(it.startMs)}${end}`
    );
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
            entry(a.id).conflicts.push(
              L(`与「${b.title}」时间重叠约 ${mins} 分钟`, `Overlaps with “${b.title}” by ~${mins} min`)
            );
            entry(b.id).conflicts.push(
              L(`与「${a.title}」时间重叠约 ${mins} 分钟`, `Overlaps with “${a.title}” by ~${mins} min`)
            );
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
      return L(
        `${Number(month)}-${day} ${timeHM(it.startMs)}`,
        `${monthShort(it.startMs)} ${Number(day)} ${timeHM(it.startMs)}`
      );
    }
    if (!it._dateMs) return '—';
    return L(`截止 ${fmtMonthDayShort(it._dateMs)}`, `Due ${fmtMonthDayShort(it._dateMs)}`);
  }

  function agendaRowHTML(it, active, level) {
    const title =
      level === 'conflict'
        ? L('时间冲突', 'Time conflict')
        : level === 'same'
          ? L('同日截止', 'Same-day deadline')
          : '';
    return `<button class="agenda-row${active ? ' active' : ''}" type="button" data-agenda-id="${esc(it.id)}">
      <span class="a-time">${esc(agendaTimeLabel(it))}</span>
      <span class="a-title">${esc(it.title)}</span>
      ${level ? `<span class="a-dot ${level}" title="${title}"></span>` : ''}
    </button>`;
  }

  function renderAgenda() {
    renderWeekAgenda();
    equalizeSidebarCards();
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
      if (pairs) {
        parts.push(L(`${pairs} 处时间冲突`, `${pairs} time conflict${pairs > 1 ? 's' : ''}`));
      }
      if (sameDayCount) {
        parts.push(
          L(`${sameDayCount} 条同日截止`, `${sameDayCount} same-day deadline${sameDayCount > 1 ? 's' : ''}`)
        );
      }
      badge.hidden = !parts.length;
      badge.textContent = parts.join(' · ');
      badge.classList.toggle('is-soft', !pairs && Boolean(sameDayCount));
    }

    const preview = $('#agendaPreview');
    if (!preview) return;
    const foot = $('#agendaFoot');
    if (foot) foot.hidden = !list.length;
    if (!list.length) {
      preview.innerHTML = `<div class="agenda-empty">${L(
        '还没有加入日程。点卡片右侧的日历图标，就会在这里显示标题和截止时间。',
        'Nothing scheduled yet. Click the calendar icon on a card to add it here.'
      )}</div>`;
      return;
    }
    const rows = list
      .slice(0, 2)
      .map((it) => agendaRowHTML(it, false, agendaRowLevel(byId, it.id)));
    if (list.length > 2) {
      rows.push(
        `<button class="agenda-more" type="button" id="agendaMore">${L(
          `还有 ${list.length - 2} 项，查看全部`,
          `${list.length - 2} more, view all`
        )}</button>`
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
      if (pairs) {
        parts.push(L(`${pairs} 处时间冲突`, `${pairs} time conflict${pairs > 1 ? 's' : ''}`));
      }
      if (sameDayCount) {
        parts.push(
          L(`${sameDayCount} 条同日截止`, `${sameDayCount} same-day deadline${sameDayCount > 1 ? 's' : ''}`)
        );
      }
      top.hidden = !parts.length;
      top.textContent = parts.join(' · ');
      top.classList.toggle('is-soft', !pairs && Boolean(sameDayCount));
    }
    const listEl = $('#agendaList');
    const detailEl = $('#agendaDetail');
    if (!list.length) {
      listEl.innerHTML = `<div class="agenda-empty">${L(
        '日程还是空的。回到列表，点卡片右侧的日历图标即可加入。',
        'Your schedule is empty. Go back to the list and click the calendar icon on a card.'
      )}</div>`;
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
        : L('时间待定', 'Time TBD')
      : it.endMs
        ? L(`截止 ${fmtMonthDay(it.endMs)}`, `Due ${fmtMonthDay(it.endMs)}`)
        : L('长期有效', 'Rolling');
    const rows = [
      [L('时间', 'Time'), timeText],
      it.company ? [L('单位', 'Organization'), companyLabel(it.company)] : null,
      it.location ? [L('地点', 'Location'), it.location] : null,
      it.city && it.city !== it.location ? [L('城市', 'City'), cityLabel(it.city)] : null,
    ].filter(Boolean);

    detailEl.innerHTML = `
      <div class="ad-kind">${esc(subtypeLabel(it) || L('机会', 'Opportunity'))}</div>
      <h4>${esc(it.title)}</h4>
      ${
        it.company
          ? `<div class="ad-company" title="${esc(it.company)}">${esc(
              companyLabel(it.company)
            )}</div>`
          : ''
      }
      <dl class="ad-meta">
        ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      ${
        conflicts.length
          ? `<div class="ad-conflict"><b>${L('时间冲突', 'Time conflicts')}</b><ul>${conflicts
              .map((c) => `<li>${esc(c)}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      ${
        sameDay.length
          ? `<div class="ad-sameday"><b>${L('同日截止', 'Same-day deadlines')}</b><ul>${sameDay
              .map(
                (t) =>
                  `<li>${L(
                    `与「${esc(t)}」同一天截止`,
                    `Also due the same day: “${esc(t)}”`
                  )}</li>`
              )
              .join('')}</ul></div>`
          : ''
      }
      ${
        !conflicts.length && !sameDay.length
          ? `<div class="ad-ok">✓ ${L('暂无时间冲突', 'No time conflicts')}</div>`
          : ''
      }
      <div class="ad-actions">
        <button class="chip" type="button" data-agenda-remove="${esc(it.id)}">${L(
          '移出日程',
          'Remove'
        )}</button>
        <button class="chip" type="button" data-agenda-ics="${esc(it.id)}">${L(
          '下载此条 .ics',
          'Download .ics'
        )}</button>
        <a class="chip" href="${esc(it.url)}" target="_blank" rel="noopener">${L(
          '查看原文',
          'View source'
        )}</a>
      </div>`;
  }

  // ---------- 交互 ----------

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const type = p.get('type');
    const range = p.get('range');
    const sort = p.get('sort');
    const lang = p.get('lang');
    if (lang === 'en' || lang === 'zh') {
      state.lang = lang;
      saveLang();
    }
    state.q = p.get('q') || '';
    state.type = ['fair', 'job', 'internship'].includes(type) ? type : 'all';
    state.range = ['today', '7d', '30d', 'soon'].includes(range) ? range : 'all';
    state.sort = ['time', 'new', 'deadline'].includes(sort) ? sort : 'time';
    const rawTags = (p.get('tags') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let legacyType = '';
    let legacyFn = '';
    let legacyDir = '';
    // 标签筛选已下线；旧链接里的行业标签仍然映射成方向，其余标签忽略
    state.tags = [];
    for (const t of rawTags) {
      if (!HIDDEN_TAGS.has(t)) continue;
      if (t === '宣讲') legacyType = 'fair';
      else if (t === '实习') legacyType = 'internship';
      else if (t === '管培生') legacyFn = '管培生';
      else if (LEGACY_TAG_TO_DIR[t]) legacyDir = LEGACY_TAG_TO_DIR[t];
    }
    if (!type && legacyType) state.type = legacyType;
    state.nature = p.get('nature') || '';
    const dir = p.get('dir');
    state.dir = DIRECTIONS.some((d) => d.id === dir)
      ? dir
      : DIRECTIONS.some((d) => d.id === legacyDir)
        ? legacyDir
        : '';
    const fn = p.get('fn');
    state.fn = fn || legacyFn;
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
      if (state.lang === 'en') p.set('lang', 'en');
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
        ? L(
            `【${it.subtype || '宣讲会'}】${it.title}${it.company ? ` — ${it.company}` : ''}`,
            `[${subtypeLabel(it)}] ${it.title}${
              it.company ? ` — ${companyLabel(it.company)}` : ''
            }`
          )
        : L(
            `【${typeLabel(it.kind, false)}截止】${it.title}${it.company ? ` — ${it.company}` : ''}`,
            `[${typeLabel(it.kind, false)} deadline] ${it.title}${
              it.company ? ` — ${companyLabel(it.company)}` : ''
            }`
          );

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
        it.company
          ? L(`单位：${it.company}`, `Organization: ${companyLabel(it.company)}`)
          : '',
        isFair && it.location ? L(`地点：${it.location}`, `Location: ${it.location}`) : '',
        !isFair && it.endMs
          ? L(`截止：${fmtDateTime(it.endMs)}`, `Deadline: ${fmtDateTime(it.endMs)}`)
          : '',
        isFair ? L(`开始：${fmtDateTime(it.startMs)}`, `Starts: ${fmtDateTime(it.startMs)}`) : '',
        it.url ? L(`原文：${it.url}`, `Source: ${it.url}`) : '',
      ]
        .filter(Boolean)
        .join('\n');
      if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
      if (it.url) lines.push(`URL:${it.url}`);

      if (isFair) {
        lines.push(
          'BEGIN:VALARM',
          'TRIGGER:-PT30M',
          'ACTION:DISPLAY',
          `DESCRIPTION:${icsEscape(L('宣讲会 30 分钟后开始', 'Career talk starts in 30 minutes'))}`,
          'END:VALARM'
        );
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadICS(list) {
    if (!list.length) {
      toast(L('当前筛选下没有可导出的安排', 'Nothing to export under the current filters'));
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
    toast(
      L(
        `已导出 ${Math.min(list.length, 300)} 条到日历文件`,
        `Exported ${Math.min(list.length, 300)} item(s) to calendar`
      )
    );
  }

  // ---------- 关注设置 ----------

  function openPrefs() {
    renderPrefsPresets();
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
    prefs = { keywords, tags: [] };
    savePrefs();
    closePrefs();
    renderPrefsSummary();
    if (state.mine && !prefs.keywords.length) {
      state.mine = false;
    }
    update();
    toast(L('已保存关注设置', 'Interests saved'));
  }

  // ---------- 事件绑定 ----------

  function bind() {
    // 图标注入（静态 HTML 中的占位）
    for (const el of document.querySelectorAll('[data-icon]')) {
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[el.dataset.icon] || ''}</svg>`;
    }

    $('#langToggle').addEventListener('click', () => {
      setLang(state.lang === 'en' ? 'zh' : 'en');
    });

    // 视口变化时重新对齐侧栏两张卡片
    let sidebarResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(sidebarResizeTimer);
      sidebarResizeTimer = setTimeout(equalizeSidebarCards, 100);
    });

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

    $('#quickList').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.hasAttribute('data-quick-all')) {
        state.dir = '';
        state.tags = [];
        update();
        return;
      }

      if (btn.hasAttribute('data-dir')) {
        const id = btn.dataset.dir;
        state.dir = state.dir === id ? '' : id;
        update();
        return;
      }

      if (btn.hasAttribute('data-tag')) {
        const tag = btn.dataset.tag;
        state.tags = state.tags.includes(tag)
          ? state.tags.filter((t) => t !== tag)
          : [...state.tags, tag];
        update();
      }
    });

    // 合并成一行后标签可能横向溢出；鼠标滚轮在筛选条上时转为横向滚动
    const quickList = $('#quickList');
    quickList.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        if (quickList.scrollWidth <= quickList.clientWidth) return;
        const atStart = quickList.scrollLeft <= 0;
        const atEnd =
          quickList.scrollLeft + quickList.clientWidth >= quickList.scrollWidth - 1;
        if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
        e.preventDefault();
        quickList.scrollLeft += e.deltaY;
      },
      { passive: false }
    );

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
      if (state.favOnly && !favs.size) {
        toast(
          L(
            '还没有收藏，点卡片右侧的星标即可收藏',
            'No starred items yet. Click the star on a card to save it.'
          )
        );
      }
    });

    $('#mineToggle').addEventListener('click', () => {
      if (!state.mine && !prefs.keywords.length && !prefs.tags.length) {
        openPrefs();
        toast(L('先设置一下你的关注领域或关键词', 'Set a few keywords first'));
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
        btn.title = favs.has(id) ? L('取消收藏', 'Remove star') : L('收藏', 'Star');
        btn.setAttribute('aria-label', btn.title);
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
          peers.length
            ? L(
                `已加入日程；另有 ${peers.length} 条同日截止`,
                `Added; ${peers.length} other deadline${peers.length > 1 ? 's' : ''} on the same day`
              )
            : undefined
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
      toast(L('已清空日程', 'Schedule cleared'));
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
      toast(
        ok
          ? L(
              '链接已复制，发给同学就能打开当前筛选',
              'Link copied. Share it to open the same filters.'
            )
          : L('复制失败，请手动复制地址栏链接', 'Copy failed. Please copy the address bar manually.')
      );
    });

    $('#prefsBtn').addEventListener('click', openPrefs);
    $('#editPrefs').addEventListener('click', openPrefs);
    $('#savePrefs').addEventListener('click', handleSavePrefs);
    $('#clearPrefs').addEventListener('click', () => {
      $('#kwInput').value = '';
    });

    $('#prefsPresets').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-preset]');
      if (!btn) return;
      const dir = DIRECTIONS.find((d) => d.id === btn.dataset.preset);
      if (!dir) return;
      $('#kwInput').value = dir.keywords.slice(0, 8).join(', ');
      for (const b of document.querySelectorAll('#prefsPresets .chip')) {
        b.classList.toggle('active', b === btn);
      }
      toast(
        L(
          `已套用「${dir.name}」，可继续调整后保存`,
          `Applied “${dirName(dir)}”. You can edit before saving.`
        )
      );
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
      const prevLang = state.lang;
      readUrl();
      if (state.lang !== prevLang) {
        applyStaticI18n();
        if (items.length) {
          renderNatureOptions();
          renderFnOptions();
          renderCohortOptions();
          renderCityOptions();
        }
      }
      render();
      renderSidebar();
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
    applyStaticI18n();
    bind();

    try {
      await loadData();
    } catch (error) {
      loadFailed = true;
      $('#list').innerHTML = `<div class="empty">
        <div class="empty-mark">燕</div>
        <h3>${L('数据加载失败', 'Failed to load data')}</h3>
        <p>${
          state.lang === 'en'
            ? 'If you opened index.html directly, the browser blocks local data requests.<br>Run <code>npm run dev</code> in the project folder, then visit <code>http://localhost:5173</code>.'
            : '如果你是直接双击打开 index.html，浏览器会拦截本地数据请求。<br>请在项目目录运行 <code>npm run dev</code>，然后访问 <code>http://localhost:5173</code>。'
        }</p>
      </div>`;
      $('#resultTitle').textContent = L('无法加载数据', 'Unable to load data');
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

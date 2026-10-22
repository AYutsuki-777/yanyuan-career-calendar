/**
 * 北京大学学生就业指导服务中心（scc.pku.edu.cn）公开列表接口封装。
 *
 * 说明：
 * - 只读取未登录即可访问的公开列表，不绕过任何权限。
 * - 请求频率由调用方控制，默认串行 + 间隔，避免给对方服务器造成压力。
 */

const BASE = 'https://scc.pku.edu.cn';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: `${BASE}/frontpage/pku/html/index.html`,
  'User-Agent': UA,
};

let cachedToken = null;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(url, options, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      await sleep(600 * (attempt + 1));
    }
  }
  throw new Error(`请求失败：${url}（${lastError?.message || '未知错误'}）`);
}

/** 获取临时 token（公开接口，无需登录） */
export async function getToken(force = false) {
  if (cachedToken && !force) return cachedToken;
  const data = await request(`${BASE}/f/ajaxHome/getToken`, {
    method: 'GET',
    headers: { 'User-Agent': UA, Referer: `${BASE}/` },
  });
  if (!data?.data) throw new Error('获取 token 失败');
  cachedToken = data.data;
  return cachedToken;
}

async function postForm(path, params) {
  const token = await getToken();
  const body = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();

  const data = await request(`${BASE}${path}?ts=${Date.now()}`, {
    method: 'POST',
    headers: { ...FORM_HEADERS, token },
    body,
  });

  // 站点 token 偶尔失效，state=0 时换一个再试一次
  if (data?.state === 0 || data?.state === '0') {
    cachedToken = null;
    const fresh = await getToken(true);
    const retry = await request(`${BASE}${path}?ts=${Date.now()}`, {
      method: 'POST',
      headers: { ...FORM_HEADERS, token: fresh },
      body,
    });
    return retry;
  }
  return data;
}

/**
 * 招聘活动（宣讲会 / 双选会 / 空中宣讲等）
 * @param {number} fairType 1=宣讲会 2=双选会 3=空中宣讲会 4=视频宣讲会 5=校外云宣讲
 */
export async function fetchFairPage({
  fairType = 1,
  pageNo = 1,
  pageSize = 50,
  title = '',
} = {}) {
  return postForm('/f/recruitmentFair/ajax_frontRecruitfair', {
    fairType,
    pageNo,
    pageSize,
    title,
  });
}

/**
 * 招聘 / 实习信息列表
 * @param {number} positionType 1=招聘信息 2=实习信息
 */
export async function fetchJobPage({
  positionType = 1,
  pageNo = 1,
  pageSize = 50,
  title = '',
} = {}) {
  return postForm('/f/recruitmentinfo/ajax_frontRecruitinfo', {
    positionType,
    pageNo,
    pageSize,
    title,
    city: '',
    corporationNature: '',
    'corporationinfo.industry': '',
  });
}

/** 招聘信息详情：岗位、学历要求、专业、工作地点等 */
export async function fetchJobDetail(recruitmentId) {
  return postForm('/f/recruitmentinfo/ajax_show', { recruitmentId });
}

/** 招聘/实习筛选项字典（单位性质、行业） */
export async function fetchFilterOptions(positionType = 1) {
  return postForm('/f/recruitmentinfo/ajax_search', { positionType });
}

/**
 * 把站点的北京时间字符串解析成毫秒时间戳。
 * 例："2026-11-05 19:00:00" -> 北京时间 19:00 对应的 UTC 毫秒
 */
export function parseCnTime(value) {
  if (!value) return null;
  const m = String(value).match(
    /(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return Date.UTC(+y, +mo - 1, +d, +h - 8, +mi, +s);
}

export { BASE };

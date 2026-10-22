# 燕园求职日历

把北大就业网（scc.pku.edu.cn）上散落的**宣讲会、招聘、实习**信息，抓成一个可以筛选、可以分享、能自动更新的单页网站。

- 数据来源：北大就业网的**公开列表接口**，不需要登录、不绕过任何权限
- 更新方式：每 6 小时自动同步一次（北京时间 02:00 / 08:00 / 14:00 / 20:00，GitHub Actions），也可以在自己电脑上一键更新
- 页面功能：关键词搜索、类型/时间/单位性质/标签筛选、**方向（咨询/金融/科技/快消/医疗/国企/制造）**、**职能 / 届别 / 城市**筛选、收藏、只看「适合我的」、**我的日程（本地勾选 + 添加时冲突确认 + 未来 7 天日历）**、导出日历（.ics）、分享带筛选条件的链接
- 技术栈：纯静态（HTML + CSS + 原生 JS）+ 一个零依赖的 Node 抓取脚本，不需要数据库

**在线地址：<https://ayutsuki-777.github.io/yanyuan-career-calendar/>**

---

## 一、先跑起来看看

需要 Node 20.11 以上（你机器上是 v24，可以直接用；推荐 22/24）。

```bash
npm run dev          # 启动本地预览，打开 http://localhost:5173
```

> 必须用本地服务器打开。直接双击 `index.html` 会因为浏览器限制而读不到 `data/events.json`。

手动更新一次数据：

```bash
npm run update        # 增量更新（快，约 10 秒）
npm run update:full   # 深度抓取，翻更多页（首次或想要完整数据时用）
```

Windows 上也可以直接双击 `update.bat`。

> 如果 PowerShell 提示「无法加载文件 npm.ps1，因为在此系统上禁止运行脚本」，改用 `npm.cmd run update`，或直接运行 `node scripts/update.mjs`；双击 `update.bat` 不受影响。

## 二、目录结构

```
.
├── index.html                 页面结构
├── assets/
│   ├── styles.css             样式（响应式，手机也能看）
│   └── app.js                 筛选、搜索、收藏、日历导出等逻辑
├── scripts/
│   ├── api.mjs                就业网接口封装（取 token、分页拉取）
│   ├── tags.mjs               根据企业名/标题推测标签的规则（可自己改）
│   ├── update.mjs             抓取 + 合并 + 写出 data/events.json
│   └── server.mjs             本地预览用的小服务器
├── data/
│   └── events.json            页面读取的数据（脚本自动生成，不用手改）
├── .github/workflows/update.yml   定时自动更新的配置
└── update.bat                 双击更新（Windows）
```

## 三、它是怎么抓到数据的

就业网页面本身是前端渲染的，真正的数据在这几个**公开接口**上（都不需要登录）：

| 用途 | 接口 | 关键参数 |
| --- | --- | --- |
| 拿临时 token | `GET /f/ajaxHome/getToken` | — |
| 宣讲会 / 双选会 | `POST /f/recruitmentFair/ajax_frontRecruitfair` | `fairType=1`（宣讲会）、`2`（双选会）… |
| 招聘 / 实习 | `POST /f/recruitmentinfo/ajax_frontRecruitinfo` | `positionType=1`（招聘）、`2`（实习） |
| 筛选项字典 | `POST /f/recruitmentinfo/ajax_search` | 单位性质、行业 |

抓取脚本做三件事：

1. 用 `getToken` 拿一个临时 token 放进请求头；
2. 按时间倒序翻页，只保留「还没结束」的信息（宣讲会保留今天及以后，招聘按截止日期）；
3. 把新数据和上一次的 `data/events.json` 按 id 合并，记下 `firstSeen`，于是页面能给新出现的信息打上 `NEW`。

几个真实数字（首次抓取）：宣讲会 70+ 场、招聘 1700+ 条、实习 80+ 条。

## 四、部署到网上，发给同学

> 现在预览用的 `http://localhost:5173` 只在你自己的电脑上有效。`localhost` 在同学手机上指的是「他自己的手机」，所以打不开；必须把页面部署到公网。

推荐 GitHub Pages，免费而且天然支持「定时提交 → 自动重新发布」。没有 Git 也能用，全程在网页上操作，大约 5 分钟。

### 1. 建仓库并上传

有 Git 的话：

```bash
git init
git add .
git commit -m "init: 燕园求职日历"
git branch -M main
git remote add origin https://github.com/<你的用户名>/yanyuan-career-calendar.git
git push -u origin main
```

没有 Git 时：

1. 打开 GitHub 新建仓库，仓库名例如 `yanyuan-career-calendar`，可见性选 **Public**（免费版 Pages 只支持公开仓库）；
2. 进入仓库 → `Add file` → `Upload files`，把 `index.html`、`assets`、`data`、`scripts` 等文件和文件夹拖进去，提交。**不要拖整个 `默认项目` 文件夹**，否则页面会多一层 `/默认项目/` 路径；要拖文件夹里面的内容；
3. `.github` 是隐藏文件夹，网页上传有时会漏掉。最稳的办法是：`Add file` → `Create new file`，文件名直接填 `.github/workflows/update.yml`，把本项目的 workflow 内容粘贴进去，提交。GitHub 会自动创建这两层目录。

### 2. 打开 Pages

仓库 `Settings` → `Pages` → Source 选 `Deploy from a branch` → 分支选 `main`、目录选 `/ (root)` → Save。

一两分钟后访问 `https://<你的用户名>.github.io/yanyuan-career-calendar/`，就能发给同学了。

### 3. 打开自动更新

仓库 `Settings` → `Actions` → `General` → Workflow permissions 选 **Read and write permissions**（否则自动更新没法提交数据）。

配置在 `.github/workflows/update.yml`，默认每 6 小时跑一次（北京时间 02:00 / 08:00 / 14:00 / 20:00）：

```yaml
on:
  schedule:
    # GitHub Actions 的 cron 用 UTC，北京时间 = UTC+8
    - cron: '0 */6 * * *'
  workflow_dispatch:       # 也支持手动点一下立刻更新
```

几个实际注意点：

- Actions 的定时任务**不保证卡点**，通常晚几分钟到几十分钟；如果碰到整点排队，可能更晚。
- 仓库连续 60 天没有任何提交时，GitHub 会自动暂停定时任务；点一次 `Run workflow` 或随便提交一次即可恢复。
- 定时任务只在默认分支（通常是 `main`）上生效。
- 想改成每小时一次就写 `0 * * * *`；Actions 页面里点 `Run workflow` 可以手动触发一次。

跑完后，仓库的 Commits 里会出现一条 `chore: 同步招聘数据 ...`；页面刷新后，页脚/数据里的 `generatedAtCst` 也会变成新的时间。如果 Actions 显示绿色但对钩却没有新提交，通常是这次本来就没有新数据。

## 五、不想用 GitHub Actions？两种替代方案

- **本机定时更新**：Windows「任务计划程序」新建任务，触发器按需要设成每天几次（例如 0:00 / 6:00 / 12:00 / 18:00），操作填 `cmd /c "C:\...\update.bat"`。需要电脑当时开机且联网；它只更新本机的 `data/events.json`，不会自动同步到已经部署的 GitHub Pages。
- **Vercel / Netlify**：把仓库连上去，用它们的定时构建（Cron Build）每天重新执行 `npm run update` 再构建，效果和 Actions 类似。

## 六、常用自定义

| 想改什么 | 改哪里 |
| --- | --- |
| 标签推测规则（哪些公司算互联网/国企…） | `scripts/tags.mjs` 里的 `RULES` |
| 方向预设（咨询/金融/科技…对应哪些关键词） | `assets/app.js` 里的 `DIRECTIONS` |
| 职能 / 届别 / 城市的推断规则 | `scripts/tags.mjs` 的 `FUNCTION_RULES`、`inferCohort`、`CITY_NAMES` |
| 重新补算派生字段（不联网） | `npm run enrich` |
| 保留多久的信息 | `scripts/update.mjs` 顶部的 `FAIR_KEEP_PAST`、`JOB_KEEP_PAST` |
| 抓多少页 | `scripts/update.mjs` 的 `FAIR_MAX_PAGES`、`JOB_MAX_PAGES` |
| 更新频率 | `.github/workflows/update.yml` 的 `cron` |
| 页面默认排序 / 每页条数 | `assets/app.js` 里的 `PAGE_SIZE` |
| 品牌名、免责声明 | `index.html` 顶部标题与底部文字 |

页面里的「我的关注」（关键词 + 标签）、「收藏」和「我的日程」都存在**访问者自己的浏览器**里，不会上传，也不需要账号。日程只保存在当前浏览器；换设备或清缓存会丢，重要场次请用「导出 .ics」存进手机/电脑日历。

### 给两年制全日制 MBA 的时间线提示

- 2026 年秋入学 → **2028 届毕业**。
- 「20XX 届校园招聘」看的是**毕业年份**：2027 届校招不是你们的；2028 届秋招通常 2027 年 9 月才开始。
- 「2027 暑期实习」按**实习年份**命名，面向 2028 届，申请期往往在 2026 年底～2027 年春。
- 26 届 / 2026 入职的校招可以忽略；社招、不限届的岗位仍然适用。
- 页面里：用「届别 / 年份」看 20XX 届或 20XX 年（宣讲会、招聘、实习都会按标题里的年份归类），用类型「实习」看暑期实习，用搜索 `管培`、`不限专业`、`MBA` 补充。
- 注意：实习标题里的年份是「实习年份」，不一定等于毕业届别（例如「2027 年暑期实习」通常面向 2028 届）。

## 七、data/events.json 字段

```jsonc
{
  "meta": {
    "generatedAtCst": "2026-10-21 22:51",  // 最近同步时间（北京时间）
    "counts": { "fair": 72, "job": 1737, "internship": 89 },
    "firstRun": false                       // 首次生成时页面不显示 NEW 标记
  },
  "items": [
    {
      "id": "fair:xxxx",        // fair: = 宣讲会，job: = 招聘/实习
      "kind": "fair",           // fair | job | internship
      "title": "…",
      "company": "…",
      "startMs": 1792476000000, // 宣讲会开始时间 / 招聘发布时间（UTC 毫秒）
      "endMs": 1792486800000,   // 宣讲会结束时间 / 招聘截止时间
      "location": "英杰月光厅",
      "nature": "国有企业",      // 单位性质
      "positions": 17,          // 需求岗位数
      "tags": ["国企/事业单位", "校招"],
      "functions": ["管培生"],   // 职能（从标题推测，可能为空）
      "cohort": 2027,           // 届别/年份：先取「20XX届」，没有则取标题里的 20XX 年；可能为 null
      "city": "北京",            // 城市（公司名 / 地点 / 标题推测，可能为空）
      "url": "https://scc.pku.edu.cn/f/…",  // 原文链接
      "top": false,
      "firstSeen": "2026-10-21T14:51:02.000Z"
    }
  ]
}
```

## 八、常见问题

**数据加载失败 / 页面空白**
一定是直接双击了 `index.html`。请用 `npm run dev`，或者把它部署到网上再访问。

**抓取脚本报错、拿不到数据**
- 先确认能上网访问 `https://scc.pku.edu.cn/`；
- 就业网接口若调整，改 `scripts/api.mjs` 里的路径与参数即可（页面逻辑不受影响）；
- GitHub Actions 的服务器在境外，偶尔会访问慢或被限制。如果发现云端经常抓不到数据，就用「本机定时更新 + 手动推送」的方式。

**为什么没有「学历要求 / 专业」筛选？**
就业网列表接口不返回这些字段（详情页里不少单位只用图片放简章），所以没法稳定提取。页面的筛选基于标题、企业名、单位性质和标签推测，点「原文」能看到完整要求。

**数据太多了看着乱**
用「适合我的」：在「我的关注」里填几个关键词（比如 `算法 产品 国企 北京`）和关注标签，再点顶部的「适合我的」，页面只留相关机会。

**「加入日程」和「导出日历」有什么区别？**
卡片右侧的日历图标只是把这条加入本页的「我的日程」，方便你对照时间；它不会自动写进手机日历。点侧栏「我的日程 → 查看」能看二分详情（左列表 / 右详情）、移出单条，或「导出 .ics」一次性写进系统日历。

侧栏「未来 7 天日程」是一排日历：从今天起 7 天，只有你**已加入日程**的日期才会显示圆点和数量，没有安排的日期只留灰色日期数字，不显示提示。点有安排的日期可直接打开当天的日程。

冲突提示分两级：

- **红色「时间冲突」**：两场宣讲会的起止时间重叠，会算重叠分钟数。点「加入日程」时就会先检查，如果和已加入的宣讲会冲突，会弹窗列出重叠场次和分钟数，选「取消」不加入，选「仍然加入」才写入；
- **黄色「同日截止」**：两条招聘/实习在同一天截止，提醒你集中投递。添加时只用 toast 轻提示，不阻断。就业网很多岗位的截止日是平台默认日期（如 12-30），这类同日只作提醒，不代表真的冲突。

## 九、合规与免责

- 本项目只读取**无需登录即可访问的公开列表**，不模拟登录、不抓取简历或任何个人数据。
- 请求是串行且带间隔的，每 6 小时一轮，不会对学校服务器造成压力。请勿把频率改得过高。
- 这是学生自制的**非官方**页面，信息可能有延迟或偏差，一切以就业网原文和学校通知为准。
- 页面上所有内容均保留原文链接并注明来源；如需删除某条数据，请联系维护者。

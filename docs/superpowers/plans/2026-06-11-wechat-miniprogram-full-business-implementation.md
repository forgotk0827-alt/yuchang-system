# 微信小程序全业务闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将煜昌电器改善提案系统交付为微信小程序完整业务闭环，覆盖员工提交、审批、积分、兑换、后台管理、报表、日志、年度清零和生产部署准备。

**Architecture:** 保留原生微信小程序作为正式前端，现有 Node.js HTTP 服务作为 API 后端。先建立可测试的业务核心和接口契约，再逐步补齐小程序页面、上传、管理、报表与部署配置。

**Tech Stack:** Node.js 18+、原生微信小程序、`node:test`、`assert/strict`、`xlsx`、JSON 数据库原型，生产前迁移 SQLite 或 MySQL。

---

## 文件结构

### 后端

- Modify: `package.json`  
  增加测试、语法检查、开发启动脚本。

- Modify: `server.js`  
  作为现有入口继续保留，逐步瘦身为 HTTP 路由装配入口。

- Create: `src/config.js`  
  保存角色、状态、提案等级、积分类型、礼品默认值、评审委员会名单、上传限制。

- Create: `src/db.js`  
  负责数据目录初始化、JSON 数据库读写、迁移、种子数据、礼品同步、评审委员会同步。

- Create: `src/auth.js`  
  负责密码哈希、登录、Token 读取、当前用户鉴权、角色判断。

- Create: `src/audit.js`  
  负责操作日志和站内通知。

- Create: `src/points.js`  
  负责积分计算、积分分配、积分流水、年度清零。

- Create: `src/proposals.js`  
  负责提案输入校验、状态流转、可见范围、审批动作、附件权限。

- Create: `src/redemptions.js`  
  负责礼品目录、库存预占、兑换审核、发放登记、库存释放、积分扣减。

- Create: `src/imports.js`  
  负责 Excel/CSV 员工导入解析、字段映射、部门创建、账号密码初始化。

- Create: `src/reports.js`  
  负责小程序报表聚合数据。

- Create: `src/http.js`  
  负责 JSON 响应、错误响应、请求体读取、multipart 解析、静态文件服务。

- Create: `src/routes.js`  
  负责 `/api/*` 路由分发，调用各业务模块。

- Create: `tests/helpers.js`  
  提供临时数据库、测试客户端、登录助手、断言助手。

- Create: `tests/auth.test.js`  
  覆盖工号登录、默认密码、禁用用户、Token 鉴权。

- Create: `tests/proposals.test.js`  
  覆盖草稿、重新编辑、删除限制、审批状态流转、焦点课题权限、积分发放时机。

- Create: `tests/points.test.js`  
  覆盖普通提案、财务创效、水平展开、焦点课题、优秀案例、月度激励、年度清零。

- Create: `tests/redemptions.test.js`  
  覆盖兑换申请、库存预占、驳回释放、通过扣分、发放登记。

- Create: `tests/imports.test.js`  
  覆盖员工 Excel/CSV 字段映射、离职禁用、部门自动创建、评审委员会标记。

- Create: `tests/reports.test.js`  
  覆盖部门统计、积分排行、兑换汇总、库存汇总、日志只读。

### 小程序

- Modify: `miniprogram/app.js`  
  统一 `baseUrl`、登录态、全局品牌色、当前用户刷新。

- Modify: `miniprogram/app.json`  
  增加管理、审批、上传、报表、日志、密码页路由。

- Modify: `miniprogram/app.wxss`  
  统一 PANTONE 286C 色彩系统、按钮、表单、列表、状态标签。

- Modify: `miniprogram/utils/api.js`  
  增加 `uploadFile`、统一错误处理、loading、权限跳转。

- Create: `miniprogram/utils/auth.js`  
  提供角色判断、管理权限判断、审批权限判断。

- Create: `miniprogram/utils/format.js`  
  提供日期、积分、金额、状态展示格式化。

- Modify: `miniprogram/pages/dashboard/*`  
  工作台展示待办、通知、提案摘要、积分摘要、管理快捷入口。

- Modify: `miniprogram/pages/proposals/*`  
  我的提案、草稿、待我审批列表、筛选、进入编辑、删除草稿。

- Modify: `miniprogram/pages/proposal-form/*`  
  新建/编辑/驳回重提、附件上传、参与人、财务创效、焦点课题字段。

- Modify: `miniprogram/pages/proposal-detail/*`  
  详情、审批记录、积分拆分、附件、部门评估、财务复核、精益办复审、评审委员会核准。

- Modify: `miniprogram/pages/points/*`  
  积分账户、流水、规则、人工奖扣、年度清零记录。

- Modify: `miniprogram/pages/redemptions/*`  
  礼品目录、兑换申请、我的兑换、审核、发放登记。

- Modify: `miniprogram/pages/profile/*`  
  个人信息、角色、评审委员会身份、管理中心、修改密码、退出。

- Create: `miniprogram/pages/admin/admin.*`  
  管理中心入口页。

- Create: `miniprogram/pages/admin-users/admin-users.*`  
  员工管理、角色设置、账号状态。

- Create: `miniprogram/pages/admin-import/admin-import.*`  
  Excel 上传导入、导入结果展示。

- Create: `miniprogram/pages/admin-gifts/admin-gifts.*`  
  礼品维护、库存、季度目录版本。

- Create: `miniprogram/pages/admin-reports/admin-reports.*`  
  报表中心。

- Create: `miniprogram/pages/admin-logs/admin-logs.*`  
  操作日志。

- Create: `miniprogram/pages/change-password/change-password.*`  
  修改密码。

---

## 开发任务

### Task 1: 建立后端测试与模块边界

**Files:**
- Modify: `package.json`
- Create: `src/config.js`
- Create: `src/http.js`
- Create: `tests/helpers.js`
- Modify: `server.js`

- [ ] **Step 1: 增加测试脚本**

在 `package.json` 中增加：

```json
{
  "scripts": {
    "dev": "node server.js",
    "test": "node --test tests/*.test.js",
    "check": "node --check server.js && node --check src/*.js && node --check tests/*.js"
  }
}
```

- [ ] **Step 2: 创建配置模块**

创建 `src/config.js`：

```js
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const ROLES = {
  employee: "普通员工",
  dept: "部门评估组",
  finance: "财务复核",
  lean: "精益办复审",
  admin: "超级管理员"
};

const STATUS = {
  draft: "草稿",
  pendingDept: "待部门评估组初评",
  deptRejected: "部门评估组驳回",
  pendingFinance: "待财务复核",
  financeRejected: "财务复核驳回",
  pendingLean: "待精益办复审",
  leanRejected: "精益办复审驳回",
  pendingCommittee: "待评审委员会核准",
  committeeRejected: "评审委员会驳回",
  reviewingAgain: "重审中",
  invalidClosed: "无效关闭",
  archived: "已归档"
};

const PROPOSAL_LEVELS = ["四级", "三级", "二级", "一级"];
const PROPOSAL_EVALUATION_TYPES = ["正常改善", "纠错", "复原", "对标"];
const PROJECT_TYPES = ["普通改善提案", "有效焦点课题"];
const REVIEW_COMMITTEE_NAMES = ["黄晓鹏", "邵海波", "刘佛生", "钱利民"];

const FOCUS_TOPIC_SCALES = {
  large: { label: "大型课题", leader: 7000, core: 1000, maxCoreMembers: 3 },
  medium: { label: "中型课题", leader: 2000, core: 500, maxCoreMembers: 3 },
  small: { label: "小型课题", leader: 300, core: 0, maxCoreMembers: 0 }
};

module.exports = {
  ROOT,
  DATA_DIR: path.join(ROOT, "data"),
  PUBLIC_DIR: path.join(ROOT, "public"),
  UPLOAD_DIR: path.join(ROOT, "data", "uploads"),
  DB_PATH: path.join(ROOT, "data", "db.json"),
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024,
  ALLOWED_UPLOAD_EXT: new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".txt"]),
  ROLES,
  STATUS,
  PROPOSAL_LEVELS,
  PROPOSAL_EVALUATION_TYPES,
  PROJECT_TYPES,
  REVIEW_COMMITTEE_NAMES,
  FOCUS_TOPIC_SCALES
};
```

- [ ] **Step 3: 创建 HTTP 工具模块**

从 `server.js` 移出 `send`、`sendJson`、`sendError`、`readBody`、`readBuffer`、`parseMultipart`、`serveStatic` 到 `src/http.js`，导出同名函数。保留行为不变。

- [ ] **Step 4: 创建测试助手**

创建 `tests/helpers.js`：

```js
const assert = require("assert/strict");
const http = require("http");

async function requestJson(port, path, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (body) headers["Content-Length"] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path,
      method: options.method || "GET",
      headers
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const data = text ? JSON.parse(text) : {};
        resolve({ status: res.statusCode, data });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(port, account, password) {
  const res = await requestJson(port, "/api/login", { method: "POST", body: { account, password } });
  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  return res.data.token;
}

module.exports = { requestJson, login };
```

- [ ] **Step 5: 验证重构未破坏启动**

Run:

```bash
npm run check
npm run dev
```

Expected:

```text
server listening on http://localhost:3000
```

- [ ] **Step 6: 提交**

```bash
git add package.json server.js src/config.js src/http.js tests/helpers.js
git commit -m "chore: add backend test harness"
```

### Task 2: 认证、权限与账号规则

**Files:**
- Create: `src/auth.js`
- Create: `tests/auth.test.js`
- Modify: `src/routes.js`
- Modify: `server.js`

- [ ] **Step 1: 编写认证测试**

创建 `tests/auth.test.js`：

```js
const test = require("node:test");
const assert = require("assert/strict");
const { requestJson, login } = require("./helpers");

test("员工使用工号和工号加@登录", async () => {
  const port = Number(process.env.TEST_PORT || 3101);
  const token = await login(port, "A001", "A001@");
  assert.equal(typeof token, "string");
});

test("错误密码返回 401", async () => {
  const port = Number(process.env.TEST_PORT || 3101);
  const res = await requestJson(port, "/api/login", {
    method: "POST",
    body: { account: "A001", password: "123456" }
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.error, "账号或密码错误");
});

test("未登录访问 /api/me 返回 401", async () => {
  const port = Number(process.env.TEST_PORT || 3101);
  const res = await requestJson(port, "/api/me");
  assert.equal(res.status, 401);
});
```

- [ ] **Step 2: 实现认证模块**

创建 `src/auth.js`：

```js
const crypto = require("crypto");
const { ROLES } = require("./config");

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return "";
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function findLoginUser(db, account, password) {
  return db.users.find((user) => {
    const sameAccount = user.employeeNo === account || user.phone === account;
    return sameAccount && user.passwordHash === hashPassword(password) && user.status !== "禁用";
  });
}

function createSession(db, userId) {
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions[token] = { userId, createdAt: new Date().toISOString() };
  return token;
}

function auth(req, db) {
  const token = getToken(req);
  const session = token && db.sessions[token];
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId && user.status !== "禁用") || null;
}

function canAdmin(user) {
  return user?.role === ROLES.admin;
}

function canLean(user) {
  return user?.role === ROLES.lean || canAdmin(user);
}

function canFinance(user) {
  return user?.role === ROLES.finance || canAdmin(user);
}

function canCommittee(user) {
  return Boolean(user?.isReviewCommittee || canLean(user));
}

module.exports = { hashPassword, getToken, publicUser, findLoginUser, createSession, auth, canAdmin, canLean, canFinance, canCommittee };
```

- [ ] **Step 3: 接入路由**

在 `src/routes.js` 的 `/api/login` 使用 `findLoginUser` 和 `createSession`，返回：

```js
sendJson(res, {
  token,
  user: publicUser(user)
});
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 5: 提交**

```bash
git add src/auth.js src/routes.js server.js tests/auth.test.js
git commit -m "feat: enforce employee login policy"
```

### Task 3: 提案状态机与审批闭环

**Files:**
- Create: `src/proposals.js`
- Create: `tests/proposals.test.js`
- Modify: `src/routes.js`

- [ ] **Step 1: 编写提案流程测试**

创建 `tests/proposals.test.js`，覆盖以下断言：

```js
const test = require("node:test");
const assert = require("assert/strict");
const { requestJson, login } = require("./helpers");

function proposalPayload(action = "submit") {
  return {
    action,
    title: "工装定位改善",
    projectType: "普通改善提案",
    category: "效率提升",
    benefitType: "非财务创效",
    evaluationType: "正常改善",
    level: "三级",
    background: "定位依赖人工经验，返工率高",
    content: "增加定位治具并统一作业方法",
    measures: "制作治具，培训班组",
    expectedBenefit: "减少返工",
    actualBenefit: "返工率下降",
    participants: []
  };
}

test("草稿可以编辑和删除，提交后不可删除", async () => {
  const port = Number(process.env.TEST_PORT || 3101);
  const token = await login(port, "A001", "A001@");
  const headers = { Authorization: `Bearer ${token}` };

  const created = await requestJson(port, "/api/proposals", { method: "POST", headers, body: proposalPayload("draft") });
  assert.equal(created.status, 200);
  assert.equal(created.data.status, "草稿");

  const deleted = await requestJson(port, `/api/proposals/${created.data.id}`, { method: "DELETE", headers });
  assert.equal(deleted.status, 200);

  const submitted = await requestJson(port, "/api/proposals", { method: "POST", headers, body: proposalPayload("submit") });
  assert.equal(submitted.data.status, "待部门评估组初评");

  const blocked = await requestJson(port, `/api/proposals/${submitted.data.id}`, { method: "DELETE", headers });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.data.error, "只允许删除草稿");
});

test("纠错复原对标类提案关闭为无效", async () => {
  const port = Number(process.env.TEST_PORT || 3101);
  const employeeToken = await login(port, "A001", "A001@");
  const reviewerToken = await login(port, "D001", "D001@");
  const created = await requestJson(port, "/api/proposals", {
    method: "POST",
    headers: { Authorization: `Bearer ${employeeToken}` },
    body: proposalPayload("submit")
  });

  const reviewed = await requestJson(port, `/api/proposals/${created.data.id}/dept-review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${reviewerToken}` },
    body: { result: "approve", opinion: "属于纠错事项", evaluationType: "纠错", onSiteConfirmed: true }
  });

  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.data.status, "无效关闭");
});
```

- [ ] **Step 2: 实现提案服务**

`src/proposals.js` 必须导出：

```js
module.exports = {
  proposalInputFromBody,
  visibleProposals,
  enrichProposal,
  canViewProposal,
  canEditProposal,
  canDeleteProposal,
  canDeptReview,
  applyDeptReview,
  applyFinanceReview,
  applyLeanReview,
  applyCommitteeReview
};
```

关键规则：

```js
function canDeleteProposal(user, proposal) {
  return proposal.status === "草稿" && proposal.submitterId === user.id;
}

function nextAfterDeptReview(proposal) {
  if (["纠错", "复原", "对标"].includes(proposal.evaluationType)) return "无效关闭";
  if (proposal.benefitType === "财务创效") return "待财务复核";
  return "待精益办复审";
}

function nextAfterLeanReview(proposal) {
  return ["一级", "二级"].includes(proposal.rewardLevel || proposal.level)
    ? "待评审委员会核准"
    : "已归档";
}
```

- [ ] **Step 3: 接入路由**

`src/routes.js` 保留以下接口：

```text
GET    /api/proposals
POST   /api/proposals
GET    /api/proposals/:id
PUT    /api/proposals/:id
DELETE /api/proposals/:id
POST   /api/proposals/:id/dept-review
POST   /api/proposals/:id/finance-review
POST   /api/proposals/:id/lean-review
POST   /api/proposals/:id/committee-review
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 5: 提交**

```bash
git add src/proposals.js src/routes.js tests/proposals.test.js
git commit -m "feat: complete proposal workflow service"
```

### Task 4: 积分计算、积分流水与年度清零

**Files:**
- Create: `src/points.js`
- Create: `tests/points.test.js`
- Modify: `src/routes.js`

- [ ] **Step 1: 编写积分测试**

创建 `tests/points.test.js`：

```js
const test = require("node:test");
const assert = require("assert/strict");
const {
  calculateProposalPointBreakdown,
  calculateFinancePoints,
  clearAnnualAvailablePoints
} = require("../src/points");

test("财务创效积分按分段公式计算", () => {
  assert.equal(calculateFinancePoints(2000), 20);
  assert.equal(calculateFinancePoints(20000), 380);
  assert.equal(calculateFinancePoints(30000), 680);
});

test("水平展开案例至少降低一级奖励", () => {
  const breakdown = calculateProposalPointBreakdown({
    projectType: "普通改善提案",
    level: "二级",
    rewardLevel: "三级",
    benefitType: "非财务创效",
    participants: [
      { userId: "u1", role: "提出人", ratio: 30 },
      { userId: "u2", role: "实施人", ratio: 70 }
    ]
  });
  assert.equal(breakdown.find((item) => item.type === "案例价值积分").points, 100);
});

test("年度清零只清可用积分并保留历史流水", () => {
  const db = {
    pointAccounts: [{ userId: "u1", available: 500, earned: 800, redeemed: 300 }],
    pointLedgers: []
  };
  clearAnnualAvailablePoints(db, "admin", "2026-05-01T24:00:00+08:00");
  assert.equal(db.pointAccounts[0].available, 0);
  assert.equal(db.pointAccounts[0].earned, 800);
  assert.equal(db.pointLedgers[0].type, "年度清零");
  assert.equal(db.pointLedgers[0].points, -500);
});
```

- [ ] **Step 2: 实现积分模块**

`src/points.js` 必须导出：

```js
module.exports = {
  calculateFinancePoints,
  calculateProposalPointBreakdown,
  distributeProposalPoints,
  addLedger,
  clearAnnualAvailablePoints
};
```

核心公式：

```js
function calculateFinancePoints(amount) {
  const R = Number(amount || 0);
  if (R <= 0) return 0;
  if (R <= 2000) return Math.round(R * 0.01);
  if (R <= 20000) return Math.round(20 + (R - 2000) * 0.02);
  return Math.round(380 + (R - 20000) * 0.03);
}
```

- [ ] **Step 3: 审批归档时发放积分**

在 `applyLeanReview` 和 `applyCommitteeReview` 中，当状态变为 `已归档` 时调用：

```js
distributeProposalPoints(db, proposal, operator.id);
```

要求同一提案只发一次积分：

```js
if (proposal.pointsIssuedAt) return;
proposal.pointsIssuedAt = new Date().toISOString();
```

- [ ] **Step 4: 增加年度清零接口**

`src/routes.js` 增加：

```text
POST /api/points/annual-clear
GET  /api/points/annual-clears
```

仅 `精益办复审` 和 `超级管理员` 可执行。

- [ ] **Step 5: 验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 6: 提交**

```bash
git add src/points.js src/routes.js tests/points.test.js
git commit -m "feat: add points engine and annual clearing"
```

### Task 5: 附件、图片和 Excel 上传

**Files:**
- Modify: `src/http.js`
- Modify: `src/proposals.js`
- Modify: `src/imports.js`
- Modify: `src/routes.js`
- Modify: `miniprogram/utils/api.js`
- Modify: `miniprogram/pages/proposal-form/*`
- Create: `miniprogram/pages/admin-import/admin-import.js`
- Create: `miniprogram/pages/admin-import/admin-import.wxml`
- Create: `miniprogram/pages/admin-import/admin-import.wxss`
- Create: `miniprogram/pages/admin-import/admin-import.json`

- [ ] **Step 1: 后端接口契约**

保留并验证：

```text
POST /api/proposals/:id/attachments
GET  /api/attachments/:attachmentId
POST /api/import/employees
```

上传限制：

```js
const ALLOWED_UPLOAD_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".txt"]);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
```

- [ ] **Step 2: 小程序封装上传**

在 `miniprogram/utils/api.js` 增加：

```js
function upload(path, filePath, name = "file", formData = {}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${app.globalData.baseUrl}${path}`,
      filePath,
      name,
      formData,
      header: token() ? { Authorization: `Bearer ${token()}` } : {},
      success(res) {
        const data = res.data ? JSON.parse(res.data) : {};
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error || "上传失败"));
          return;
        }
        resolve(data);
      },
      fail() {
        reject(new Error("网络请求失败"));
      }
    });
  });
}
```

- [ ] **Step 3: 提案表单上传附件**

`proposal-form.js` 增加 `chooseAttachment`：

```js
async chooseAttachment() {
  const result = await wx.chooseMessageFile({ count: 3, type: "file" });
  const files = result.tempFiles || [];
  for (const file of files) {
    await upload(`/api/proposals/${this.data.id}/attachments`, file.path, "file");
  }
  toast("附件已上传");
  await this.load();
}
```

- [ ] **Step 4: 管理端导入员工**

`admin-import.js` 增加：

```js
async chooseEmployeeFile() {
  const result = await wx.chooseMessageFile({ count: 1, type: "file", extension: ["xls", "xlsx", "csv"] });
  const file = result.tempFiles[0];
  const data = await upload("/api/import/employees", file.path, "file");
  this.setData({ result: data });
  toast(`导入成功：${data.created} 新增，${data.updated} 更新`);
}
```

- [ ] **Step 5: 验证**

Run:

```bash
npm run check
for f in miniprogram/**/*.json miniprogram/*.json project.config.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || exit 1; done
for f in miniprogram/**/*.js miniprogram/*.js; do node --check "$f" || exit 1; done
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 6: 提交**

```bash
git add src/http.js src/proposals.js src/imports.js src/routes.js miniprogram/utils/api.js miniprogram/pages/proposal-form miniprogram/pages/admin-import
git commit -m "feat: add mini program upload flows"
```

### Task 6: 兑换、礼品库存和发放闭环

**Files:**
- Create: `src/redemptions.js`
- Create: `tests/redemptions.test.js`
- Modify: `src/routes.js`
- Modify: `miniprogram/pages/redemptions/*`
- Create: `miniprogram/pages/admin-gifts/admin-gifts.*`

- [ ] **Step 1: 编写兑换测试**

创建 `tests/redemptions.test.js`：

```js
const test = require("node:test");
const assert = require("assert/strict");
const { createRedemption, reviewRedemption, issueRedemption } = require("../src/redemptions");

test("提交兑换申请时预占库存但不立即扣积分", () => {
  const db = {
    gifts: [{ id: "g1", name: "抽纸", requiredPoints: 120, stockQty: 2, reservedQty: 0, status: "启用" }],
    pointAccounts: [{ userId: "u1", available: 200 }],
    redemptions: []
  };
  const redemption = createRedemption(db, { userId: "u1" }, { giftId: "g1", quantity: 1 });
  assert.equal(redemption.status, "待审核");
  assert.equal(db.gifts[0].reservedQty, 1);
  assert.equal(db.pointAccounts[0].available, 200);
});

test("审核驳回释放预占库存", () => {
  const db = {
    gifts: [{ id: "g1", name: "抽纸", requiredPoints: 120, stockQty: 2, reservedQty: 1, status: "启用" }],
    pointAccounts: [{ userId: "u1", available: 200 }],
    pointLedgers: [],
    redemptions: [{ id: "r1", userId: "u1", giftId: "g1", quantity: 1, requiredPoints: 120, status: "待审核" }]
  };
  reviewRedemption(db, { id: "admin" }, "r1", { result: "reject", opinion: "库存盘点异常" });
  assert.equal(db.redemptions[0].status, "已驳回");
  assert.equal(db.gifts[0].reservedQty, 0);
});
```

- [ ] **Step 2: 实现兑换服务**

`src/redemptions.js` 导出：

```js
module.exports = {
  createRedemption,
  reviewRedemption,
  issueRedemption,
  upsertGift,
  listGifts,
  listRedemptions
};
```

状态：

```js
const REDEMPTION_STATUS = {
  pending: "待审核",
  rejected: "已驳回",
  approved: "已通过",
  issued: "已发放",
  received: "已领取"
};
```

- [ ] **Step 3: 小程序兑换页补齐管理动作**

`redemptions.js` 中根据权限展示：

```js
canManageRedemptions(user) {
  return ["精益办复审", "超级管理员"].includes(user.role);
}
```

页面动作：

```text
普通员工：查看目录、提交兑换、查看本人记录。
精益办/管理员：查看待审核、审核通过、审核驳回、登记发放。
```

- [ ] **Step 4: 礼品维护页字段**

`admin-gifts` 表单字段：

```text
礼品名称、所需积分、参考价值、库存数量、季度目录版本、状态、说明。
```

- [ ] **Step 5: 验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 6: 提交**

```bash
git add src/redemptions.js src/routes.js tests/redemptions.test.js miniprogram/pages/redemptions miniprogram/pages/admin-gifts
git commit -m "feat: complete redemption and gift operations"
```

### Task 7: 小程序提案审批界面

**Files:**
- Modify: `miniprogram/pages/proposals/*`
- Modify: `miniprogram/pages/proposal-detail/*`
- Modify: `miniprogram/pages/proposal-form/*`
- Create: `miniprogram/utils/auth.js`
- Create: `miniprogram/utils/format.js`

- [ ] **Step 1: 权限工具**

创建 `miniprogram/utils/auth.js`：

```js
function role() {
  return (wx.getStorageSync("yc_user") || {}).role || "";
}

function currentUser() {
  return wx.getStorageSync("yc_user") || {};
}

function canLean() {
  return ["精益办复审", "超级管理员"].includes(role());
}

function canFinance() {
  return ["财务复核", "超级管理员"].includes(role());
}

function canCommittee() {
  const user = currentUser();
  return Boolean(user.isReviewCommittee || canLean());
}

function canAdmin() {
  return role() === "超级管理员";
}

module.exports = { currentUser, canLean, canFinance, canCommittee, canAdmin };
```

- [ ] **Step 2: 格式化工具**

创建 `miniprogram/utils/format.js`：

```js
function points(value) {
  return `${Number(value || 0)}分`;
}

function money(value) {
  return `￥${Number(value || 0).toFixed(0)}`;
}

function statusTone(status) {
  if (!status) return "neutral";
  if (status.includes("驳回") || status.includes("无效")) return "danger";
  if (status.includes("待")) return "warning";
  return "success";
}

module.exports = { points, money, statusTone };
```

- [ ] **Step 3: 提案列表分组**

`proposals.js` 增加筛选：

```js
tabs: [
  { key: "mine", label: "我的提案" },
  { key: "draft", label: "草稿" },
  { key: "pending", label: "待我审批" }
]
```

点击草稿进入：

```js
editDraft(event) {
  wx.navigateTo({ url: `/pages/proposal-form/proposal-form?id=${event.currentTarget.dataset.id}` });
}
```

删除草稿：

```js
async deleteDraft(event) {
  const id = event.currentTarget.dataset.id;
  const res = await wx.showModal({ title: "删除草稿", content: "确认删除该草稿？" });
  if (!res.confirm) return;
  await request(`/api/proposals/${id}`, { method: "DELETE" });
  toast("草稿已删除");
  this.load();
}
```

- [ ] **Step 4: 详情页审批表单**

`proposal-detail.wxml` 按状态展示：

```text
待部门评估组初评：现场确认、评定类型、原始等级、水平展开、审批意见、通过/驳回。
待财务复核：财务金额、核算附件、审批意见、通过/驳回。
待精益办复审：奖励等级、是否优秀案例、审批意见、通过/驳回。
待评审委员会核准：审批意见、通过/驳回。
```

- [ ] **Step 5: 验证**

Run:

```bash
for f in miniprogram/**/*.json miniprogram/*.json project.config.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || exit 1; done
for f in miniprogram/**/*.js miniprogram/*.js; do node --check "$f" || exit 1; done
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 6: 提交**

```bash
git add miniprogram/utils/auth.js miniprogram/utils/format.js miniprogram/pages/proposals miniprogram/pages/proposal-detail miniprogram/pages/proposal-form
git commit -m "feat: add mini program proposal review screens"
```

### Task 8: 后台管理、报表和日志

**Files:**
- Create: `src/reports.js`
- Create: `tests/reports.test.js`
- Modify: `src/audit.js`
- Modify: `src/routes.js`
- Create: `miniprogram/pages/admin/admin.*`
- Create: `miniprogram/pages/admin-users/admin-users.*`
- Create: `miniprogram/pages/admin-reports/admin-reports.*`
- Create: `miniprogram/pages/admin-logs/admin-logs.*`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/profile/*`
- Modify: `miniprogram/pages/dashboard/*`

- [ ] **Step 1: 编写报表测试**

创建 `tests/reports.test.js`：

```js
const test = require("node:test");
const assert = require("assert/strict");
const { buildReports } = require("../src/reports");

test("报表返回部门、积分、兑换和库存汇总", () => {
  const db = {
    departments: [{ id: "d1", name: "制造部" }],
    users: [{ id: "u1", name: "张三", deptId: "d1" }],
    proposals: [{ id: "p1", deptId: "d1", status: "已归档" }],
    pointAccounts: [{ userId: "u1", available: 100, earned: 200 }],
    redemptions: [{ id: "r1", giftId: "g1", status: "已通过", requiredPoints: 120 }],
    gifts: [{ id: "g1", name: "抽纸", stockQty: 10, reservedQty: 1 }]
  };
  const reports = buildReports(db);
  assert.equal(reports.proposalsByDepartment[0].department, "制造部");
  assert.equal(reports.pointsRanking[0].name, "张三");
  assert.equal(reports.giftStock[0].availableStock, 9);
});
```

- [ ] **Step 2: 实现报表模块**

`src/reports.js` 导出：

```js
module.exports = { buildReports };
```

返回结构：

```js
{
  proposalsByDepartment: [],
  proposalsByStatus: [],
  pointsByDepartment: [],
  pointsRanking: [],
  redemptionSummary: [],
  giftStock: []
}
```

- [ ] **Step 3: 后端管理接口**

`src/routes.js` 增加：

```text
GET  /api/admin/users
PUT  /api/admin/users/:id
GET  /api/admin/departments
POST /api/admin/departments
GET  /api/reports
GET  /api/logs
GET  /api/notifications
POST /api/notifications/:id/read
```

- [ ] **Step 4: 小程序管理中心**

`admin` 页入口：

```text
员工管理、组织导入、礼品管理、报表中心、操作日志、系统配置。
```

入口权限：

```js
const user = wx.getStorageSync("yc_user") || {};
const isManager = ["精益办复审", "超级管理员"].includes(user.role);
```

- [ ] **Step 5: 验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 6: 提交**

```bash
git add src/reports.js src/audit.js src/routes.js tests/reports.test.js miniprogram/app.json miniprogram/pages/admin miniprogram/pages/admin-users miniprogram/pages/admin-reports miniprogram/pages/admin-logs miniprogram/pages/profile miniprogram/pages/dashboard
git commit -m "feat: add mini program admin center"
```

### Task 9: 修改密码、Token 过期和基础安全

**Files:**
- Modify: `src/auth.js`
- Modify: `src/routes.js`
- Create: `miniprogram/pages/change-password/change-password.js`
- Create: `miniprogram/pages/change-password/change-password.wxml`
- Create: `miniprogram/pages/change-password/change-password.wxss`
- Create: `miniprogram/pages/change-password/change-password.json`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/profile/*`

- [ ] **Step 1: 后端安全规则**

Token 会话结构：

```js
{
  userId: "u1",
  createdAt: "2026-06-11T00:00:00.000Z",
  expiresAt: "2026-06-18T00:00:00.000Z"
}
```

密码修改接口：

```text
POST /api/change-password
```

请求：

```json
{
  "oldPassword": "A001@",
  "newPassword": "NewPass2026@"
}
```

校验：

```text
旧密码必须正确。
新密码长度至少 8 位。
新密码必须包含字母、数字或符号中的两类。
修改成功后清除当前用户其他 Token。
```

- [ ] **Step 2: 小程序修改密码页**

`change-password.js` 提交：

```js
async submit() {
  const { oldPassword, newPassword, confirmPassword } = this.data.form;
  if (newPassword !== confirmPassword) {
    toast("两次输入的新密码不一致");
    return;
  }
  await request("/api/change-password", {
    method: "POST",
    data: { oldPassword, newPassword }
  });
  toast("密码已修改，请重新登录");
  wx.removeStorageSync("yc_token");
  wx.removeStorageSync("yc_user");
  wx.reLaunch({ url: "/pages/login/login" });
}
```

- [ ] **Step 3: 验证**

Run:

```bash
npm run check
for f in miniprogram/**/*.json miniprogram/*.json project.config.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || exit 1; done
for f in miniprogram/**/*.js miniprogram/*.js; do node --check "$f" || exit 1; done
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 4: 提交**

```bash
git add src/auth.js src/routes.js miniprogram/app.json miniprogram/pages/change-password miniprogram/pages/profile
git commit -m "feat: add password change and session expiry"
```

### Task 10: 小程序 UI 统一和移动端可用性检查

**Files:**
- Modify: `miniprogram/app.wxss`
- Modify: `miniprogram/pages/**/*.wxss`
- Modify: `miniprogram/pages/**/*.wxml`

- [ ] **Step 1: 统一设计变量**

`miniprogram/app.wxss` 增加：

```css
page {
  --brand: #0033A1;
  --brand-pressed: #00277A;
  --brand-soft: #EAF0FF;
  --text: #142033;
  --muted: #64748B;
  --line: #DCE4F2;
  --bg: #F2F6FF;
  --success: #168A4A;
  --warning: #B7791F;
  --danger: #C2410C;
  background: var(--bg);
  color: var(--text);
  font-size: 28rpx;
}

.primary-button {
  min-height: 88rpx;
  border-radius: 12rpx;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}
```

- [ ] **Step 2: 页面布局标准**

所有业务页采用：

```text
页面顶部：核心摘要或筛选。
中部：列表、表单或审批内容。
底部：固定主要操作按钮，仅用于提交、保存、审核。
```

- [ ] **Step 3: 小屏检查**

在微信开发者工具模拟：

```text
iPhone SE
iPhone 15
Android 1080x2400
```

检查项：

```text
按钮文字不换行溢出。
审批表单输入框可完整填写。
底部按钮不遮挡表单最后一项。
状态标签不与标题重叠。
列表项点击区域不小于 88rpx 高。
```

- [ ] **Step 4: 验证**

Run:

```bash
for f in miniprogram/**/*.json miniprogram/*.json project.config.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || exit 1; done
for f in miniprogram/**/*.js miniprogram/*.js; do node --check "$f" || exit 1; done
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 5: 提交**

```bash
git add miniprogram/app.wxss miniprogram/pages
git commit -m "style: polish mini program mobile UI"
```

### Task 11: 数据库迁移准备和生产部署清单

**Files:**
- Create: `docs/deployment/wechat-miniprogram-release-checklist.md`
- Create: `docs/deployment/data-migration-plan.md`
- Modify: `README.md`
- Modify: `project.config.json`

- [ ] **Step 1: 发布检查清单**

创建 `docs/deployment/wechat-miniprogram-release-checklist.md`，包含：

```markdown
# 微信小程序发布检查清单

## 客户需提供

- 正式微信小程序 AppID。
- 已备案公网域名。
- HTTPS SSL 证书。
- 可部署 Node.js 18+ 的服务器。
- 服务器 SSH 或面板发布方式。
- 微信公众平台管理员扫码权限。

## 微信后台配置

- request 合法域名：`https://客户域名`
- uploadFile 合法域名：`https://客户域名`
- downloadFile 合法域名：`https://客户域名`

## 上线前验证

- 工号登录成功。
- 员工导入成功。
- 普通提案从提交到归档成功。
- 财务创效提案经过财务复核。
- 一级/二级提案经过评审委员会核准。
- 积分到账生成流水。
- 兑换申请预占库存。
- 兑换审核通过后扣分。
- 礼品发放状态正确。
- 年度清零记录正确。
- 操作日志可追溯。
```

- [ ] **Step 2: 数据迁移计划**

创建 `docs/deployment/data-migration-plan.md`，明确：

```markdown
# 数据迁移计划

## 原型阶段

当前使用 `data/db.json`，适合演示和小规模试运行。

## 正式阶段

推荐 MySQL。表结构按以下业务对象设计：

- users
- departments
- sessions
- proposals
- proposal_approvals
- proposal_attachments
- point_accounts
- point_ledgers
- gifts
- redemptions
- notifications
- operation_logs
- annual_clears

## 迁移原则

- 先冻结 JSON 数据写入。
- 导出 JSON 备份。
- 执行一次性导入脚本。
- 对账用户数、提案数、积分账户余额、积分流水数量、兑换记录数量。
- 切换生产服务连接到 MySQL。
```

- [ ] **Step 3: README 更新**

`README.md` 增加：

```markdown
## 微信小程序开发

1. 启动后端：`npm run dev`
2. 使用微信开发者工具打开项目根目录。
3. 开发环境后端地址：`http://127.0.0.1:3000`
4. 模拟登录账号：工号
5. 初始密码：工号后加 `@`
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run check
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 5: 提交**

```bash
git add README.md project.config.json docs/deployment/wechat-miniprogram-release-checklist.md docs/deployment/data-migration-plan.md
git commit -m "docs: add mini program release checklist"
```

### Task 12: 全量验收和 GitHub 推送

**Files:**
- Verify: all project files

- [ ] **Step 1: 清理工作区**

Run:

```bash
git status --short
```

Expected:

```text
No unrelated generated files staged
```

- [ ] **Step 2: 后端验证**

Run:

```bash
npm run check
TEST_PORT=3101 npm test
```

Expected:

```text
pass
```

- [ ] **Step 3: 小程序文件验证**

Run:

```bash
for f in miniprogram/**/*.json miniprogram/*.json project.config.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || exit 1; done
for f in miniprogram/**/*.js miniprogram/*.js; do node --check "$f" || exit 1; done
```

Expected:

```text
No output and exit code 0
```

- [ ] **Step 4: 本地接口冒烟**

Run:

```bash
npm run dev
```

另开终端验证：

```bash
curl -s -X POST http://127.0.0.1:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"account":"A001","password":"A001@"}'
```

Expected:

```json
{
  "token": "非空字符串",
  "user": {
    "employeeNo": "A001"
  }
}
```

- [ ] **Step 5: 微信开发者工具验收**

手工验收路径：

```text
登录 -> 工作台 -> 新建草稿 -> 进入草稿编辑 -> 删除草稿
登录 -> 新建提案 -> 部门评估 -> 财务复核或精益办复审 -> 评审委员会核准 -> 积分到账
登录 -> 兑换礼品 -> 审核通过 -> 发放登记
登录 -> 管理中心 -> 员工导入 -> 礼品维护 -> 报表 -> 日志
登录 -> 我的 -> 修改密码 -> 重新登录
```

- [ ] **Step 6: 推送到 GitHub**

Run:

```bash
git status --short
git remote -v
git push origin main
```

Expected:

```text
To github.com:forgotk0827-alt/yuchang-system.git
```

---

## 自检结果

### 需求覆盖

- 员工提交、草稿编辑、草稿删除、审批进度：Task 3、Task 7。
- 部门评估、财务复核、精益办复审、评审委员会核准：Task 3、Task 7。
- 积分自动计算和积分流水：Task 4。
- 有效焦点课题：Task 3、Task 4、Task 7。
- 礼品目录、库存预占、兑换审核、发放登记：Task 6。
- 员工与组织 Excel 导入：Task 5、Task 8。
- 礼品维护：Task 6、Task 8。
- 报表、排行和操作日志：Task 8。
- 年度积分清零：Task 4。
- 站内通知：Task 8。
- 修改密码和 Token 过期：Task 9。
- 小程序移动端体验：Task 10。
- 生产部署准备：Task 11。

### 执行策略

每个任务都应单独提交。执行时优先保持接口向后兼容，确保 PC 网页仍可作为调试入口，但所有新增业务闭环以微信小程序为准。

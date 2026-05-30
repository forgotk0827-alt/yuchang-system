const state = {
  token: localStorage.getItem("yc_token") || "",
  user: null,
  bootstrap: null,
  route: "dashboard",
};

const navItems = [
  { id: "dashboard", label: "工作台", subtitle: "待办、通知和关键指标", icon: "dashboard" },
  { id: "proposals", label: "改善提案", subtitle: "提交、审批与复审闭环", icon: "proposal" },
  { id: "points", label: "积分账户", subtitle: "余额、流水和人工调整", icon: "points" },
  { id: "redemptions", label: "积分兑换", subtitle: "礼品库存、兑换审核与发放", icon: "gift" },
  { id: "reports", label: "统计报表", subtitle: "部门提案和员工积分排行", icon: "chart" },
  { id: "admin", label: "系统管理", subtitle: "组织导入模板和日志审计", icon: "settings" },
];

const icons = {
  dashboard: '<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/></svg>',
  proposal: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12v2h8v-2H8Zm0 4v2h8v-2H8Z"/></svg>',
  points: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v2.1c1.8.3 3 1.3 3 2.8 0 1.9-1.6 2.6-3.6 3.1-1.4.3-1.9.6-1.9 1.2s.6 1 1.8 1c1.1 0 2-.3 2.9-.8l.7 1.8c-.7.5-1.7.8-2.9.9V21h-2v-2c-1.7-.3-3-1.2-3.5-2.7l1.9-.8c.4 1 1.4 1.6 2.8 1.6 1.2 0 1.9-.4 1.9-1s-.4-.9-2.1-1.3c-1.9-.5-3.3-1.2-3.3-3s1.3-2.6 3.2-2.9V7h2Z"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><path d="M20 7h-2.2A3 3 0 0 0 12 4.9 3 3 0 0 0 6.2 7H4a2 2 0 0 0-2 2v3h20V9a2 2 0 0 0-2-2Zm-10 0H8.9A1 1 0 1 1 10 5.9V7Zm5.1 0H14V5.9A1 1 0 1 1 15.1 7ZM3 14v6a2 2 0 0 0 2 2h6v-8H3Zm10 8h6a2 2 0 0 0 2-2v-6h-8v8Z"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.6A8 8 0 0 0 7 6.1l-2.4-1-2 3.4 2 1.5-.1 1.5.1 1.5-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"/></svg>',
};

const $ = (selector) => document.querySelector(selector);
const main = $("#main");

function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return fetch(path, { ...options, headers }).then(async (res) => {
    if (res.status === 401) {
      logout(false);
      throw new Error("登录已失效");
    }
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error(body.error || body || "请求失败");
    return body;
  });
}

async function uploadFiles(proposalId, files) {
  if (!files || !files.length) return [];
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));
  const result = await api(`/api/proposals/${proposalId}/attachments`, { method: "POST", body: formData });
  return result.attachments || [];
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function statusClass(status) {
  if (!status) return "";
  if (status.includes("驳回")) return "danger";
  if (status.includes("待")) return "warn";
  if (status.includes("通过") || status.includes("归档")) return "done";
  return "";
}

function money(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function authUrl(path) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}access_token=${encodeURIComponent(state.token)}`;
}

function roleCan(...roles) {
  return state.user && roles.includes(state.user.role);
}

function showLogin() {
  $('[data-view="login"]').classList.remove("hidden");
  $('[data-view="main"]').classList.add("hidden");
}

function showMain() {
  $('[data-view="login"]').classList.add("hidden");
  $('[data-view="main"]').classList.remove("hidden");
}

function setPage(item) {
  $("#pageTitle").textContent = item.label;
  $("#pageSubtitle").textContent = item.subtitle;
}

function renderNav() {
  const nav = $("#nav");
  nav.innerHTML = navItems.map((item) => `
    <button class="nav-item ${state.route === item.id ? "active" : ""}" type="button" data-route="${item.id}">
      ${icons[item.icon]}
      <span>${item.label}</span>
    </button>
  `).join("");
  nav.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
}

async function bootstrap() {
  if (!state.token) return showLogin();
  try {
    const data = await api("/api/bootstrap");
    state.user = data.user;
    state.bootstrap = data;
    $("#currentUser").textContent = `${data.user.name} (${data.user.employeeNo})`;
    $("#currentRole").textContent = data.user.role;
    showMain();
    renderNav();
    await navigate(state.route, false);
  } catch (err) {
    showLogin();
  }
}

async function navigate(route, push = true) {
  state.route = route;
  const item = navItems.find((nav) => nav.id === route) || navItems[0];
  setPage(item);
  renderNav();
  main.innerHTML = `<div class="panel pad">加载中...</div>`;
  try {
    if (route === "dashboard") await renderDashboard();
    if (route === "proposals") await renderProposals();
    if (route === "points") await renderPoints();
    if (route === "redemptions") await renderRedemptions();
    if (route === "reports") await renderReports();
    if (route === "admin") await renderAdmin();
    if (push) history.replaceState(null, "", `#${route}`);
  } catch (err) {
    main.innerHTML = `<div class="panel empty">${escapeHtml(err.message)}</div>`;
  }
}

function table(headers, rows) {
  if (!rows.length) return `<div class="panel empty">暂无数据</div>`;
  return `
    <div class="panel table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

async function renderDashboard() {
  const data = await api("/api/dashboard");
  main.innerHTML = `
    <section class="grid cols-4">
      ${data.cards.map((card) => `<div class="panel metric"><span>${card.label}</span><strong>${money(card.value)}</strong></div>`).join("")}
    </section>
    <div class="section-head">
      <div><h3>最近提案</h3><p>按当前账号权限展示可见记录。</p></div>
      <button class="btn primary" type="button" data-action="new-proposal">新建提案</button>
    </div>
    ${proposalTable(data.recentProposals, false)}
    <div class="section-head">
      <div><h3>站内通知</h3><p>流程节点、积分到账和兑换结果会在这里提醒。</p></div>
    </div>
    <section class="panel pad timeline">
      ${data.notifications.length ? data.notifications.map((item) => `
        <div class="timeline-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.content)} · ${new Date(item.createdAt).toLocaleString("zh-CN")}</span>
        </div>
      `).join("") : '<div class="empty">暂无通知</div>'}
    </section>
  `;
  $('[data-action="new-proposal"]').addEventListener("click", () => openProposalModal());
}

function proposalTable(items, actions = true) {
  return table(["编号", "标题", "提交人", "部门", "状态", "类型", "等级", "预计积分", actions ? "操作" : ""].filter(Boolean), items.map((item) => `
    <tr>
      <td>${escapeHtml(item.proposalNo)}</td>
      <td><strong>${escapeHtml(item.title)}</strong><br><span class="hint">${escapeHtml(item.category)}</span></td>
      <td>${escapeHtml(item.submitterName)}</td>
      <td>${escapeHtml(item.deptName)}</td>
      <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${escapeHtml(item.benefitType)}</td>
      <td>${escapeHtml(item.level || "-")}</td>
      <td>${money(item.estimatedPoints)}</td>
      ${actions ? `<td><button class="mini-action" type="button" data-detail="${item.id}">查看</button></td>` : ""}
    </tr>
  `));
}

async function renderProposals() {
  const items = await api("/api/proposals");
  main.innerHTML = `
    <div class="section-head" style="margin-top:0">
      <div><h3>提案列表</h3><p>支持草稿、初审、财务复核、精益办复审与归档。</p></div>
      <div class="toolbar">
        <a class="btn" href="${authUrl("/api/export/proposals")}" target="_blank" rel="noreferrer">导出 CSV</a>
        <button class="btn primary" type="button" data-action="new-proposal">新建提案</button>
      </div>
    </div>
    ${proposalTable(items)}
  `;
  $('[data-action="new-proposal"]').addEventListener("click", () => openProposalModal());
  main.querySelectorAll("[data-detail]").forEach((btn) => btn.addEventListener("click", () => openProposalDetail(btn.dataset.detail)));
}

function userOptions() {
  return state.bootstrap.users.map((user) => `<option value="${user.id}">${user.name} (${user.employeeNo})</option>`).join("");
}

function openModal(title, body, onMount) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header>
        <h3>${escapeHtml(title)}</h3>
        <button class="icon-btn" type="button" data-close aria-label="关闭">${icons.close}</button>
      </header>
      <div class="modal-body">${body}</div>
    </section>
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-close]").addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  onMount?.(backdrop, close);
  backdrop.querySelector("button, input, select, textarea")?.focus();
}

function openProposalModal() {
  openModal("新建改善提案", `
    <form id="proposalForm" class="form-grid">
      <label><span>提案标题 *</span><input name="title" required /></label>
      <label><span>提案类别</span><select name="category"><option>效率提升</option><option>品质改善</option><option>成本降低</option><option>安全环境</option><option>流程优化</option></select></label>
      <label><span>效益类型</span><select name="benefitType"><option>非财务创效</option><option>财务创效</option></select></label>
      <label><span>财务创效金额</span><input name="financeAmount" type="number" min="0" value="0" /></label>
      <label class="wide"><span>改善背景 *</span><textarea name="background" required></textarea></label>
      <label class="wide"><span>改善内容 *</span><textarea name="content" required></textarea></label>
      <label class="wide"><span>改善措施 *</span><textarea name="measures" required></textarea></label>
      <label><span>预期效益</span><textarea name="expectedBenefit"></textarea></label>
      <label><span>实际效益</span><textarea name="actualBenefit"></textarea></label>
      <label><span>评级预估</span><select name="level"><option>四级</option><option>三级</option><option>二级</option><option>一级</option></select></label>
      <label><span>实施人</span><select name="implementerId">${userOptions()}</select></label>
      <label class="wide"><span>提案附件</span><input name="attachments" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt" /><span class="hint">支持 PDF、Word、Excel、图片和文本文件，单次上传不超过 10MB。</span></label>
      <div class="wide toolbar">
        <button class="btn" type="submit" data-mode="draft">保存草稿</button>
        <button class="btn primary" type="submit" data-mode="submit">提交初审</button>
      </div>
    </form>
  `, (root, close) => {
    const form = root.querySelector("#proposalForm");
    form.implementerId.value = state.user.id;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const fd = new FormData(form);
      const implementerId = fd.get("implementerId");
      const payload = Object.fromEntries(fd.entries());
      payload.action = submitter.dataset.mode === "draft" ? "draft" : "submit";
      payload.participants = [
        { userId: state.user.id, role: "提出人", ratio: 30 },
        { userId: implementerId, role: "实施人", ratio: 70 },
      ];
      try {
        submitter.disabled = true;
        const created = await api("/api/proposals", { method: "POST", body: JSON.stringify(payload) });
        const files = form.attachments.files;
        if (files.length) await uploadFiles(created.id, files);
        toast(files.length ? "提案和附件已保存" : (payload.action === "draft" ? "草稿已保存" : "提案已提交"));
        close();
        navigate("proposals");
      } catch (err) {
        toast(err.message);
      } finally {
        submitter.disabled = false;
      }
    });
  });
}

async function openProposalDetail(id) {
  const item = await api(`/api/proposals/${id}`);
  const actionForms = [];
  if (item.status === "待部门初审" && (roleCan("部门初审", "超级管理员"))) actionForms.push(reviewForm("department-review", "部门初审"));
  if (item.status === "待财务复核" && (roleCan("财务复核", "超级管理员"))) actionForms.push(financeForm());
  if (item.status === "待精益办复审" && (roleCan("精益办复审", "超级管理员"))) actionForms.push(reviewForm("lean-review", "精益办复审", true));
  openModal(item.title, `
    <dl class="detail-list">
      <dt>提案编号</dt><dd>${escapeHtml(item.proposalNo)}</dd>
      <dt>状态</dt><dd><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></dd>
      <dt>提交人</dt><dd>${escapeHtml(item.submitterName)} / ${escapeHtml(item.deptName)}</dd>
      <dt>类型</dt><dd>${escapeHtml(item.category)} · ${escapeHtml(item.benefitType)}</dd>
      <dt>参与人</dt><dd>${escapeHtml(item.participantNames)}</dd>
      <dt>预计积分</dt><dd>${money(item.estimatedPoints)}</dd>
      <dt>背景</dt><dd>${escapeHtml(item.background)}</dd>
      <dt>内容</dt><dd>${escapeHtml(item.content)}</dd>
      <dt>措施</dt><dd>${escapeHtml(item.measures)}</dd>
      <dt>实际效益</dt><dd>${escapeHtml(item.actualBenefit || "-")}</dd>
    </dl>
    <div class="section-head"><div><h3>附件</h3><p>提案附件和财务效益核算表统一留痕。</p></div></div>
    ${attachmentList(item.attachments || [])}
    <div class="section-head"><div><h3>审批记录</h3></div></div>
    <div class="timeline">${item.approvals.length ? item.approvals.map((ap) => `<div class="timeline-item"><strong>${escapeHtml(ap.node)} · ${escapeHtml(ap.result)}</strong><span>${escapeHtml(ap.opinion || "-")} · ${new Date(ap.at).toLocaleString("zh-CN")}</span></div>`).join("") : '<div class="empty">暂无审批记录</div>'}</div>
    ${actionForms.join("")}
  `, (root, close) => bindReviewForms(root, close, id));
}

function attachmentList(attachments) {
  if (!attachments.length) return '<div class="panel empty">暂无附件</div>';
  return `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>文件名</th><th>大小</th><th>上传时间</th><th>操作</th></tr></thead>
        <tbody>
          ${attachments.map((item) => `
            <tr>
              <td>${escapeHtml(item.originalName)}</td>
              <td>${money(Math.ceil((item.size || 0) / 1024))} KB</td>
              <td>${new Date(item.uploadedAt).toLocaleString("zh-CN")}</td>
              <td><a class="mini-action" href="${authUrl(`/api/attachments/${item.id}/download`)}" target="_blank" rel="noreferrer">下载</a></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function reviewForm(endpoint, title, withLevel = false) {
  return `
    <div class="section-head"><div><h3>${title}</h3><p>驳回时必须填写原因。</p></div></div>
    <form class="form-grid review-form" data-endpoint="${endpoint}">
      ${withLevel ? '<label><span>最终等级</span><select name="level"><option>四级</option><option>三级</option><option>二级</option><option>一级</option></select></label><label><span>实际效益核定</span><input name="actualBenefit" /></label>' : ""}
      <label class="wide"><span>审批意见</span><textarea name="opinion"></textarea></label>
      <div class="wide toolbar">
        <button class="btn danger" type="submit" data-result="reject">驳回</button>
        <button class="btn success" type="submit" data-result="pass">通过</button>
      </div>
    </form>
  `;
}

function financeForm() {
  return `
    <div class="section-head"><div><h3>财务复核</h3><p>财务创效类提案需上传核算表附件；当前版本先登记附件名称。</p></div></div>
    <form class="form-grid review-form" data-endpoint="finance-review">
      <label><span>核定创效金额</span><input name="financeAmount" type="number" min="0" required /></label>
      <label><span>效益核算表附件名称</span><input name="financeAttachmentName" placeholder="例如：效益核算表.xlsx" /></label>
      <label class="wide"><span>上传效益核算表</span><input name="financeAttachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt" /></label>
      <label class="wide"><span>复核意见</span><textarea name="opinion"></textarea></label>
      <div class="wide toolbar">
        <button class="btn danger" type="submit" data-result="reject">驳回</button>
        <button class="btn success" type="submit" data-result="pass">通过</button>
      </div>
    </form>
  `;
}

function bindReviewForms(root, close, proposalId) {
  root.querySelectorAll(".review-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const payload = Object.fromEntries(new FormData(form).entries());
      delete payload.financeAttachment;
      payload.result = submitter.dataset.result === "reject" ? "reject" : "pass";
      try {
        submitter.disabled = true;
        if (form.financeAttachment?.files?.length) {
          await uploadFiles(proposalId, form.financeAttachment.files);
          payload.financeAttachmentName ||= form.financeAttachment.files[0].name;
        }
        await api(`/api/proposals/${proposalId}/${form.dataset.endpoint}`, { method: "POST", body: JSON.stringify(payload) });
        toast("审批已提交");
        close();
        navigate("proposals");
      } catch (err) {
        toast(err.message);
      } finally {
        submitter.disabled = false;
      }
    });
  });
}

async function renderPoints() {
  const data = await api("/api/points/account");
  const canAdjust = roleCan("超级管理员", "精益办复审");
  main.innerHTML = `
    <section class="grid cols-4">
      <div class="panel metric"><span>当前余额</span><strong>${money(data.account.balance)}</strong></div>
      <div class="panel metric"><span>预占积分</span><strong>${money(data.account.reserved)}</strong></div>
      <div class="panel metric"><span>年度积分</span><strong>${money(data.account.annualPoints)}</strong></div>
      <div class="panel metric"><span>累计扣减</span><strong>${money(data.account.totalDeducted)}</strong></div>
    </section>
    ${canAdjust ? adjustPanel() : ""}
    <div class="section-head"><div><h3>积分流水</h3><p>提案发分、人工奖扣、兑换扣减和年度清零全部留痕。</p></div></div>
    ${table(["时间", "类型", "积分", "余额", "备注"], data.ledger.map((item) => `<tr><td>${new Date(item.createdAt).toLocaleString("zh-CN")}</td><td>${escapeHtml(item.type)}</td><td>${item.points > 0 ? "+" : ""}${money(item.points)}</td><td>${money(item.balanceAfter)}</td><td>${escapeHtml(item.remark)}</td></tr>`))}
  `;
  if (canAdjust) bindAdjust();
}

function adjustPanel() {
  return `
    <div class="section-head"><div><h3>人工积分调整</h3><p>奖励和扣减必须填写备注。</p></div></div>
    <form id="adjustForm" class="panel pad form-grid">
      <label><span>员工</span><select name="userId">${userOptions()}</select></label>
      <label><span>积分变动</span><input name="points" type="number" placeholder="正数奖励，负数扣减" required /></label>
      <label class="wide"><span>备注 *</span><input name="remark" required /></label>
      <div class="wide"><button class="btn primary" type="submit">提交调整</button></div>
    </form>
  `;
}

function bindAdjust() {
  $("#adjustForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/points/adjust", { method: "POST", body: JSON.stringify(payload) });
      toast("积分已调整");
      renderPoints();
    } catch (err) {
      toast(err.message);
    }
  });
}

async function renderRedemptions() {
  const [gifts, redemptions] = await Promise.all([api("/api/gifts"), api("/api/redemptions")]);
  const canReview = roleCan("超级管理员", "精益办复审");
  main.innerHTML = `
    <div class="section-head" style="margin-top:0">
      <div><h3>兑换礼品</h3><p>库存预占、缺货处理和季度目录版本已纳入流程。</p></div>
      ${canReview ? '<button class="btn primary" type="button" data-new-gift>新增礼品</button>' : ""}
    </div>
    <section class="grid cols-2">
      ${gifts.map((gift) => `
        <div class="panel pad">
          <h3 style="margin:0 0 6px">${escapeHtml(gift.name)}</h3>
          <p class="hint">版本 ${escapeHtml(gift.quarterVersion)} · 库存 ${money(gift.stockQty - gift.reservedQty)} / 预占 ${money(gift.reservedQty)}</p>
          <strong>${money(gift.requiredPoints)} 分</strong>
          <div class="toolbar" style="margin-top:14px">
            <button class="btn primary" type="button" data-redeem="${gift.id}">申请兑换</button>
          </div>
        </div>
      `).join("")}
    </section>
    <div class="section-head"><div><h3>兑换记录</h3><p>审核通过后自动扣减积分，发放后登记领取状态。</p></div></div>
    ${table(["员工", "礼品", "积分", "数量", "状态", "领取状态", "操作"], redemptions.map((item) => `
      <tr>
        <td>${escapeHtml(item.userName)}</td>
        <td>${escapeHtml(item.giftName)}</td>
        <td>${money(item.points)}</td>
        <td>${money(item.quantity)}</td>
        <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.receiveStatus)}</td>
        <td class="toolbar">
          ${canReview && item.status === "待审核" ? `<button class="mini-action" data-rd-review="${item.id}" data-result="pass">通过</button><button class="mini-action" data-rd-review="${item.id}" data-result="reject">驳回</button>` : ""}
          ${canReview && item.status === "审核通过" && item.receiveStatus !== "已发放" ? `<button class="mini-action" data-rd-issue="${item.id}">发放</button>` : ""}
        </td>
      </tr>
    `))}
  `;
  main.querySelectorAll("[data-redeem]").forEach((btn) => btn.addEventListener("click", () => redeemGift(btn.dataset.redeem)));
  main.querySelectorAll("[data-rd-review]").forEach((btn) => btn.addEventListener("click", () => reviewRedemption(btn.dataset.rdReview, btn.dataset.result)));
  main.querySelectorAll("[data-rd-issue]").forEach((btn) => btn.addEventListener("click", () => issueRedemption(btn.dataset.rdIssue)));
  if (canReview && $("[data-new-gift]")) $("[data-new-gift]").addEventListener("click", openGiftModal);
}

async function redeemGift(giftId) {
  const quantity = prompt("请输入兑换数量", "1");
  if (!quantity) return;
  try {
    await api("/api/redemptions", { method: "POST", body: JSON.stringify({ giftId, quantity: Number(quantity) }) });
    toast("兑换申请已提交");
    renderRedemptions();
  } catch (err) {
    toast(err.message);
  }
}

async function reviewRedemption(id, result) {
  const opinion = result === "reject" ? prompt("请输入驳回原因", "库存或条件不符合") : "";
  if (result === "reject" && !opinion) return;
  try {
    await api(`/api/redemptions/${id}/review`, { method: "POST", body: JSON.stringify({ result, opinion }) });
    toast("兑换审核已处理");
    renderRedemptions();
  } catch (err) {
    toast(err.message);
  }
}

async function issueRedemption(id) {
  try {
    await api(`/api/redemptions/${id}/issue`, { method: "POST", body: JSON.stringify({}) });
    toast("礼品发放已确认");
    renderRedemptions();
  } catch (err) {
    toast(err.message);
  }
}

function openGiftModal() {
  openModal("新增兑换礼品", `
    <form id="giftForm" class="form-grid">
      <label><span>礼品名称 *</span><input name="name" required /></label>
      <label><span>所需积分 *</span><input name="requiredPoints" type="number" min="1" required /></label>
      <label><span>参考价值</span><input name="referenceValue" type="number" min="0" /></label>
      <label><span>初始库存</span><input name="stockQty" type="number" min="0" value="0" /></label>
      <label><span>季度版本</span><input name="quarterVersion" value="2026Q2" /></label>
      <label><span>状态</span><select name="status"><option>启用</option><option>停用</option></select></label>
      <div class="wide"><button class="btn primary" type="submit">保存礼品</button></div>
    </form>
  `, (root, close) => {
    root.querySelector("#giftForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/gifts", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
        toast("礼品已新增");
        close();
        renderRedemptions();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

async function renderReports() {
  const data = await api("/api/reports");
  main.innerHTML = `
    <div class="section-head" style="margin-top:0"><div><h3>部门提案统计</h3><p>提交数、通过数、驳回数和已发积分。</p></div></div>
    ${table(["部门", "提交数", "通过数", "驳回数", "已发积分"], data.proposalByDept.map((item) => `<tr><td>${escapeHtml(item.dept)}</td><td>${money(item.total)}</td><td>${money(item.approved)}</td><td>${money(item.rejected)}</td><td>${money(item.points)}</td></tr>`))}
    <div class="section-head"><div><h3>员工积分排行</h3><p>按累计获得积分排序。</p></div></div>
    ${table(["员工", "部门", "当前余额", "累计获得", "累计扣减"], data.employeePoints.map((item) => `<tr><td>${escapeHtml(item.userName)}</td><td>${escapeHtml(item.deptName)}</td><td>${money(item.balance)}</td><td>${money(item.totalEarned)}</td><td>${money(item.totalDeducted)}</td></tr>`))}
  `;
}

async function renderAdmin() {
  const logsAllowed = roleCan("超级管理员");
  let logs = [];
  if (logsAllowed) logs = await api("/api/logs");
  main.innerHTML = `
    <section class="grid cols-2">
      <div class="panel pad">
        <h3 style="margin-top:0">数据导入</h3>
        <p class="hint">支持员工、部门、礼品三类 CSV / XLS / XLSX 导入。员工初始密码统一为 123456。</p>
        <div class="tabs" style="margin:12px 0">
          <a class="tab active" href="${authUrl("/api/import/users-template")}" target="_blank" rel="noreferrer">员工模板</a>
          <a class="tab active" href="${authUrl("/api/import/departments-template")}" target="_blank" rel="noreferrer">部门模板</a>
          <a class="tab active" href="${authUrl("/api/import/gifts-template")}" target="_blank" rel="noreferrer">礼品模板</a>
        </div>
        <form id="importForm" class="form-stack">
          <label><span>导入类型</span><select name="type"><option value="users">员工</option><option value="departments">部门</option><option value="gifts">礼品</option></select></label>
          <label><span>导入文件</span><input name="importFile" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
          <button class="btn primary" type="submit">开始导入</button>
        </form>
      </div>
      <div class="panel pad">
        <h3 style="margin-top:0">部署边界</h3>
        <p>公网域名访问；服务器、域名、ICP备案和 SSL 证书由客户提供。本地版本用于流程确认和演示。</p>
      </div>
    </section>
    <div class="section-head"><div><h3>操作日志</h3><p>关键业务操作保留前后值、操作人、IP 和时间。</p></div></div>
    ${logsAllowed ? table(["时间", "操作人", "动作", "对象", "IP"], logs.map((item) => `<tr><td>${new Date(item.createdAt).toLocaleString("zh-CN")}</td><td>${escapeHtml(item.operatorName)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.objectType)} / ${escapeHtml(item.objectId)}</td><td>${escapeHtml(item.ip)}</td></tr>`)) : '<div class="panel empty">仅超级管理员可查看操作日志</div>'}
  `;
  const importForm = $("#importForm");
  if (importForm) importForm.addEventListener("submit", handleImport);
}

async function handleImport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fd = new FormData(form);
  const file = form.importFile.files[0];
  if (!file) return toast("请选择导入文件");
  const submitter = event.submitter;
  try {
    submitter.disabled = true;
    const result = await api(`/api/import/${fd.get("type")}`, { method: "POST", body: fd });
    toast(`导入完成：新增 ${result.created}，更新 ${result.updated}，错误 ${result.errors.length}`);
    if (result.errors.length) {
      openModal("导入错误明细", `<div class="panel pad">${result.errors.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`);
    }
    const data = await api("/api/bootstrap");
    state.bootstrap = data;
    state.user = data.user;
    renderAdmin();
  } catch (err) {
    toast(err.message);
  } finally {
    submitter.disabled = false;
  }
}

function logout(callApi = true) {
  if (callApi && state.token) api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
  localStorage.removeItem("yc_token");
  state.token = "";
  state.user = null;
  showLogin();
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const btn = event.submitter;
  try {
    btn.disabled = true;
    const data = await api("/api/login", { method: "POST", body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("yc_token", data.token);
    toast("登录成功");
    await bootstrap();
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});

$("#logoutBtn").addEventListener("click", () => logout(true));

const hashRoute = location.hash.replace("#", "");
if (hashRoute) state.route = hashRoute;
bootstrap();

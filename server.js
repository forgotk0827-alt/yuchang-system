const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const { URL } = require("url");
const {
  PORT,
  DATA_DIR,
  UPLOAD_DIR,
  DB_PATH,
  MAX_UPLOAD_SIZE,
  ALLOWED_UPLOAD_EXT,
  ROLES,
  STATUS,
  PROPOSAL_EVALUATION_TYPES,
  PROPOSAL_LEVELS,
  PROJECT_TYPES,
  DEFAULT_REVIEW_COMMITTEE_NAMES,
  FOCUS_TOPIC_SCALES,
  POINT_TYPES,
} = require("./src/config");
const {
  sendJson,
  sendError,
  readBody,
  readBuffer,
  parseMultipart,
  serveStatic,
} = require("./src/http");
const {
  hashPassword,
  getToken,
  publicUser,
  findLoginUser,
  createSession,
  requireAuth,
  canAdmin,
  canLean,
  canFinance,
  canCommittee,
} = require("./src/auth");
const {
  calculateProposalPoints,
  calculateProposalPointBreakdown,
  addLedger: pointsAddLedger,
  distributeProposalPoints,
  clearAnnualAvailablePoints,
  resolveRewardLevel,
  requiresCommittee,
} = require("./src/points");
const {
  REDEMPTION_STATUS,
  createRedemption,
  reviewRedemption,
  issueRedemption,
  listGifts,
  listRedemptions,
  upsertGift,
} = require("./src/redemptions");

function now() {
  return new Date().toISOString();
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function defaultGifts() {
  return [
    { id: "g_120", name: "品牌抽纸一提（6包）", requiredPoints: 120, referenceValue: 20, stockQty: 30, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_600_a", name: "品牌电动牙刷", requiredPoints: 600, referenceValue: 120, stockQty: 10, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_600_b", name: "高颜值保温杯", requiredPoints: 600, referenceValue: 120, stockQty: 10, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_1500_a", name: "无线降噪蓝牙耳机", requiredPoints: 1500, referenceValue: 400, stockQty: 5, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_1500_b", name: "便携式筋膜枪", requiredPoints: 1500, referenceValue: 400, stockQty: 5, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_3500_a", name: "中高端智能手表", requiredPoints: 3500, referenceValue: 1300, stockQty: 3, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_3500_b", name: "千元级家用投影仪", requiredPoints: 3500, referenceValue: 1300, stockQty: 3, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_5000_a", name: "家用空气净化器", requiredPoints: 5000, referenceValue: 2500, stockQty: 2, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_5000_b", name: "家用净水器", requiredPoints: 5000, referenceValue: 2500, stockQty: 2, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_7500_a", name: "洗衣机", requiredPoints: 7500, referenceValue: 5000, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_7500_b", name: "大屏高端平板电脑", requiredPoints: 7500, referenceValue: 5000, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_10000_a", name: "高端笔记本电脑", requiredPoints: 10000, referenceValue: 8500, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_10000_b", name: "高端智能电视", requiredPoints: 10000, referenceValue: 8500, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_12000_a", name: "顶级旗舰手机", requiredPoints: 12000, referenceValue: 12000, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
    { id: "g_12000_b", name: "同额学习基金", requiredPoints: 12000, referenceValue: 12000, stockQty: 1, reservedQty: 0, quarterVersion: "2026Q2", status: "启用" },
  ];
}

function seedDb() {
  const users = [
    { id: "u_admin", employeeNo: "A001", name: "系统管理员", phone: "13800000001", deptId: "d_lean", post: "管理员", role: ROLES.ADMIN, passwordHash: hashPassword("A001@"), status: "在职" },
    { id: "u_emp", employeeNo: "E001", name: "张三", phone: "13800000002", deptId: "d_prod", post: "操作员", role: ROLES.EMPLOYEE, passwordHash: hashPassword("E001@"), status: "在职" },
    { id: "u_dept", employeeNo: "D001", name: "李主管", phone: "13800000003", deptId: "d_prod", post: "部门主管", role: ROLES.DEPT_REVIEWER, passwordHash: hashPassword("D001@"), status: "在职" },
    { id: "u_finance", employeeNo: "F001", name: "王财务", phone: "13800000004", deptId: "d_finance", post: "财务", role: ROLES.FINANCE, passwordHash: hashPassword("F001@"), status: "在职" },
    { id: "u_lean", employeeNo: "L001", name: "赵精益", phone: "13800000005", deptId: "d_lean", post: "精益专员", role: ROLES.LEAN_OFFICE, passwordHash: hashPassword("L001@"), status: "在职" },
  ];
  return {
    meta: { createdAt: now(), nextProposalNo: 2, reviewCommitteeNames: DEFAULT_REVIEW_COMMITTEE_NAMES },
    sessions: {},
    departments: [
      { id: "d_prod", name: "生产部", parentId: "", leaderId: "u_dept", status: "启用" },
      { id: "d_finance", name: "财务部", parentId: "", leaderId: "u_finance", status: "启用" },
      { id: "d_lean", name: "精益推进办公室", parentId: "", leaderId: "u_lean", status: "启用" },
    ],
    users,
    proposals: [
      {
        id: "p_demo",
        proposalNo: "YC-2026-0001",
        title: "注塑换模工具定置改善",
        category: "效率提升",
        benefitType: "非财务创效",
        projectType: "普通改善提案",
        focusTopicScale: "",
        background: "现场换模工具取用路径长，换模准备时间偏长。",
        content: "通过工具定置、标识优化和点检表标准化缩短准备时间。",
        measures: "制作定置板，明确工具编号，设置每日点检。",
        expectedBenefit: "预计单次换模缩短 5 分钟。",
        actualBenefit: "试运行后单次换模平均缩短 6 分钟。",
        level: "四级",
        originalLevel: "四级",
        rewardLevel: "四级",
        evaluationType: "正常改善",
        isHorizontalExpansion: false,
        siteConfirmed: true,
        siteConfirmedBy: "u_dept",
        siteConfirmedAt: now(),
        siteConfirmNote: "现场已确认实施效果。",
        committeeRequired: false,
        committeeStatus: "",
        status: STATUS.LEAN_PENDING,
        submitterId: "u_emp",
        deptId: "d_prod",
        participants: [{ userId: "u_emp", role: "提出人", ratio: 30 }, { userId: "u_emp", role: "实施人", ratio: 70 }],
        attachments: [],
        createdAt: now(),
        updatedAt: now(),
        submittedAt: now(),
        approvals: [
          { node: "部门评估组初评", approverId: "u_dept", result: "通过", opinion: "属实，建议复审。", at: now() },
        ],
      },
    ],
    pointsAccounts: users.map((user) => ({
      id: `pa_${user.id}`,
      userId: user.id,
      balance: user.id === "u_emp" ? 260 : 0,
      reserved: 0,
      annualPoints: user.id === "u_emp" ? 260 : 0,
      totalEarned: user.id === "u_emp" ? 260 : 0,
      totalDeducted: 0,
    })),
    pointsLedger: [
      { id: "pl_seed", userId: "u_emp", type: POINT_TYPES.MANUAL_ADD, points: 260, sourceType: "seed", sourceId: "", balanceAfter: 260, remark: "初始化测试积分", operatorId: "u_admin", createdAt: now() },
    ],
    gifts: defaultGifts(),
    redemptions: [],
    notifications: [],
    operationLogs: [],
    backups: [],
  };
}

function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const db = seedDb();
    saveDb(db);
    return db;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  migrateDb(db);
  syncReviewCommittee(db);
  syncDefaultGifts(db);
  return db;
}

function saveDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function syncDefaultGifts(db) {
  const defaults = defaultGifts();
  const hasLatestCatalog = defaults.every((gift) => db.gifts?.some((item) => item.id === gift.id));
  if (hasLatestCatalog) return;
  db.gifts = defaults.map((gift) => {
    const existing = db.gifts?.find((item) => item.id === gift.id || item.name === gift.name);
    return existing ? { ...gift, stockQty: existing.stockQty ?? gift.stockQty, reservedQty: existing.reservedQty ?? 0, status: existing.status || gift.status } : gift;
  });
  saveDb(db);
}

function migrateDb(db) {
  db.meta ||= {};
  db.meta.reviewCommitteeNames ||= DEFAULT_REVIEW_COMMITTEE_NAMES;
  const statusMap = {
    "待部门初审": STATUS.DEPT_PENDING,
    "部门初审驳回": STATUS.DEPT_REJECTED,
  };
  (db.proposals || []).forEach((proposal) => {
    if (statusMap[proposal.status]) proposal.status = statusMap[proposal.status];
    proposal.evaluationType ||= "正常改善";
    proposal.projectType = PROJECT_TYPES.includes(proposal.projectType) ? proposal.projectType : "普通改善提案";
    proposal.focusTopicScale = FOCUS_TOPIC_SCALES[proposal.focusTopicScale] ? proposal.focusTopicScale : "";
    proposal.originalLevel ||= proposal.level || "四级";
    proposal.isHorizontalExpansion = Boolean(proposal.isHorizontalExpansion);
    proposal.rewardLevel ||= resolveRewardLevel(proposal.originalLevel, proposal.isHorizontalExpansion);
    proposal.siteConfirmed = Boolean(proposal.siteConfirmed);
    proposal.siteConfirmedBy ||= "";
    proposal.siteConfirmedAt ||= "";
    proposal.siteConfirmNote ||= "";
    proposal.committeeRequired = Boolean(proposal.committeeRequired);
    proposal.committeeStatus ||= "";
    (proposal.approvals || []).forEach((approval) => {
      if (approval.node === "部门初审") approval.node = "部门评估组初评";
    });
  });
  (db.users || []).forEach((user) => {
    if (user.role === "部门初审") user.role = ROLES.DEPT_REVIEWER;
  });
}

function syncReviewCommittee(db) {
  const names = db.meta?.reviewCommitteeNames?.length ? db.meta.reviewCommitteeNames : DEFAULT_REVIEW_COMMITTEE_NAMES;
  (db.users || []).forEach((user) => {
    user.isReviewCommittee = names.includes(user.name);
  });
}

function safeFileName(filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext).replace(/[^\w\u4e00-\u9fa5.-]+/g, "_").slice(0, 80) || "file";
  return `${base}${ext}`;
}

function csvRows(text) {
  const source = text.replace(/^\ufeff/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value.trim());
      value = "";
    } else if (char === "\n") {
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function csvObjects(text) {
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header || "").trim());
  return rows.slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])))
    .filter((row) => Object.values(row).some(Boolean));
}

function workbookObjects(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames.find((name) => name.includes("员工")) || workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  return rowsToObjects(rows);
}

async function readImportRows(req) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const buffer = await readBuffer(req, MAX_UPLOAD_SIZE);
    const file = parseMultipart(req, buffer).find((part) => part.filename);
    if (!file) throw new Error("请选择要导入的文件");
    const ext = path.extname(file.filename).toLowerCase();
    if (ext === ".csv") return csvObjects(file.data.toString("utf8"));
    if (ext === ".xls" || ext === ".xlsx") return workbookObjects(file.data);
    throw new Error("仅支持 .csv、.xls、.xlsx 文件");
  }
  const body = await readBody(req);
  return csvObjects(String(body.csv || ""));
}

function valueFrom(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function requireAdminOrLean(user, res, message) {
  if (!canAdmin(user) && !canLean(user)) {
    sendError(res, 403, message);
    return false;
  }
  return true;
}

function findOrCreateDepartment(db, name) {
  const deptName = String(name || "").trim() || "未分配部门";
  let dept = db.departments.find((item) => item.name === deptName);
  if (!dept) {
    dept = { id: uid("d"), name: deptName, parentId: "", leaderId: "", status: "启用" };
    db.departments.push(dept);
  }
  return dept;
}

function canDeptReview(user, proposal) {
  return canAdmin(user) || user.role === ROLES.DEPT_REVIEWER && user.deptId === proposal.deptId;
}

function departmentName(db, id) {
  return db.departments.find((item) => item.id === id)?.name || "-";
}

function userName(db, id) {
  return db.users.find((item) => item.id === id)?.name || "-";
}

function accountFor(db, userId) {
  let account = db.pointsAccounts.find((item) => item.userId === userId);
  if (!account) {
    account = { id: uid("pa"), userId, balance: 0, reserved: 0, annualPoints: 0, totalEarned: 0, totalDeducted: 0 };
    db.pointsAccounts.push(account);
  }
  return account;
}

function logOperation(db, operatorId, action, objectType, objectId, beforeValue, afterValue, req) {
  db.operationLogs.unshift({
    id: uid("log"),
    operatorId,
    action,
    objectType,
    objectId,
    beforeValue: beforeValue ? JSON.stringify(beforeValue).slice(0, 1500) : "",
    afterValue: afterValue ? JSON.stringify(afterValue).slice(0, 1500) : "",
    ip: req.socket.remoteAddress || "",
    createdAt: now(),
  });
}

function notify(db, receiverId, type, title, content) {
  db.notifications.unshift({ id: uid("ntf"), receiverId, type, title, content, read: false, createdAt: now() });
}

function addLedger(db, userId, type, points, sourceType, sourceId, remark, operatorId) {
  return pointsAddLedger(db, accountFor, now, userId, type, points, sourceType, sourceId, remark, operatorId);
}

function visibleProposals(db, user) {
  if (canAdmin(user) || user.role === ROLES.LEAN_OFFICE || user.role === ROLES.FINANCE) return db.proposals;
  if (user.isReviewCommittee) return db.proposals.filter((item) => item.status === STATUS.COMMITTEE_PENDING || item.submitterId === user.id || item.participants?.some((participant) => participant.userId === user.id));
  if (user.role === ROLES.DEPT_REVIEWER) return db.proposals.filter((item) => item.deptId === user.deptId || item.submitterId === user.id);
  return db.proposals.filter((item) => item.submitterId === user.id || item.participants?.some((participant) => participant.userId === user.id));
}

function enrichProposal(db, proposal) {
  return {
    ...proposal,
    submitterName: userName(db, proposal.submitterId),
    deptName: departmentName(db, proposal.deptId),
    participantNames: (proposal.participants || []).map((p) => proposal.projectType === "有效焦点课题" ? `${userName(db, p.userId)}(${p.role})` : `${userName(db, p.userId)}(${p.role}/${p.ratio}%)`).join("、"),
    estimatedPoints: calculateProposalPoints(proposal),
    pointsBreakdown: proposal.pointsBreakdown || calculateProposalPointBreakdown(proposal).items,
  };
}

function canViewProposal(db, user, proposal) {
  return Boolean(proposal && visibleProposals(db, user).some((item) => item.id === proposal.id));
}

function canAttachProposal(db, user, proposal) {
  if (!canViewProposal(db, user, proposal)) return false;
  return canAdmin(user) || canLean(user) || canFinance(user) || canDeptReview(user, proposal) || proposal.submitterId === user.id;
}

function proposalInputFromBody(user, body) {
  const requestedProjectType = PROJECT_TYPES.includes(body.projectType) ? String(body.projectType) : "普通改善提案";
  if (requestedProjectType === "有效焦点课题" && !canLean(user)) {
    const error = new Error("有效焦点课题需由精益办或管理员认定");
    error.status = 403;
    throw error;
  }
  const projectType = requestedProjectType;
  const focusTopicScale = projectType === "有效焦点课题" && FOCUS_TOPIC_SCALES[body.focusTopicScale] ? String(body.focusTopicScale) : "";
  const participants = body.participants?.length ? body.participants : [{ userId: user.id, role: "提出人", ratio: 30 }, { userId: user.id, role: "实施人", ratio: 70 }];
  if (projectType === "有效焦点课题") {
    if (!participants.some((participant) => participant.role === "课题组长")) {
      const error = new Error("有效焦点课题必须指定课题组长");
      error.status = 400;
      throw error;
    }
    const scale = FOCUS_TOPIC_SCALES[focusTopicScale] || FOCUS_TOPIC_SCALES.small;
    const coreCount = participants.filter((participant) => participant.role === "核心组员").length;
    if (coreCount > scale.maxCoreMembers) {
      const error = new Error(`${scale.label}核心组员最多${scale.maxCoreMembers}人`);
      error.status = 400;
      throw error;
    }
  }
  const level = String(body.level || "四级");
  const isHorizontalExpansion = body.isHorizontalExpansion === true || body.isHorizontalExpansion === "on" || body.isHorizontalExpansion === "true";
  return {
    title: String(body.title),
    category: String(body.category || "效率提升"),
    benefitType: String(body.benefitType || "非财务创效"),
    projectType,
    focusTopicScale,
    financeAmount: Number(body.financeAmount || 0),
    background: String(body.background),
    content: String(body.content),
    measures: String(body.measures),
    expectedBenefit: String(body.expectedBenefit || ""),
    actualBenefit: String(body.actualBenefit || ""),
    level,
    originalLevel: level,
    rewardLevel: resolveRewardLevel(level, isHorizontalExpansion),
    evaluationType: PROPOSAL_EVALUATION_TYPES.includes(body.evaluationType) ? String(body.evaluationType) : "正常改善",
    isHorizontalExpansion,
    participants,
  };
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const str = String(value ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(",")).join("\n");
}

async function handleApi(req, res, url) {
  const db = loadDb();
  const pathParts = url.pathname.split("/").filter(Boolean);
  const method = req.method || "GET";

  try {
    if (url.pathname === "/api/login" && method === "POST") {
      const body = await readBody(req);
      const account = String(body.account || "").trim();
      const password = String(body.password || "");
      const user = findLoginUser(db, account, password);
      if (!user) return sendError(res, 401, "账号或密码错误");
      const token = createSession(db, user.id, now());
      logOperation(db, user.id, "登录系统", "session", token, null, { account }, req);
      saveDb(db);
      return sendJson(res, { token, user: publicUser(user) });
    }

    if (url.pathname === "/api/logout" && method === "POST") {
      const token = getToken(req);
      if (token) delete db.sessions[token];
      saveDb(db);
      return sendJson(res, { ok: true });
    }

    const user = requireAuth(req, res, db);
    if (!user) return;

    if (url.pathname === "/api/me" && method === "GET") {
      return sendJson(res, { user: publicUser(user), department: departmentName(db, user.deptId), account: accountFor(db, user.id) });
    }

    if (url.pathname === "/api/bootstrap" && method === "GET") {
      return sendJson(res, {
        user: publicUser(user),
        departments: db.departments,
        users: db.users.map(publicUser),
        gifts: db.gifts,
        roles: Object.values(ROLES),
        statuses: Object.values(STATUS),
        reviewCommitteeNames: db.meta.reviewCommitteeNames || DEFAULT_REVIEW_COMMITTEE_NAMES,
      });
    }

    if (pathParts[1] === "proposals" && pathParts[2] && pathParts[3] === "attachments" && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal) return sendError(res, 404, "提案不存在");
      if (!canAttachProposal(db, user, proposal)) return sendError(res, 403, "无附件上传权限");
      const buffer = await readBuffer(req);
      const parts = parseMultipart(req, buffer).filter((part) => part.filename);
      if (!parts.length) return sendError(res, 400, "请选择要上传的附件");
      const saved = [];
      for (const part of parts) {
        const originalName = safeFileName(Buffer.from(part.filename, "binary").toString("utf8"));
        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_UPLOAD_EXT.has(ext)) return sendError(res, 400, `不支持的文件类型：${ext || "未知"}`);
        const storedName = `${uid("file")}${ext}`;
        const storedPath = path.join(UPLOAD_DIR, storedName);
        fs.writeFileSync(storedPath, part.data);
        const attachment = {
          id: uid("att"),
          originalName,
          storedName,
          mimeType: part.type,
          size: part.data.length,
          uploaderId: user.id,
          uploadedAt: now(),
        };
        proposal.attachments ||= [];
        proposal.attachments.push(attachment);
        saved.push(attachment);
      }
      proposal.updatedAt = now();
      logOperation(db, user.id, "上传提案附件", "proposal", proposal.id, null, saved, req);
      saveDb(db);
      return sendJson(res, { attachments: saved });
    }

    if (pathParts[1] === "attachments" && pathParts[2] && (!pathParts[3] || pathParts[3] === "download") && method === "GET") {
      let targetProposal = null;
      let targetAttachment = null;
      for (const proposal of db.proposals) {
        const attachment = (proposal.attachments || []).find((item) => item.id === pathParts[2]);
        if (attachment) {
          targetProposal = proposal;
          targetAttachment = attachment;
          break;
        }
      }
      if (!targetAttachment || !canViewProposal(db, user, targetProposal)) return sendError(res, 404, "附件不存在");
      const filePath = path.join(UPLOAD_DIR, targetAttachment.storedName);
      if (!fs.existsSync(filePath)) return sendError(res, 404, "附件文件不存在");
      res.writeHead(200, {
        "Content-Type": targetAttachment.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(targetAttachment.originalName)}`,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    if (url.pathname === "/api/dashboard" && method === "GET") {
      const proposals = visibleProposals(db, user);
      const account = accountFor(db, user.id);
      const pending = proposals.filter((item) => {
        if (user.role === ROLES.DEPT_REVIEWER) return item.status === STATUS.DEPT_PENDING && item.deptId === user.deptId;
        if (user.role === ROLES.FINANCE) return item.status === STATUS.FINANCE_PENDING;
        if (user.role === ROLES.LEAN_OFFICE) return [STATUS.LEAN_PENDING, STATUS.COMMITTEE_PENDING].includes(item.status);
        if (user.isReviewCommittee) return item.status === STATUS.COMMITTEE_PENDING;
        if (canAdmin(user)) return [STATUS.DEPT_PENDING, STATUS.FINANCE_PENDING, STATUS.LEAN_PENDING, STATUS.COMMITTEE_PENDING].includes(item.status);
        return false;
      }).length;
      return sendJson(res, {
        cards: [
          { label: "可见提案", value: proposals.length },
          { label: "待办审批", value: pending },
          { label: "我的可用积分", value: account.balance },
          { label: "预占积分", value: account.reserved },
        ],
        recentProposals: proposals.slice(0, 5).map((item) => enrichProposal(db, item)),
        notifications: db.notifications.filter((item) => item.receiverId === user.id).slice(0, 6),
      });
    }

    if (url.pathname === "/api/proposals" && method === "GET") {
      const status = url.searchParams.get("status");
      const keyword = url.searchParams.get("keyword")?.trim();
      let proposals = visibleProposals(db, user);
      if (status) proposals = proposals.filter((item) => item.status === status);
      if (keyword) proposals = proposals.filter((item) => item.title.includes(keyword) || item.proposalNo.includes(keyword) || userName(db, item.submitterId).includes(keyword));
      return sendJson(res, proposals.map((item) => enrichProposal(db, item)));
    }

    if (url.pathname === "/api/proposals" && method === "POST") {
      const body = await readBody(req);
      const asDraft = body.action === "draft";
      if (!body.title || !body.background || !body.content || !body.measures) return sendError(res, 400, "标题、背景、内容和措施为必填");
      let input;
      try {
        input = proposalInputFromBody(user, body);
      } catch (err) {
        return sendError(res, err.status || 400, err.message);
      }
      const proposal = {
        id: uid("p"),
        proposalNo: `YC-2026-${String(db.meta.nextProposalNo++).padStart(4, "0")}`,
        ...input,
        siteConfirmed: false,
        siteConfirmedBy: "",
        siteConfirmedAt: "",
        siteConfirmNote: "",
        committeeRequired: false,
        committeeStatus: "",
        status: asDraft ? STATUS.DRAFT : STATUS.DEPT_PENDING,
        submitterId: user.id,
        deptId: user.deptId,
        attachments: [],
        approvals: [],
        createdAt: now(),
        updatedAt: now(),
        submittedAt: asDraft ? "" : now(),
      };
      db.proposals.unshift(proposal);
      db.users.filter((item) => item.role === ROLES.DEPT_REVIEWER && item.deptId === user.deptId).forEach((reviewer) => {
        notify(db, reviewer.id, "部门评估待办", "新的改善提案待初评", `${user.name} 提交了“${proposal.title}”。`);
      });
      logOperation(db, user.id, asDraft ? "保存提案草稿" : "提交提案", "proposal", proposal.id, null, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal), 201);
    }

    if (pathParts[1] === "proposals" && pathParts[2] && method === "PUT") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal || (proposal.submitterId !== user.id && !canAdmin(user))) return sendError(res, 404, "提案不存在");
      if (![STATUS.DRAFT, STATUS.DEPT_REJECTED, STATUS.FINANCE_REJECTED, STATUS.LEAN_REJECTED, STATUS.COMMITTEE_REJECTED].includes(proposal.status)) return sendError(res, 400, "当前状态不可编辑");
      const body = await readBody(req);
      const asDraft = body.action === "draft";
      if (!body.title || !body.background || !body.content || !body.measures) return sendError(res, 400, "标题、背景、内容和措施为必填");
      let input;
      try {
        input = proposalInputFromBody(user, body);
      } catch (err) {
        return sendError(res, err.status || 400, err.message);
      }
      const before = { ...proposal };
      Object.assign(proposal, input, {
        status: asDraft ? STATUS.DRAFT : STATUS.DEPT_PENDING,
        updatedAt: now(),
        submittedAt: asDraft ? proposal.submittedAt || "" : now(),
      });
      proposal.pointsBreakdown = calculateProposalPointBreakdown(proposal).items;
      logOperation(db, user.id, asDraft ? "更新提案草稿" : "编辑并提交提案", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && method === "DELETE") {
      const index = db.proposals.findIndex((item) => item.id === pathParts[2]);
      const proposal = db.proposals[index];
      if (!proposal || (proposal.submitterId !== user.id && !canAdmin(user))) return sendError(res, 404, "提案不存在");
      if (proposal.status !== STATUS.DRAFT) return sendError(res, 400, "只允许删除草稿");
      db.proposals.splice(index, 1);
      logOperation(db, user.id, "删除提案草稿", "proposal", proposal.id, proposal, null, req);
      saveDb(db);
      return sendJson(res, { ok: true });
    }

    if (pathParts[1] === "proposals" && pathParts[2] && method === "GET") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal || !visibleProposals(db, user).some((item) => item.id === proposal.id)) return sendError(res, 404, "提案不存在");
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && pathParts[3] === "submit" && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal || proposal.submitterId !== user.id) return sendError(res, 404, "提案不存在");
      if (![STATUS.DRAFT, STATUS.DEPT_REJECTED, STATUS.FINANCE_REJECTED, STATUS.LEAN_REJECTED, STATUS.COMMITTEE_REJECTED].includes(proposal.status)) return sendError(res, 400, "当前状态不可提交");
      const before = { ...proposal };
      proposal.status = STATUS.DEPT_PENDING;
      proposal.submittedAt = now();
      proposal.updatedAt = now();
      logOperation(db, user.id, "重新提交提案", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && ["department-review", "dept-review"].includes(pathParts[3]) && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal) return sendError(res, 404, "提案不存在");
      if (!canDeptReview(user, proposal)) return sendError(res, 403, "无部门评估权限");
      if (![STATUS.DEPT_PENDING, STATUS.RETRIAL].includes(proposal.status)) return sendError(res, 400, "当前状态不可初评");
      const body = await readBody(req);
      const before = { ...proposal };
      const evaluationType = PROPOSAL_EVALUATION_TYPES.includes(body.evaluationType) ? String(body.evaluationType) : (proposal.evaluationType || "正常改善");
      const originalLevel = PROPOSAL_LEVELS.includes(body.originalLevel) ? String(body.originalLevel) : (proposal.originalLevel || proposal.level || "四级");
      const isHorizontalExpansion = body.isHorizontalExpansion === true || body.isHorizontalExpansion === "on" || body.isHorizontalExpansion === "true";
      proposal.evaluationType = evaluationType;
      proposal.originalLevel = originalLevel;
      proposal.level = originalLevel;
      proposal.isHorizontalExpansion = isHorizontalExpansion;
      proposal.rewardLevel = resolveRewardLevel(originalLevel, isHorizontalExpansion);
      proposal.siteConfirmed = body.siteConfirmed === true || body.siteConfirmed === "on" || body.siteConfirmed === "true";
      proposal.siteConfirmedBy = proposal.siteConfirmed ? user.id : "";
      proposal.siteConfirmedAt = proposal.siteConfirmed ? now() : "";
      proposal.siteConfirmNote = String(body.siteConfirmNote || "");
      if (body.result === "reject") {
        if (!body.opinion) return sendError(res, 400, "驳回必须填写原因");
        proposal.status = STATUS.DEPT_REJECTED;
      } else if (evaluationType !== "正常改善") {
        proposal.status = STATUS.INVALID_CLOSED;
        proposal.awardedPoints = 0;
        proposal.pointsBreakdown = calculateProposalPointBreakdown(proposal).items;
      } else {
        if (!proposal.siteConfirmed) return sendError(res, 400, "通过部门评估前必须完成现场确认");
        proposal.status = proposal.benefitType === "财务创效" ? STATUS.FINANCE_PENDING : STATUS.LEAN_PENDING;
      }
      proposal.approvals.push({
        node: "部门评估组初评",
        approverId: user.id,
        result: body.result === "reject" ? "驳回" : (evaluationType !== "正常改善" ? "无效关闭" : "通过"),
        opinion: String(body.opinion || ""),
        evaluationType,
        originalLevel,
        rewardLevel: proposal.rewardLevel,
        siteConfirmed: proposal.siteConfirmed,
        at: now(),
      });
      proposal.updatedAt = now();
      notify(db, proposal.submitterId, "部门评估结果", `提案${body.result === "reject" ? "被驳回" : "已完成部门评估"}`, `提案“${proposal.title}”状态变更为${proposal.status}。`);
      logOperation(db, user.id, "部门评估组初评", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && pathParts[3] === "finance-review" && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal) return sendError(res, 404, "提案不存在");
      if (!canFinance(user)) return sendError(res, 403, "无财务复核权限");
      if (proposal.status !== STATUS.FINANCE_PENDING) return sendError(res, 400, "当前状态不可财务复核");
      const body = await readBody(req);
      const before = { ...proposal };
      if (body.result === "reject") {
        if (!body.opinion) return sendError(res, 400, "驳回必须填写原因");
        proposal.status = STATUS.FINANCE_REJECTED;
      } else {
        proposal.financeAmount = Number(body.financeAmount || proposal.financeAmount || 0);
        proposal.status = STATUS.LEAN_PENDING;
      }
      proposal.financeAttachmentName = String(body.financeAttachmentName || proposal.financeAttachmentName || "");
      proposal.approvals.push({ node: "财务复核", approverId: user.id, result: body.result === "reject" ? "驳回" : "通过", opinion: String(body.opinion || ""), financeAmount: proposal.financeAmount, at: now() });
      proposal.updatedAt = now();
      notify(db, proposal.submitterId, "财务复核结果", `提案${body.result === "reject" ? "被财务驳回" : "已通过财务复核"}`, `提案“${proposal.title}”状态变更为${proposal.status}。`);
      logOperation(db, user.id, "财务复核", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && pathParts[3] === "lean-review" && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal) return sendError(res, 404, "提案不存在");
      if (!canLean(user)) return sendError(res, 403, "无精益办复审权限");
      if (proposal.status !== STATUS.LEAN_PENDING) return sendError(res, 400, "当前状态不可复审");
      const body = await readBody(req);
      const before = { ...proposal };
      if (body.result === "reject") {
        if (!body.opinion) return sendError(res, 400, "驳回必须填写原因");
        proposal.status = STATUS.LEAN_REJECTED;
      } else if (body.result === "return-dept") {
        if (!body.opinion) return sendError(res, 400, "退回部门评估组必须填写原因");
        proposal.status = STATUS.RETRIAL;
      } else {
        const originalLevel = PROPOSAL_LEVELS.includes(body.originalLevel || body.level) ? String(body.originalLevel || body.level) : (proposal.originalLevel || proposal.level || "四级");
        const isHorizontalExpansion = body.isHorizontalExpansion === true || body.isHorizontalExpansion === "on" || body.isHorizontalExpansion === "true";
        proposal.originalLevel = originalLevel;
        proposal.level = originalLevel;
        proposal.isHorizontalExpansion = isHorizontalExpansion;
        proposal.rewardLevel = resolveRewardLevel(originalLevel, isHorizontalExpansion);
        proposal.actualBenefit = String(body.actualBenefit || proposal.actualBenefit || "");
        proposal.committeeRequired = requiresCommittee(proposal.rewardLevel);
        if (proposal.committeeRequired) {
          proposal.committeeStatus = "待核准";
          proposal.status = STATUS.COMMITTEE_PENDING;
        } else {
          proposal.status = STATUS.ARCHIVED;
          distributeProposalPoints(db, proposal, user.id, { addLedger, notify, now });
        }
      }
      proposal.approvals.push({
        node: "精益办复审",
        approverId: user.id,
        result: body.result === "reject" ? "驳回" : (body.result === "return-dept" ? "退回部门评估组" : "通过"),
        opinion: String(body.opinion || ""),
        originalLevel: proposal.originalLevel || proposal.level,
        rewardLevel: proposal.rewardLevel || proposal.level,
        committeeRequired: Boolean(proposal.committeeRequired),
        at: now(),
      });
      proposal.updatedAt = now();
      notify(db, proposal.submitterId, "精益办复审结果", `提案${body.result === "reject" ? "被驳回" : "已通过复审"}`, `提案“${proposal.title}”状态变更为${proposal.status}。`);
      logOperation(db, user.id, "精益办复审", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (pathParts[1] === "proposals" && pathParts[2] && pathParts[3] === "committee-review" && method === "POST") {
      const proposal = db.proposals.find((item) => item.id === pathParts[2]);
      if (!proposal) return sendError(res, 404, "提案不存在");
      if (!canCommittee(user)) return sendError(res, 403, "无评审委员会核准权限");
      if (proposal.status !== STATUS.COMMITTEE_PENDING) return sendError(res, 400, "当前状态不可委员会核准");
      const body = await readBody(req);
      const before = { ...proposal };
      if (body.result === "reject") {
        if (!body.opinion) return sendError(res, 400, "驳回必须填写原因");
        proposal.status = STATUS.COMMITTEE_REJECTED;
        proposal.committeeStatus = "驳回";
      } else if (body.result === "return-dept") {
        if (!body.opinion) return sendError(res, 400, "退回部门评估组必须填写原因");
        proposal.status = STATUS.RETRIAL;
        proposal.committeeStatus = "退回重审";
      } else {
        proposal.status = STATUS.ARCHIVED;
        proposal.committeeStatus = "核准通过";
        distributeProposalPoints(db, proposal, user.id, { addLedger, notify, now });
      }
      proposal.approvals.push({
        node: "评审委员会核准",
        approverId: user.id,
        result: body.result === "reject" ? "驳回" : (body.result === "return-dept" ? "退回部门评估组" : "通过"),
        opinion: String(body.opinion || ""),
        rewardLevel: proposal.rewardLevel || proposal.level,
        at: now(),
      });
      proposal.updatedAt = now();
      notify(db, proposal.submitterId, "委员会核准结果", `提案${proposal.committeeStatus}`, `提案“${proposal.title}”状态变更为${proposal.status}。`);
      logOperation(db, user.id, "评审委员会核准", "proposal", proposal.id, before, proposal, req);
      saveDb(db);
      return sendJson(res, enrichProposal(db, proposal));
    }

    if (url.pathname === "/api/points/account" && method === "GET") {
      const targetUserId = url.searchParams.get("userId") || user.id;
      if (targetUserId !== user.id && !canAdmin(user) && !canLean(user)) return sendError(res, 403, "无权查看该积分账户");
      return sendJson(res, {
        account: accountFor(db, targetUserId),
        ledger: db.pointsLedger.filter((item) => item.userId === targetUserId).slice(0, 100),
      });
    }

    if (url.pathname === "/api/points/annual-clear" && method === "POST") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无年度清零权限");
      const body = await readBody(req);
      const clearAt = String(body.clearAt || now());
      const records = clearAnnualAvailablePoints(db, user.id, clearAt);
      logOperation(db, user.id, "年度积分清零", "points", "annual-clear", null, { clearAt, records: records.length }, req);
      saveDb(db);
      return sendJson(res, { clearAt, records });
    }

    if (url.pathname === "/api/points/annual-clears" && method === "GET") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无年度清零查看权限");
      return sendJson(res, db.annualClears || []);
    }

    if (url.pathname === "/api/points/adjust" && method === "POST") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无积分调整权限");
      const body = await readBody(req);
      if (!body.userId || !Number(body.points) || !body.remark) return sendError(res, 400, "员工、积分和备注必填");
      const points = Number(body.points);
      addLedger(db, body.userId, points > 0 ? POINT_TYPES.MANUAL_ADD : POINT_TYPES.MANUAL_DEDUCT, points, "manual", "", String(body.remark), user.id);
      notify(db, body.userId, "积分调整", points > 0 ? "收到人工奖励积分" : "积分被人工扣减", `${points > 0 ? "增加" : "扣减"} ${Math.abs(points)} 分：${body.remark}`);
      logOperation(db, user.id, "人工调整积分", "points_account", body.userId, null, body, req);
      saveDb(db);
      return sendJson(res, { ok: true, account: accountFor(db, body.userId) });
    }

    if (url.pathname === "/api/gifts" && method === "GET") {
      return sendJson(res, listGifts(db));
    }

    if (url.pathname === "/api/gifts" && method === "POST") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无礼品维护权限");
      const body = await readBody(req);
      if (!body.name || !Number(body.requiredPoints)) return sendError(res, 400, "礼品名称和所需积分必填");
      const gift = upsertGift(db, body, { uid });
      logOperation(db, user.id, "新增礼品", "gift", gift.id, null, gift, req);
      saveDb(db);
      return sendJson(res, gift, 201);
    }

    if (url.pathname === "/api/redemptions" && method === "GET") {
      const rows = listRedemptions(db, user, canAdmin(user) || canLean(user));
      return sendJson(res, rows.map((item) => ({
        ...item,
        userName: userName(db, item.userId),
        deptName: departmentName(db, db.users.find((u) => u.id === item.userId)?.deptId),
        giftName: db.gifts.find((gift) => gift.id === item.giftId)?.name || "-",
      })));
    }

    if (url.pathname === "/api/redemptions" && method === "POST") {
      const body = await readBody(req);
      let redemption;
      try {
        redemption = createRedemption(db, user, body, {
          accountFor,
          now,
          uid,
          notify,
          logOperation: (innerDb, operatorId, action, objectType, objectId, before, after) =>
            logOperation(innerDb, operatorId, action, objectType, objectId, before, after, req),
        });
      } catch (err) {
        return sendError(res, err.message === "礼品不存在或未启用" ? 404 : 400, err.message);
      }
      saveDb(db);
      return sendJson(res, redemption, 201);
    }

    if (pathParts[1] === "redemptions" && pathParts[2] && pathParts[3] === "review" && method === "POST") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无兑换审核权限");
      const body = await readBody(req);
      let redemption;
      try {
        redemption = reviewRedemption(db, user, pathParts[2], body, {
          accountFor,
          now,
          addLedger,
          notify,
          logOperation: (innerDb, operatorId, action, objectType, objectId, before, after) =>
            logOperation(innerDb, operatorId, action, objectType, objectId, before, after, req),
        });
      } catch (err) {
        return sendError(res, err.message === "兑换记录不存在" ? 404 : 400, err.message);
      }
      saveDb(db);
      return sendJson(res, redemption);
    }

    if (pathParts[1] === "redemptions" && pathParts[2] && pathParts[3] === "issue" && method === "POST") {
      if (!canAdmin(user) && !canLean(user)) return sendError(res, 403, "无礼品发放权限");
      let redemption;
      try {
        redemption = issueRedemption(db, user, pathParts[2], {
          now,
          notify,
          logOperation: (innerDb, operatorId, action, objectType, objectId, before, after) =>
            logOperation(innerDb, operatorId, action, objectType, objectId, before, after, req),
        });
      } catch (err) {
        return sendError(res, err.message === "兑换记录不存在" ? 404 : 400, err.message);
      }
      saveDb(db);
      return sendJson(res, redemption);
    }

    if (url.pathname === "/api/reports" && method === "GET") {
      const proposals = visibleProposals(db, user);
      const byDept = {};
      proposals.forEach((proposal) => {
        const key = departmentName(db, proposal.deptId);
        byDept[key] ||= { dept: key, total: 0, approved: 0, rejected: 0, points: 0 };
        byDept[key].total += 1;
        if ([STATUS.APPROVED, STATUS.ARCHIVED].includes(proposal.status)) byDept[key].approved += 1;
        if (proposal.status.includes("驳回")) byDept[key].rejected += 1;
        byDept[key].points += proposal.awardedPoints || 0;
      });
      const employeePoints = db.pointsAccounts.map((account) => ({
        userName: userName(db, account.userId),
        deptName: departmentName(db, db.users.find((u) => u.id === account.userId)?.deptId),
        balance: account.balance,
        totalEarned: account.totalEarned,
        totalDeducted: account.totalDeducted,
      })).sort((a, b) => b.totalEarned - a.totalEarned);
      return sendJson(res, { proposalByDept: Object.values(byDept), employeePoints });
    }

    if (url.pathname === "/api/export/proposals" && method === "GET") {
      const rows = [["提案编号", "标题", "提交人", "部门", "状态", "类型", "等级", "预计积分", "创建时间"]];
      visibleProposals(db, user).forEach((proposal) => rows.push([proposal.proposalNo, proposal.title, userName(db, proposal.submitterId), departmentName(db, proposal.deptId), proposal.status, proposal.benefitType, proposal.level, calculateProposalPoints(proposal), proposal.createdAt]));
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=proposals.csv",
      });
      res.end(`\ufeff${toCsv(rows)}`);
      return;
    }

    if (url.pathname === "/api/logs" && method === "GET") {
      if (!canAdmin(user)) return sendError(res, 403, "无日志查看权限");
      return sendJson(res, db.operationLogs.slice(0, 200).map((item) => ({ ...item, operatorName: userName(db, item.operatorId) })));
    }

    if (url.pathname === "/api/import/users-template" && method === "GET") {
      const rows = [["员工编号", "姓名", "手机号/账号", "部门", "岗位", "角色", "在职状态"], ["E002", "示例员工", "13800000006", "生产部", "操作员", "普通员工", "在职"]];
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=users-template.csv",
      });
      res.end(`\ufeff${toCsv(rows)}`);
      return;
    }

    if (url.pathname === "/api/import/departments-template" && method === "GET") {
      const rows = [["部门名称", "上级部门", "负责人编号", "状态"], ["生产部", "", "D001", "启用"]];
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=departments-template.csv",
      });
      res.end(`\ufeff${toCsv(rows)}`);
      return;
    }

    if (url.pathname === "/api/import/gifts-template" && method === "GET") {
      const rows = [["礼品名称", "所需积分", "参考价值", "初始库存", "季度版本", "状态"], ["品牌抽纸一提", "120", "20", "30", "2026Q2", "启用"]];
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=gifts-template.csv",
      });
      res.end(`\ufeff${toCsv(rows)}`);
      return;
    }

    if (pathParts[1] === "import" && method === "POST") {
      const importTypeMap = {
        users: "users",
        employees: "users",
        departments: "departments",
        gifts: "gifts",
      };
      const type = importTypeMap[pathParts[2]];
      if (type === "users" || type === "departments") {
        if (!canAdmin(user)) return sendError(res, 403, "仅超级管理员可导入组织数据");
      } else if (type === "gifts") {
        if (!requireAdminOrLean(user, res, "无礼品导入权限")) return;
      } else {
        return sendError(res, 404, "导入类型不存在");
      }
      const rows = await readImportRows(req);
      if (!rows.length) return sendError(res, 400, "文件内容为空或缺少表头");
      let created = 0;
      let updated = 0;
      const errors = [];

      if (type === "departments") {
        rows.forEach((row, index) => {
          const name = valueFrom(row, ["部门名称", "1级部门", "2级部门", "部门", "name"]);
          if (!name) {
            errors.push(`第 ${index + 2} 行缺少部门名称`);
            return;
          }
          let dept = db.departments.find((item) => item.name === name);
          const leaderNameOrNo = valueFrom(row, ["负责人编号", "部门主管", "leaderNo"]);
          const leader = db.users.find((item) => item.employeeNo === leaderNameOrNo || item.name === leaderNameOrNo);
          const parent = db.departments.find((item) => item.name === valueFrom(row, ["上级部门", "1级部门", "parentName"]));
          if (!dept) {
            dept = { id: uid("d"), name, parentId: parent?.id || "", leaderId: leader?.id || "", status: valueFrom(row, ["状态", "员工状态", "status"]) || "启用" };
            db.departments.push(dept);
            created += 1;
          } else {
            dept.parentId = parent?.id || dept.parentId || "";
            dept.leaderId = leader?.id || dept.leaderId || "";
            dept.status = valueFrom(row, ["状态", "员工状态", "status"]) || dept.status || "启用";
            updated += 1;
          }
        });
      }

      if (type === "users") {
        const validRoles = new Set(Object.values(ROLES));
        rows.forEach((row, index) => {
          const name = valueFrom(row, ["姓名", "name"]);
          let employeeNo = valueFrom(row, ["员工编号", "工号", "employeeNo"]);
          let phone = valueFrom(row, ["手机号/账号", "手机号", "手机", "phone"]) || employeeNo;
          const role = valueFrom(row, ["角色", "role"]) || ROLES.EMPLOYEE;
          if (!name) {
            errors.push(`第 ${index + 2} 行缺少姓名`);
            return;
          }
          if (!employeeNo) employeeNo = phone || `AUTO_${String(index + 1).padStart(4, "0")}`;
          if (!phone) phone = employeeNo;
          if (!validRoles.has(role)) {
            errors.push(`第 ${index + 2} 行角色无效：${role}`);
            return;
          }
          const deptName = valueFrom(row, ["2级部门", "部门", "1级部门", "department"]);
          const dept = findOrCreateDepartment(db, deptName);
          const rawStatus = valueFrom(row, ["在职状态", "员工状态", "status"]);
          const status = rawStatus === "离职" ? "禁用" : (rawStatus || "在职");
          let target = db.users.find((item) => item.employeeNo === employeeNo);
          if (!target) {
            target = {
              id: uid("u"),
              employeeNo,
              name,
              phone,
              deptId: dept.id,
              post: valueFrom(row, ["岗位", "职位", "post"]),
              role,
              passwordHash: hashPassword(`${employeeNo}@`),
              status,
            };
            db.users.push(target);
            accountFor(db, target.id);
            created += 1;
          } else {
            target.name = name;
            target.phone = phone;
            target.deptId = dept.id;
            target.post = valueFrom(row, ["岗位", "职位", "post"]) || target.post || "";
            target.role = role;
            target.status = status || target.status || "在职";
            updated += 1;
          }
        });
      }

      if (type === "gifts") {
        rows.forEach((row, index) => {
          const name = row["礼品名称"] || row.name;
          const requiredPoints = Number(row["所需积分"] || row.requiredPoints || 0);
          if (!name || !requiredPoints) {
            errors.push(`第 ${index + 2} 行缺少礼品名称或所需积分`);
            return;
          }
          let gift = db.gifts.find((item) => item.name === name && item.quarterVersion === (row["季度版本"] || row.quarterVersion || "未设置"));
          if (!gift) {
            gift = {
              id: uid("g"),
              name,
              requiredPoints,
              referenceValue: Number(row["参考价值"] || row.referenceValue || 0),
              stockQty: Number(row["初始库存"] || row.stockQty || 0),
              reservedQty: 0,
              quarterVersion: row["季度版本"] || row.quarterVersion || "未设置",
              status: row["状态"] || row.status || "启用",
            };
            db.gifts.push(gift);
            created += 1;
          } else {
            gift.requiredPoints = requiredPoints;
            gift.referenceValue = Number(row["参考价值"] || row.referenceValue || gift.referenceValue || 0);
            gift.stockQty = Number(row["初始库存"] || row.stockQty || gift.stockQty || 0);
            gift.status = row["状态"] || row.status || gift.status || "启用";
            updated += 1;
          }
        });
      }

      logOperation(db, user.id, `导入${type}`, "import", type, null, { created, updated, errors }, req);
      syncReviewCommittee(db);
      saveDb(db);
      return sendJson(res, { created, updated, errors });
    }

    return sendError(res, 404, "接口不存在");
  } catch (err) {
    return sendError(res, 500, err.message || "服务器错误");
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url.pathname);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`煜昌电器改善提案系统已启动: http://localhost:${PORT}`);
    console.log("测试账号: A001 / E001 / D001 / F001 / L001，密码为对应工号加 @，如 A001@");
  });
}

module.exports = {
  createServer,
  handleApi,
  loadDb,
  saveDb,
};

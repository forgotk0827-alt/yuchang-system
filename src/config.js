const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.YC_DATA_DIR || path.join(ROOT, "data");
const DB_PATH = process.env.YC_DB_PATH || path.join(DATA_DIR, "db.json");
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_JSON_BODY_SIZE = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".txt"]);

const ROLES = {
  EMPLOYEE: "普通员工",
  DEPT_REVIEWER: "部门评估组",
  FINANCE: "财务复核",
  LEAN_OFFICE: "精益办复审",
  ADMIN: "超级管理员",
};

const STATUS = {
  DRAFT: "草稿",
  DEPT_PENDING: "待部门评估组初评",
  DEPT_REJECTED: "部门评估组驳回",
  FINANCE_PENDING: "待财务复核",
  FINANCE_REJECTED: "财务复核驳回",
  LEAN_PENDING: "待精益办复审",
  LEAN_REJECTED: "精益办复审驳回",
  COMMITTEE_PENDING: "待评审委员会核准",
  COMMITTEE_REJECTED: "评审委员会驳回",
  APPEALING: "申诉中",
  RETRIAL: "重审中",
  INVALID_CLOSED: "无效关闭",
  APPROVED: "复审通过",
  ARCHIVED: "已归档",
};

const PROPOSAL_EVALUATION_TYPES = ["正常改善", "纠错", "复原", "对标"];
const PROPOSAL_LEVELS = ["四级", "三级", "二级", "一级"];
const PROJECT_TYPES = ["普通改善提案", "有效焦点课题"];
const DEFAULT_REVIEW_COMMITTEE_NAMES = ["黄晓鹏", "邵海波", "刘佛生", "钱利民"];

const FOCUS_TOPIC_SCALES = {
  large: { label: "大型课题", leaderPoints: 7000, corePoints: 1000, maxCoreMembers: 3 },
  medium: { label: "中型课题", leaderPoints: 2000, corePoints: 500, maxCoreMembers: 3 },
  small: { label: "小型课题", leaderPoints: 300, corePoints: 0, maxCoreMembers: 0 },
};

const POINT_TYPES = {
  PROPOSAL: "提案通过发分",
  MANUAL_ADD: "人工奖励",
  MANUAL_DEDUCT: "人工扣减",
  REDEEM_RESERVE: "兑换预占",
  REDEEM_RELEASE: "兑换释放",
  REDEEM_DEDUCT: "兑换扣减",
  ANNUAL_CLEAR: "年度清零",
};

module.exports = {
  PORT,
  ROOT,
  PUBLIC_DIR,
  DATA_DIR,
  UPLOAD_DIR,
  DB_PATH,
  MAX_UPLOAD_SIZE,
  MAX_JSON_BODY_SIZE,
  ALLOWED_UPLOAD_EXT,
  ROLES,
  STATUS,
  PROPOSAL_EVALUATION_TYPES,
  PROPOSAL_LEVELS,
  PROJECT_TYPES,
  DEFAULT_REVIEW_COMMITTEE_NAMES,
  FOCUS_TOPIC_SCALES,
  POINT_TYPES,
};

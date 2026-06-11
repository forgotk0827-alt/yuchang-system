const crypto = require("crypto");
const { URL } = require("url");

const { ROLES } = require("./config");
const { sendError } = require("./http");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password) {
  return crypto.createHash("sha256").update(`yuchang:${password}`).digest("hex");
}

function getToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    return url.searchParams.get("access_token") || "";
  } catch (err) {
    return "";
  }
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function findLoginUser(db, account, password) {
  return db.users.find((user) => {
    const sameAccount = user.employeeNo === account || user.phone === account;
    return sameAccount && user.passwordHash === hashPassword(password) && user.status !== "禁用";
  }) || null;
}

function createSession(db, userId, now) {
  const token = crypto.randomBytes(24).toString("hex");
  const createdAt = now;
  const expiresAt = new Date(new Date(now).getTime() + SESSION_TTL_MS).toISOString();
  db.sessions[token] = { userId, createdAt, expiresAt };
  return token;
}

function auth(req, db) {
  const token = getToken(req);
  const session = token && db.sessions[token];
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    delete db.sessions[token];
    return null;
  }
  return db.users.find((user) => user.id === session.userId && user.status !== "禁用") || null;
}

function requireAuth(req, res, db) {
  const user = auth(req, db);
  if (!user) {
    sendError(res, 401, "请先登录");
    return null;
  }
  return user;
}

function canAdmin(user) {
  return user.role === ROLES.ADMIN;
}

function canLean(user) {
  return user.role === ROLES.LEAN_OFFICE || canAdmin(user);
}

function canFinance(user) {
  return user.role === ROLES.FINANCE || canAdmin(user);
}

function canCommittee(user) {
  return Boolean(user.isReviewCommittee) || canLean(user);
}

function validateNewPassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "新密码长度至少 8 位";
  let classes = 0;
  if (/[A-Za-z]/.test(value)) classes += 1;
  if (/\d/.test(value)) classes += 1;
  if (/[^A-Za-z0-9]/.test(value)) classes += 1;
  if (classes < 2) return "新密码必须包含至少两类字符";
  return "";
}

function revokeOtherSessions(db, userId, currentToken) {
  Object.keys(db.sessions || {}).forEach((token) => {
    if (token !== currentToken && db.sessions[token]?.userId === userId) {
      delete db.sessions[token];
    }
  });
}

module.exports = {
  hashPassword,
  getToken,
  publicUser,
  findLoginUser,
  createSession,
  auth,
  requireAuth,
  canAdmin,
  canLean,
  canFinance,
  canCommittee,
  validateNewPassword,
  revokeOtherSessions,
};

const crypto = require("crypto");
const { URL } = require("url");

const { ROLES } = require("./config");
const { sendError } = require("./http");

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
  db.sessions[token] = { userId, createdAt: now };
  return token;
}

function auth(req, db) {
  const token = getToken(req);
  const session = token && db.sessions[token];
  if (!session) return null;
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
};

const test = require("node:test");
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const { createTempDbRoot, login, requestJson, startServer } = require("./helpers");

test("auth module exposes stable password hashing", () => {
  const { hashPassword } = require("../src/auth");

  assert.equal(hashPassword("A001@"), hashPassword("A001@"));
  assert.notEqual(hashPassword("A001@"), hashPassword("A002@"));
});

test("server uses isolated db path for auth requests", async () => {
  const tempRoot = createTempDbRoot();
  const dataDir = path.join(tempRoot, "data");
  const dbPath = path.join(dataDir, "db.json");
  const runtime = await startServer({ dataDir, dbPath });

  try {
    const token = await login(runtime.port, "A001", "A001@");
    assert.ok(token);
    assert.equal(fs.existsSync(dbPath), true);
  } finally {
    await runtime.stop();
  }
});

test("api/me requires token and returns current employee after login", async () => {
  const tempRoot = createTempDbRoot();
  const dataDir = path.join(tempRoot, "data");
  const dbPath = path.join(dataDir, "db.json");
  const runtime = await startServer({ dataDir, dbPath });

  try {
    const unauthorized = await requestJson(runtime.port, "/api/me");
    assert.equal(unauthorized.status, 401);

    const token = await login(runtime.port, "A001", "A001@");
    const me = await requestJson(runtime.port, "/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(me.status, 200);
    assert.equal(me.data.user.employeeNo, "A001");
  } finally {
    await runtime.stop();
  }
});

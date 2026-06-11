const test = require("node:test");
const assert = require("assert/strict");
const path = require("path");

const { createTempDbRoot, login, requestJson, startServer } = require("./helpers");
const {
  calculateFinancePoints,
  calculateProposalPointBreakdown,
  clearAnnualAvailablePoints,
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
    originalLevel: "二级",
    rewardLevel: "三级",
    benefitType: "非财务创效",
    evaluationType: "正常改善",
    isHorizontalExpansion: true,
    participants: [
      { userId: "u1", role: "提出人", ratio: 30 },
      { userId: "u2", role: "实施人", ratio: 70 },
    ],
  });

  assert.equal(breakdown.total, 120);
  assert.equal(breakdown.items.find((item) => item.type === "案例价值积分").points, 100);
});

test("年度清零只清可用积分并保留历史流水", () => {
  const db = {
    pointsAccounts: [{ userId: "u1", balance: 500, reserved: 120, annualPoints: 800, totalEarned: 800, totalDeducted: 300 }],
    pointsLedger: [],
    annualClears: [],
  };

  clearAnnualAvailablePoints(db, "admin", "2026-05-01T24:00:00+08:00");

  assert.equal(db.pointsAccounts[0].balance, 120);
  assert.equal(db.pointsAccounts[0].reserved, 120);
  assert.equal(db.pointsAccounts[0].annualPoints, 0);
  assert.equal(db.pointsAccounts[0].totalEarned, 800);
  assert.equal(db.pointsLedger[0].type, "年度清零");
  assert.equal(db.pointsLedger[0].points, -380);
  assert.equal(db.annualClears[0].clearedPoints, 380);
});

test("积分清零接口只允许精益办或管理员执行", async () => {
  const tempRoot = createTempDbRoot();
  const runtime = await startServer({
    dataDir: path.join(tempRoot, "data"),
    dbPath: path.join(tempRoot, "data", "db.json"),
  });

  try {
    const employeeToken = await login(runtime.port, "E001", "E001@");
    const blocked = await requestJson(runtime.port, "/api/points/annual-clear", {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: {},
    });
    assert.equal(blocked.status, 403);

    const adminToken = await login(runtime.port, "A001", "A001@");
    const cleared = await requestJson(runtime.port, "/api/points/annual-clear", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { clearAt: "2026-05-01T24:00:00+08:00" },
    });
    assert.equal(cleared.status, 200);
    assert.ok(Array.isArray(cleared.data.records));

    const history = await requestJson(runtime.port, "/api/points/annual-clears", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(history.status, 200);
    assert.ok(Array.isArray(history.data));
  } finally {
    await runtime.stop();
  }
});

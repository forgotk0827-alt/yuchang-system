const test = require("node:test");
const assert = require("assert/strict");

const { buildReports } = require("../src/reports");

test("buildReports 返回部门统计和积分排行", () => {
  const db = {
    users: [{ id: "u1", name: "张三", deptId: "d1" }],
    pointsAccounts: [{ userId: "u1", balance: 100, totalEarned: 200, totalDeducted: 50 }],
  };

  const result = buildReports(
    db,
    [{ id: "p1", deptId: "d1", status: "已归档", awardedPoints: 80 }],
    (_db, deptId) => (deptId === "d1" ? "制造部" : "-"),
    (_db, userId) => (userId === "u1" ? "张三" : "-"),
    { APPROVED: "复审通过", ARCHIVED: "已归档" }
  );

  assert.equal(result.proposalByDept[0].dept, "制造部");
  assert.equal(result.proposalByDept[0].approved, 1);
  assert.equal(result.employeePoints[0].userName, "张三");
});

const test = require("node:test");
const assert = require("assert/strict");

const { csvObjects, importData } = require("../src/imports");
const { hashPassword } = require("../src/auth");
const { ROLES } = require("../src/config");

test("csvObjects 解析带表头的员工 CSV", () => {
  const rows = csvObjects("工号,姓名,2级部门\nT001,测试员工,生产部\n");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].工号, "T001");
  assert.equal(rows[0].姓名, "测试员工");
});

test("importData 导入员工时自动建部门并生成默认密码", () => {
  const db = {
    departments: [],
    users: [],
    gifts: [],
    pointsAccounts: [],
  };

  const result = importData(
    db,
    "users",
    [{ 工号: "T001", 姓名: "测试员工", "2级部门": "生产部", 职位: "操作员", 员工状态: "在职", 角色: ROLES.EMPLOYEE }],
    {
      uid: (prefix) => `${prefix}_1`,
      hashPassword,
      accountFor: (innerDb, userId) => {
        const account = { id: `pa_${userId}`, userId, balance: 0, reserved: 0, annualPoints: 0, totalEarned: 0, totalDeducted: 0 };
        innerDb.pointsAccounts.push(account);
        return account;
      },
    }
  );

  assert.equal(result.created, 1);
  assert.equal(db.departments[0].name, "生产部");
  assert.equal(db.users[0].employeeNo, "T001");
  assert.equal(db.users[0].passwordHash, hashPassword("T001@"));
});

const test = require("node:test");
const assert = require("assert/strict");

const { createRedemption, issueRedemption, reviewRedemption } = require("../src/redemptions");

function baseDb() {
  return {
    gifts: [{ id: "g1", name: "抽纸", requiredPoints: 120, stockQty: 2, reservedQty: 0, status: "启用" }],
    pointsAccounts: [{ userId: "u1", balance: 200, reserved: 0, annualPoints: 200, totalEarned: 200, totalDeducted: 0 }],
    pointsLedger: [],
    redemptions: [],
  };
}

test("提交兑换申请时预占库存但不立即扣积分", () => {
  const db = baseDb();
  const redemption = createRedemption(
    db,
    { id: "u1", name: "张三" },
    { giftId: "g1", quantity: 1, remark: "" },
    {
      accountFor: (innerDb, userId) => innerDb.pointsAccounts.find((item) => item.userId === userId),
      now: () => "2026-06-11T00:00:00.000Z",
      uid: (prefix) => `${prefix}_1`,
      notify: () => {},
      logOperation: () => {},
    }
  );

  assert.equal(redemption.status, "待审核");
  assert.equal(db.gifts[0].reservedQty, 1);
  assert.equal(db.pointsAccounts[0].reserved, 120);
  assert.equal(db.pointsAccounts[0].balance, 200);
});

test("审核驳回释放预占库存", () => {
  const db = baseDb();
  db.gifts[0].reservedQty = 1;
  db.pointsAccounts[0].reserved = 120;
  db.redemptions.push({ id: "r1", userId: "u1", giftId: "g1", points: 120, quantity: 1, status: "待审核", receiveStatus: "未发放" });

  reviewRedemption(
    db,
    { id: "admin", name: "管理员" },
    "r1",
    { result: "reject", opinion: "库存盘点异常" },
    {
      accountFor: (innerDb, userId) => innerDb.pointsAccounts.find((item) => item.userId === userId),
      now: () => "2026-06-11T00:00:00.000Z",
      addLedger: () => {},
      notify: () => {},
      logOperation: () => {},
    }
  );

  assert.equal(db.redemptions[0].status, "已驳回");
  assert.equal(db.gifts[0].reservedQty, 0);
  assert.equal(db.pointsAccounts[0].reserved, 0);
});

test("审核通过扣减积分并减少库存", () => {
  const db = baseDb();
  db.gifts[0].reservedQty = 1;
  db.pointsAccounts[0].reserved = 120;
  db.redemptions.push({ id: "r1", userId: "u1", giftId: "g1", points: 120, quantity: 1, status: "待审核", receiveStatus: "未发放" });

  reviewRedemption(
    db,
    { id: "admin", name: "管理员" },
    "r1",
    { result: "approve", opinion: "" },
    {
      accountFor: (innerDb, userId) => innerDb.pointsAccounts.find((item) => item.userId === userId),
      now: () => "2026-06-11T00:00:00.000Z",
      addLedger: (innerDb, userId, type, points) => innerDb.pointsLedger.unshift({ userId, type, points }),
      notify: () => {},
      logOperation: () => {},
    }
  );

  assert.equal(db.redemptions[0].status, "已通过");
  assert.equal(db.redemptions[0].receiveStatus, "待发放");
  assert.equal(db.gifts[0].reservedQty, 0);
  assert.equal(db.gifts[0].stockQty, 1);
  assert.equal(db.pointsAccounts[0].reserved, 0);
  assert.equal(db.pointsAccounts[0].balance, 80);
});

test("发放登记只允许已通过记录进入已发放", () => {
  const db = baseDb();
  db.redemptions.push({ id: "r1", userId: "u1", giftId: "g1", points: 120, quantity: 1, status: "已通过", receiveStatus: "待发放" });

  issueRedemption(
    db,
    { id: "admin", name: "管理员" },
    "r1",
    {
      now: () => "2026-06-11T00:00:00.000Z",
      notify: () => {},
      logOperation: () => {},
    }
  );

  assert.equal(db.redemptions[0].receiveStatus, "已发放");
  assert.equal(db.redemptions[0].status, "已通过");
});

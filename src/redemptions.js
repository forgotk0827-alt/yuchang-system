const { POINT_TYPES } = require("./config");

const REDEMPTION_STATUS = {
  pending: "待审核",
  rejected: "已驳回",
  approved: "已通过",
};

function createRedemption(db, user, body, helpers) {
  const gift = db.gifts.find((item) => item.id === body.giftId && item.status === "启用");
  if (!gift) throw new Error("礼品不存在或未启用");

  const quantity = Math.max(1, Number(body.quantity || 1));
  const availableStock = gift.stockQty - gift.reservedQty;
  if (availableStock < quantity) throw new Error("库存不足");

  const required = gift.requiredPoints * quantity;
  const account = helpers.accountFor(db, user.id);
  if (account.balance - account.reserved < required) throw new Error("可用积分不足");

  account.reserved += required;
  gift.reservedQty += quantity;

  const redemption = {
    id: helpers.uid("rd"),
    userId: user.id,
    giftId: gift.id,
    points: required,
    quantity,
    status: REDEMPTION_STATUS.pending,
    receiveStatus: "未发放",
    remark: String(body.remark || ""),
    createdAt: helpers.now(),
    updatedAt: helpers.now(),
  };

  db.redemptions.unshift(redemption);
  helpers.notify(db, user.id, "兑换申请", "兑换申请已提交", `礼品“${gift.name}”已预占 ${required} 积分，等待审核。`);
  helpers.logOperation(db, user.id, "提交兑换申请", "redemption", redemption.id, null, redemption);
  return redemption;
}

function reviewRedemption(db, reviewer, redemptionId, body, helpers) {
  const redemption = db.redemptions.find((item) => item.id === redemptionId);
  if (!redemption) throw new Error("兑换记录不存在");
  if (redemption.status !== REDEMPTION_STATUS.pending) throw new Error("当前状态不可审核");

  const gift = db.gifts.find((item) => item.id === redemption.giftId);
  const account = helpers.accountFor(db, redemption.userId);
  const before = { ...redemption };

  if (body.result === "reject") {
    account.reserved -= redemption.points;
    if (gift) gift.reservedQty -= redemption.quantity;
    redemption.status = REDEMPTION_STATUS.rejected;
    redemption.reviewOpinion = String(body.opinion || "不通过");
    if (helpers.addLedger) {
      helpers.addLedger(db, redemption.userId, POINT_TYPES.REDEEM_RELEASE, 0, "redemption", redemption.id, "兑换驳回释放预占积分", reviewer.id);
    }
  } else {
    account.reserved -= redemption.points;
    account.balance -= redemption.points;
    account.totalDeducted += redemption.points;
    if (gift) {
      gift.reservedQty -= redemption.quantity;
      gift.stockQty -= redemption.quantity;
    }
    if (helpers.addLedger) {
      helpers.addLedger(db, redemption.userId, POINT_TYPES.REDEEM_DEDUCT, -redemption.points, "redemption", redemption.id, "兑换审核通过扣减积分", reviewer.id);
    }
    redemption.status = REDEMPTION_STATUS.approved;
    redemption.receiveStatus = "待发放";
  }

  redemption.reviewerId = reviewer.id;
  redemption.reviewedAt = helpers.now();
  redemption.updatedAt = helpers.now();
  helpers.notify(db, redemption.userId, "兑换审核结果", `兑换${redemption.status}`, body.result === "reject" ? redemption.reviewOpinion : "兑换审核通过，等待发放。");
  helpers.logOperation(db, reviewer.id, "兑换审核", "redemption", redemption.id, before, redemption);
  return redemption;
}

function issueRedemption(db, issuer, redemptionId, helpers) {
  const redemption = db.redemptions.find((item) => item.id === redemptionId);
  if (!redemption) throw new Error("兑换记录不存在");
  if (redemption.status !== REDEMPTION_STATUS.approved) throw new Error("当前状态不可发放");

  const before = { ...redemption };
  redemption.receiveStatus = "已发放";
  redemption.issuedAt = helpers.now();
  redemption.issuerId = issuer.id;
  redemption.updatedAt = helpers.now();
  helpers.notify(db, redemption.userId, "礼品发放", "兑换礼品已发放", "请按通知领取礼品。");
  helpers.logOperation(db, issuer.id, "礼品发放确认", "redemption", redemption.id, before, redemption);
  return redemption;
}

function listGifts(db) {
  return db.gifts;
}

function listRedemptions(db, user, canManage) {
  const rows = canManage ? db.redemptions : db.redemptions.filter((item) => item.userId === user.id);
  return rows;
}

function upsertGift(db, body, helpers) {
  const gift = {
    id: helpers.uid("g"),
    name: String(body.name),
    requiredPoints: Number(body.requiredPoints),
    referenceValue: Number(body.referenceValue || 0),
    stockQty: Number(body.stockQty || 0),
    reservedQty: 0,
    quarterVersion: String(body.quarterVersion || "未设置"),
    status: String(body.status || "启用"),
  };
  db.gifts.unshift(gift);
  return gift;
}

module.exports = {
  REDEMPTION_STATUS,
  createRedemption,
  reviewRedemption,
  issueRedemption,
  listGifts,
  listRedemptions,
  upsertGift,
};

const { FOCUS_TOPIC_SCALES, POINT_TYPES, PROPOSAL_LEVELS } = require("./config");

function calculateFinancePoints(amount) {
  const numeric = Number(amount || 0);
  if (numeric <= 0) return 0;
  if (numeric <= 2000) return Math.round(numeric * 0.01);
  if (numeric <= 20000) return Math.round(20 + (numeric - 2000) * 0.02);
  return Math.round(380 + (numeric - 20000) * 0.03);
}

function calculateProposalPointBreakdown(proposal) {
  if (proposal.projectType === "有效焦点课题") {
    const scale = FOCUS_TOPIC_SCALES[proposal.focusTopicScale] || FOCUS_TOPIC_SCALES.small;
    const coreCount = (proposal.participants || [])
      .filter((participant) => participant.role === "核心组员")
      .slice(0, scale.maxCoreMembers).length;
    const items = [
      { type: "有效焦点课题", project: `${scale.label} / 课题组长奖励`, points: scale.leaderPoints, distributionMode: "focus_leader" },
    ];
    if (scale.corePoints > 0 && coreCount > 0) {
      items.push({
        type: "有效焦点课题",
        project: `${scale.label} / 核心组员奖励（最多${scale.maxCoreMembers}人）`,
        points: scale.corePoints * coreCount,
        distributionMode: "focus_core",
      });
    }
    return { items, total: items.reduce((sum, item) => sum + item.points, 0) };
  }

  if (proposal.evaluationType && proposal.evaluationType !== "正常改善") {
    return {
      items: [{ type: "判定结果", project: `${proposal.evaluationType}类项目不纳入改善提案积分`, points: 0, distributionMode: "none" }],
      total: 0,
    };
  }

  const items = [
    { type: "基础参与积分", project: "有效改善提案", points: 20, distributionMode: "participant_ratio" },
  ];
  const levelMap = { "四级": 60, "三级": 100, "二级": 200, "一级": 400 };
  const rewardLevel = proposal.rewardLevel || proposal.level;
  const levelPoints = levelMap[rewardLevel] || 0;

  if (levelPoints > 0) {
    const project = proposal.isHorizontalExpansion
      ? `水平展开项目：原评${proposal.originalLevel || proposal.level}，奖励按${rewardLevel}`
      : `提案实施效果评级：${rewardLevel}`;
    items.push({ type: "案例价值积分", project, points: levelPoints, distributionMode: "participant_ratio" });
  }

  if (proposal.benefitType === "财务创效") {
    const financePoints = calculateFinancePoints(proposal.financeAmount || 0);
    if (financePoints > 0) {
      items.push({ type: "专项激励积分", project: "财务创效奖励", points: financePoints, distributionMode: "leader_allocated" });
    }
  }

  return { items, total: items.reduce((sum, item) => sum + item.points, 0) };
}

function aggregateDistribution(points, participants) {
  const rows = participants?.length ? participants : [];
  if (!rows.length) return [];
  const allocations = new Map();
  let distributed = 0;

  rows.forEach((participant, index) => {
    const isLast = index === rows.length - 1;
    const share = isLast ? points - distributed : Math.round(points * Number(participant.ratio || 0) / 100);
    distributed += share;
    if (share <= 0) return;
    const current = allocations.get(participant.userId) || { userId: participant.userId, points: 0, roles: [] };
    current.points += share;
    current.roles.push(participant.role);
    allocations.set(participant.userId, current);
  });

  return Array.from(allocations.values());
}

function focusTopicDistribution(item, proposal) {
  const scale = FOCUS_TOPIC_SCALES[proposal.focusTopicScale] || FOCUS_TOPIC_SCALES.small;
  const participants = proposal.participants || [];
  const leader = participants.find((participant) => participant.role === "课题组长") || { userId: proposal.submitterId, role: "课题组长" };

  if (item.distributionMode === "focus_leader") {
    return [{ userId: leader.userId, points: scale.leaderPoints, roles: ["课题组长"] }];
  }

  return participants
    .filter((participant) => participant.role === "核心组员" && participant.userId !== leader.userId)
    .slice(0, scale.maxCoreMembers)
    .map((participant) => ({ userId: participant.userId, points: scale.corePoints, roles: ["核心组员"] }));
}

function addLedger(db, getAccount, now, userId, type, points, sourceType, sourceId, remark, operatorId) {
  const account = getAccount(db, userId);
  account.balance += points;
  if (points > 0) {
    account.totalEarned += points;
    account.annualPoints += points;
  } else {
    account.totalDeducted += Math.abs(points);
  }

  const ledger = {
    id: `pl_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`,
    userId,
    type,
    points,
    sourceType,
    sourceId,
    balanceAfter: account.balance,
    remark,
    operatorId,
    createdAt: now(),
  };
  db.pointsLedger.unshift(ledger);
  return ledger;
}

function distributeProposalPoints(db, proposal, operatorId, helpers) {
  if (proposal.pointsIssuedAt) return;

  const breakdown = calculateProposalPointBreakdown(proposal);
  const participantDistribution = proposal.participants?.length
    ? proposal.participants
    : [{ userId: proposal.submitterId, role: "提出人", ratio: 100 }];

  breakdown.items.forEach((item) => {
    if (item.distributionMode?.startsWith("focus_")) {
      focusTopicDistribution(item, proposal).forEach((allocation) => {
        if (allocation.points <= 0) return;
        helpers.addLedger(
          db,
          allocation.userId,
          POINT_TYPES.PROPOSAL,
          allocation.points,
          "proposal",
          proposal.id,
          `${proposal.proposalNo} ${proposal.title} ${item.type}/${item.project} ${allocation.roles.join("、")}`,
          operatorId
        );
        helpers.notify(db, allocation.userId, "积分到账", "有效焦点课题积分到账", `课题“${proposal.title}”${item.project}到账 ${allocation.points} 分。`);
      });
      return;
    }

    const distribution = item.distributionMode === "leader_allocated" && proposal.financeDistribution?.length
      ? proposal.financeDistribution
      : participantDistribution;

    aggregateDistribution(item.points, distribution).forEach((allocation) => {
      helpers.addLedger(
        db,
        allocation.userId,
        POINT_TYPES.PROPOSAL,
        allocation.points,
        "proposal",
        proposal.id,
        `${proposal.proposalNo} ${proposal.title} ${item.type}/${item.project} ${allocation.roles.join("、")}`,
        operatorId
      );
      helpers.notify(db, allocation.userId, "积分到账", "改善提案积分到账", `提案“${proposal.title}”${item.project}到账 ${allocation.points} 分。`);
    });
  });

  proposal.awardedPoints = breakdown.total;
  proposal.pointsBreakdown = breakdown.items;
  proposal.pointsIssuedAt = helpers.now();
}

function clearAnnualAvailablePoints(db, operatorId, clearAt) {
  db.annualClears ||= [];
  const records = [];

  for (const account of db.pointsAccounts || []) {
    const available = Math.max(0, Number(account.balance || 0) - Number(account.reserved || 0));
    if (available <= 0) {
      account.annualPoints = 0;
      continue;
    }

    account.balance -= available;
    account.annualPoints = 0;

    const ledger = {
      id: `pl_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`,
      userId: account.userId,
      type: POINT_TYPES.ANNUAL_CLEAR,
      points: -available,
      sourceType: "annual-clear",
      sourceId: "",
      balanceAfter: account.balance,
      remark: "年度清零扣减可用积分",
      operatorId,
      createdAt: clearAt,
    };
    db.pointsLedger.unshift(ledger);

    const record = {
      id: `clear_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`,
      userId: account.userId,
      clearedPoints: available,
      balanceAfter: account.balance,
      reservedAfter: account.reserved,
      operatorId,
      clearedAt: clearAt,
    };
    db.annualClears.unshift(record);
    records.push(record);
  }

  return records;
}

function calculateProposalPoints(proposal) {
  return calculateProposalPointBreakdown(proposal).total;
}

function levelIndex(level) {
  return PROPOSAL_LEVELS.indexOf(level);
}

function downgradeLevel(level) {
  const index = levelIndex(level);
  return index > 0 ? PROPOSAL_LEVELS[index - 1] : "四级";
}

function resolveRewardLevel(originalLevel, isHorizontalExpansion) {
  const level = PROPOSAL_LEVELS.includes(originalLevel) ? originalLevel : "四级";
  return isHorizontalExpansion ? downgradeLevel(level) : level;
}

function requiresCommittee(level) {
  return ["二级", "一级"].includes(level);
}

module.exports = {
  calculateFinancePoints,
  calculateProposalPointBreakdown,
  calculateProposalPoints,
  aggregateDistribution,
  focusTopicDistribution,
  addLedger,
  distributeProposalPoints,
  clearAnnualAvailablePoints,
  resolveRewardLevel,
  requiresCommittee,
};

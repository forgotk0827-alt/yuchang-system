function buildReports(db, visibleProposals, departmentName, userName, status) {
  const proposals = visibleProposals;
  const byDept = {};
  proposals.forEach((proposal) => {
    const key = departmentName(db, proposal.deptId);
    byDept[key] ||= { dept: key, total: 0, approved: 0, rejected: 0, points: 0 };
    byDept[key].total += 1;
    if ([status.APPROVED, status.ARCHIVED].includes(proposal.status)) byDept[key].approved += 1;
    if (proposal.status.includes("驳回")) byDept[key].rejected += 1;
    byDept[key].points += proposal.awardedPoints || 0;
  });

  const employeePoints = db.pointsAccounts
    .map((account) => ({
      userName: userName(db, account.userId),
      deptName: departmentName(db, db.users.find((user) => user.id === account.userId)?.deptId),
      balance: account.balance,
      totalEarned: account.totalEarned,
      totalDeducted: account.totalDeducted,
    }))
    .sort((a, b) => b.totalEarned - a.totalEarned);

  return {
    proposalByDept: Object.values(byDept),
    employeePoints,
  };
}

module.exports = {
  buildReports,
};

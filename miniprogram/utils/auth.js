function currentUser() {
  return wx.getStorageSync("yc_user") || {};
}

function role() {
  return currentUser().role || "";
}

function canAdmin() {
  return role() === "超级管理员";
}

function canLean() {
  return ["精益办复审", "超级管理员"].includes(role());
}

function canFinance() {
  return ["财务复核", "超级管理员"].includes(role());
}

function canCommittee() {
  const user = currentUser();
  return Boolean(user.isReviewCommittee || canLean());
}

function canDeptReview(proposal) {
  const user = currentUser();
  return canAdmin() || (user.role === "部门评估组" && user.deptId === proposal.deptId);
}

module.exports = {
  currentUser,
  role,
  canAdmin,
  canLean,
  canFinance,
  canCommittee,
  canDeptReview
};

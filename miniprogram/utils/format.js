function statusClass(status) {
  if (!status) return "";
  if (status.includes("驳回") || status.includes("无效")) return "status-danger";
  if (status.includes("待")) return "status-warn";
  return "";
}

function points(value) {
  return `${Number(value || 0)} 分`;
}

module.exports = {
  statusClass,
  points
};

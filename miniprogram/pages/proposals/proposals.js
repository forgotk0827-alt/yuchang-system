const { request, ensureLogin, toast } = require("../../utils/api");
const { currentUser, canAdmin, canLean, canFinance } = require("../../utils/auth");
const { statusClass } = require("../../utils/format");

function canEdit(item, user) {
  return item.submitterId === user.id && ["草稿", "部门评估组驳回", "财务复核驳回", "精益办复审驳回", "评审委员会驳回"].includes(item.status);
}

Page({
  data: {
    allItems: [],
    items: [],
    activeTab: "mine",
    tabs: [
      { key: "mine", label: "我的提案" },
      { key: "draft", label: "草稿" },
      { key: "pending", label: "待我审批" }
    ]
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const user = currentUser();
      const rows = await request("/api/proposals");
      const allItems = rows.map((item) => ({
        ...item,
        statusClass: statusClass(item.status),
        canEdit: canEdit(item, user),
        canDelete: item.submitterId === user.id && item.status === "草稿"
      }));
      this.setData({ allItems });
      this.applyFilter();
    } catch (err) {
      toast(err.message);
    }
  },

  applyFilter() {
    const user = currentUser();
    const { activeTab, allItems } = this.data;
    const items = allItems.filter((item) => {
      if (activeTab === "draft") return item.status === "草稿" && item.submitterId === user.id;
      if (activeTab === "pending") return this.isPendingForUser(item, user);
      return item.submitterId === user.id || (item.participants || []).some((participant) => participant.userId === user.id);
    });
    this.setData({ items });
  },

  isPendingForUser(item, user) {
    if (canAdmin()) return ["待部门评估组初评", "待财务复核", "待精益办复审", "待评审委员会核准"].includes(item.status);
    if (user.role === "部门评估组") return item.status === "待部门评估组初评" && item.deptId === user.deptId;
    if (canFinance()) return item.status === "待财务复核";
    if (canLean()) return ["待精益办复审", "待评审委员会核准"].includes(item.status);
    if (user.isReviewCommittee) return item.status === "待评审委员会核准";
    return false;
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key });
    this.applyFilter();
  },

  newProposal() {
    wx.navigateTo({ url: "/pages/proposal-form/proposal-form" });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/proposal-detail/proposal-detail?id=${event.currentTarget.dataset.id}` });
  },

  editProposal(event) {
    wx.navigateTo({ url: `/pages/proposal-form/proposal-form?id=${event.currentTarget.dataset.id}` });
  },

  deleteDraft(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除草稿",
      content: "确认删除这条草稿？删除后不可恢复。",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request(`/api/proposals/${id}`, { method: "DELETE" });
          toast("草稿已删除");
          this.load();
        } catch (err) {
          toast(err.message);
        }
      }
    });
  }
});

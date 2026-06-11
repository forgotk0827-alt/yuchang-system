const { request, ensureLogin, toast } = require("../../utils/api");
const { statusClass } = require("../../utils/format");

Page({
  data: {
    user: {},
    cards: [],
    recentProposals: [],
    notifications: [],
    canManage: false
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const data = await request("/api/dashboard");
      const user = wx.getStorageSync("yc_user") || {};
      this.setData({
        user,
        cards: data.cards || [],
        recentProposals: (data.recentProposals || []).map((item) => ({ ...item, statusClass: statusClass(item.status) })),
        notifications: data.notifications || [],
        canManage: ["超级管理员", "精益办复审"].includes(user.role)
      });
    } catch (err) {
      toast(err.message);
    }
  },

  newProposal() {
    wx.navigateTo({ url: "/pages/proposal-form/proposal-form" });
  },

  goProposals() {
    wx.switchTab({ url: "/pages/proposals/proposals" });
  },

  openProposal(event) {
    wx.navigateTo({ url: `/pages/proposal-detail/proposal-detail?id=${event.currentTarget.dataset.id}` });
  },

  openAdmin() {
    wx.navigateTo({ url: "/pages/admin/admin" });
  }
});

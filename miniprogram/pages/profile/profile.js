const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    user: {},
    department: "",
    canImport: false
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const data = await request("/api/me");
      const user = data.user || {};
      this.setData({
        user,
        department: data.department || "",
        canImport: ["超级管理员", "精益办复审"].includes(user.role)
      });
      wx.setStorageSync("yc_user", data.user);
    } catch (err) {
      toast(err.message);
    }
  },

  openImport() {
    wx.navigateTo({ url: "/pages/admin-import/admin-import" });
  },

  async logout() {
    try {
      await request("/api/logout", { method: "POST" });
    } catch {
      // Local cleanup still matters if the server session already expired.
    }
    wx.removeStorageSync("yc_token");
    wx.removeStorageSync("yc_user");
    wx.reLaunch({ url: "/pages/login/login" });
  }
});

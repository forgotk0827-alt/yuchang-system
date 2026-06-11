const { request, toast } = require("../../utils/api");

Page({
  data: {
    account: "A001",
    password: "A001@",
    loading: false
  },

  onLoad() {
    if (wx.getStorageSync("yc_token")) {
      wx.switchTab({ url: "/pages/dashboard/dashboard" });
    }
  },

  onInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },

  async login() {
    if (!this.data.account || !this.data.password) {
      toast("请输入账号和密码");
      return;
    }
    this.setData({ loading: true });
    try {
      const data = await request("/api/login", {
        method: "POST",
        data: { account: this.data.account, password: this.data.password }
      });
      wx.setStorageSync("yc_token", data.token);
      wx.setStorageSync("yc_user", data.user);
      getApp().globalData.user = data.user;
      wx.switchTab({ url: "/pages/dashboard/dashboard" });
    } catch (err) {
      toast(err.message);
    } finally {
      this.setData({ loading: false });
    }
  }
});

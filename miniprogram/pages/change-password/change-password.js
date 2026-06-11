const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    form: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  },

  onShow() {
    ensureLogin();
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  async submit() {
    const { oldPassword, newPassword, confirmPassword } = this.data.form;
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast("请填写完整");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("两次输入的新密码不一致");
      return;
    }
    try {
      await request("/api/change-password", {
        method: "POST",
        data: { oldPassword, newPassword }
      });
      toast("密码已修改，请重新登录");
      wx.removeStorageSync("yc_token");
      wx.removeStorageSync("yc_user");
      wx.reLaunch({ url: "/pages/login/login" });
    } catch (err) {
      toast(err.message);
    }
  }
});

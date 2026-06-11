const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    users: []
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const users = await request("/api/admin/users");
      this.setData({ users: users || [] });
    } catch (err) {
      toast(err.message);
    }
  }
});

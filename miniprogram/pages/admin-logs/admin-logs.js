const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    logs: []
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const logs = await request("/api/logs");
      this.setData({ logs: logs || [] });
    } catch (err) {
      toast(err.message);
    }
  }
});

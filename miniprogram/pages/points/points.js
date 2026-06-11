const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    account: {},
    ledger: []
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const data = await request("/api/points/account");
      this.setData({ account: data.account || {}, ledger: data.ledger || [] });
    } catch (err) {
      toast(err.message);
    }
  }
});

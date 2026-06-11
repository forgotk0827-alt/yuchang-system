const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    proposalByDept: [],
    employeePoints: []
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const data = await request("/api/reports");
      this.setData({
        proposalByDept: data.proposalByDept || [],
        employeePoints: data.employeePoints || []
      });
    } catch (err) {
      toast(err.message);
    }
  }
});

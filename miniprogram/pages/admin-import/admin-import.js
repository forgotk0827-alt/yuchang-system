const { upload, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    result: null,
    loading: false
  },

  onShow() {
    ensureLogin();
  },

  async chooseEmployeeFile() {
    if (this.data.loading) return;
    try {
      this.setData({ loading: true });
      const result = await wx.chooseMessageFile({
        count: 1,
        type: "file",
        extension: ["xls", "xlsx", "csv"]
      });
      const file = (result.tempFiles || [])[0];
      if (!file) {
        this.setData({ loading: false });
        return;
      }
      const data = await upload("/api/import/employees", file.path, "file");
      this.setData({ result: data, loading: false });
      toast(`导入完成：新增 ${data.created}，更新 ${data.updated}`);
    } catch (err) {
      this.setData({ loading: false });
      toast(err.message);
    }
  }
});

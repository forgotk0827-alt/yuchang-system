const { request, ensureLogin, toast } = require("../../utils/api");

Page({
  data: {
    gifts: [],
    redemptions: []
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const [gifts, redemptions] = await Promise.all([request("/api/gifts"), request("/api/redemptions")]);
      this.setData({
        gifts: (gifts || []).filter((item) => item.status === "启用").map((item) => ({
          ...item,
          availableStock: Number(item.stockQty || 0) - Number(item.reservedQty || 0)
        })),
        redemptions: redemptions || []
      });
    } catch (err) {
      toast(err.message);
    }
  },

  redeem(event) {
    const giftId = event.currentTarget.dataset.id;
    wx.showModal({
      title: "确认兑换",
      content: "确认兑换 1 件该礼品？",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request("/api/redemptions", { method: "POST", data: { giftId, quantity: 1 } });
          toast("兑换申请已提交");
          this.load();
        } catch (err) {
          toast(err.message);
        }
      }
    });
  }
});

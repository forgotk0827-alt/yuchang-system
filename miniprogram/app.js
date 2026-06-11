App({
  globalData: {
    baseUrl: "http://127.0.0.1:3000",
    user: null
  },

  onLaunch() {
    const token = wx.getStorageSync("yc_token");
    const user = wx.getStorageSync("yc_user");
    if (token && user) {
      this.globalData.user = user;
    }
  }
});

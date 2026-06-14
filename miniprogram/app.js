App({
  globalData: {
    baseUrl: "https://api.takenow.com",
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

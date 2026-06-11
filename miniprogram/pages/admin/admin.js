Page({
  data: {
    items: [
      { key: "users", label: "员工管理", url: "/pages/admin-users/admin-users" },
      { key: "import", label: "员工导入", url: "/pages/admin-import/admin-import" },
      { key: "reports", label: "报表中心", url: "/pages/admin-reports/admin-reports" },
      { key: "logs", label: "操作日志", url: "/pages/admin-logs/admin-logs" }
    ]
  },

  openPage(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url });
  }
});

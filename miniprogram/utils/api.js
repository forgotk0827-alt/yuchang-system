const app = getApp();

function token() {
  return wx.getStorageSync("yc_token") || "";
}

function request(path, options = {}) {
  const header = Object.assign({ "Content-Type": "application/json" }, options.header || {});
  if (token()) header.Authorization = `Bearer ${token()}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${path}`,
      method: options.method || "GET",
      data: options.data || {},
      header,
      success(res) {
        if (res.statusCode === 401) {
          if (path === "/api/login") {
            reject(new Error(res.data?.error || "账号或密码错误"));
            return;
          }
          wx.removeStorageSync("yc_token");
          wx.removeStorageSync("yc_user");
          wx.reLaunch({ url: "/pages/login/login" });
          reject(new Error("登录已失效"));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data?.error || "请求失败"));
          return;
        }
        resolve(res.data);
      },
      fail() {
        reject(new Error("网络请求失败"));
      }
    });
  });
}

function upload(path, filePath, name = "file", formData = {}) {
  const header = token() ? { Authorization: `Bearer ${token()}` } : {};
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${app.globalData.baseUrl}${path}`,
      filePath,
      name,
      formData,
      header,
      success(res) {
        let data = {};
        try {
          data = res.data ? JSON.parse(res.data) : {};
        } catch (err) {
          reject(new Error("响应解析失败"));
          return;
        }
        if (res.statusCode === 401) {
          if (path === "/api/login") {
            reject(new Error(data.error || "账号或密码错误"));
            return;
          }
          wx.removeStorageSync("yc_token");
          wx.removeStorageSync("yc_user");
          wx.reLaunch({ url: "/pages/login/login" });
          reject(new Error("登录已失效"));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error || "上传失败"));
          return;
        }
        resolve(data);
      },
      fail() {
        reject(new Error("网络请求失败"));
      }
    });
  });
}

function ensureLogin() {
  if (!token()) {
    wx.reLaunch({ url: "/pages/login/login" });
    return false;
  }
  return true;
}

function toast(title) {
  wx.showToast({ title, icon: "none" });
}

module.exports = { request, upload, ensureLogin, toast };

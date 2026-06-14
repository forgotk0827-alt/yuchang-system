const test = require("node:test");
const assert = require("assert/strict");

function loadApiModule() {
  delete require.cache[require.resolve("../miniprogram/utils/api")];
  return require("../miniprogram/utils/api");
}

test("login 接口返回 401 时保留后端错误信息，不提示登录已失效", async () => {
  const removedKeys = [];
  let relaunchedUrl = "";

  global.getApp = () => ({
    globalData: {
      baseUrl: "https://api.takenow.com",
    },
  });

  global.wx = {
    getStorageSync(key) {
      if (key === "yc_token") return "token";
      return "";
    },
    removeStorageSync(key) {
      removedKeys.push(key);
    },
    reLaunch({ url }) {
      relaunchedUrl = url;
    },
    request(options) {
      options.success({
        statusCode: 401,
        data: { error: "账号或密码错误" },
      });
    },
  };

  const { request } = loadApiModule();

  await assert.rejects(
    request("/api/login", { method: "POST", data: { account: "YC000001", password: "YC000001@" } }),
    /账号或密码错误/
  );
  assert.deepEqual(removedKeys, []);
  assert.equal(relaunchedUrl, "");
});

test("非登录接口返回 401 时清理登录态并跳转登录页", async () => {
  const removedKeys = [];
  let relaunchedUrl = "";

  global.getApp = () => ({
    globalData: {
      baseUrl: "https://api.takenow.com",
    },
  });

  global.wx = {
    getStorageSync(key) {
      if (key === "yc_token") return "token";
      return "";
    },
    removeStorageSync(key) {
      removedKeys.push(key);
    },
    reLaunch({ url }) {
      relaunchedUrl = url;
    },
    request(options) {
      options.success({
        statusCode: 401,
        data: { error: "请先登录" },
      });
    },
  };

  const { request } = loadApiModule();

  await assert.rejects(request("/api/me"), /登录已失效/);
  assert.deepEqual(removedKeys, ["yc_token", "yc_user"]);
  assert.equal(relaunchedUrl, "/pages/login/login");
});

const http = require("http");

function requestJson(port, path, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (body) headers["Content-Length"] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: options.method || "GET",
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = {};
          if (text) {
            data = JSON.parse(text);
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(port, account, password) {
  const response = await requestJson(port, "/api/login", {
    method: "POST",
    body: { account, password },
  });
  if (response.status !== 200 || !response.data.token) {
    throw new Error(`Login failed with status ${response.status}`);
  }
  return response.data.token;
}

module.exports = {
  requestJson,
  login,
};

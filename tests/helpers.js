const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

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
  createTempDbRoot,
  startServer,
};

function createTempDbRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "yuchang-auth-"));
}

async function startServer(options = {}) {
  const originalEnv = {
    YC_DATA_DIR: process.env.YC_DATA_DIR,
    YC_DB_PATH: process.env.YC_DB_PATH,
  };

  if (options.dataDir) process.env.YC_DATA_DIR = options.dataDir;
  if (options.dbPath) process.env.YC_DB_PATH = options.dbPath;

  const configPath = require.resolve("../src/config");
  const serverPath = require.resolve("../server");
  delete require.cache[configPath];
  delete require.cache[serverPath];

  const { createServer } = require("../server");
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });

  const port = server.address().port;

  async function stop() {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    if (originalEnv.YC_DATA_DIR === undefined) delete process.env.YC_DATA_DIR;
    else process.env.YC_DATA_DIR = originalEnv.YC_DATA_DIR;

    if (originalEnv.YC_DB_PATH === undefined) delete process.env.YC_DB_PATH;
    else process.env.YC_DB_PATH = originalEnv.YC_DB_PATH;

    delete require.cache[configPath];
    delete require.cache[serverPath];
  }

  return { server, port, stop };
}

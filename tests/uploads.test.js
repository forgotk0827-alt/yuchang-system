const test = require("node:test");
const assert = require("assert/strict");
const path = require("path");

const { buildMultipart, createTempDbRoot, login, requestJson, requestRaw, startServer } = require("./helpers");

function proposalPayload() {
  return {
    action: "submit",
    title: "上传附件测试提案",
    projectType: "普通改善提案",
    category: "效率提升",
    benefitType: "非财务创效",
    evaluationType: "正常改善",
    level: "四级",
    background: "需要验证附件上传和下载",
    content: "上传一个 txt 附件",
    measures: "调用上传接口",
    expectedBenefit: "接口可用",
    actualBenefit: "",
  };
}

test("employee import alias works on /api/import/employees", async () => {
  const tempRoot = createTempDbRoot();
  const runtime = await startServer({
    dataDir: path.join(tempRoot, "data"),
    dbPath: path.join(tempRoot, "data", "db.json"),
  });

  try {
    const token = await login(runtime.port, "A001", "A001@");
    const csv = [
      "工号,姓名,2级部门,职位,员工状态",
      "T9001,测试员工,生产部,操作员,在职",
    ].join("\n");

    const res = await requestJson(runtime.port, "/api/import/employees", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { csv },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.created, 1);
    assert.equal(Array.isArray(res.data.errors), true);
  } finally {
    await runtime.stop();
  }
});

test("attachment alias works on /api/attachments/:id", async () => {
  const tempRoot = createTempDbRoot();
  const runtime = await startServer({
    dataDir: path.join(tempRoot, "data"),
    dbPath: path.join(tempRoot, "data", "db.json"),
  });

  try {
    const token = await login(runtime.port, "E001", "E001@");
    const createRes = await requestJson(runtime.port, "/api/proposals", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: proposalPayload(),
    });
    assert.equal(createRes.status, 201);

    const multipart = buildMultipart({}, [
      {
        name: "file",
        filename: "evidence.txt",
        contentType: "text/plain",
        data: Buffer.from("attachment-content", "utf8"),
      },
    ]);

    const uploadRes = await requestRaw(runtime.port, `/api/proposals/${createRes.data.id}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": multipart.contentType,
      },
      body: multipart.body,
    });

    assert.equal(uploadRes.status, 200);
    const uploadData = JSON.parse(uploadRes.body.toString("utf8"));
    assert.equal(uploadData.attachments.length, 1);

    const attachmentId = uploadData.attachments[0].id;
    const downloadRes = await requestRaw(runtime.port, `/api/attachments/${attachmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(downloadRes.status, 200);
    assert.equal(downloadRes.body.toString("utf8"), "attachment-content");
  } finally {
    await runtime.stop();
  }
});

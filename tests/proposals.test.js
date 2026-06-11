const test = require("node:test");
const assert = require("assert/strict");
const path = require("path");

const { createTempDbRoot, login, requestJson, startServer } = require("./helpers");

function proposalPayload(action = "submit", overrides = {}) {
  return {
    action,
    title: "工装定位改善",
    projectType: "普通改善提案",
    category: "效率提升",
    benefitType: "非财务创效",
    evaluationType: "正常改善",
    level: "三级",
    background: "定位依赖人工经验，返工率高",
    content: "增加定位治具并统一作业方法",
    measures: "制作治具，培训班组",
    expectedBenefit: "减少返工",
    actualBenefit: "返工率下降",
    participants: [],
    ...overrides,
  };
}

test("草稿可以删除，非草稿删除返回统一提示", async () => {
  const tempRoot = createTempDbRoot();
  const runtime = await startServer({
    dataDir: path.join(tempRoot, "data"),
    dbPath: path.join(tempRoot, "data", "db.json"),
  });

  try {
    const token = await login(runtime.port, "A001", "A001@");
    const headers = { Authorization: `Bearer ${token}` };

    const draft = await requestJson(runtime.port, "/api/proposals", {
      method: "POST",
      headers,
      body: proposalPayload("draft"),
    });
    assert.equal(draft.status, 201);
    assert.equal(draft.data.status, "草稿");

    const deleted = await requestJson(runtime.port, `/api/proposals/${draft.data.id}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(deleted.status, 200);

    const submitted = await requestJson(runtime.port, "/api/proposals", {
      method: "POST",
      headers,
      body: proposalPayload("submit"),
    });
    assert.equal(submitted.status, 201);

    const blocked = await requestJson(runtime.port, `/api/proposals/${submitted.data.id}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.data.error, "只允许删除草稿");
  } finally {
    await runtime.stop();
  }
});

test("dept-review 路由别名可用，纠错类提案关闭为无效", async () => {
  const tempRoot = createTempDbRoot();
  const runtime = await startServer({
    dataDir: path.join(tempRoot, "data"),
    dbPath: path.join(tempRoot, "data", "db.json"),
  });

  try {
    const employeeToken = await login(runtime.port, "E001", "E001@");
    const reviewerToken = await login(runtime.port, "D001", "D001@");

    const created = await requestJson(runtime.port, "/api/proposals", {
      method: "POST",
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: proposalPayload("submit"),
    });
    assert.equal(created.status, 201);

    const reviewed = await requestJson(runtime.port, `/api/proposals/${created.data.id}/dept-review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${reviewerToken}` },
      body: {
        result: "approve",
        opinion: "属于纠错事项",
        evaluationType: "纠错",
        originalLevel: "三级",
        siteConfirmed: true,
      },
    });

    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.data.status, "无效关闭");
  } finally {
    await runtime.stop();
  }
});

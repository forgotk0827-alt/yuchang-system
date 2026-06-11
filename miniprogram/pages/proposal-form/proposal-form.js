const { request, upload, ensureLogin, toast } = require("../../utils/api");

const defaultForm = {
  title: "",
  projectType: "普通改善提案",
  focusTopicScale: "medium",
  category: "效率提升",
  benefitType: "非财务创效",
  financeAmount: 0,
  evaluationType: "正常改善",
  level: "四级",
  background: "",
  content: "",
  measures: "",
  expectedBenefit: "",
  actualBenefit: ""
};

Page({
  data: {
    id: "",
    form: { ...defaultForm },
    projectTypes: ["普通改善提案"],
    categories: ["效率提升", "品质改善", "成本降低", "安全环境", "流程优化"],
    benefitTypes: ["非财务创效", "财务创效"],
    levels: ["四级", "三级", "二级", "一级"],
    attachments: [],
    focusScales: [
      { label: "大型课题", value: "large" },
      { label: "中型课题", value: "medium" },
      { label: "小型课题", value: "small" }
    ],
    projectTypeIndex: 0,
    categoryIndex: 0,
    benefitTypeIndex: 0,
    levelIndex: 0,
    focusScaleIndex: 1
  },

  onLoad(options) {
    const user = wx.getStorageSync("yc_user") || {};
    const projectTypes = ["普通改善提案"];
    if (user.role === "超级管理员" || user.role === "精益办复审") projectTypes.push("有效焦点课题");
    this.setData({ id: options.id || "", projectTypes });
  },

  onShow() {
    if (!ensureLogin()) return;
    if (this.data.id) this.load();
  },

  async load() {
    try {
      const item = await request(`/api/proposals/${this.data.id}`);
      const form = { ...defaultForm, ...item, level: item.originalLevel || item.level || "四级" };
      this.setData({ form, attachments: item.attachments || [] });
      this.syncIndexes(form);
    } catch (err) {
      toast(err.message);
    }
  },

  syncIndexes(form) {
    this.setData({
      projectTypeIndex: Math.max(0, this.data.projectTypes.indexOf(form.projectType)),
      categoryIndex: Math.max(0, this.data.categories.indexOf(form.category)),
      benefitTypeIndex: Math.max(0, this.data.benefitTypes.indexOf(form.benefitType)),
      levelIndex: Math.max(0, this.data.levels.indexOf(form.level)),
      focusScaleIndex: Math.max(0, this.data.focusScales.findIndex((item) => item.value === form.focusTopicScale))
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onPicker(event) {
    const field = event.currentTarget.dataset.field;
    const maps = {
      projectType: "projectTypes",
      category: "categories",
      benefitType: "benefitTypes",
      level: "levels"
    };
    const list = this.data[maps[field]];
    const value = list[Number(event.detail.value)];
    this.setData({ [`form.${field}`]: value, [`${field}Index`]: Number(event.detail.value) });
  },

  onFocusScale(event) {
    const index = Number(event.detail.value);
    this.setData({ focusScaleIndex: index, "form.focusTopicScale": this.data.focusScales[index].value });
  },

  buildPayload(action) {
    const user = wx.getStorageSync("yc_user") || {};
    const form = this.data.form;
    const participants = form.projectType === "有效焦点课题"
      ? [{ userId: user.id, role: "课题组长", ratio: 100 }]
      : [{ userId: user.id, role: "提出人", ratio: 30 }, { userId: user.id, role: "实施人", ratio: 70 }];
    return { ...form, action, participants };
  },

  async saveDraft() {
    await this.save("draft");
  },

  async submit() {
    await this.save("submit");
  },

  async save(action) {
    const payload = this.buildPayload(action);
    if (action !== "draft" && (!payload.title || !payload.background || !payload.content || !payload.measures)) {
      toast("请填写必填项");
      return;
    }
    try {
      const path = this.data.id ? `/api/proposals/${this.data.id}` : "/api/proposals";
      await request(path, { method: this.data.id ? "PUT" : "POST", data: payload });
      toast(action === "draft" ? "草稿已保存" : "提案已提交");
      if (this.data.id) {
        this.load();
      } else {
        wx.navigateBack({ delta: 1 });
      }
    } catch (err) {
      toast(err.message);
    }
  },

  async chooseAttachment() {
    if (!this.data.id) {
      toast("请先保存草稿后再上传附件");
      return;
    }
    try {
      const result = await wx.chooseMessageFile({ count: 3, type: "file" });
      const files = result.tempFiles || [];
      for (const file of files) {
        await upload(`/api/proposals/${this.data.id}/attachments`, file.path, "file");
      }
      toast("附件已上传");
      this.load();
    } catch (err) {
      toast(err.message);
    }
  }
});

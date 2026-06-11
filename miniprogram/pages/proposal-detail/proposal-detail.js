const { request, ensureLogin, toast } = require("../../utils/api");
const { canCommittee, canDeptReview, canFinance, canLean } = require("../../utils/auth");
const { statusClass } = require("../../utils/format");

Page({
  data: {
    id: "",
    item: {},
    review: {
      opinion: "",
      evaluationType: "正常改善",
      originalLevel: "四级",
      isHorizontalExpansion: false,
      siteConfirmed: false,
      siteConfirmNote: "",
      financeAmount: 0,
      actualBenefit: ""
    },
    canDeptReview: false,
    canFinanceReview: false,
    canLeanReview: false,
    canCommitteeReview: false,
    evaluationTypes: ["正常改善", "纠错", "复原", "对标"],
    levels: ["四级", "三级", "二级", "一级"],
    evaluationTypeIndex: 0,
    levelIndex: 0
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
  },

  onShow() {
    if (!ensureLogin()) return;
    this.load();
  },

  async load() {
    try {
      const item = await request(`/api/proposals/${this.data.id}`);
      this.setData({
        item: { ...item, statusClass: statusClass(item.status), approvals: item.approvals || [], pointsBreakdown: item.pointsBreakdown || [] },
        review: {
          opinion: "",
          evaluationType: item.evaluationType || "正常改善",
          originalLevel: item.originalLevel || item.level || "四级",
          isHorizontalExpansion: Boolean(item.isHorizontalExpansion),
          siteConfirmed: Boolean(item.siteConfirmed),
          siteConfirmNote: item.siteConfirmNote || "",
          financeAmount: item.financeAmount || 0,
          actualBenefit: item.actualBenefit || ""
        },
        canDeptReview: item.status === "待部门评估组初评" && canDeptReview(item),
        canFinanceReview: item.status === "待财务复核" && canFinance(),
        canLeanReview: item.status === "待精益办复审" && canLean(),
        canCommitteeReview: item.status === "待评审委员会核准" && canCommittee(),
        evaluationTypeIndex: Math.max(0, this.data.evaluationTypes.indexOf(item.evaluationType || "正常改善")),
        levelIndex: Math.max(0, this.data.levels.indexOf(item.originalLevel || item.level || "四级"))
      });
    } catch (err) {
      toast(err.message);
    }
  },

  onReviewInput(event) {
    this.setData({ [`review.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onReviewSwitch(event) {
    this.setData({ [`review.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  onEvaluationTypeChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      evaluationTypeIndex: index,
      "review.evaluationType": this.data.evaluationTypes[index]
    });
  },

  onLevelChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      levelIndex: index,
      "review.originalLevel": this.data.levels[index]
    });
  },

  async submitReview(event) {
    const action = event.currentTarget.dataset.action;
    const result = event.currentTarget.dataset.result;
    const { review, id } = this.data;
    const routeMap = {
      dept: "department-review",
      finance: "finance-review",
      lean: "lean-review",
      committee: "committee-review"
    };
    const payloadMap = {
      dept: {
        result,
        opinion: review.opinion,
        evaluationType: review.evaluationType,
        originalLevel: review.originalLevel,
        isHorizontalExpansion: review.isHorizontalExpansion,
        siteConfirmed: review.siteConfirmed,
        siteConfirmNote: review.siteConfirmNote
      },
      finance: {
        result,
        opinion: review.opinion,
        financeAmount: Number(review.financeAmount || 0)
      },
      lean: {
        result,
        opinion: review.opinion,
        originalLevel: review.originalLevel,
        isHorizontalExpansion: review.isHorizontalExpansion,
        actualBenefit: review.actualBenefit
      },
      committee: {
        result,
        opinion: review.opinion
      }
    };

    try {
      await request(`/api/proposals/${id}/${routeMap[action]}`, {
        method: "POST",
        data: payloadMap[action]
      });
      toast("已提交");
      this.load();
    } catch (err) {
      toast(err.message);
    }
  }
});

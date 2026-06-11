# 数据迁移计划

## 原型阶段

当前系统使用 `data/db.json` 存储业务数据，适合演示、小范围试运行和需求确认。

## 正式阶段建议

正式全公司使用前，建议迁移到 MySQL 或 SQLite。优先推荐 MySQL，原因是：

- 更适合多人并发访问
- 更容易做备份与恢复
- 后续报表、审计、清零任务更稳定

## 推荐业务表

- `users`
- `departments`
- `sessions`
- `proposals`
- `proposal_approvals`
- `proposal_attachments`
- `point_accounts`
- `point_ledgers`
- `annual_clears`
- `gifts`
- `redemptions`
- `notifications`
- `operation_logs`

## 迁移原则

- 先冻结 `JSON` 数据写入
- 备份当前 `data/db.json`
- 执行一次性导入脚本
- 对账以下关键数量：
  - 用户数
  - 提案数
  - 积分账户余额
  - 积分流水数量
  - 兑换记录数量
- 切换生产服务到正式数据库

## 迁移前必须确认

- 员工和部门字段映射已固定
- 积分清零口径已最终确认
- 提案等级与评分区间口径已最终确认
- 礼品库存和季度目录版本规则已最终确认

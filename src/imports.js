const path = require("path");
const XLSX = require("xlsx");

const { MAX_UPLOAD_SIZE, ROLES } = require("./config");

function csvRows(text) {
  const source = text.replace(/^\ufeff/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value.trim());
      value = "";
    } else if (char === "\n") {
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function csvObjects(text) {
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header || "").trim());
  return rows.slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])))
    .filter((row) => Object.values(row).some(Boolean));
}

function workbookObjects(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames.find((name) => name.includes("员工")) || workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  return rowsToObjects(rows);
}

async function readImportRows(req, helpers) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const buffer = await helpers.readBuffer(req, MAX_UPLOAD_SIZE);
    const file = helpers.parseMultipart(req, buffer).find((part) => part.filename);
    if (!file) throw new Error("请选择要导入的文件");
    const ext = path.extname(file.filename).toLowerCase();
    if (ext === ".csv") return csvObjects(file.data.toString("utf8"));
    if (ext === ".xls" || ext === ".xlsx") return workbookObjects(file.data);
    throw new Error("仅支持 .csv、.xls、.xlsx 文件");
  }
  const body = await helpers.readBody(req);
  return csvObjects(String(body.csv || ""));
}

function valueFrom(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function findOrCreateDepartment(db, name, helpers) {
  const deptName = String(name || "").trim() || "未分配部门";
  let dept = db.departments.find((item) => item.name === deptName);
  if (!dept) {
    dept = { id: helpers.uid("d"), name: deptName, parentId: "", leaderId: "", status: "启用" };
    db.departments.push(dept);
  }
  return dept;
}

function importData(db, type, rows, helpers) {
  let created = 0;
  let updated = 0;
  const errors = [];

  if (type === "departments") {
    rows.forEach((row, index) => {
      const name = valueFrom(row, ["部门名称", "1级部门", "2级部门", "部门", "name"]);
      if (!name) {
        errors.push(`第 ${index + 2} 行缺少部门名称`);
        return;
      }
      let dept = db.departments.find((item) => item.name === name);
      const leaderNameOrNo = valueFrom(row, ["负责人编号", "部门主管", "leaderNo"]);
      const leader = db.users.find((item) => item.employeeNo === leaderNameOrNo || item.name === leaderNameOrNo);
      const parent = db.departments.find((item) => item.name === valueFrom(row, ["上级部门", "1级部门", "parentName"]));
      if (!dept) {
        dept = { id: helpers.uid("d"), name, parentId: parent?.id || "", leaderId: leader?.id || "", status: valueFrom(row, ["状态", "员工状态", "status"]) || "启用" };
        db.departments.push(dept);
        created += 1;
      } else {
        dept.parentId = parent?.id || dept.parentId || "";
        dept.leaderId = leader?.id || dept.leaderId || "";
        dept.status = valueFrom(row, ["状态", "员工状态", "status"]) || dept.status || "启用";
        updated += 1;
      }
    });
  }

  if (type === "users") {
    const validRoles = new Set(Object.values(ROLES));
    rows.forEach((row, index) => {
      const name = valueFrom(row, ["姓名", "name"]);
      let employeeNo = valueFrom(row, ["员工编号", "工号", "employeeNo"]);
      let phone = valueFrom(row, ["手机号/账号", "手机号", "手机", "phone"]) || employeeNo;
      const role = valueFrom(row, ["角色", "role"]) || ROLES.EMPLOYEE;
      if (!name) {
        errors.push(`第 ${index + 2} 行缺少姓名`);
        return;
      }
      if (!employeeNo) employeeNo = phone || `AUTO_${String(index + 1).padStart(4, "0")}`;
      if (!phone) phone = employeeNo;
      if (!validRoles.has(role)) {
        errors.push(`第 ${index + 2} 行角色无效：${role}`);
        return;
      }
      const deptName = valueFrom(row, ["2级部门", "部门", "1级部门", "department"]);
      const dept = findOrCreateDepartment(db, deptName, helpers);
      const rawStatus = valueFrom(row, ["在职状态", "员工状态", "status"]);
      const status = rawStatus === "离职" ? "禁用" : (rawStatus || "在职");
      let target = db.users.find((item) => item.employeeNo === employeeNo);
      if (!target) {
        target = {
          id: helpers.uid("u"),
          employeeNo,
          name,
          phone,
          deptId: dept.id,
          post: valueFrom(row, ["岗位", "职位", "post"]),
          role,
          passwordHash: helpers.hashPassword(`${employeeNo}@`),
          status,
        };
        db.users.push(target);
        helpers.accountFor(db, target.id);
        created += 1;
      } else {
        target.name = name;
        target.phone = phone;
        target.deptId = dept.id;
        target.post = valueFrom(row, ["岗位", "职位", "post"]) || target.post || "";
        target.role = role;
        target.status = status || target.status || "在职";
        updated += 1;
      }
    });
  }

  if (type === "gifts") {
    rows.forEach((row, index) => {
      const name = row["礼品名称"] || row.name;
      const requiredPoints = Number(row["所需积分"] || row.requiredPoints || 0);
      if (!name || !requiredPoints) {
        errors.push(`第 ${index + 2} 行缺少礼品名称或所需积分`);
        return;
      }
      let gift = db.gifts.find((item) => item.name === name && item.quarterVersion === (row["季度版本"] || row.quarterVersion || "未设置"));
      if (!gift) {
        gift = {
          id: helpers.uid("g"),
          name,
          requiredPoints,
          referenceValue: Number(row["参考价值"] || row.referenceValue || 0),
          stockQty: Number(row["初始库存"] || row.stockQty || 0),
          reservedQty: 0,
          quarterVersion: row["季度版本"] || row.quarterVersion || "未设置",
          status: row["状态"] || row.status || "启用",
        };
        db.gifts.push(gift);
        created += 1;
      } else {
        gift.requiredPoints = requiredPoints;
        gift.referenceValue = Number(row["参考价值"] || row.referenceValue || gift.referenceValue || 0);
        gift.stockQty = Number(row["初始库存"] || row.stockQty || gift.stockQty || 0);
        gift.status = row["状态"] || row.status || gift.status || "启用";
        updated += 1;
      }
    });
  }

  return { created, updated, errors };
}

module.exports = {
  csvRows,
  csvObjects,
  rowsToObjects,
  workbookObjects,
  readImportRows,
  valueFrom,
  findOrCreateDepartment,
  importData,
};

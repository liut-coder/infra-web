import { chromium } from "playwright";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5181";
const account = process.env.SMOKE_ACCOUNT || "admin@example.com";
const password = process.env.SMOKE_PASSWORD || "ChangeMe123!";

const requiredRoutes = [
  ["/dashboard", "Infra Control"],
  ["/infra/hosts", "服务器"],
  ["/infra/services", "服务"],
  ["/infra/billing", "续费资产"],
  ["/infra/domains", "域名"],
  ["/infra/network-profiles", "线路画像"],
  ["/infra/actions", "生成任务"],
  ["/infra/inventory", "Inventory 配置"],
  ["/infra/generated", "生成物"],
  ["/infra/discovery", "发现合并"],
  ["/admin/users", "用户管理"],
  ["/admin/roles", "角色管理"],
  ["/admin/permissions", "权限字典"],
  ["/admin/settings", "系统设置"],
  ["/admin/dictionaries", "数据字典"],
  ["/admin/audit-logs", "审计日志"],
  ["/admin/files", "文件管理"],
  ["/examples/table", "资源列表工作台"],
  ["/examples/form", "资源接入表单"],
  ["/examples/detail", "节点详情工作台"],
  ["/examples/wizard", "编排流程工作台"],
];

async function expectButtonDisabled(page, name) {
  const button = page.getByRole("button", { name });
  await button.waitFor({ state: "visible" });
  if (!(await button.isDisabled())) {
    throw new Error(`Expected button to be disabled: ${name}`);
  }
}

async function pressButton(page, name) {
  const button = page.getByRole("button", { name });
  await button.waitFor({ state: "visible" });
  await button.press("Enter");
}

async function runHighRiskActionSmoke(page) {
  await page.goto(`${baseUrl}/infra/actions`, { waitUntil: "networkidle" });
  await pressButton(page, /Wallos 应用/);
  await page.getByLabel("输入确认令牌").fill("WRONG");
  await expectButtonDisabled(page, "确认执行");
  await page.getByLabel("输入确认令牌").fill("CONFIRM:sync-wallos-apply");
  await page.getByRole("button", { name: "确认执行" }).click();
  await page.getByText("demo fallback executed sync-wallos-apply").waitFor({ timeout: 10000 });
}

async function runMergeApplySmoke(page) {
  await page.goto(`${baseUrl}/infra/discovery`, { waitUntil: "networkidle" });
  await pressButton(page, /确认合并/);
  await page.getByLabel("输入确认令牌").fill("WRONG");
  await expectButtonDisabled(page, "确认应用");
  await page.getByLabel("输入确认令牌").fill("CONFIRM:merge-apply");
  await page.getByRole("button", { name: "确认应用" }).click();
  await page.getByText("demo fallback executed merge-apply").waitFor({ timeout: 10000 });
}

async function runRetireApplySmoke(page) {
  await page.goto(`${baseUrl}/infra/actions`, { waitUntil: "networkidle" });
  await pressButton(page, /应用退役/);
  await page.getByLabel("Host ID").fill("us-01");
  await page.getByLabel("输入确认令牌").fill("CONFIRM:retire-apply-force:us-01");
  await expectButtonDisabled(page, "确认退役");
  await page.getByLabel("输入确认令牌").fill("CONFIRM:retire-apply:us-01");
  await page.getByRole("button", { name: "确认退役" }).click();
  await page.getByText("demo fallback retired us-01").waitFor({ timeout: 10000 });
}

async function runInventorySaveSmoke(page) {
  const marker = `smoke_inventory_marker_${Date.now()}`;
  await page.goto(`${baseUrl}/infra/inventory`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "高级" }).click();
  const yamlEditor = page.getByLabel("Inventory YAML");
  await yamlEditor.waitFor({ state: "visible" });
  const original = await yamlEditor.inputValue();
  await yamlEditor.fill(`${original.trimEnd()}\n# ${marker}\n`);
  await page.getByRole("button", { name: "保存" }).click();
  await page.getByText("保存后已自动校验并刷新正式生成物。").waitFor({ timeout: 10000 });
  await pressButton(page, /服务\s+登记服务部署位置/);
  await pressButton(page, /插件\s+控制哪些能力/);
  await page.getByRole("button", { name: "高级" }).click();
  await page.getByLabel("Inventory YAML").waitFor({ state: "visible" });
  await page.waitForFunction(
    (expectedMarker) => document.querySelector("#infra-inventory-yaml")?.value.includes(expectedMarker),
    marker,
  );
}

async function runGeneratedArtifactsSmoke(page) {
  await page.goto(`${baseUrl}/infra/generated`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const expectedArtifacts = [
    "generated/ansible/inventory.ini",
    "generated/reports/network.md",
    "generated/uptime-kuma/monitors.plan.yml",
    "generated/wallos/subscriptions.plan.yml",
    "generated/wallos/subscriptions.csv",
    "generated/semaphore/tasks.plan.yml",
    "generated/retirement/index.yml",
    "generated/web/infra-data.json",
  ];

  for (const artifact of expectedArtifacts) {
    if (!body.includes(artifact)) {
      throw new Error(`Generated page did not expose formal artifact: ${artifact}`);
    }
  }

  await page.getByRole("button", { name: /Ansible inventory/ }).click();
  await page.getByText("[all]").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: /^generate$/ }).waitFor({ timeout: 10000 });
}

async function runResponsiveNavigationSmoke(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const mobileMainPadding = await page.locator("main").first().evaluate((element) => {
    return Number.parseFloat(window.getComputedStyle(element).paddingLeft);
  });
  if (mobileMainPadding > 24) {
    throw new Error(`Expected compact mobile main padding, got ${mobileMainPadding}px`);
  }
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.waitForFunction(() => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    const rect = aside.getBoundingClientRect();
    return Math.abs(rect.left) < 2 && rect.width >= 220;
  });
  await page.getByRole("link", { name: "服务", exact: true }).click();
  await page.waitForURL("**/infra/services", { timeout: 10000 });
  await page.waitForFunction(() => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    return aside.getBoundingClientRect().left < -200;
  });
  await page.getByRole("heading", { name: "服务" }).waitFor({ timeout: 10000 });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const desktopMainPadding = await page.locator("main").first().evaluate((element) => {
    return Number.parseFloat(window.getComputedStyle(element).paddingLeft);
  });
  if (desktopMainPadding < 30) {
    throw new Error(`Expected full desktop main padding, got ${desktopMainPadding}px`);
  }
  await page.getByRole("button", { name: "收起侧边栏" }).click();
  await page.waitForFunction(() => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    const width = aside.getBoundingClientRect().width;
    return width > 70 && width < 90;
  });
  await page.getByRole("button", { name: "展开侧边栏" }).click();
  await page.waitForFunction(() => {
    const aside = document.querySelector("aside");
    if (!aside) return false;
    return aside.getBoundingClientRect().width >= 220;
  });
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=account]", account);
  await page.fill("input[name=password]", password);
  await page.click('button:has-text("登录")');
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  for (const [path, marker] of requiredRoutes) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (!body.includes(marker)) {
      throw new Error(`Route ${path} did not render marker: ${marker}`);
    }
  }

  await runResponsiveNavigationSmoke(page);
  await runInventorySaveSmoke(page);
  await runGeneratedArtifactsSmoke(page);
  await runHighRiskActionSmoke(page);
  await runMergeApplySmoke(page);
  await runRetireApplySmoke(page);

  const unexpectedErrors = consoleErrors.filter(
    (message) =>
      !message.includes("401") &&
      !(message.includes("Failed to load resource") && message.includes("/api/")),
  );
  if (unexpectedErrors.length > 0) {
    throw new Error(`Console errors:\n${unexpectedErrors.join("\n")}`);
  }

  console.log(`Smoke passed: ${baseUrl}`);
} finally {
  await browser.close();
}

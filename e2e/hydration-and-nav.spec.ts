import { test, expect, type Page } from "@playwright/test";

const ROUTES = ["/", "/agenda", "/urgencias", "/encaixes", "/retornos", "/funil", "/config"];

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("/login (sem autenticação)", () => {
  test("carrega sem erros de console", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/login", { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });
});

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Dashboard autenticado", () => {
  test.skip(
    !email || !password,
    "defina E2E_EMAIL e E2E_PASSWORD (usuário de teste dedicado) para rodar estes testes"
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", email!);
    await page.fill("#password", password!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  });

  for (const route of ROUTES) {
    test(`${route} — hard reload sem erro de console/hidratação`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(route, { waitUntil: "networkidle" });
      expect(errors, `console errors on ${route}`).toEqual([]);
    });
  }

  test("navegação repetida entre rotas não acumula erros", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "networkidle" });
    }
    for (const route of [...ROUTES].reverse()) {
      await page.goto(route, { waitUntil: "networkidle" });
    }
    expect(errors).toEqual([]);
  });

  test("drawer mobile abre/fecha sem erro de hidratação (viewport estreito)", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await context.newPage();
    const errors = trackConsoleErrors(page);
    await page.goto("/login");
    await page.fill("#email", email!);
    await page.fill("#password", password!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "networkidle" });
      await page.getByLabel("Abrir menu de navegação").click();
      await expect(page.getByLabel("Navegação")).toBeVisible();
      await page.getByLabel("Fechar menu").click();
    }
    await context.close();
    expect(errors, "console errors while opening/closing mobile drawer").toEqual([]);
  });

  test("InfoTip em /config abre sem erro de hidratação", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/config", { waitUntil: "networkidle" });
    await page.getByLabel("Mais informações").first().hover();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});

// Open the demo's #report URL with Playwright CLI, then run from the repo root:
// playwright-cli run-code --filename frontend/checks/report-ui.js
// Uses mocked catalog/report responses; never calls the model or audit storage.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const product = { product_id: 1, name: "검증 모니터", model: "UI-test" };
  const markdown = "# 검증 보고서\n\n" + Array.from({ length: 40 }, (_, i) =>
    `## 비교 항목 ${i + 1}\n\n화면 배치와 초기화 동작을 확인하기 위한 테스트 내용입니다.\n\n`
  ).join("");
  let mode = "success";
  const pending = [];
  const fulfill = route => route.fulfill({
    status: 200, contentType: "text/event-stream",
    body: "data: " + JSON.stringify({ type: "result", data: { product, markdown, units: [], catalog_version: "ui-test" } }) + "\n\n",
  });
  await page.route("**/catalog", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ products: [product], metadata: { source_data_version: "ui-test", counts: { reviews: 0, opinion_units: 0 } }, api_ready: true }),
  }));
  await page.route("**/report", route => {
    if (mode === "pending") { pending.push(route); return; }
    if (mode === "error") return route.fulfill({ status: 503, body: "UI test failure" });
    return fulfill(route);
  });
  await page.reload();
  const input = page.getByRole("textbox", { name: "나의 사용 경험" });
  const start = page.getByRole("button", { name: "새 리뷰 작성하기" });
  const submit = page.getByRole("button", { name: "보고서 생성", exact: true });
  const dialog = page.getByRole("dialog", { name: "새 리뷰를 작성할까요?" });
  await input.waitFor();
  assert(await page.getByRole("link", { name: "채팅 페이지로 이동" }).count() === 0, "Old chat link remains");
  const layout = [];
  for (const [width, height] of [[1440, 1200], [1280, 900], [768, 1024], [390, 844], [320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    const state = await page.evaluate(() => ({
      width: innerWidth, height: innerHeight,
      footerBottom: document.querySelector("footer").getBoundingClientRect().bottom,
      documentHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert(!state.overflow, "Horizontal overflow: " + width);
    assert(Math.abs(state.footerBottom - Math.max(height, state.documentHeight)) < 2, "Footer floats: " + JSON.stringify(state));
    layout.push(state);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await input.fill("화면은 선명하지만 빛샘이 조금 거슬립니다.");
  await submit.click();
  await page.getByText("보고서 생성 완료", { exact: true }).waitFor();
  await page.evaluate(() => scrollTo(0, 1000));
  const sticky = await page.locator(".report-heading").evaluate(el => ({ top: el.getBoundingClientRect().top, position: getComputedStyle(el).position }));
  assert(sticky.position === "sticky" && Math.abs(sticky.top - 24) < 2, "Sidebar does not follow scrolling");
  await start.click();
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  assert(await input.inputValue() !== "" && await page.locator(".report-result").count() === 1, "Cancel erased review/report");
  await start.click();
  await page.keyboard.press("Escape");
  assert(await dialog.count() === 0 && await page.locator(".report-result").count() === 1, "Escape failed to cancel");
  await start.click();
  await dialog.getByRole("button", { name: "지우고 시작" }).click();
  await page.waitForFunction(() => scrollY === 0 && document.activeElement?.id === "review");
  assert(await input.inputValue() === "" && await page.locator(".report-result").count() === 0, "Reset left review/report behind");
  assert(await page.locator("#product").inputValue() === "1", "Reset changed the selected product");

  mode = "error";
  await input.fill("실패 후 초기화도 확인합니다.");
  await submit.click();
  await page.getByRole("alert").waitFor();
  await start.click();
  await dialog.getByRole("button", { name: "지우고 시작" }).click();
  assert(await page.getByRole("alert").count() === 0, "Reset left error behind");

  mode = "pending";
  await input.fill("진행 중인 요청을 초기화합니다.");
  await submit.click();
  await page.waitForFunction(() => document.querySelector("#review").disabled);
  await start.click();
  await dialog.getByRole("button", { name: "지우고 시작" }).click();
  await page.waitForFunction(() => !document.querySelector("#review").disabled);
  assert(await input.inputValue() === "", "Pending reset did not clear input");
  // Release any late response after resetting; an aborted request may reject fulfill.
  for (const route of pending) await fulfill(route).catch(() => {});
  mode = "success";
  await input.fill("새로 작성한 리뷰로 다시 생성합니다.");
  await submit.click();
  await page.getByText("보고서 생성 완료", { exact: true }).waitFor();
  assert(await input.inputValue() === "새로 작성한 리뷰로 다시 생성합니다.", "Late request overwrote new review");
  await start.click();
  await dialog.getByRole("button", { name: "지우고 시작" }).click();
  assert(errors.length === 0, errors.join("; "));
  return { mode: "mocked API with real browser", layout, sticky, reset: "cancel / Escape / success / error / pending / regenerate passed", errors };
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9333;
const baseUrl = process.argv[2] || "http://127.0.0.1:8082";
const userDataDir = path.join(os.tmpdir(), `service-10105-chrome-${Date.now()}`);
const failures = [];
const consoleErrors = [];

const browser = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
]);

try {
  const wsUrl = await waitForWebSocketUrl();
  const cdp = await connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  cdp.on("Runtime.exceptionThrown", (event) => {
    consoleErrors.push(event.exceptionDetails?.text || "Runtime exception");
  });
  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      consoleErrors.push(event.args?.map((arg) => arg.value || arg.description).join(" ") || "console.error");
    }
  });

  await setViewport(cdp, 1440, 1100, false);
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await expect(
    cdp,
    "header counters removed",
    "document.querySelector('.site-header .odometer-strip') === null && document.querySelectorAll('.site-header .odometer').length === 0"
  );
  await expect(cdp, "desktop price rows", "document.querySelectorAll('.price-row').length >= 10");
  await expect(cdp, "category tabs have icons", "document.querySelectorAll('.catalog-tabs .tab-icon').length >= 4");
  await expect(cdp, "active category icon present", "document.querySelector('.catalog-tabs .tab.active .tab-icon') !== null");
  await expect(cdp, "device media tags present", "document.querySelectorAll('.device-media-tags span').length >= 3");
  await expect(cdp, "no repeated page title", "document.querySelector('.page-title') === null");
  await expect(cdp, "no breadcrumbs", "document.querySelector('.breadcrumbs') === null");
  await expect(cdp, "no available works heading", "document.querySelector('.prices-panel__head h2') === null");
  await expect(cdp, "collapsed services button", "document.querySelector('.expand-services')?.textContent.includes('Раскройте')");
  await expect(cdp, "contact block present", "document.querySelector('.contact-section .contact-form') !== null && document.querySelector('.map-frame') !== null");
  await expect(cdp, "brand counter present", "document.querySelector('[data-brand-counter-value]') !== null");
  await expect(cdp, "price note master copy", "document.querySelector('.note-box')?.textContent.includes('Сразу с вами будет нужный мастер')");
  const brandCounterBefore = await cdp.eval("document.querySelector('[data-brand-counter-value]')?.textContent");
  await delay(2300);
  const brandCounterAfter = await cdp.eval("document.querySelector('[data-brand-counter-value]')?.textContent");
  if (brandCounterBefore.result.value === brandCounterAfter.result.value) failures.push("brand counter changes");
  await expect(cdp, "desktop no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(
    cdp,
    "service button label",
    "document.querySelector('.price-row .select-service')?.textContent.trim() === 'Выбрать'"
  );
  await cdp.eval("document.querySelectorAll('.price-row .select-service')[1].click()");
  await delay(250);
  await expect(cdp, "booking bar visible", "document.querySelector('.booking-bar.visible') !== null");
  await cdp.eval("document.querySelector('.booking-bar button').click()");
  await delay(250);
  await expect(cdp, "modal visible", "document.querySelector('.modal.visible') !== null");
  await expect(cdp, "selected service checked", "document.querySelectorAll('.selected-list input:checked').length >= 1");
  await expect(cdp, "two branch cards for phone", "document.querySelectorAll('.branch-card').length === 2");
  await expect(
    cdp,
    "email form action",
    "document.querySelector('.booking-form')?.action.includes('shineteatr@gmail.com')"
  );
  await expect(
    cdp,
    "contact form action",
    "document.querySelector('.contact-form')?.action.includes('shineteatr@gmail.com')"
  );

  await setViewport(cdp, 390, 1400, true);
  await navigate(cdp, `${baseUrl}/remont/noutbuki/apple/macbook-pro/`);
  await expect(cdp, "mobile content loaded", "document.querySelectorAll('.price-row').length >= 5");
  await expect(cdp, "mobile no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(
    cdp,
    "mobile device before prices",
    "document.querySelector('.device-card').getBoundingClientRect().top < document.querySelector('.prices-panel').getBoundingClientRect().top"
  );
  await cdp.eval("document.querySelectorAll('.price-row .select-service')[1].click()");
  await delay(200);
  await cdp.eval("document.querySelector('.booking-bar button').click()");
  await delay(200);
  await expect(cdp, "onsite branch for laptop", "[...document.querySelectorAll('.branch-card strong')].some((item) => item.textContent.includes('Заказать выезд'))");

  await navigate(cdp, `${baseUrl}/`);
  await setViewport(cdp, 390, 900, true);
  await delay(300);
  await expect(cdp, "home page class", "document.body.classList.contains('home-page')");
  await expect(cdp, "home dark hero", "getComputedStyle(document.querySelector('.hero')).backgroundColor === 'rgb(2, 6, 23)'");
  await expect(cdp, "10105 hero buttons stacked", "document.querySelector('.hero__actions .btn-ghost').getBoundingClientRect().top > document.querySelector('.hero__actions .btn-primary').getBoundingClientRect().bottom");
  await expect(cdp, "10105 description layered on animation", "document.querySelector('.hero__lead') === null && document.querySelector('.hero-story .hero-visual .hero-story__text') !== null");
  await expect(
    cdp,
    "10105 story text centered and unframed",
    "(() => { const visual = document.querySelector('.hero-story .hero-visual').getBoundingClientRect(); const textNode = document.querySelector('.hero-story__text'); const text = textNode.getBoundingClientRect(); const style = getComputedStyle(textNode); const dx = Math.abs((text.left + text.width / 2) - (visual.left + visual.width / 2)); const dy = Math.abs((text.top + text.height / 2) - (visual.top + visual.height / 2)); return dx < 12 && dy < 12 && style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.boxShadow === 'none'; })()"
  );
  await expect(cdp, "10105 story text glows", "getComputedStyle(document.querySelector('.hero-story__text')).textShadow.includes('rgb')");
  await expect(cdp, "revival counter present", "document.querySelector('[data-revival-counter]') !== null");
  await expect(cdp, "revival counter copy", "document.querySelector('.revival-counter')?.textContent.includes('Вернули к жизни') && document.querySelector('.revival-counter__bottom')?.textContent.includes('апгрейдили ваших спутников')");
  await expect(cdp, "10105 counter enlarged", "document.querySelector('.revival-counter__number').getBoundingClientRect().height >= 72");
  await expect(cdp, "10105 gadget panel transparency", "Math.abs(parseFloat(getComputedStyle(document.querySelector('.hero-story .hero-visual__glow')).opacity) - 0.777) < 0.02 && Math.abs(parseFloat(getComputedStyle(document.querySelector('.hero-story .float-card')).opacity) - 0.777) < 0.02");
  await expect(cdp, "10105 gadget panel blurred", "getComputedStyle(document.querySelector('.hero-story .hero-visual__glow')).filter.includes('blur') && getComputedStyle(document.querySelector('.hero-story .float-card')).filter.includes('blur')");
  await expect(cdp, "10105 counter frame hidden by default", "!document.querySelector('.revival-counter').classList.contains('is-framed') && getComputedStyle(document.querySelector('.revival-counter')).borderTopColor === 'rgba(0, 0, 0, 0)'");
  await cdp.eval("document.querySelector('.revival-counter').click()");
  await delay(100);
  await expect(cdp, "10105 counter frame toggles on", "document.querySelector('.revival-counter').classList.contains('is-framed') && document.querySelector('.revival-counter').getAttribute('aria-pressed') === 'true'");
  await cdp.eval("document.querySelector('.revival-counter').click()");
  await delay(100);
  await expect(cdp, "10105 counter frame toggles off", "!document.querySelector('.revival-counter').classList.contains('is-framed') && document.querySelector('.revival-counter').getAttribute('aria-pressed') === 'false'");
  const revivalDuring = await cdp.eval("Number(document.querySelector('[data-revival-counter]')?.textContent.replace(/\\D/g, '') || 0)");
  if (revivalDuring.result.value <= 0 || revivalDuring.result.value >= 523847) failures.push("revival counter starts animated");
  await delay(2600);
  const revivalReady = await cdp.eval("Number(document.querySelector('[data-revival-counter]')?.textContent.replace(/\\D/g, '') || 0)");
  if (revivalReady.result.value < 523847) failures.push("revival counter reaches target");
  await delay(2600);
  const revivalGrown = await cdp.eval("Number(document.querySelector('[data-revival-counter]')?.textContent.replace(/\\D/g, '') || 0)");
  if (revivalGrown.result.value <= revivalReady.result.value) failures.push("revival counter keeps growing");
  await expect(cdp, "home mobile no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(cdp, "10105 mobile gadget panel visible", "getComputedStyle(document.querySelector('.hero-story .hero-visual')).display !== 'none'");

  if (consoleErrors.length) {
    failures.push(`console errors: ${consoleErrors.join("; ")}`);
  }
} finally {
  browser.kill();
  await delay(500);
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // Chrome may keep a profile lock for a moment on Windows; it is safe to leave this temp folder.
  }
}

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}

console.log("Browser verification passed");

async function waitForWebSocketUrl() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const data = await response.json();
      const page = data.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await delay(150);
    }
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const handlers = new Map();

    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((ok, fail) => pending.set(callId, { ok, fail }));
        },
        eval(expression) {
          return this.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
          });
        },
        on(method, handler) {
          handlers.set(method, handler);
        },
      });
    });

    ws.addEventListener("message", (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) {
        const item = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) item.fail(new Error(data.error.message));
        else item.ok(data.result);
      } else if (data.method && handlers.has(data.method)) {
        handlers.get(data.method)(data.params);
      }
    });
    ws.addEventListener("error", reject);
  });
}

async function setViewport(cdp, width, height, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await delay(1400);
}

async function expect(cdp, label, expression) {
  const result = await cdp.eval(`Boolean(${expression})`);
  if (!result.result.value) failures.push(label);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

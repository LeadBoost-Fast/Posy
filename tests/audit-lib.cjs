// Общие помощники для аудита: стенд (сайт на эмуляторах), вход под ролью, размеры экрана, тема, язык, сбор ошибок.
// Сайт берётся из корня готовым (после node build/build.mjs). В страницу добавляются флаги проверки
// (__EMU и др.) — в боевой версии их нет, поэтому сайт работает с настоящей базой.
const fs = require("fs"), path = require("path"), http = require("http"), { chromium } = require("playwright");
const ROOT = process.env.SITE || path.resolve(__dirname, ".."), NM = process.env.FB_DIR || path.join(__dirname, "node_modules/firebase");
const OUT = path.join(__dirname, "out", "audit"); fs.mkdirSync(OUT, { recursive: true });
const PORT = 5079, BASE = `http://127.0.0.1:${PORT}/`;
const fbfix = h => h.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[0-9.]+\//g, "/fb/");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// Роли стенда (пароль у всех secret12, см. seed.cjs)
const ROLES = {
  owner: "tilegen615@gmail.com", mainadmin: "nash0082008@icloud.com", admin: "adm@x.kz",
  operator: "op1@x.kz", florist: "fl1@x.kz", assistant: "as@x.kz", courier: "co1@x.kz"
};
const SIZES = { phone: { width: 390, height: 844 }, small: { width: 360, height: 780 }, tablet: { width: 768, height: 1024 }, laptop: { width: 1440, height: 900 } };
// Дизайны V5: Bento 2.0 (по умолчанию) и Космос
const DESIGNS = ["Bento", "Космос"];

let server = null;
function serve() {
  if (server) return server;
  const html = fbfix(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")).replace("<head>", "<head><script>window.__EMU=1;window.__NOGEO=1;window.__NATIVEASK=1;window.__FSREST='http://127.0.0.1:8080';try{localStorage.setItem('cacheV','3');sessionStorage.setItem('skI','1')}catch(e){}</script>");
  server = http.createServer((q, r) => {
    const u = q.url.split("?")[0];
    if (u.startsWith("/fb/")) { const f = path.join(NM, u.slice(4)); if (fs.existsSync(f)) { r.setHeader("content-type", "text/javascript"); return r.end(fs.readFileSync(f)); } }
    if (u === "/") { r.setHeader("content-type", "text/html"); return r.end(html); }
    if (u === "/status.html" || u === "/vitrina.html") { r.setHeader("content-type", "text/html"); return r.end(fbfix(fs.readFileSync(path.join(ROOT, u.slice(1)), "utf8")).replace("<script>\nconst", "<script>window.__FSEMU=1;\nconst")); }
    const f = path.join(ROOT, u);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      if (/\.css$/.test(u)) { r.setHeader("content-type", "text/css"); return r.end(fs.readFileSync(f, "utf8").replaceAll("content-visibility:auto", "content-visibility:visible")); }
      if (/\.js$/.test(u)) r.setHeader("content-type", "text/javascript");
      return r.end(fs.readFileSync(f));
    }
    r.statusCode = 404; r.end();
  });
  // если стенд уже поднят другим прогоном (тот же сайт), используем его
  server.on("error", e => { if (e.code !== "EADDRINUSE") throw e; });
  server.listen(PORT);
  return server;
}

// Вход: роль, размер, тема ("light"/"dark"), язык ("ru"/"kk"), дизайн (имя из DESIGNS)
async function login(br, role, o = {}) {
  serve();
  const size = SIZES[o.size || "phone"], email = ROLES[role] || role;
  const ctx = await br.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: size.width < 800, hasTouch: size.width < 800, colorScheme: o.theme === "dark" ? "dark" : "light" });
  await ctx.route("https://example.com/**", r => r.fulfill({ body: PNG, contentType: "image/png" }));
  const pg = await ctx.newPage(), errors = [];
  pg.on("pageerror", x => errors.push("pageerror: " + x.message));
  pg.on("console", m => { if (m.type() === "error" && !/favicon|ERR_|net::|Failed to load resource|google|gstatic|messaging/i.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });
  pg.on("dialog", d => d.accept());
  await pg.addInitScript(([lang, theme]) => { try { localStorage.setItem("lang", lang); localStorage.setItem("t", theme); } catch (e) {} }, [o.lang || "ru", o.theme || "light"]);
  await pg.goto(BASE); await pg.waitForTimeout(900);
  await pg.locator("input[type=email]").first().fill(email);
  await pg.locator("input[type=password]").first().fill("secret12");
  await pg.locator("form button[type=submit], button:has-text('Войти'), button:has-text('Кіру')").first().click();
  await pg.waitForFunction(() => typeof S !== "undefined" && S, null, { timeout: 25000 });
  await pg.waitForTimeout(1800);
  if (o.design && o.design !== "Bento") await pg.evaluate(n => setPal(n), o.design);
  else await pg.evaluate(() => { try { if (typeof setBento === "function") setBento(); } catch (e) {} });
  await pg.waitForTimeout(400);
  return { ctx, pg, errors };
}

// Проверки вёрстки текущего экрана: горизонтальная прокрутка, мелкие кнопки, перекрытия
async function layoutIssues(pg) {
  return pg.evaluate(() => {
    const out = [], W = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > W + 2) out.push("горизонтальная прокрутка " + document.documentElement.scrollWidth + ">" + W);
    const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const small = [...document.querySelectorAll("#v button, #v [data-a], #m button")].filter(vis).filter(el => { const r = el.getBoundingClientRect(); return r.height < 30 && r.width < 30; });
    if (small.length) out.push("мелкие кнопки: " + small.length);
    const over = [...document.querySelectorAll("#v *")].filter(vis).filter(el => { const r = el.getBoundingClientRect(); return r.right > W + 4 && getComputedStyle(el).position !== "fixed"; });
    if (over.length) out.push("вылезает за экран: " + over.slice(0, 3).map(e => e.tagName + "." + String(e.className).slice(0, 20)).join(", "));
    return out;
  });
}

module.exports = { chromium, serve, login, layoutIssues, ROLES, SIZES, DESIGNS, OUT, BASE };

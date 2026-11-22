// Карта сайта: под каждой ролью собирает видимые разделы меню, группы и подразделы, разделы настроек.
// Запуск: эмуляторы + node tests/seed.cjs, затем node tests/sitemap.cjs → tests/out/audit/sitemap.json
const fs = require("fs"), path = require("path"), { chromium, login, ROLES, OUT } = require("./audit-lib.cjs");
(async () => {
  const br = await chromium.launch(), map = {}, errs = {};
  for (const role of Object.keys(ROLES)) {
    const { ctx, pg, errors } = await login(br, role);
    map[role] = await pg.evaluate(() => {
      const T = (window.TALL || []).map(t => [t[0], (window.GLB && GLB[t[0]]) || t[2]]);
      const groups = (typeof GR !== "undefined" ? GR : []).map(g => g.filter(k => T.some(t => t[0] === k)));
      const sets = typeof SETSEC === "function" ? SETSEC().map(x => x[1]) : [];
      return { tabs: T, groups: groups.filter(g => g.length), settings: sets, role: S.role, owner: own(), admin: adm() };
    });
    // заходим в каждый раздел и записываем заголовок и ошибки
    map[role].screens = [];
    for (const [k] of map[role].tabs) {
      await pg.evaluate(k => { modal(""); tab = k; draw(); }, k);
      await pg.waitForTimeout(350);
      const h = await pg.evaluate(() => { const h1 = document.querySelector("#v h1"); return { h1: h1 ? h1.textContent.trim().slice(0, 40) : "", buttons: [...new Set([...document.querySelectorAll("#v [data-a]")].map(b => b.dataset.a))].slice(0, 40) }; });
      map[role].screens.push({ tab: k, ...h });
    }
    errs[role] = errors.slice(0, 20);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "sitemap.json"), JSON.stringify({ map, errs }, null, 1));
  for (const r of Object.keys(map)) console.log(r.padEnd(10), map[r].tabs.map(t => t[1]).join(" · "), "| ошибок:", errs[r].length);
  await br.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

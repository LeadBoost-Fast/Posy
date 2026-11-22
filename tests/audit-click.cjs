// Проверка нажатий: на каждом экране каждой роли нажимаем кнопки и ссылки (и кнопки в окне, которое открылось)
// и отмечаем те, после которых ничего не произошло, и ошибки JS после нажатия.
// Подтверждения (confirm/prompt) отклоняются, поэтому удаления и опасные действия не выполняются.
// Данные стенда при проверке меняются: после неё перезалейте базу (node tests/seed.cjs).
// Запуск: node tests/audit-click.cjs [роли через запятую] [размер] [дизайн]
// Результат: tests/out/audit/click-<роли>.json и строка-итог в консоли.
const fs = require("fs"), path = require("path"), { chromium, login, ROLES, OUT } = require("./audit-lib.cjs");
const roles = (process.argv[2] || "owner,operator,florist,courier").split(","), size = process.argv[3] || "phone", design = process.argv[4] || "Bento";
const MAX_PER_SCREEN = +process.env.CLICK_MAX || 30, MODAL_DEPTH = process.env.CLICK_DEPTH === "0" ? 0 : 1;
// не нажимаем: выход, смена пароля, полная перезагрузка, ссылки наружу проверяем по href
const SKIP_A = /^(lang_kk|lang_ru|logout|out|signout|reload|hardReload|cache_clear|fs_reset|x_del|del|o_del|tdel|pv_off|pv_on|sh_end|sh_start|wa_link|ch_rec)$/;
const SKIP_T = /^(Выйти|Выход|Обновить сайт|Сбросить|Удалить)/;

// в браузере: пометить кнопки экрана (или окна), вернуть список
const TAG = ([scope, max]) => {
  const root = scope === "m" ? document.getElementById("m") : document.getElementById("v"); if (!root) return [];
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > .05; };
  const inClosed = el => { const d = el.closest("details"); return d && !d.open && !el.closest("summary"); };
  const els = [...root.querySelectorAll("button, a, [data-a], summary, [role=button], [data-id][style*=pointer]")]
    .filter(el => !el.closest("[data-ck-skip]") && !el.matches(".on,[aria-selected=true],[aria-pressed=true],[aria-current],[aria-checked=true]") && !el.disabled && vis(el) && !inClosed(el) && !(el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.tagName === "LABEL"))
    .filter((el, i, a) => !a.some((p, j) => j < i && p.contains(el) && p.matches("button, a, [data-a]")));
  return els.slice(0, max).map((el, i) => {
    el.setAttribute("data-ck", scope + i);
    const href = el.tagName === "A" ? el.getAttribute("href") || "" : "";
    return { ck: scope + i, a: el.dataset.a || "", id: el.dataset.id || "", t: (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40), href, tag: el.tagName.toLowerCase(), type: el.getAttribute("type") || "" };
  });
};
// в браузере: «снимок» состояния — если после нажатия он не изменился, значит реакции не было
const SIG = () => {
  const h = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; };
  const m = document.getElementById("m"), v = document.getElementById("v"), t = document.getElementById("toast");
  return [typeof tab !== "undefined" ? tab : "", m ? h(m.innerHTML) : 0, v ? h(v.innerHTML) : 0, document.body.children.length,
    t && !t.hidden ? t.textContent : "", window.__ckOpen || 0, location.hash, document.querySelectorAll("[open]").length,
    document.activeElement && document.activeElement.tagName, scrollY > 40 ? 1 : 0,
    h([...document.querySelectorAll("#m input,#m select,#m textarea,#v input,#v select")].map(e => e.type === "checkbox" || e.type === "radio" ? (e.checked ? 1 : 0) : e.value).join("\u0001")),
    (document.getElementById("nfs") || {}).innerHTML ? h(document.getElementById("nfs").innerHTML) : 0, document.querySelectorAll(".skb,.bloom,.ski").length, document.documentElement.dataset.pal || "", document.documentElement.dataset.t || "", document.documentElement.style.cssText.length].join("|");
};

(async () => {
  const br = await chromium.launch(), R = [];
  for (const role of roles) {
    let s; try { s = await login(br, role, { size, design }); } catch (e) { R.push({ role, screen: "вход", el: "", issue: "не удалось войти: " + e.message.slice(0, 100) }); continue; }
    const { ctx, pg, errors } = s, seen = new Set();
    pg.removeAllListeners("dialog"); pg.on("dialog", d => { pg.__dlg = (pg.__dlg || 0) + 1; d.dismiss().catch(() => {}); });
    pg.on("filechooser", () => { pg.__fc = (pg.__fc || 0) + 1; });
    pg.on("popup", p => { pg.__pop = (pg.__pop || 0) + 1; p.close().catch(() => {}); });
    await pg.addInitScript(() => { const o = window.open; window.open = (...a) => { window.__ckOpen = (window.__ckOpen || 0) + 1; return null; }; });
    await pg.evaluate(() => { const o = window.open; window.open = (...a) => { window.__ckOpen = (window.__ckOpen || 0) + 1; return null; }; });
    const screens = await pg.evaluate(() => { const L = []; (window.TALL || []).forEach(t => { if (t[0] !== "more" && t[0] !== "help") L.push({ tab: t[0] }); }); if ((window.TALL || []).some(t => t[0] === "set")) SETSEC().forEach(x => L.push({ tab: "set", sets: x[0] })); return L; });
    const reset = async sc => { await pg.evaluate(sc => { try { modal(""); } catch (e) {} document.querySelectorAll("#cpk,#lb,.lbx,#gpov,.ov2").forEach(e => e.remove()); if (sc.sets) SETS = sc.sets; tab = sc.tab; draw(); scrollTo(0, 0); }, sc); await pg.waitForTimeout(150); };
    const tryClick = async (sc, scope, it, name) => {
      const key = role + "|" + (it.a ? "a:" + it.a : "t:" + it.t);
      if (seen.has(key)) return; seen.add(key);
      if (SKIP_A.test(it.a) || SKIP_T.test(it.t)) return;
      if (it.href && !/^#?$/.test(it.href) && !it.href.startsWith("javascript")) return; // ссылка наружу (tel:, wa.me, 2ГИС) — работает браузером
      const e0 = errors.length, d0 = pg.__dlg || 0, f0 = pg.__fc || 0, p0 = pg.__pop || 0;
      let loc = pg.locator(`[data-ck="${it.ck}"]`).first();
      const same = async () => (await loc.count()) && (await loc.evaluate((el, it) => (el.dataset.a || "") === it.a && (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40) === it.t, it).catch(() => false));
      if (!(await same())) { if (scope === "m") return; await reset(sc); await pg.evaluate(TAG, ["v", MAX_PER_SCREEN]); loc = pg.locator(`[data-ck="${it.ck}"]`).first(); if (!(await same())) return; }
      await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
      await pg.evaluate(() => { try { lock = 0; } catch (e) {} }); // защита сайта от двойного нажатия (1,5 с) не должна съедать нажатия проверки
      const before = await pg.evaluate(SIG);
      try { await loc.click({ timeout: 2500 }); } catch (e) { try { await loc.evaluate(el => el.click()); } catch (x) { R.push({ role, screen: name, el: it.t || it.a, a: it.a, issue: "не нажимается: " + String(e.message).split("\n")[0].slice(0, 90) }); return; } }
      await pg.waitForTimeout(300);
      const after = await pg.evaluate(SIG), ne = errors.slice(e0);
      if (ne.length) R.push({ role, screen: name, el: it.t || it.a, a: it.a, issue: "ошибка JS: " + ne[0].slice(0, 160) });
      else if (after === before && (pg.__dlg || 0) === d0 && (pg.__fc || 0) === f0 && (pg.__pop || 0) === p0) R.push({ role, screen: name, el: it.t || it.a, a: it.a, id: it.id, issue: "нет реакции на нажатие" });
      pg.__dirty = after !== before; return after.split("|")[1] !== before.split("|")[1]; // открылось/изменилось окно
    };
    for (const sc of screens) {
      const name = sc.tab + (sc.sets ? ":" + sc.sets : "");
      try {
        await reset(sc);
        const items = await pg.evaluate(TAG, ["v", MAX_PER_SCREEN]);
        console.log(role, name, "кнопок:", items.length);
        pg.__dirty = false;
        for (const it of items) {
          if (pg.__dirty) { await reset(sc); await pg.evaluate(TAG, ["v", MAX_PER_SCREEN]); pg.__dirty = false; }
          const opened = await tryClick(sc, "v", it, name);
          if (opened && MODAL_DEPTH) {
            const sub = await pg.evaluate(TAG, ["m", 12]);
            for (const st of sub) {
              // окно открываем заново для каждой кнопки в нём: прошлое нажатие могло его закрыть или изменить
              if (!(await pg.locator(`[data-ck="${st.ck}"]`).count())) {
                await reset(sc); await pg.evaluate(TAG, ["v", MAX_PER_SCREEN]);
                await pg.locator(`[data-ck="${it.ck}"]`).first().click({ timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(350);
                await pg.evaluate(TAG, ["m", 12]);
                if (!(await pg.locator(`[data-ck="${st.ck}"]`).count())) continue;
              }
              await tryClick(sc, "m", st, name + " › окно «" + (it.t || it.a).slice(0, 20) + "»");
            }
          }
        }
      } catch (e) { R.push({ role, screen: name, el: "", issue: "экран не проверен: " + String(e.message).slice(0, 120) }); }
    }
    R.push({ role, screen: "итог", el: "", issue: "", tested: seen.size });
    await ctx.close();
  }
  const tag = roles.join("_"), bad = R.filter(r => r.issue);
  fs.writeFileSync(path.join(OUT, `click-${tag}.json`), JSON.stringify(R, null, 1));
  const byKind = bad.reduce((a, r) => { const k = r.issue.split(":")[0]; a[k] = (a[k] || 0) + 1; return a; }, {});
  console.log("click", tag, "проверено нажатий:", R.filter(r => r.tested).reduce((a, r) => a + r.tested, 0), "замечаний:", bad.length, JSON.stringify(byKind));
  // для автопроверки: падаем только на ошибках JS после нажатия; «нет реакции» — замечание для человека
  await br.close(); process.exit(bad.some(r => /^ошибка JS/.test(r.issue)) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

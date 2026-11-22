// Автообход: роль × раздел (и подразделы настроек и склада) × размер × дизайн.
// Для каждого экрана: ошибки консоли, горизонтальная прокрутка, вылезающие блоки, мелкие кнопки, пустой экран, плохой контраст.
// Запуск: node tests/audit-walk.cjs [дизайн] [роли через запятую] [размеры через запятую] [тема] [язык]
// Результат: tests/out/audit/walk-<дизайн>-<тема>-<язык>.json и скриншоты проблемных экранов.
const fs = require("fs"), path = require("path"), { chromium, login, ROLES, DESIGNS, OUT } = require("./audit-lib.cjs");
const design = process.argv[2] || "Bento", roles = (process.argv[3] || Object.keys(ROLES).join(",")).split(","), sizes = (process.argv[4] || "phone,laptop").split(","), theme = process.argv[5] || "light", lang = process.argv[6] || "ru";
const tag = `${design.replace(/\s/g, "")}-${theme}-${lang}` + (sizes.join(",") !== "phone,laptop" ? "-" + sizes.join("_") : ""), SHOT = path.join(OUT, "walk-" + tag); fs.mkdirSync(SHOT, { recursive: true });

// проверки текущего экрана в браузере
const CHECK = () => {
  const out = [], W = document.documentElement.clientWidth, v = document.getElementById("v");
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
  if (document.documentElement.scrollWidth > W + 2) out.push(["P2", "горизонтальная прокрутка страницы " + document.documentElement.scrollWidth + "px > " + W + "px"]);
  const over = [...v.querySelectorAll("*")].filter(vis).filter(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); if (s.position === "fixed") return false; let p = el.parentElement; while (p && p !== v) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowX)) return false; p = p.parentElement; } return r.right > W + 3; });
  if (over.length) out.push(["P2", "вылезает за экран: " + over.slice(0, 4).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") + "«" + (e.textContent || "").trim().slice(0, 20) + "»").join("; ")]);
  const inClosed = el => { const d = el.closest("details"); return d && !d.open && !el.closest("summary"); };
  const fixedUp = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === "sticky" || ps === "fixed") return true; } return false; };
  const btns = [...document.querySelectorAll("#v button, #v a[data-a], #v [data-a]:not(div):not(section):not(span)")].filter(vis).filter(el => !inClosed(el));
  const hitPad = el => { const a = getComputedStyle(el, "::after"); return a.content !== "none" && a.position === "absolute" ? Math.max(0, -parseFloat(a.top) || 0) * 2 : 0; };
  const tiny = btns.filter(el => { if (el.matches("input[type=checkbox],input[type=radio]") && el.closest("label")) return false; const r = el.getBoundingClientRect(), p = hitPad(el); return r.height + p < 32 && r.width + p < 32; });
  if (tiny.length) out.push(["P3", "мелкие кнопки (<32px): " + tiny.length + " — " + tiny.slice(0, 4).map(e => (e.dataset.a || e.textContent.trim().slice(0, 10) || e.getAttribute("aria-label") || "?")).join(", ")]);
  // кнопка перекрыта другим элементом (центр кнопки)
  const clippedOut = el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowY + ps.overflowX)) { const q = p.getBoundingClientRect(); if (y < q.top || y > q.bottom || x < q.left || x > q.right) return true; } } return false; };
  const covered = btns.slice(0, 120).filter(el => !clippedOut(el)).filter(el => { const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 90) return false; const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return t && t !== el && !el.contains(t) && !t.contains(el) && !t.closest("#nav,nav,#tb,.toast,#toast") && !fixedUp(t); });
  if (covered.length) out.push(["P1", "кнопка перекрыта другим блоком: " + covered.slice(0, 3).map(e => (e.dataset.a || e.textContent.trim().slice(0, 14))).join(", ")]);
  // кнопка за краем прокручиваемого ряда без видимой полосы прокрутки (мышью не достать)
  const clipped = btns.filter(el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2; for (let p = el.parentElement; p && p !== v; p = p.parentElement) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowX)) { const q = p.getBoundingClientRect(); return (x > q.right || x < q.left) && (ps.scrollbarWidth === "none" || ps.overflowX === "hidden") && matchMedia("(pointer:fine)").matches; } } return false; });
  if (clipped.length) out.push(["P2", "кнопка за краем ряда, прокрутка не видна: " + clipped.slice(0, 3).map(e => (e.dataset.a || e.textContent.trim().slice(0, 14))).join(", ")]);
  // казахский: русские слова без перевода
  if ((localStorage.getItem("lang") || "") === "kk") { const ru = ((v.innerText || "").match(/(?:^|[^А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі])(Заказы|Клиенты|Отмена|Оплаты|Оплата|Сегодня|Настройки|Сохранить|Сотрудники|Сотрудник|Доставка|Удалить|Добавить|Закрыть|Изменить|Выдать|Поиск|Смена|Букеты|Готово|Завтра|Вчера|Принять|Отменить)(?=$|[^А-Яа-яЁё])/g) || []).map(x => x.trim()); if (ru.length) out.push(["P2", "казахский: без перевода " + ru.length + " — " + [...new Set(ru)].slice(0, 8).join(", ")]); }
  const txt = (v.innerText || "").trim();
  if (txt.length < 25) out.push(["P2", "почти пустой экран: «" + txt.slice(0, 40) + "»"]);
  if (/undefined|NaN|\[object Object\]|null ₸|Invalid Date/.test(txt)) out.push(["P1", "в тексте: " + (txt.match(/.{0,25}(undefined|NaN|\[object Object\]|null ₸|Invalid Date).{0,25}/) || [""])[0].replace(/\n/g, " ")]);
  if (v.querySelector("script") || /<script>alert/.test(v.innerHTML)) out.push(["P0", "не экранирован ввод: <script> попал в разметку"]);
  // контраст
  const lum = c => { const srgb = /^color\(srgb/.test(c), m = c.replace(/^color\(srgb/, "").match(/[\d.]+/g); if (!m) return null; if (srgb && m.length === 3) m.push("1"); const [r, g, b] = m.slice(0, 3).map(x => { x = srgb ? +x : +x / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return { L: .2126 * r + .7152 * g + .0722 * b, a: m[3] === undefined ? 1 : +m[3] }; };
  const bgOf = el => { while (el) { const s = getComputedStyle(el), c = lum(s.backgroundColor); if (s.backgroundImage !== "none") return null; if (c && c.a > .85) return c.L; el = el.parentElement; } const b = lum(getComputedStyle(document.body).backgroundColor); return b ? b.L : 1; };
  const bad = [];
  for (const el of [...v.querySelectorAll("b,span,p,h1,h2,h3,button,label,small,div,a,td")].slice(0, 700)) {
    if (!vis(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const s = getComputedStyle(el), f = lum(s.color); if (!f || f.a < .5) continue; const bL = bgOf(el); if (bL == null) continue;
    const cr = (Math.max(f.L, bL) + .05) / (Math.min(f.L, bL) + .05), big = parseFloat(s.fontSize) >= 18 || (parseFloat(s.fontSize) >= 14 && +s.fontWeight >= 700);
    if (cr < (big ? 2.2 : 3)) bad.push((el.textContent || "").trim().slice(0, 18) + " (" + cr.toFixed(1) + ")");
  }
  if (bad.length) out.push([bad.length > 5 ? "P1" : "P2", "плохой контраст текста: " + bad.length + " — " + bad.slice(0, 4).join("; ")]);
  return out;
};

(async () => {
  const br = await chromium.launch(), R = [];
  for (const role of roles) for (const size of sizes) {
    let s;
    try { s = await login(br, role, { size, design, theme, lang }); } catch (e) { R.push({ role, size, screen: "вход", issues: [["P0", "не удалось войти: " + e.message.slice(0, 120)]] }); continue; }
    const { ctx, pg, errors } = s;
    const screens = await pg.evaluate(() => {
      const L = [];
      (window.TALL || []).forEach(t => { if (t[0] === "more") return; L.push({ tab: t[0] }); });
      if ((window.TALL || []).some(t => t[0] === "set")) SETSEC().forEach(x => L.push({ tab: "set", sets: x[0] }));
      if ((window.TALL || []).some(t => t[0] === "stock")) ["z", "k", "v"].forEach(k => L.push({ tab: "stock", sv: k }));
      return L;
    });
    for (const sc of screens) {
      const name = sc.tab + (sc.sets ? ":" + sc.sets : "") + (sc.sv ? ":" + sc.sv : "");
      const e0 = errors.length, t0 = Date.now();
      try {
        await pg.evaluate(sc => { modal(""); if (sc.sets) SETS = sc.sets; if (sc.sv) sv = sc.sv; else if (sc.tab === "stock") sv = "i"; tab = sc.tab; draw(); scrollTo(0, 0); }, sc);
        await pg.waitForTimeout(450);
        const ms = Date.now() - t0;
        const iss = await pg.evaluate(CHECK);
        const ne = errors.slice(e0); if (ne.length) iss.unshift(["P0", "ошибка JS: " + ne.slice(0, 2).join(" | ")]);
        if (iss.length) { const f = `${role}-${size}-${name.replace(/:/g, "_")}.png`; await pg.screenshot({ path: path.join(SHOT, f), fullPage: false }).catch(() => {}); R.push({ role, size, screen: name, issues: iss, shot: path.relative(OUT, path.join(SHOT, f)), ms }); }
      } catch (e) { R.push({ role, size, screen: name, issues: [["P0", "экран не открылся: " + e.message.slice(0, 160)]] }); }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, `walk-${tag}.json`), JSON.stringify(R, null, 1));
  const cnt = R.reduce((a, r) => { r.issues.forEach(i => a[i[0]] = (a[i[0]] || 0) + 1); return a; }, {});
  console.log(tag, "экранов с проблемами:", R.length, JSON.stringify(cnt));
  await br.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

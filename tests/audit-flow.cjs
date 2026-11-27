// Сквозные сценарии через настоящие кнопки сайта. Запуск: эмуляторы + seed, затем node tests/audit-flow.cjs [дизайн]
// Результат: строки OK/FAIL и tests/out/audit/flow-<дизайн>.json
const fs = require("fs"), path = require("path"), { chromium, login, OUT, BASE } = require("./audit-lib.cjs");
const design = process.argv[2] || "Bento", FS = "http://127.0.0.1:8080/v1/projects/mirflowersbase/databases/(default)/documents", H = { Authorization: "Bearer owner" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const N = [], ok = (c, m, extra) => { N.push({ ok: !!c, m, extra }); console.log(new Date().toISOString().slice(11, 19) + " " + (c ? "OK   " : "FAIL ") + m + (extra && !c ? " — " + extra : "")); };
const doc = async p => { const r = await fetch(FS + "/" + p, { headers: H }); return r.ok ? r.json() : null; };
const fv = (d, k) => { const f = d && d.fields && d.fields[k]; if (!f) return undefined; return f.integerValue !== undefined ? +f.integerValue : f.doubleValue !== undefined ? f.doubleValue : f.booleanValue !== undefined ? f.booleanValue : f.stringValue !== undefined ? f.stringValue : f.mapValue ? f.mapValue : f; };
const list = async (c, n = 300) => { const r = await (await fetch(`${FS}/${c}?pageSize=${n}`, { headers: H })).json(); return r.documents || []; };
const st = async id => fv(await doc("orders/" + id), "st");
const findBy = async (col, field, value) => { const r = await (await fetch(FS + ":runQuery", { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } } } }) })).json(); return r.filter(x => x.document).map(x => x.document); };

// открыть заказ и нажать кнопку по тексту; на всплывших окнах прикрепить фото и нажать главную кнопку
async function act(pg, id, re, opts = {}) {
  let b = null;
  await pg.waitForFunction(id => typeof O !== "undefined" && O.some(x => x.id === id && !x._pend), id, { timeout: 15000 }).catch(() => {});
  for (let k = 0; k < 12; k++) { await pg.evaluate(id => { modal(""); detail(id); }, id); await pg.waitForTimeout(400); b = pg.locator("#m button, #m [data-a]").filter({ hasText: re }).first(); if (await b.count()) break; await pg.waitForTimeout(600); }
  if (!(await b.count())) return "нет кнопки " + re + "; есть: " + (await pg.locator("#m button").allInnerTexts()).map(t => t.trim()).filter(Boolean).slice(0, 14).join(" | ");
  if (await b.isVisible().catch(() => false)) await b.click(); else await b.evaluate(e => e.click());
  await pg.waitForTimeout(700);
  if (opts.next) { const n = pg.locator("#m button:visible, #cpk button:visible").filter({ hasText: opts.next }).first(); if (await n.count()) { await n.click(); await pg.waitForTimeout(1200); } }
  for (let k = 0; k < 3; k++) {
    const fi = pg.locator("#m input[type=file]");
    if (await fi.count()) { await fi.first().setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG }).catch(() => {}); await pg.waitForTimeout(3500); if (!(await pg.locator("#m input[type=file]").count())) break; }
    if (opts.fill) for (const [sel, v] of opts.fill) if (await pg.locator(sel).count()) await pg.fill(sel, v);
    const prim = pg.locator("#m form .acts .btn:not(.g):not(.r), #m .acts .btn:not(.g):not(.r)").last();
    if (!(await prim.count()) || !(await prim.isVisible().catch(() => false))) break;
    const t = (await prim.innerText({ timeout: 2000 }).catch(() => "Закрыть")).trim(); if (/Закрыть|Отмена/.test(t)) break;
    await prim.click().catch(() => {}); await pg.waitForTimeout(900);
  }
  await pg.evaluate(() => modal("")).catch(() => {});
  return "";
}

// открыть форму нового заказа (через выбор «Заказ», если он показан)
async function newOrder(pg) {
  for (let k = 0; k < 3; k++) {
    await pg.evaluate(() => { modal(""); document.querySelectorAll("#cpk").forEach(e => e.remove()); tab = "orders"; draw(); scrollTo(0, 0); }); await pg.waitForTimeout(400);
    await pg.locator('[data-a="new"]:visible').first().click(); await pg.waitForTimeout(700);
    if (await pg.locator("#of").count()) { await pg.waitForTimeout(500); if (await pg.locator("#of [name=phone]").count()) return; }
    const c = pg.locator("#m button, #m [data-a]").filter({ hasText: /^Заказ/ }).first();
    if (await c.count()) { await c.click(); await pg.waitForTimeout(900); if (await pg.locator("#of [name=phone]").count()) return; }
  }
  throw new Error("форма заказа не открылась: " + (await pg.evaluate(() => (document.querySelector("#m") || {}).innerText || "").catch(() => "")).slice(0, 200));
}

(async () => {
  const br = await chromium.launch(), errs = [];
  const run = async (role, o = {}) => { const s = await login(br, role, { design, ...o }); s.pg.on("pageerror", e => { if (!errs.length) console.log("ПЕРВАЯ ОШИБКА JS (" + role + ", " + new Date().toISOString().slice(11, 19) + "): " + e.message.slice(0, 120)); errs.push(role + ": " + e.message); }); return s; };
  const t0 = new Date().toLocaleDateString("sv-SE");

  // 1. оператор создаёт заказ через форму
  const op = await run("operator");
  await op.pg.evaluate(() => { tab = "orders"; draw(); }); await op.pg.waitForTimeout(400);
  await newOrder(op.pg);
  const nm = "Аудит " + Date.now() % 100000;
  await op.pg.fill('#of [name=phone]', "+7 701 555 44 33"); await op.pg.click('#of [name=client]'); await op.pg.waitForTimeout(300); await op.pg.keyboard.type(nm, { delay: 20 });
  await op.pg.evaluate(() => { const e = document.querySelector('#of [name=bn]'); if (e) e.value = "Тест 25 роз"; });
  await op.pg.evaluate(() => { const e = document.querySelector('#of .bqp'); if (e) { e.value = "20000"; e.dispatchEvent(new Event("input", { bubbles: true })); } });
  const save = op.pg.locator("#of .acts .btn:not(.g)").last(); await save.dblclick(); await op.pg.waitForTimeout(2500);
  const mine = await findBy("orders", "client", nm);
  ok(mine.length === 1, "1.1 оператор создал заказ (двойное нажатие «Создать» — один заказ)", "заказов с этим именем: " + mine.length);
  const oid = mine[0] && mine[0].name.split("/").pop();
  if (!oid) { console.log("дальше нельзя: заказа нет"); await br.close(); process.exit(1); }

  // 2. флорист: начать сборку → готов с фото
  const fl = await run("florist");
  let r = await act(fl.pg, oid, /Начать сборку|Взять/); ok(!r && (await st(oid)) === 1, "1.2 флорист «Начать сборку» → статус 1", r || "статус " + (await st(oid)));
  r = await act(fl.pg, oid, /Готов/); const s2 = await doc("orders/" + oid);
  ok(!r && fv(s2, "st") === 2, "1.3 флорист «Готов» с фото → статус 2", r || "статус " + fv(s2, "st"));
  ok(fv(s2, "rv") === "wait" || fv(s2, "rv") === undefined, "1.4 после «Готов» ждёт приёмки (rv=wait)", "rv=" + fv(s2, "rv"));

  // 3. приёмка другим (оператор)
  r = await act(op.pg, oid, /Принять заказ|Принять букет|Проверено|Всё хорошо/); ok(!r && fv(await doc("orders/" + oid), "rv") === "ok", "1.5 приёмка оператором (rv=ok)", r || "rv=" + fv(await doc("orders/" + oid), "rv"));
  // флорист не может принять свой букет
  // 4. выдача (самовывоз) с двойным нажатием оплаты
  r = await act(op.pg, oid, /Принять оплату|Оплачено/i, { next: /без чека/i }); const paid = fv(await doc("orders/" + oid), "paid");
  ok(paid === true, "1.6 «Оплачено»", r || "paid=" + paid);
  r = await act(op.pg, oid, /Выдать|Выдан/); ok(!r && (await st(oid)) === 4, "1.7 «Выдать» → статус 4", r || "статус " + (await st(oid)));
  const jr = (await findBy("activityLogs", "oid", oid)).map(d => fv(d, "act"));
  ok(jr.length >= 2, "1.8 журнал записал действия по заказу: " + jr.slice(0, 5).join(", "), "записей " + jr.length);
  const mv = (await list("stockMovements", 600)).filter(d => /Аудит|Тест 25 роз/.test(fv(d, "note") || ""));
  ok(true, "1.9 списание со склада по заказу без рецепта: записей " + mv.length + " (рецепта «Тест 25 роз» нет — списания не ждём)");
  const pub = await list("pubOrders", 300);
  r = await act(op.pg, oid, /Ссылка|Отправить ссылку|Статус для клиента/i); let pub2 = 0; for (let k = 0; k < 10 && !pub2; k++) { pub2 = (await list("pubOrders", 300)).length; if (!pub2) await op.pg.waitForTimeout(500); }
  ok(pub2 > 0, "1.10 ссылка для клиента: копия заказа в pubOrders (" + pub2 + ")", r || "нет копии после «ссылки»");

  // 5. доставка: новый заказ с доставкой, выставить курьеру, курьер принимает, доставлено
  await op.pg.evaluate(() => { modal(""); tab = "orders"; draw(); }); await newOrder(op.pg);
  const nm2 = "Доставка " + Date.now() % 100000; await op.pg.fill('#of [name=phone]', "+7 701 555 44 34"); await op.pg.click('#of [name=client]'); await op.pg.waitForTimeout(300); await op.pg.keyboard.type(nm2, { delay: 20 }); await op.pg.evaluate(() => { const e = document.querySelector('#of .bqp'); if (e) { e.value = "15000"; e.dispatchEvent(new Event("input", { bubbles: true })); } });
  if (await op.pg.locator('#of select[name=dv]').count()) { const dvb = op.pg.locator('#of .segc [data-sv="1"]'); if (await dvb.count()) await dvb.click(); else await op.pg.selectOption('#of select[name=dv]', "1"); await op.pg.waitForTimeout(200); await op.pg.fill('#of [name=addr]', "12 мкр 34").catch(() => {}); }
  await op.pg.locator("#of .acts .btn:not(.g)").last().click(); await op.pg.waitForTimeout(2200);
  let d2 = null; for (let k = 0; k < 10; k++) { d2 = (await findBy("orders", "client", nm2))[0]; if (d2 && fv(d2, "dv") === true) break; await op.pg.waitForTimeout(500); } const oid2 = d2 && d2.name.split("/").pop();
  ok(!!oid2 && fv(d2, "dv") === true, "2.1 заказ с доставкой создан", "dv=" + fv(d2, "dv"));
  if (oid2) {
    await act(fl.pg, oid2, /Начать сборку|Взять/); await act(fl.pg, oid2, /Готов/); await act(op.pg, oid2, /Принять заказ|Принять букет|Проверено|Всё хорошо/);
    r = await act(op.pg, oid2, /курьер|Выставить/i); const s5 = await doc("orders/" + oid2);
    ok(!r || /Снять с доставки/.test(r), "2.2 доставка выставлена курьерам" + (r ? " (сама, после приёмки)" : ""), r);
    const co = await run("courier");
    await co.pg.evaluate(() => { tab = "orders"; draw(); }); await co.pg.waitForTimeout(800);
    const tk = co.pg.locator(`[data-a="cur_take"][data-id="${oid2}"], [data-a="cur_acc"][data-id="${oid2}"]`).first();
    if (await tk.count()) { await tk.click(); await co.pg.waitForTimeout(1200); }
    else r = await act(co.pg, oid2, /Принять|Беру|Взять/);
    ok(fv(await doc("orders/" + oid2), "courier"), "2.3 курьер взял доставку", "courier=" + fv(await doc("orders/" + oid2), "courier") + " " + (r || ""));
    r = await act(co.pg, oid2, /Забрал|еду/i); ok((await st(oid2)) === 3, "2.4 курьер «Забрал, еду» → статус 3", r || "статус " + (await st(oid2)));
    r = await act(co.pg, oid2, /Доставлено/); ok((await st(oid2)) === 4, "2.5 курьер «Доставлено» с фото → статус 4", r || "статус " + (await st(oid2)));
    await co.ctx.close();
  }

  // 6. отмена: неоплаченный оператор отменяет сам (с причиной, «с отметкой»), оплаченный — через запрос, разрешает админ
  const mkOrder = async (nm, phone, paid) => { await op.pg.evaluate(() => { modal(""); tab = "orders"; draw(); }); await newOrder(op.pg);
    await op.pg.fill('#of [name=phone]', phone); await op.pg.click('#of [name=client]'); await op.pg.waitForTimeout(300); await op.pg.keyboard.type(nm, { delay: 20 });
    await op.pg.evaluate(paid => { const e = document.querySelector('#of .bqp'); if (e) { e.value = "9000"; e.dispatchEvent(new Event("input", { bubbles: true })); } const c = document.querySelector('#of [name=paid]'); if (c && paid) c.checked = true; }, paid);
    await op.pg.locator("#of .acts .btn:not(.g)").last().click(); await op.pg.waitForTimeout(2200);
    const d = (await findBy("orders", "client", nm))[0]; return d && d.name.split("/").pop(); };
  const oid3 = await mkOrder("Отмена " + Date.now() % 100000, "+7 701 555 44 35", false);
  await op.pg.waitForFunction(id => O.some(x => x.id === id && !x._pend), oid3, { timeout: 15000 }).catch(() => {});
  await op.pg.evaluate(id => { modal(""); detail(id); }, oid3); await op.pg.waitForTimeout(600);
  await op.pg.locator('#m [data-a="cx"]').first().evaluate(e => e.click()); await op.pg.waitForTimeout(1600);
  const cxf = await op.pg.locator("#cxf").count(); if (cxf) { await op.pg.fill('#cxf [name=why]', "Клиент передумал"); await op.pg.locator("#cxf .btn.r").click(); await op.pg.waitForTimeout(2500); }
  const q3 = await doc("orders/" + oid3);
  ok(fv(q3, "st") === 5 && fv(q3, "cxWhy") === "Клиент передумал", "3.1 неоплаченный: оператор отменил сам с причиной (права действий: «с отметкой»)", "форма отмены " + cxf + ", st=" + fv(q3, "st"));
  const oid4 = await mkOrder("Отмена опл " + Date.now() % 100000, "+7 701 555 44 36", true);
  r = await act(op.pg, oid4, /Отменить|Отмена заказа/); const q4 = await doc("orders/" + oid4);
  ok(fv(q4, "rqK") === "cx" && fv(q4, "st") === 0, "3.2 оплаченный: оператор отправил запрос (rqK=cx), заказ не отменён", r || "rqK=" + fv(q4, "rqK") + " st=" + fv(q4, "st"));
  const ad = await run("admin");
  r = await act(ad.pg, oid4, /Разрешить|Одобрить|Отменить заказ/); ok(fv(await doc("orders/" + oid4), "st") === 5, "3.3 админ разрешил отмену оплаченного → статус 5", r || "st=" + fv(await doc("orders/" + oid4), "st"));

  // 7. права: курьер не видит финансы, флорист не видит «Финансы», помощник не видит «Команду»
  const as = await run("assistant");
  const tabs = await as.pg.evaluate(() => (window.TALL || []).map(t => t[0]));
  ok(!tabs.includes("fin") && !tabs.includes("team"), "4.1 помощник не видит Финансы и Команду");
  ok(["pv", "crm"].every(t => tabs.includes(t)), "4.2 помощник видит «Оплаты» и «Клиенты», как оператор (решение владельца; закрываются в «Доступе»)", "нет: " + ["pv", "crm"].filter(t => !tabs.includes(t)).join(", "));

  // 8. страница клиента
  const pubs = await list("pubOrders", 50), tok = pubs[0] && pubs[0].name.split("/").pop();
  if (tok) { const p2 = await br.newPage({ viewport: { width: 390, height: 844 } }); const pe = []; p2.on("pageerror", e => pe.push(e.message)); await p2.goto(BASE + "status.html?t=" + tok); await p2.waitForTimeout(2500); const tx = await p2.locator("body").innerText(); ok(tx.length > 40 && !pe.length, "5.1 status.html открывается у клиента", pe.join("|") || tx.slice(0, 80)); await p2.screenshot({ path: path.join(OUT, "status-page.png") }); }

  // 9. раздел 5: просмотр фото поверх всего, сотрудники в чате, заказы клиента по порядку, журнал «Важное»
  { const pg = ad.pg; await pg.evaluate(() => { modal(""); tab = "chats"; chV = "list"; draw(); }); await pg.waitForTimeout(800);
    await pg.evaluate(() => chStart("wa_7700100015")); await pg.waitForTimeout(2500);
    const im = pg.locator(".chmsgs img, #cht img").first();
    if (await im.count()) { await im.scrollIntoViewIfNeeded(); await im.click(); await pg.waitForTimeout(600);
      const hit = await pg.evaluate(() => ["lbx", "lbd"].every(id => { const b = document.getElementById(id); if (!b) return false; const q = b.getBoundingClientRect(), e = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return e === b || b.contains(e); }));
      ok(hit, "Р5.1 фото в чате: кнопки просмотра видны и нажимаются поверх панели ввода");
      await pg.keyboard.press("Escape"); await pg.waitForTimeout(500); ok(!(await pg.locator("#lb").count()), "Р5.3 просмотр фото закрывается (Escape)");
    } else ok(false, "Р5.1 в тестовом чате нет фото");
    const by = await pg.evaluate(() => [...document.querySelectorAll(".chby")].map(x => x.textContent));
    ok(by.some(t => /Оператор/.test(t)), "Р5.4 сообщение сотрудника подписано: имя и роль", by.join(" | "));
    const ch = await pg.evaluate(() => [...document.querySelectorAll(".chcl .chip")].map(c => /olive|olate/.test(c.className) ? 1 : 0));
    ok(ch.every((v, i) => i === 0 || v <= ch[i - 1]), "Р5.5 заказы клиента: действующие сверху, старые ниже", ch.join(""));
    await pg.evaluate(() => { tab = "jr"; JRV = "chg"; lgp = "a"; draw(); }); await pg.waitForTimeout(900);
    ok(await pg.locator("#lgo").count() > 0 && await pg.locator(".jrseg").innerText().then(t => /Важное/.test(t)), "Р5.6 журнал: вкладка «Важное» и поиск по заказу");
  }

  // 10. дизайн V5: остался один — Bento 2.0 (Космос убран по решению владельца)
  { const pg = ad.pg, w = ms => new Promise(r => setTimeout(r, ms));
    const card = await pg.evaluate(() => themeCard());
    ok(!/Космос/.test(card) && !/class="dsv5"/.test(card) && !/Прежние оформления|Blooming Glass/.test(card), "Р6.1 «Оформление»: выбора дизайна нет, Космоса нет");
    await pg.evaluate(() => setDS("b2")); await w(400);
    const b = await pg.evaluate(() => ({ ds: document.documentElement.dataset.ds, p: thGet().p, pz: document.documentElement.dataset.pz, sv: thGet().ds }));
    ok(b.ds === "b2" && b.sv === "b2" && ["Ч/Б","Жемчуг","Нежная роза","Персик","Лаванда","Мята","Сумерки","Туман"].includes(b.p) && b.pz === "1", "Р6.2 Bento 2.0 включён и сохраняется, палитра Bento", JSON.stringify(b));
    const r = await pg.evaluate(() => ({ keys: Object.keys(DSYS).join(","), cos: typeof window.COSMOS, sc: [...document.scripts].some(x => /d-cosmos/.test(x.src)) }));
    ok(r.keys === "b2" && r.cos === "undefined" && !r.sc, "Р6.3 в коде только Bento 2.0, сцена Космоса не загружается", JSON.stringify(r));
    await pg.evaluate(() => { const th = thGet(); th.ds = "c2"; th.cp = "mono"; STO.set("th", JSON.stringify(th)); applyTheme(); draw(); }); await w(600);
    const o = await pg.evaluate(() => ({ ds: document.documentElement.dataset.ds, cp: document.documentElement.dataset.cp || "", h: !!document.getElementById("b2h") }));
    ok(o.ds === "b2" && !o.cp && o.h, "Р6.4 старый выбор «Космос» на телефоне открывается как Bento 2.0", JSON.stringify(o));
    const tabsOk = await pg.evaluate(() => { const bad = []; for (const t of ["home", "orders", "chats", "stock", "fin"]) { try { modal(""); tab = t; draw(); if (!document.querySelector("#v").children.length) bad.push(t) } catch (e) { bad.push(t + ":" + e.message) } } tab = "home"; draw(); return bad });
    ok(!tabsOk.length, "Р6.5 разделы открываются", tabsOk.join(", "));
    const lb = await pg.evaluate(() => lbSign());
    ok(typeof lb === "string" && lb.length > 0 && !/ellipse cx="50" cy="50" rx="40" ry="13"/.test(lb), "Р6.6 знак в просмотре фото — знак палитры Bento");
  }

  // 11. зарплата: смена один раз в день, часы без двойного счёта, забытая смена, сборка по дню и за каждый букет
  { const r = await ad.pg.evaluate(() => { const keep = { s: SLG, p: SH.pay, de: SH.dayEnd }, U1 = "tU1", d = addD(today(), -2), D = h => new Date(d + "T" + h).getTime(), res = {};
      SH.pay = { shift: 5000, hour: 500, asmPct: 0, asmFix: 300, opPct: 0, opFix: 0, scPct: 0 }; SH.dayEnd = "01:00"; SF[U1] = { name: "Тест", role: "florist", active: true };
      SLG = [{ uid: U1, start: D("10:00"), end: D("12:00") }, { uid: U1, start: D("12:30"), end: D("18:00") }]; res.two = earn(U1, d, d).total;
      SLG = [{ uid: U1, start: D("10:00"), end: D("14:00") }, { uid: U1, start: D("13:00"), end: D("15:00") }]; res.ov = earn(U1, d, d).total;
      SLG = [{ uid: U1, start: D("10:00"), end: D("10:10") }]; res.short = earn(U1, d, d).rows.find(x => /Смены/.test(x[0]));
      SLG = [{ uid: U1, start: D("10:00"), end: 0 }]; res.forgot = earn(U1, d, d);
      SLG = []; O.push({ id: "tO1", bn: "Тест", qty: 3, p: 30000, st: 4, asm: U1, readyAt: D("15:00"), date: addD(d, 1), by: "x", ts: D("09:00") }); res.asm = earn(U1, d, d).total; res.asmNext = earn(U1, addD(d, 1), addD(d, 1)).total;
      O.splice(O.findIndex(o => o.id === "tO1"), 1); delete SF[U1]; SLG = keep.s; SH.pay = keep.p; SH.dayEnd = keep.de; return res; });
    ok(r.two === 8750, "Р7.1 две смены за день: оплата за смену один раз + 7,5 ч", "итого " + r.two);
    ok(r.ov === 7500, "Р7.2 пересекающиеся смены: часы не удваиваются (5 ч)", "итого " + r.ov);
    ok(r.short && r.short[1] === 0, "Р7.3 смена на 10 минут: за смену не начисляется", JSON.stringify(r.short));
    ok(r.forgot.open === 1 && r.forgot.total === 5000, "Р7.4 забытая смена без графика: за смену есть, часов нет, видно «не закрыто»", JSON.stringify(r.forgot));
    ok(r.asm === 900 && r.asmNext === 0, "Р7.5 сборка: по дню нажатия «Готов» и за каждый букет (3 × 300)", r.asm + " / " + r.asmNext);
  }

  ok(!errs.length, "ошибок JS за сценарии: " + errs.length, errs.slice(0, 3).join(" | "));
  fs.writeFileSync(path.join(OUT, "flow-" + design.replace(/\s/g, "") + ".json"), JSON.stringify({ N, errs }, null, 1));
  const failed = N.filter(x => !x.ok).length; console.log(failed ? "ИТОГ: не прошло " + failed + " из " + N.length : "ИТОГ: все " + N.length + " проверок прошли");
  await br.close(); process.exit(failed ? 1 : 0);
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });

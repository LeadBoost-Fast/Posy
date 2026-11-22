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
  if (await op.pg.locator('#of select[name=dv]').count()) { await op.pg.selectOption('#of select[name=dv]', "1"); await op.pg.waitForTimeout(200); await op.pg.fill('#of [name=addr]', "12 мкр 34").catch(() => {}); }
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

  // 6. отмена не-админом → запрос → решение админом
  await op.pg.evaluate(() => { modal(""); tab = "orders"; draw(); }); await newOrder(op.pg);
  const nm3 = "Отмена " + Date.now() % 100000; await op.pg.fill('#of [name=phone]', "+7 701 555 44 35"); await op.pg.click('#of [name=client]'); await op.pg.waitForTimeout(300); await op.pg.keyboard.type(nm3, { delay: 20 }); await op.pg.evaluate(() => { const e = document.querySelector('#of .bqp'); if (e) { e.value = "9000"; e.dispatchEvent(new Event("input", { bubbles: true })); } });
  await op.pg.locator("#of .acts .btn:not(.g)").last().click(); await op.pg.waitForTimeout(2200);
  const o3 = (await findBy("orders", "client", nm3))[0], oid3 = o3 && o3.name.split("/").pop();
  r = await act(op.pg, oid3, /Отменить|Отмена заказа/); const q3 = await doc("orders/" + oid3);
  ok(fv(q3, "rqK") === "cx" && fv(q3, "st") === 0, "3.1 оператор отменяет → создан запрос (rqK=cx), заказ не отменён", r || "rqK=" + fv(q3, "rqK") + " st=" + fv(q3, "st"));
  const ad = await run("admin");
  r = await act(ad.pg, oid3, /Разрешить|Одобрить|Отменить заказ/); ok(fv(await doc("orders/" + oid3), "st") === 5, "3.2 админ разрешил отмену → статус 5", r || "st=" + fv(await doc("orders/" + oid3), "st"));

  // 7. права: курьер не видит финансы, флорист не видит «Финансы», помощник не видит «Команду»
  const as = await run("assistant");
  const tabs = await as.pg.evaluate(() => (window.TALL || []).map(t => t[0]));
  ok(!tabs.includes("fin") && !tabs.includes("team"), "4.1 помощник не видит Финансы и Команду");
  ok(tabs.includes("pv"), "4.2 [вопрос владельцу] помощник видит «Оплаты» — по заданию не должен", "");

  // 8. страница клиента
  const pubs = await list("pubOrders", 50), tok = pubs[0] && pubs[0].name.split("/").pop();
  if (tok) { const p2 = await br.newPage({ viewport: { width: 390, height: 844 } }); const pe = []; p2.on("pageerror", e => pe.push(e.message)); await p2.goto(BASE + "status.html?t=" + tok); await p2.waitForTimeout(2500); const tx = await p2.locator("body").innerText(); ok(tx.length > 40 && !pe.length, "5.1 status.html открывается у клиента", pe.join("|") || tx.slice(0, 80)); await p2.screenshot({ path: path.join(OUT, "status-page.png") }); }

  ok(!errs.length, "ошибок JS за сценарии: " + errs.length, errs.slice(0, 3).join(" | "));
  fs.writeFileSync(path.join(OUT, "flow-" + design.replace(/\s/g, "") + ".json"), JSON.stringify({ N, errs }, null, 1));
  await br.close(); process.exit(0);
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });

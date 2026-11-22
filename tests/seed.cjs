// Тестовая база для проверки сайта на эмуляторе Firebase (боевая база не затрагивается).
// Запуск: эмуляторы подняты (см. tests/README.md), затем  node tests/seed.cjs
// Всем сотрудникам пароль secret12. Можно подключить из другого скрипта: require("./seed.cjs").seed()
const PRJ = "mirflowersbase";
const FS = `http://127.0.0.1:8080/v1/projects/${PRJ}/databases/(default)/documents`;
const AUTH = "http://127.0.0.1:9099";
const H = { "content-type": "application/json", Authorization: "Bearer owner" };

// --- значения Firestore REST ---
const val = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
};
let W = [];
const put = (path, data) => W.push({ update: { name: `projects/${PRJ}/databases/(default)/documents/${path}`, fields: val(data).mapValue.fields } });
async function flush() {
  for (let i = 0; i < W.length; i += 400) {
    const r = await fetch(`${FS}:commit`, { method: "POST", headers: H, body: JSON.stringify({ writes: W.slice(i, i + 400) }) });
    if (!r.ok) throw new Error("commit " + r.status + " " + (await r.text()).slice(0, 300));
  }
  W = [];
}
async function user(email) {
  const r = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "secret12", returnSecureToken: true }) })).json();
  if (r.localId) return r.localId;
  const s = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "secret12", returnSecureToken: true }) })).json();
  return s.localId;
}

// --- помощники ---
let seedN = 7;
const rnd = () => (seedN = (seedN * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const hm = () => String(int(9, 23)).padStart(2, "0") + ":" + pick(["00", "15", "30", "45"]);
const ph = () => "+7 7" + int(0, 7) + int(0, 9) + " " + int(100, 999) + " " + int(10, 99) + " " + int(10, 99);

const NAMES = ["Айгерим", "Ержан", "Аделя", "Мадина", "Дана", "Асель", "Нурлан", "Жанар", "Ғалия", "Құралай", "Әсем", "Өмірзақ", "Ұлжан", "Үміт", "Һашим", "Іңкәр"];
const BAD = [
  "Александра Константиновна Иванова-Петрова-Сидорова (очень длинное имя для проверки вёрстки)",
  "<script>alert('xss')</script>",
  "🌸 Роза 💐 Клиент 😍",
  "Әйгерім Қуанышқызы Ұлықбекова",
  "",
  "\"Кавычки\" & <b>теги</b>"
];
const LONG_ADDR = "микрорайон 12, дом 34, подъезд 5, этаж 9, квартира 187, домофон не работает, позвонить за 10 минут до приезда, во дворе шлагбаум, код 4512#";
const FLOWERS = [
  ["Роза", "Розы", ["красная", "белая", "розовая", "Джумелия", "Мандала"]],
  ["Кустовая роза", "Кустовые розы", ["красная", "белая"]],
  ["Гортензия", "Экзотические цветы", ["синяя", "белая", "красная"]],
  ["Тюльпан", "Тюльпаны", ["жёлтый", "красный", "белый", "микс"]],
  ["Пион", "Пионы", ["розовый", "белый"]],
  ["Хризантема", "Хризантемы", ["Балтика белая", "жёлтая"]],
  ["Эустома", "Экзотические цветы", ["белая", "сиреневая"]],
  ["Альстромерия", "Экзотические цветы", ["микс"]]
];
const GREEN = ["Эвкалипт", "Рускус", "Салал", "Гипсофила", "Писташ"];
const PACK = ["Лента атласная", "Плёнка матовая", "Бумага крафт", "Коробка шляпная", "Корзина малая", "Шар фольгированный", "Открытка", "Бенто", "Сладкий бокс"];

async function seed() {
  const L1 = "main", L2 = "p10";
  // инвентаризации прошлых прогонов мешают начать новую — удаляем их (остальные коллекции перезаписываются по тем же ID)
  for (const col of ["invCounts"]) {
    const l = await (await fetch(`${FS}/${col}?pageSize=300`, { headers: H })).json();
    for (const d of l.documents || []) await fetch(`${FS}/${d.name.split("/documents/")[1]}`, { method: "DELETE", headers: H });
  }
  // сотрудники
  const staffDef = [
    ["tilegen615@gmail.com", "admin", "Владелец", L1],
    ["nash0082008@icloud.com", "admin", "Главный админ", L1],
    ["adm@x.kz", "admin", "Админ Дана", L2],
    ["op1@x.kz", "operator", "Оператор Аружан", L1],
    ["op2@x.kz", "operator", "Оператор Ғалия", L2],
    ["fl1@x.kz", "florist", "Флорист Асель", L1],
    ["fl2@x.kz", "florist", "Флорист Мадина", L2],
    ["as@x.kz", "assistant", "Помощник Нурлан", L1],
    ["co1@x.kz", "courier", "Курьер Ерлан", L1],
    ["co2@x.kz", "courier", "Курьер Бауыржан", L2]
  ];
  const S = {};
  for (const [email, role, name, loc] of staffDef) {
    const id = await user(email);
    S[email] = id;
    put(`staff/${id}`, { role, active: true, email, name, loc, createdAt: new Date() });
  }
  const ids = k => S[k];
  const ops = [ids("op1@x.kz"), ids("op2@x.kz")], fls = [ids("fl1@x.kz"), ids("fl2@x.kz")], cos = [ids("co1@x.kz"), ids("co2@x.kz")];

  // магазин и точки
  put("settings/main", {
    name: "Mirflowers", phone: "777 102 72 92 · +7 706 707 36 22", addr: "19А мкр, 107/1", hours: "10:00–02:00",
    dayStart: "10:00", dayEnd: "02:00", split: true, fx: { ckl: true, prem: true, deals: true, clientChat: true, teamChat: true, remind: true },
    icats: ["Розы", "Кустовые розы", "Тюльпаны", "Пионы", "Хризантемы", "Экзотические цветы", "Зелень", "Упаковка", "Материалы"],
    updatedAt: new Date()
  });
  put(`locations/${L1}`, { name: "19А мкр", addr: "19А мкр, 107/1", lat: 43.65, lng: 51.16 });
  put(`locations/${L2}`, { name: "10 мкр", addr: "10 мкр, 5", lat: 43.66, lng: 51.15 });

  // склад ~80
  const inv = [];
  let n = 0;
  const lot = (q, daysAgo, shelf) => ({ q, d: day(-daysAgo), sh: shelf });
  for (const [f, cat, vars] of FLOWERS) for (const v of vars) {
    const id = "i" + (++n), q1 = int(0, 300), q2 = int(0, 200), fresh = pick([1, 3, 6, 9, 12]);
    inv.push(id);
    put(`inventory/${id}`, { name: f + " " + v, grp: f, var: v, cat, unit: "шт", qty: q1 + q2, qs: { [L1]: q1, [L2]: q2 }, min: 20, sell: int(500, 3000), shelf: 7,
      lots: { [L1]: [lot(q1, fresh, 7)], [L2]: [lot(q2, fresh, 7)] }, recv: day(-fresh), loc: L1 });
    put(`invcost/${id}`, { buy: int(200, 1200) });
  }
  for (const g of GREEN) { const id = "i" + (++n), q = pick([0, 0.5, 3, 12]); inv.push(id); put(`inventory/${id}`, { name: g, cat: "Зелень", unit: "пачка", pk: 6, qty: q, qs: { [L1]: q, [L2]: 0 }, min: 2, sell: 4000 }); put(`invcost/${id}`, { buy: 2500 }); }
  for (const p of PACK) { const id = "i" + (++n), q = int(0, 60); inv.push(id); put(`inventory/${id}`, { name: p, cat: p === "Бенто" || p === "Сладкий бокс" ? "Материалы" : "Упаковка", unit: "шт", qty: q, qs: { [L1]: q, [L2]: 0 }, min: 5, sell: int(300, 3500) }); put(`invcost/${id}`, { buy: int(100, 2000) }); }
  while (n < 80) { const id = "i" + (++n), neg = n % 13 === 0, q = neg ? -3 : int(0, 40); inv.push(id); put(`inventory/${id}`, { name: (n % 9 === 0 ? BAD[0] : "Позиция №" + n), cat: pick(["Упаковка", "Материалы", "Зелень"]), unit: "шт", qty: q, qs: { [L1]: q, [L2]: 0 }, min: 3, sell: 1000 }); }

  // каталог букетов с рецептами
  const BQ = [];
  for (let i = 1; i <= 15; i++) {
    const items = [{ iid: inv[int(0, 20)], q: pick([5, 11, 15, 25, 51]) }, { iid: inv[int(25, 29)], q: 1 }, { iid: inv[int(30, 33)], q: 1 }];
    const name = i === 15 ? "Сладкий бокс «Праздник»" : pick(["Нежность", "Белое облако", "Красная классика", "Весна", "Ұлы дала"]) + " " + i;
    BQ.push(name);
    put(`bouquets/b${i}`, { name, price: int(8, 60) * 1000, wrap: pick([0, 1500, 3000]), items, kind: i === 15 ? "box" : "", createdAt: new Date() });
  }
  // витрина и галерея
  for (let i = 1; i <= 10; i++) put(`showcase/s${i}`, { name: pick(BQ), price: int(10, 40) * 1000, st: i <= 7 ? "in" : pick(["sold", "wo"]), at: Date.now() - int(0, 4) * 864e5, loc: i % 2 ? L1 : L2, days: 3, img: "https://example.com/s" + i + ".jpg" });
  for (let i = 1; i <= 10; i++) put(`gallery/g${i}`, { img: "https://example.com/g" + i + ".jpg", name: pick(BQ), price: int(10, 50) * 1000, by: ops[0], at: Date.now() - i * 36e5, loc: L1 });

  // заказы ~300
  const days = [0, 0, 0, 0, 1, 1, 2, 5, -1, -1, -2, -3, -7, -14, -30, -60, 400];
  for (let i = 1; i <= 300; i++) {
    const st = i <= 40 ? 0 : i <= 70 ? 1 : i <= 100 ? 2 : i <= 120 ? 3 : i <= 270 ? 4 : 5;
    const dv = rnd() < 0.45, d = st >= 4 ? day(-int(0, 60)) : day(pick(days));
    const client = i % 25 === 0 ? BAD[i / 25 % BAD.length] : pick(NAMES);
    const p = i % 37 === 0 ? 0 : int(8, 60) * 1000;
    const paid = st >= 4 ? rnd() < 0.9 : rnd() < 0.4;
    const o = {
      client, phone: ph(), bn: pick(BQ), p, fee: dv ? 1500 : 0, pre: !paid && rnd() < 0.3 ? 5000 : 0, paid, ...(paid ? { paidAt: Date.now() - int(0, 72) * 36e5, paidBy: pick(ops), pay: pick(["Kaspi", "Наличные", "Карта"]) } : {}),
      st, date: d, ...(i % 11 === 0 ? { tu: true } : { time: hm() }), dv, ...(dv ? { addr: i % 17 === 0 ? LONG_ADDR : "мкр " + int(1, 35) + ", дом " + int(1, 80) } : {}),
      by: pick(ops), loc: i % 3 ? L1 : L2, ts: Date.now() - int(0, 60) * 864e5, src: pick(["WhatsApp", "Instagram", "Звонок", "Пришёл в магазин"]),
      note: i % 19 === 0 ? "Комментарий с эмодзи 🎉 и <i>тегами</i>" : ""
    };
    if (st >= 1) { o.takenBy = pick(fls); o.asm = o.takenBy; }
    if (st === 2) o.rv = pick(["wait", "ok", "wait"]);
    if (st >= 3 && dv) { o.courier = pick(cos); o.cAcc = Date.now() - 36e5; }
    if (i % 23 === 0 && st < 4) { o.redoN = 1; o.redoAt = Date.now() - 36e5; o.redoBy = ops[0]; o.redoNote = "Не та лента"; o.rv = "redo"; }
    if (i % 31 === 0 && st < 4) Object.assign(o, { rqK: "cx", rqWhy: "Клиент передумал", rqBy: ops[1], rqN: "Оператор Ғалия", rqT: Date.now() - 36e5 });
    if (i % 29 === 0 && st < 4) Object.assign(o, { rqK: "p", rqP: Math.max(0, p - 3000), rqWhy: "Постоянный клиент", rqBy: ops[0], rqN: "Оператор Аружан", rqT: Date.now() - 2 * 36e5 });
    put(`orders/o${i}`, o);
  }

  // клиенты, заявки, сделки
  for (let i = 1; i <= 30; i++) { const phn = "7701" + String(1000000 + i); put(`customers/${phn}`, { name: i === 3 ? BAD[1] : pick(NAMES), phone: "+" + phn, prefs: i % 4 ? "" : "Любит белые розы", ...(i % 10 === 0 ? { co: "ТОО «Каспий Ойл»", coDeal: "Скидка 10%", coDisc: 10 } : {}), vip: i % 7 === 0 }); }
  for (let i = 1; i <= 10; i++) put(`leads/l${i}`, { name: pick(NAMES), phone: ph(), text: "Хочу букет на завтра", st: pick(["new", "work", "done"]), ts: Date.now() - i * 36e5, loc: L1 });
  for (let i = 1; i <= 10; i++) put(`deals/d${i}`, { title: "Свадьба " + pick(NAMES), client: pick(NAMES), phone: ph(), st: pick(["new", "talk", "won", "lost"]), sum: int(50, 500) * 1000, last: Date.now() - i * 864e5, fid: "main" });

  // чаты 60
  const CH = ["wa", "ig", "tg"];
  for (let i = 1; i <= 60; i++) {
    const ch = CH[i % 3], cid = ch + "_7700" + String(100000 + i), t0 = Date.now() - i * 3600e3;
    put(`chats/${cid}`, { ch, phone: ch === "wa" ? "+7700" + (100000 + i) : "", handle: ch !== "wa" ? "@user" + i : "", name: i % 15 === 0 ? BAD[i / 15 % BAD.length] : pick(NAMES), last: pick(["Здравствуйте, есть розы?", "Сколько стоит?", "Спасибо!", "🌹"]), lastInTs: t0, unread: i % 4 === 0 ? 2 : 0, st: i % 9 === 0 ? "closed" : "open", loc: i % 2 ? L1 : L2, ext: String(100000 + i) });
    const msgs = [
      { dir: "in", t: "Здравствуйте! Нужен букет на завтра", ts: t0 - 6e5 },
      { dir: "out", t: "Здравствуйте! Какой бюджет?", ts: t0 - 5e5, by: ops[0] },
      i % 5 === 0 ? { dir: "in", img: "https://example.com/c" + i + ".jpg", t: "", ts: t0 - 4e5 } : { dir: "in", t: "Около 20 000 https://instagram.com/p/xyz", ts: t0 - 4e5 },
      i % 6 === 0 ? { dir: "in", aud: "https://example.com/v" + i + ".ogg", t: "", ts: t0 - 3e5 } : { dir: "in", t: "Можно с доставкой?", q: { t: "Какой бюджет?" }, ts: t0 - 3e5 }
    ];
    msgs.forEach((m, k) => put(`chats/${cid}/msgs/m${k}`, m));
  }
  // чат команды
  for (let i = 1; i <= 10; i++) put(`team/t${i}`, { t: pick(["Кто на смене?", "Привезли розы", "Закончилась лента", "Ок 👍"]), by: pick([...ops, ...fls]), byName: "Сотрудник", role: "operator", ts: Date.now() - i * 6e5 });

  // отчёты всех типов
  const RT = ["show", "desk", "cash", "wo"];
  for (let i = 1; i <= 12; i++) put(`reports/r${i}`, { type: RT[i % 4], date: day(-int(0, 3)), by: pick([...ops, ...fls]), byName: "Сотрудник", loc: i % 2 ? L1 : L2, ts: Date.now() - i * 36e5, rv: pick(["", "ok", "bad"]), photos: [], ...(RT[i % 4] === "wo" ? { items: [{ iid: inv[0], name: "Роза красная", unit: "шт", q: 3 }], why: "Завяли", wdone: false } : {}) });

  // график и журнал смен
  const staffIds = Object.values(S);
  for (let d = -3; d <= 7; d++) staffIds.slice(2).forEach((u, k) => { if ((d + k) % 3) put(`shifts/${u}_${day(d)}`, { uid: u, date: day(d), t: "work", from: "10:00", to: "22:00", loc: k % 2 ? L1 : L2 }); });
  staffIds.slice(3, 8).forEach((u, k) => put(`shiftLog/sl${k}`, { uid: u, start: Date.now() - (3 + k) * 36e5, ...(k % 2 ? {} : { end: Date.now() - 36e5 }), loc: L1, name: "Сотрудник" }));

  // расходы, запросы склада
  for (let i = 1; i <= 10; i++) put(`expenses/e${i}`, { cat: pick(["Аренда", "Цветы", "Зарплата", "Реклама"]), sum: int(5, 300) * 1000, date: day(-int(0, 30)), note: "", by: S["tilegen615@gmail.com"] });
  for (let i = 1; i <= 5; i++) put(`stockReqs/q${i}`, { kind: pick(["adj", "ed", "wo"]), iid: inv[i], name: "Роза", unit: "шт", q: int(0, 20), by: fls[0], byName: "Флорист Асель", st: "wait", ts: Date.now() - i * 36e5, loc: L1 });

  await flush();
  return { staff: S, orders: 300, inventory: n, chats: 60 };
}

module.exports = { seed };
if (require.main === module) seed().then(r => { console.log("Тестовая база готова:", JSON.stringify({ ...r, staff: Object.keys(r.staff).length })); }).catch(e => { console.error(e); process.exit(1); });

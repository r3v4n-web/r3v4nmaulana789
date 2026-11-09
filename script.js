/* ================= STATE ================= */
/* Semua data disimpan di variabel biasa (array/object) di memori.
   Ini beda dari React yang punya "state" otomatis — di sini,
   SETIAP KALI data berubah, kita HARUS manual panggil fungsi render()
   yang sesuai supaya tampilan ikut ter-update. */

let products = [
  { id: "p1", name: "Es Teh Manis", code: "MNM-01", price: 5000, stock: 42, category: "Non Coffee" },
  { id: "p2", name: "Nasi Goreng", code: "MKN-01", price: 15000, stock: 18, category: "Makanan Berat" },
  { id: "p3", name: "Kopi Hitam", code: "MNM-02", price: 8000, stock: 30, category: "Coffee" },
  { id: "p4", name: "Roti Bakar", code: "MKN-02", price: 12000, stock: 7, category: "Camilan/Snack" },
  { id: "p5", name: "Air Mineral 600ml", code: "MNM-03", price: 4000, stock: 60, category: "Non Coffee" },
  { id: "p6", name: "Kerupuk", code: "SNK-01", price: 3000, stock: 25, category: "Camilan/Snack" },
  { id: "p7", name: "Kopi Susu Gula Aren", code: "MNM-04", price: 10000, stock: 24, category: "Coffee" },
  { id: "p8", name: "Ayam Geprek", code: "MKN-03", price: 18000, stock: 12, category: "Makanan Berat" },
];

let cart = [];               // isi keranjang saat ini
let transactions = [];       // riwayat transaksi
let selectedPayment = "Tunai";
let selectedCategory = "Semua";
let editingProductId = null; // null = mode tambah, isi = mode edit

let rawMaterials = [
  { id: "m1", name: "Biji Kopi Arabika", unit: "kg", stock: 8, minStock: 3 },
  { id: "m2", name: "Susu Full Cream", unit: "liter", stock: 12, minStock: 5 },
  { id: "m3", name: "Gula Aren", unit: "kg", stock: 4, minStock: 2 },
  { id: "m4", name: "Cup Kertas 12oz", unit: "pcs", stock: 150, minStock: 50 },
  { id: "m5", name: "Ayam Fillet", unit: "kg", stock: 2, minStock: 3 },
];
let editingMaterialId = null;
let stockAdjustMaterialId = null;
let stockAdjustType = "in";

let employees = [
  { id: "e1", name: "Ateng", role: "Kasir" },
  { id: "e2", name: "Reyvan", role: "Karyawan" },
  { id: "e3", name: "RDB", role: "Owner" },
];
let attendance = [];         // { id, employeeId, employeeName, role, date, checkIn, checkOut }
let editingEmployeeId = null;

/* ================= AKUN & HAK AKSES =================
   Akun disimpan di tabel "app_users" (Supabase), password di-hash di
   database dan TIDAK pernah dikirim ke browser. Login dicek lewat
   fungsi database "app_login" (lihat supabase-setup.sql).
   Tabel hak akses di bawah ini yang menentukan menu & tombol tiap peran;
   ubah di sini kalau pembagian aksesnya mau diganti. */
let currentUser = null; // { id, username, fullName, role, employeeId }
const ROLE_ACCESS = {
  owner: {
    label: "Owner",
    home: "kasir",
    pages: ["kasir", "produk", "bahanbaku", "absensi", "riwayat", "laporan"],
    editProducts: true, manageMaterials: true, adjustStock: true, manageEmployees: true, salesReport: true, deleteTransactions: true, deleteAttendance: true,
  },
  kasir: {
    label: "Kasir",
    home: "kasir",
    // "laporan" untuk kasir = hanya tab Pengeluaran (tanpa laporan penjualan & laba)
    pages: ["kasir", "produk", "bahanbaku", "absensi", "riwayat", "laporan"],
    editProducts: false, manageMaterials: false, adjustStock: true, manageEmployees: false, salesReport: false, deleteTransactions: false, deleteAttendance: false,
  },
  karyawan: {
    label: "Karyawan",
    home: "absensi",
    pages: ["absensi", "bahanbaku", "riwayat"],
    editProducts: false, manageMaterials: false, adjustStock: true, manageEmployees: false, salesReport: false, deleteTransactions: false, deleteAttendance: false,
  },
};
const can = (perm) => !!(currentUser && ROLE_ACCESS[currentUser.role] && ROLE_ACCESS[currentUser.role][perm]);
const canOpenPage = (page) => !!(currentUser && ROLE_ACCESS[currentUser.role] && ROLE_ACCESS[currentUser.role].pages.includes(page));

let expenses = [];           // pengeluaran: { id, date (Date), category, note, amount }
let editingExpenseId = null;
const EXPENSE_CATEGORIES = [
  "Bahan Baku", "Gaji Karyawan", "Sewa", "Listrik/Air/Internet", "Operasional", "Lainnya",
];

/* ================= DATABASE (Supabase) =================
   Supabase = database sungguhan di internet (cloud). Data bisa diakses
   dari HP kasir, laptop owner, atau perangkat mana pun selama semuanya
   memakai project Supabase yang SAMA lewat dua nilai di bawah ini.

   Cara mengisi (sekali saja):
   1. Jalankan supabase-setup.sql di Supabase > SQL Editor.
   2. Buka Project Settings > API, salin "Project URL" dan
      "Publishable / anon key", tempel di bawah.

   PENTING: SUPABASE_URL harus berupa alamat LENGKAP, bentuknya
   https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   (bukan cuma kode project-nya). Kalau kamu hanya menempel kode
   project, fungsi di bawah otomatis melengkapinya.
*/
const SUPABASE_URL_INPUT = "https://cqphwaveecwbmbrxnuao.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Za41s3dD5ZfMXLmeyoprHw_7m2dPIYr";

function normalizeSupabaseUrl(raw) {
  let u = String(raw || "").trim().replace(/\/+$/, "");
  if (!u || u.startsWith("ISI_")) return "";
  if (!/^https?:\/\//i.test(u)) {
    // hanya kode project (contoh: abcdefghijklmnopqrst) -> lengkapi
    u = /^[a-z0-9]+$/i.test(u) ? "https://" + u + ".supabase.co" : "https://" + u;
  }
  return u;
}
const SUPABASE_URL = normalizeSupabaseUrl(SUPABASE_URL_INPUT);
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith("ISI_");

let db = null;
let dbConnected = false; // jadi true hanya kalau data BERHASIL dimuat dari Supabase
if (isSupabaseConfigured) {
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("URL/key Supabase tidak valid:", err);
    db = null; // aplikasi tetap jalan pakai data contoh
  }
} else {
  console.warn("Supabase belum disetel. Aplikasi jalan pakai data contoh di memori.");
}

/* Menampilkan status koneksi di sidebar supaya langsung kelihatan. */
function setDbStatus(state) {
  const el = $("db-status");
  if (!el) return;
  const map = {
    online:  { text: "● Terhubung ke database", color: "#3F8F5B" },
    offline: { text: "● Database belum terhubung (data sementara)", color: "#C0504D" },
  };
  const m = map[state] || map.offline;
  el.textContent = m.text;
  el.style.color = m.color;
}

/* ---- pengubah bentuk data: baris database (snake_case) <-> objek JS (camelCase) ---- */
function trxToRow(t) {
  return {
    id: t.id, date: t.date, items: t.items, payment: t.payment, paid: t.paid, change: t.change,
    subtotal: t.subtotal, discount_pct: t.discountPct, discount_amt: t.discountAmt,
    tax_pct: t.taxPct, tax_amt: t.taxAmt, total: t.total,
  };
}
function rowToTrx(r) {
  return {
    id: r.id, date: new Date(r.date), items: r.items || [], payment: r.payment,
    paid: Number(r.paid), change: Number(r.change),
    subtotal: Number(r.subtotal), discountPct: Number(r.discount_pct), discountAmt: Number(r.discount_amt),
    taxPct: Number(r.tax_pct), taxAmt: Number(r.tax_amt), total: Number(r.total),
  };
}
function rowToProduct(r) {
  return { id: r.id, name: r.name, code: r.code, category: r.category || "", price: Number(r.price), stock: Number(r.stock) };
}
function attToRow(a) {
  return {
    id: a.id, employee_id: a.employeeId, employee_name: a.employeeName, role: a.role, date: a.date,
    check_in: a.checkIn, check_in_photo: a.checkInPhoto, check_out: a.checkOut, check_out_photo: a.checkOutPhoto,
  };
}
function rowToAtt(r) {
  return {
    id: r.id, employeeId: r.employee_id, employeeName: r.employee_name, role: r.role, date: r.date,
    checkIn: new Date(r.check_in), checkInPhoto: r.check_in_photo,
    checkOut: r.check_out ? new Date(r.check_out) : null, checkOutPhoto: r.check_out_photo,
  };
}
function matToRow(m) {
  return { id: m.id, name: m.name, unit: m.unit, stock: m.stock, min_stock: m.minStock };
}
function rowToMat(r) {
  return { id: r.id, name: r.name, unit: r.unit, stock: Number(r.stock), minStock: Number(r.min_stock) };
}
/* Tanggal pengeluaran disimpan sebagai teks "YYYY-MM-DD" (tanpa jam),
   supaya tidak bergeser sehari gara-gara zona waktu. */
function toDateInput(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fromDateInput(str) {
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function expToRow(x) {
  return { id: x.id, date: toDateInput(x.date), category: x.category, note: x.note, amount: x.amount };
}
function rowToExp(r) {
  return { id: r.id, date: fromDateInput(r.date), category: r.category, note: r.note || "", amount: Number(r.amount) };
}

/* Dipanggil sekali setelah "login". Kalau Supabase sudah disetel,
   ini menarik data terbaru dari cloud. Kalau belum, langsung
   selesai tanpa melakukan apa pun (data contoh tetap dipakai). */
async function loadData() {
  if (!db) { setDbStatus("offline"); return false; }
  let mainOk = false;
  try {
    const [p, m, t, e, a] = await Promise.all([
      db.from("products").select("*").order("name"),
      db.from("materials").select("*").order("name"),
      db.from("transactions").select("*").order("date"),
      db.from("employees").select("*").order("name"),
      db.from("attendance").select("*").order("check_in"),
    ]);
    const firstError = p.error || m.error || t.error || e.error || a.error;
    if (firstError) throw firstError;

    products = p.data.map(rowToProduct);
    rawMaterials = m.data.map(rowToMat);
    transactions = t.data.map(rowToTrx);
    employees = e.data;
    attendance = a.data.map(rowToAtt);
    mainOk = true;
  } catch (err) {
    console.error("Gagal memuat dari Supabase:", err);
    alert(
      "Gagal terhubung ke database Supabase. Aplikasi tetap jalan pakai data contoh sementara.\n\n" +
      "Cek lagi: SUPABASE_URL, SUPABASE_ANON_KEY, koneksi internet, dan apakah supabase-setup.sql sudah dijalankan."
    );
  }

  // Pengeluaran dimuat terpisah: kalau tabel "expenses" belum dibuat,
  // data lain (produk, transaksi, dll.) tetap termuat normal.
  try {
    const x = await db.from("expenses").select("*").order("date");
    if (x.error) throw x.error;
    expenses = x.data.map(rowToExp);
  } catch (err) {
    console.error("Gagal memuat pengeluaran dari Supabase:", err);
    alert(
      "Data pengeluaran gagal dimuat dari database.\n\n" +
      "Kalau kamu baru menambahkan fitur Pengeluaran, jalankan supabase-setup.sql di SQL Editor Supabase sekali saja."
    );
  }

  dbConnected = mainOk;
  setDbStatus(mainOk ? "online" : "offline");
  return mainOk;
}

/* ================= HELPERS ================= */
const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
const $ = (id) => document.getElementById(id);

/* ================= TEMA GELAP/TERANG ================= */
/* Preferensi tema disimpan di variabel biasa (bukan localStorage),
   jadi akan kembali ke "Terang" tiap kali halaman dimuat ulang. */
let currentTheme = "light";

function applyTheme() {
  const btn = $("theme-toggle-floating");
  const moonIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.6A9 9 0 1 1 11.4 3a7.2 7.2 0 0 0 9.6 9.6z"/></svg>`;
  const sunIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.4 19.6 6 18M18 6l1.6-1.6"/></svg>`;

  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    btn.innerHTML = sunIcon;
    btn.title = "Ganti ke mode terang";
  } else {
    document.documentElement.removeAttribute("data-theme");
    btn.innerHTML = moonIcon;
    btn.title = "Ganti ke mode gelap";
  }
}

$("theme-toggle-floating").addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme();
});
applyTheme();

/* ================= LOGIN ================= */
function showLoginError(msg) {
  const el = $("login-error");
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("login-username").value.trim();
  const password = $("login-password").value; // password tidak di-trim
  showLoginError("");

  if (!username || !password) {
    showLoginError("Isi username dan password dulu, ya.");
    return;
  }
  if (!db) {
    showLoginError("Database belum terhubung, jadi login belum bisa dipakai. Cek SUPABASE_URL dan SUPABASE_ANON_KEY di script.js.");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Memeriksa akun...";

  try {
    const { data, error } = await db.rpc("app_login", { p_username: username, p_password: password });
    if (error) throw error;
    if (!data || data.length === 0 || !ROLE_ACCESS[data[0].role]) {
      showLoginError("Username atau password salah.");
      return;
    }
    const row = data[0];
    currentUser = {
      id: row.id, username: row.username, fullName: row.full_name,
      role: row.role, employeeId: row.employee_id || null,
    };
    submitBtn.textContent = "Menghubungkan ke database...";
    await enterApp();
    $("login-form").reset();
  } catch (err) {
    console.error("Login gagal:", err);
    const fnMissing = err && (err.code === "PGRST202" || /app_login/.test(err.message || ""));
    showLoginError(
      fnMissing
        ? "Fungsi login belum ada di database. Jalankan supabase-setup.sql di SQL Editor Supabase."
        : "Gagal terhubung ke database. Cek koneksi internet kamu."
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Masuk";
  }
});

/* Dipanggil setelah akun terverifikasi: muat data, atur menu sesuai peran, buka halaman awal. */
async function enterApp() {
  await loadData();
  $("login-screen").style.display = "none";
  $("app").style.display = "flex";
  applyRoleUI();
  renderAll();
  goToPage(ROLE_ACCESS[currentUser.role].home);
}

/* Sembunyikan menu & tombol yang tidak boleh dipakai peran ini. */
function applyRoleUI() {
  const access = ROLE_ACCESS[currentUser.role];
  document.querySelectorAll("#sidebar nav button").forEach((btn) => {
    btn.style.display = canOpenPage(btn.dataset.page) ? "" : "none";
  });
  $("user-info").textContent = currentUser.fullName;
  $("user-info").dataset.role = access.label;
  $("add-product-btn").style.display = can("editProducts") ? "" : "none";
  $("add-material-btn").style.display = can("manageMaterials") ? "" : "none";
  $("add-employee-btn").style.display = can("manageEmployees") ? "" : "none";
  $("attendance-filter").style.display = can("manageEmployees") ? "" : "none";
  $("attendance-action-th").style.display = can("deleteAttendance") ? "" : "none";
  const actionTh = document.querySelector("#page-produk thead th:last-child");
  if (actionTh) actionTh.style.display = can("editProducts") ? "" : "none";

  // Halaman Laporan: yang boleh laporan penjualan melihat dua tab; yang lain
  // hanya melihat Pengeluaran (tanpa tab Penjualan dan tanpa ringkasan laba).
  const sales = can("salesReport");
  document.querySelectorAll("#sidebar nav button").forEach((btn) => {
    if (btn.dataset.page !== "laporan") return;
    const ico = btn.querySelector(".ni"), lbl = btn.querySelector(".nl");
    if (ico) ico.textContent = sales ? "📊" : "💸";
    if (lbl) lbl.textContent = sales ? "Laporan" : "Pengeluaran";
  });
  $("report-title").textContent = sales ? "Laporan" : "Pengeluaran";
  $("report-tabs").style.display = sales ? "" : "none";
  $("profit-box").style.display = sales ? "" : "none";
  setReportTab(sales ? "penjualan" : "pengeluaran");
}

$("logout-btn").addEventListener("click", () => {
  currentUser = null;
  cart = [];
  $("page-kasir").classList.remove("cart-open", "has-items");
  $("discount-input").value = 0;
  $("tax-input").value = 0;
  $("paid-input").value = "";
  $("app").style.display = "none";
  $("login-screen").style.display = "flex";
  $("login-form").reset();
  showLoginError("");
});

/* ================= NAVIGATION ================= */
function goToPage(page) {
  if (!canOpenPage(page)) return; // pagar akses: peran ini tidak boleh membuka halaman tsb.
  document.querySelectorAll("#sidebar nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  // page-kasir tidak punya class "page", jadi diatur terpisah
  $("page-kasir").classList.toggle("active", page === "kasir");
  if (page !== "kasir") $("page-" + page).classList.add("active");

  if (page === "produk") renderProductTable();
  if (page === "bahanbaku") renderMaterialsTable();
  if (page === "absensi") renderAbsensi();
  if (page === "riwayat") renderTransactionList();
  if (page === "laporan") renderReport();
}
document.querySelectorAll("#sidebar nav button").forEach((btn) => {
  btn.addEventListener("click", () => goToPage(btn.dataset.page));
});

/* ================= KASIR: render product grid ================= */
function renderProductGrid() {
  const query = $("product-search").value.toLowerCase();
  const grid = $("product-grid");
  grid.innerHTML = "";
  const filtered = products.filter(
    (p) =>
      (selectedCategory === "Semua" || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query))
  );
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#A3907A; font-size:13px; padding:40px 0;">Produk tidak ditemukan.</div>';
    return;
  }
  filtered.forEach((p) => {
    const card = document.createElement("button");
    card.className = "product-card" + (p.stock <= 0 ? " disabled" : "");
    card.disabled = p.stock <= 0;
    card.innerHTML = `
      <div class="pname">${p.name}</div>
      <div class="pcode">${p.code}</div>
      <div class="prow">
        <span class="pprice">${rupiah(p.price)}</span>
        <span class="pstock ${p.stock <= 5 ? "low" : ""}">stok ${p.stock}</span>
      </div>`;
    card.addEventListener("click", () => addToCart(p.id));
    grid.appendChild(card);
  });
}
$("product-search").addEventListener("input", renderProductGrid);

document.querySelectorAll(".cat-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedCategory = btn.dataset.cat;
    renderProductGrid();
  });
});

/* ================= KASIR: cart logic ================= */
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;
  const existing = cart.find((i) => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) return;
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  const product = products.find((p) => p.id === productId);
  if (!item || !product) return;
  item.qty = Math.min(Math.max(item.qty + delta, 1), product.stock);
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  renderCart();
}

function calcTotals() {
  const discountPct = Number($("discount-input").value) || 0;
  const taxPct = Number($("tax-input").value) || 0;
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmt = (subtotal * discountPct) / 100;
  const taxAmt = ((subtotal - discountAmt) * taxPct) / 100;
  const total = subtotal - discountAmt + taxAmt;
  return { discountPct, taxPct, subtotal, discountAmt, taxAmt, total };
}

function renderCart() {
  const container = $("cart-items");
  container.innerHTML = "";
  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">Belum ada item. Ketuk produk untuk menambah.</div>';
  } else {
    cart.forEach((i) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="ci-info">
          <div class="ci-name">${i.name}</div>
          <div class="ci-price">${rupiah(i.price)}</div>
        </div>
        <button class="qty-btn" data-action="minus">−</button>
        <span class="qty-num">${i.qty}</span>
        <button class="qty-btn" data-action="plus">+</button>
        <button class="rm-btn" data-action="remove">🗑</button>`;
      row.querySelector('[data-action="minus"]').addEventListener("click", () => changeQty(i.id, -1));
      row.querySelector('[data-action="plus"]').addEventListener("click", () => changeQty(i.id, 1));
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeFromCart(i.id));
      container.appendChild(row);
    });
  }
  const { subtotal, total } = calcTotals();
  $("subtotal-val").textContent = rupiah(subtotal);
  $("total-val").textContent = rupiah(total);

  // Tampilan HP: bar ringkas di bawah daftar produk (jumlah item + total)
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);
  $("page-kasir").classList.toggle("has-items", itemCount > 0);
  if (itemCount === 0) $("page-kasir").classList.remove("cart-open");
  $("cb-count").textContent = itemCount + " item";
  $("cb-total").textContent = rupiah(total);

  updatePaymentUI(total);
  renderProductGrid(); // refresh stok badge kalau ada perubahan
}

/* Nominal bayar (tunai) hanya relevan kalau metode pembayarannya Tunai.
   Fungsi ini yang mengatur tampil/sembunyi input, hitung kembalian,
   dan menentukan boleh/tidaknya transaksi diselesaikan. */
function updatePaymentUI(total) {
  const isCash = selectedPayment === "Tunai";
  const cashWrap = $("cash-input-wrap");
  const changeRow = $("change-row");
  const errorEl = $("paid-error");
  const paid = Number($("paid-input").value) || 0;

  cashWrap.classList.toggle("show", isCash);
  changeRow.classList.toggle("show", isCash);

  let valid = cart.length > 0;

  if (isCash) {
    const change = paid - total;
    changeRow.classList.toggle("negative", change < 0);
    $("change-val").textContent = rupiah(Math.max(change, 0));

    if (cart.length > 0 && paid < total) {
      errorEl.textContent = "Nominal bayar kurang dari total belanja.";
      errorEl.classList.add("show");
      valid = false;
    } else {
      errorEl.classList.remove("show");
    }
  } else {
    errorEl.classList.remove("show");
  }

  $("finish-btn").disabled = !valid;
}

/* Tampilan HP: keranjang berupa panel yang naik dari bawah */
$("cart-bar").addEventListener("click", () => $("page-kasir").classList.add("cart-open"));
$("cart-close").addEventListener("click", () => $("page-kasir").classList.remove("cart-open"));
$("cart-backdrop").addEventListener("click", () => $("page-kasir").classList.remove("cart-open"));

$("discount-input").addEventListener("input", renderCart);
$("tax-input").addEventListener("input", renderCart);
$("paid-input").addEventListener("input", renderCart);

document.querySelectorAll(".pay-methods button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pay-methods button").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedPayment = btn.dataset.pay;
    renderCart();
  });
});

$("finish-btn").addEventListener("click", async () => {
  if (cart.length === 0) return;
  const totals = calcTotals();
  const isCash = selectedPayment === "Tunai";
  const paid = isCash ? (Number($("paid-input").value) || 0) : totals.total;

  if (isCash && paid < totals.total) return; // sudah dicegah lewat tombol disabled, ini jaga-jaga

  // kurangi stok (di layar dulu, baru dikirim ke database kalau ada)
  const stockUpdates = [];
  cart.forEach((i) => {
    const product = products.find((p) => p.id === i.id);
    if (product) {
      product.stock -= i.qty;
      if (db) stockUpdates.push(db.from("products").update({ stock: product.stock }).eq("id", product.id));
    }
  });

  const trx = {
    id: "TRX" + Date.now(),
    date: new Date(),
    items: cart.map((i) => ({ ...i })),
    payment: selectedPayment,
    paid,
    change: isCash ? paid - totals.total : 0,
    ...totals,
  };
  transactions.push(trx);

  showReceipt(trx);

  cart = [];
  $("discount-input").value = 0;
  $("tax-input").value = 0;
  $("paid-input").value = "";
  renderCart();

  if (db) {
    // Promise.all TIDAK melempar error untuk hasil {error} dari Supabase,
    // jadi setiap hasil harus dicek satu per satu.
    const results = await Promise.all([db.from("transactions").insert([trxToRow(trx)]), ...stockUpdates]);
    const failed = results.find((r) => r && r.error);
    if (failed) {
      console.error("Gagal menyimpan transaksi ke database:", failed.error);
      alert("Transaksi tersimpan di layar, tapi gagal dikirim ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ================= RECEIPT MODAL ================= */
function showReceipt(trx) {
  const el = $("receipt-content");
  const dateStr = trx.date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = trx.date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  el.innerHTML = `
    <div class="receipt-paper">
      <div class="receipt-head">
        <svg class="r-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/>
          <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>
          <path d="M8 3.5c-.6.6-.6 1.4 0 2s.6 1.4 0 2"/>
          <path d="M12 3.5c-.6.6-.6 1.4 0 2s.6 1.4 0 2"/>
        </svg>
        <div class="r-shop">Saerah Coffe House</div>
        <div class="r-address">Jl. Merdeka No. 12, Malang<br>0812-3456-7890</div>
      </div>

      <div class="receipt-divider solid"></div>

      <div class="receipt-meta">
        <div class="rline"><span>No. Struk</span><span>${trx.id}</span></div>
        <div class="rline"><span>Tanggal</span><span>${dateStr}, ${timeStr}</span></div>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-items">
        ${trx.items.map((i) => `
          <div class="receipt-item">
            <div class="ri-name">${i.name}</div>
            <div class="rline"><span>${i.qty} x ${rupiah(i.price)}</span><span>${rupiah(i.price * i.qty)}</span></div>
          </div>`).join("")}
      </div>

      <div class="receipt-divider"></div>

      <div class="rtotals">
        <div class="rline"><span>Subtotal</span><span>${rupiah(trx.subtotal)}</span></div>
        ${trx.discountPct > 0 ? `<div class="rline"><span>Diskon ${trx.discountPct}%</span><span>-${rupiah(trx.discountAmt)}</span></div>` : ""}
        ${trx.taxPct > 0 ? `<div class="rline"><span>Pajak ${trx.taxPct}%</span><span>${rupiah(trx.taxAmt)}</span></div>` : ""}
        <div class="receipt-divider"></div>
        <div class="rline rtotal-final"><span>TOTAL</span><span>${rupiah(trx.total)}</span></div>
        <div class="rline"><span>Metode</span><span>${trx.payment}</span></div>
        ${trx.payment === "Tunai" ? `
          <div class="rline"><span>Nominal Bayar</span><span>${rupiah(trx.paid)}</span></div>
          <div class="rline"><span>Kembalian</span><span>${rupiah(trx.change)}</span></div>
        ` : ""}
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-footer">
        <div class="r-thanks">Terima kasih sudah berbelanja! ☕</div>
        <div class="r-note">Barang yang sudah dibeli tidak dapat ditukar</div>
        <div class="receipt-barcode"></div>
      </div>
    </div>`;
  $("receipt-modal").classList.add("active");
}
function closeReceipt() { $("receipt-modal").classList.remove("active"); }
$("receipt-x").addEventListener("click", closeReceipt);
$("receipt-close").addEventListener("click", closeReceipt);
$("receipt-print").addEventListener("click", () => window.print());

/* ================= PRODUK PAGE ================= */
function renderProductTable() {
  $("product-count").textContent = products.length + " produk terdaftar";
  const body = $("product-table-body");
  body.innerHTML = "";
  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.code}</td>
      <td>${p.category || "-"}</td>
      <td class="num">${rupiah(p.price)}</td>
      <td class="num ${p.stock <= 5 ? "low-stock" : ""}">${p.stock}</td>
      ${can("editProducts") ? `<td class="num">
        <button class="icon-btn edit" data-action="edit">✎</button>
        <button class="icon-btn danger" data-action="delete">🗑</button>
      </td>` : ""}`;
    tr.querySelector('[data-action="edit"]')?.addEventListener("click", () => openProductForm(p.id));
    tr.querySelector('[data-action="delete"]')?.addEventListener("click", async () => {
      products = products.filter((x) => x.id !== p.id);
      renderProductTable();
      renderProductGrid();
      if (db) {
        const { error } = await db.from("products").delete().eq("id", p.id);
        if (error) {
          console.error("Gagal menghapus produk:", error);
          alert("Gagal menghapus produk dari database. Cek koneksi internet kamu.");
        }
      }
    });
    body.appendChild(tr);
  });
}

function openProductForm(productId) {
  editingProductId = productId || null;
  const form = $("product-form");
  if (productId) {
    const p = products.find((x) => x.id === productId);
    $("product-form-title").textContent = "Edit Produk";
    $("pf-name").value = p.name;
    $("pf-code").value = p.code;
    $("pf-category").value = p.category || "";
    $("pf-price").value = p.price;
    $("pf-stock").value = p.stock;
  } else {
    $("product-form-title").textContent = "Tambah Produk";
    form.reset();
  }
  $("product-form-modal").classList.add("active");
}
function closeProductForm() { $("product-form-modal").classList.remove("active"); }
$("add-product-btn").addEventListener("click", () => openProductForm(null));
$("product-form-x").addEventListener("click", closeProductForm);

$("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("pf-name").value.trim(),
    code: $("pf-code").value.trim(),
    category: $("pf-category").value.trim(),
    price: Number($("pf-price").value),
    stock: Number($("pf-stock").value),
  };
  if (!data.name || !data.code) return;

  let newProduct = null;
  if (editingProductId) {
    const p = products.find((x) => x.id === editingProductId);
    Object.assign(p, data);
  } else {
    newProduct = { id: "p" + Date.now(), ...data };
    products.push(newProduct);
  }
  closeProductForm();
  renderProductTable();
  renderProductGrid();

  if (db) {
    const { error } = editingProductId
      ? await db.from("products").update(data).eq("id", editingProductId)
      : await db.from("products").insert([newProduct]);
    if (error) {
      console.error("Gagal menyimpan produk:", error);
      alert("Gagal menyimpan produk ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ================= STOK BAHAN BAKU =================
   Terhubung ke tabel "materials" di Supabase. Catatan (sa-note) pada
   form Sesuaikan Stok belum disimpan; kalau butuh riwayat perubahan
   stok, perlu tabel baru. */
function renderMaterialsTable() {
  $("material-count").textContent = rawMaterials.length + " bahan baku terdaftar";
  const body = $("material-table-body");
  body.innerHTML = "";
  rawMaterials.forEach((m) => {
    const isLow = m.stock <= m.minStock;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.unit}</td>
      <td class="num ${isLow ? "material-stock-low" : ""}">${m.stock} ${m.unit}</td>
      <td class="num">${m.minStock} ${m.unit}</td>
      <td class="num">
        ${can("adjustStock") ? `<button class="stock-adjust-btn" data-action="adjust" title="Sesuaikan stok">±</button>` : ""}
        ${can("manageMaterials") ? `<button class="icon-btn edit" data-action="edit">✎</button>
        <button class="icon-btn danger" data-action="delete">🗑</button>` : ""}
      </td>`;
    tr.querySelector('[data-action="adjust"]')?.addEventListener("click", () => openStockAdjust(m.id));
    tr.querySelector('[data-action="edit"]')?.addEventListener("click", () => openMaterialForm(m.id));
    tr.querySelector('[data-action="delete"]')?.addEventListener("click", async () => {
      rawMaterials = rawMaterials.filter((x) => x.id !== m.id);
      renderMaterialsTable();
      if (db) {
        const { error } = await db.from("materials").delete().eq("id", m.id);
        if (error) {
          console.error("Gagal menghapus bahan baku:", error);
          alert("Gagal menghapus bahan baku dari database. Cek koneksi internet kamu.");
        }
      }
    });
    body.appendChild(tr);
  });
}

/* ---- tambah / edit bahan baku ---- */
function openMaterialForm(materialId) {
  editingMaterialId = materialId || null;
  const form = $("material-form");
  if (materialId) {
    const m = rawMaterials.find((x) => x.id === materialId);
    $("material-form-title").textContent = "Edit Bahan Baku";
    $("mf-name").value = m.name;
    $("mf-unit").value = m.unit;
    $("mf-stock").value = m.stock;
    $("mf-min-stock").value = m.minStock;
  } else {
    $("material-form-title").textContent = "Tambah Bahan Baku";
    form.reset();
  }
  $("material-form-modal").classList.add("active");
}
function closeMaterialForm() { $("material-form-modal").classList.remove("active"); }
$("add-material-btn").addEventListener("click", () => openMaterialForm(null));
$("material-form-x").addEventListener("click", closeMaterialForm);

$("material-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("mf-name").value.trim(),
    unit: $("mf-unit").value,
    stock: Number($("mf-stock").value),
    minStock: Number($("mf-min-stock").value),
  };
  if (!data.name) return;

  let newMaterial = null;
  if (editingMaterialId) {
    const m = rawMaterials.find((x) => x.id === editingMaterialId);
    Object.assign(m, data);
  } else {
    newMaterial = { id: "m" + Date.now(), ...data };
    rawMaterials.push(newMaterial);
  }
  closeMaterialForm();
  renderMaterialsTable();

  if (db) {
    const { error } = editingMaterialId
      ? await db.from("materials").update(matToRow(data)).eq("id", editingMaterialId)
      : await db.from("materials").insert([matToRow(newMaterial)]);
    if (error) {
      console.error("Gagal menyimpan bahan baku:", error);
      alert("Gagal menyimpan bahan baku ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ---- sesuaikan stok (tambah stok masuk / kurangi stok keluar) ---- */
function openStockAdjust(materialId) {
  stockAdjustMaterialId = materialId;
  stockAdjustType = "in";
  const m = rawMaterials.find((x) => x.id === materialId);
  $("stock-adjust-current").textContent = `Stok saat ini: ${m.stock} ${m.unit}`;
  $("stock-adjust-form").reset();
  document.querySelectorAll('#stock-adjust-modal .pay-methods button').forEach((b) => {
    b.classList.toggle("selected", b.dataset.adjust === "in");
  });
  $("stock-adjust-modal").classList.add("active");
}
function closeStockAdjust() { $("stock-adjust-modal").classList.remove("active"); }
$("stock-adjust-x").addEventListener("click", closeStockAdjust);

document.querySelectorAll('#stock-adjust-modal .pay-methods button').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#stock-adjust-modal .pay-methods button').forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    stockAdjustType = btn.dataset.adjust;
  });
});

$("stock-adjust-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = Number($("sa-amount").value);
  if (!amount || amount <= 0) return;
  const m = rawMaterials.find((x) => x.id === stockAdjustMaterialId);
  if (!m) return;

  if (stockAdjustType === "in") {
    m.stock += amount;
  } else {
    m.stock = Math.max(0, m.stock - amount);
  }
  // Catatan (sa-note) sengaja belum disimpan ke mana pun - baru sekadar
  // kolom di form. Kalau nanti riwayat perubahan stok dibutuhkan,
  // ini titik yang pas untuk menambahkannya (butuh tabel baru).
  closeStockAdjust();
  renderMaterialsTable();

  if (db) {
    const { error } = await db.from("materials").update({ stock: m.stock }).eq("id", m.id);
    if (error) {
      console.error("Gagal menyimpan penyesuaian stok:", error);
      alert("Gagal menyimpan perubahan stok ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ================= RIWAYAT PAGE ================= */
function renderTransactionList() {
  $("trx-count").textContent = transactions.length + " transaksi tercatat";
  const list = $("trx-list");
  list.innerHTML = "";
  if (transactions.length === 0) {
    list.innerHTML = '<div class="trx-empty">Belum ada transaksi. Riwayat akan muncul setelah kamu bertransaksi di halaman Kasir.</div>';
    return;
  }
  [...transactions].reverse().forEach((t) => {
    const item = document.createElement("div");
    item.className = "trx-item";

    const row = document.createElement("button");
    row.className = "trx-row";
    row.innerHTML = `
      <div>
        <div class="trx-id">${t.id}</div>
        <div class="trx-meta">${t.date.toLocaleString("id-ID")} · ${t.items.length} item · ${t.payment}</div>
      </div>
      <div class="trx-total">${rupiah(t.total)}</div>`;
    row.addEventListener("click", () => showReceipt(t));
    item.appendChild(row);

    if (can("deleteTransactions")) {
      const del = document.createElement("button");
      del.className = "icon-btn danger trx-del";
      del.title = "Hapus transaksi";
      del.textContent = "🗑";
      del.addEventListener("click", () => deleteTransaction(t));
      item.appendChild(del);
    }
    list.appendChild(item);
  });
}

async function deleteTransaction(t) {
  if (!can("deleteTransactions")) return; // pagar akses
  const ok = confirm(
    "Hapus transaksi " + t.id + " (" + rupiah(t.total) + ")?\n\n" +
    "Transaksi akan hilang dari riwayat dan laporan penjualan. " +
    "Stok produk TIDAK dikembalikan. Tindakan ini tidak bisa dibatalkan."
  );
  if (!ok) return;

  const before = transactions;
  transactions = transactions.filter((x) => x.id !== t.id);
  renderTransactionList();

  if (db) {
    const { error } = await db.from("transactions").delete().eq("id", t.id);
    if (error) {
      console.error("Gagal menghapus transaksi:", error);
      transactions = before; // batalkan penghapusan di layar supaya sama dengan database
      renderTransactionList();
      alert("Gagal menghapus transaksi dari database. Transaksi dikembalikan. Cek koneksi internet kamu.");
    }
  }
}

/* ================= LAPORAN PAGE ================= */
function renderReport() {
  $("report-date").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Peran tanpa akses laporan penjualan: data penjualan tidak dihitung/ditampilkan sama sekali.
  if (!can("salesReport")) { renderExpenseReport(); return; }

  const now = new Date();
  const isSameDay = (d) => d.toDateString() === now.toDateString();
  const isSameWeek = (d) => { const diff = (now - d) / 86400000; return diff >= 0 && diff < 7; };
  const isSameMonth = (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const stats = [
    { label: "Hari ini", fn: isSameDay },
    { label: "Minggu ini", fn: isSameWeek },
    { label: "Bulan ini", fn: isSameMonth },
  ];

  $("stat-grid").innerHTML = stats.map((s) => {
    const list = transactions.filter((t) => s.fn(t.date));
    const total = list.reduce((sum, t) => sum + t.total, 0);
    return `<div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-val">${rupiah(total)}</div>
      <div class="stat-count">${list.length} transaksi</div>
    </div>`;
  }).join("");

  const productTotals = {};
  transactions.forEach((t) => t.items.forEach((i) => {
    productTotals[i.name] = (productTotals[i.name] || 0) + i.qty;
  }));
  const sorted = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topEl = $("top-products");
  if (sorted.length === 0) {
    topEl.innerHTML = '<p style="font-size:12px;color:#9C9A8F;">Belum ada data penjualan.</p>';
  } else {
    const max = sorted[0][1];
    topEl.innerHTML = sorted.map(([name, qty]) => `
      <div class="bar-row">
        <div class="bar-name">${name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(qty / max) * 100}%"></div></div>
        <div class="bar-qty">${qty} terjual</div>
      </div>`).join("");
  }

  renderExpenseReport();
}

/* ================= LAPORAN: PENGELUARAN ================= */
const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---- tab Penjualan | Pengeluaran ---- */
function setReportTab(name) {
  if (name === "penjualan" && !can("salesReport")) name = "pengeluaran"; // pagar akses
  document.querySelectorAll(".report-tab").forEach((b) => b.classList.toggle("active", b.dataset.rtab === name));
  $("report-penjualan").classList.toggle("active", name === "penjualan");
  $("report-pengeluaran").classList.toggle("active", name === "pengeluaran");
}
document.querySelectorAll(".report-tab").forEach((btn) => {
  btn.addEventListener("click", () => setReportTab(btn.dataset.rtab));
});

/* isi dropdown kategori (form + filter) dari satu daftar EXPENSE_CATEGORIES */
function initExpenseCategories() {
  const opts = EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  $("xf-category").innerHTML = opts;
  $("expense-filter").innerHTML = '<option value="">Semua kategori</option>' + opts;
}
initExpenseCategories();

function renderExpenseReport() {
  const now = new Date();
  const isSameDay = (d) => d.toDateString() === now.toDateString();
  const isSameWeek = (d) => { const diff = (now - d) / 86400000; return diff >= 0 && diff < 7; };
  const isSameMonth = (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const sum = (list, key) => list.reduce((s, x) => s + x[key], 0);

  // kartu ringkasan: hari ini / minggu ini / bulan ini
  const periods = [
    { label: "Hari ini", fn: isSameDay },
    { label: "Minggu ini", fn: isSameWeek },
    { label: "Bulan ini", fn: isSameMonth },
  ];
  $("expense-stat-grid").innerHTML = periods.map((p) => {
    const list = expenses.filter((x) => p.fn(x.date));
    return `<div class="stat-card">
      <div class="stat-label">${p.label}</div>
      <div class="stat-val">${rupiah(sum(list, "amount"))}</div>
      <div class="stat-count">${list.length} pengeluaran</div>
    </div>`;
  }).join("");

  // ringkasan bulan ini: pemasukan - pengeluaran
  const monthExpenses = expenses.filter((x) => isSameMonth(x.date));
  const monthOut = sum(monthExpenses, "amount");
  if (can("salesReport")) {
    const monthIncome = sum(transactions.filter((t) => isSameMonth(t.date)), "total");
    const profit = monthIncome - monthOut;
    $("profit-summary").innerHTML = `
      <div class="profit-row"><span>Pemasukan (penjualan)</span><span>${rupiah(monthIncome)}</span></div>
      <div class="profit-row"><span>Pengeluaran</span><span>− ${rupiah(monthOut)}</span></div>
      <div class="profit-row total"><span>Laba bersih</span><span class="${profit < 0 ? "neg" : "pos"}">${profit < 0 ? "−" : ""}${rupiah(Math.abs(profit))}</span></div>`;
  } else {
    $("profit-summary").innerHTML = ""; // kasir tidak boleh melihat pemasukan/laba
  }

  // pengeluaran per kategori (bulan ini)
  const byCat = {};
  monthExpenses.forEach((x) => { byCat[x.category] = (byCat[x.category] || 0) + x.amount; });
  const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const catEl = $("expense-by-category");
  if (catSorted.length === 0) {
    catEl.innerHTML = '<p class="expense-empty">Belum ada pengeluaran bulan ini.</p>';
  } else {
    const max = catSorted[0][1];
    catEl.innerHTML = catSorted.map(([cat, amt]) => `
      <div class="bar-row">
        <div class="bar-name">${escapeHtml(cat)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(amt / max) * 100}%"></div></div>
        <div class="bar-qty wide">${rupiah(amt)}</div>
      </div>`).join("");
  }

  renderExpenseTable();
}

function renderExpenseTable() {
  const filterCat = $("expense-filter").value;
  const body = $("expense-table-body");
  body.innerHTML = "";
  const rows = expenses
    .filter((x) => !filterCat || x.category === filterCat)
    .sort((a, b) => b.date - a.date || b.id.localeCompare(a.id));

  if (rows.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Belum ada pengeluaran tercatat.</td></tr>';
    return;
  }

  rows.forEach((x) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${x.date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td><span class="expense-cat">${escapeHtml(x.category)}</span></td>
      <td>${escapeHtml(x.note) || "-"}</td>
      <td class="num expense-amount">${rupiah(x.amount)}</td>
      <td class="num">
        <button class="icon-btn edit" data-action="edit">✎</button>
        <button class="icon-btn danger" data-action="delete">🗑</button>
      </td>`;
    tr.querySelector('[data-action="edit"]').addEventListener("click", () => openExpenseForm(x.id));
    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Hapus pengeluaran ini?")) return;
      expenses = expenses.filter((e) => e.id !== x.id);
      renderExpenseReport();
      if (db) {
        const { error } = await db.from("expenses").delete().eq("id", x.id);
        if (error) {
          console.error("Gagal menghapus pengeluaran:", error);
          alert("Gagal menghapus pengeluaran dari database. Cek koneksi internet kamu.");
        }
      }
    });
    body.appendChild(tr);
  });
}
$("expense-filter").addEventListener("change", renderExpenseTable);

/* ---- form tambah / edit pengeluaran ---- */
function openExpenseForm(expenseId) {
  editingExpenseId = expenseId || null;
  if (expenseId) {
    const x = expenses.find((e) => e.id === expenseId);
    $("expense-form-title").textContent = "Edit Pengeluaran";
    $("xf-date").value = toDateInput(x.date);
    $("xf-category").value = x.category;
    $("xf-note").value = x.note;
    $("xf-amount").value = x.amount;
  } else {
    $("expense-form-title").textContent = "Catat Pengeluaran";
    $("expense-form").reset();
    $("xf-date").value = toDateInput(new Date()); // default: hari ini
  }
  $("expense-form-modal").classList.add("active");
}
function closeExpenseForm() { $("expense-form-modal").classList.remove("active"); }
$("add-expense-btn").addEventListener("click", () => openExpenseForm(null));
$("expense-form-x").addEventListener("click", closeExpenseForm);

$("expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    date: fromDateInput($("xf-date").value),
    category: $("xf-category").value,
    note: $("xf-note").value.trim(),
    amount: Number($("xf-amount").value),
  };
  if (!$("xf-date").value || !data.note || !(data.amount > 0)) return;

  let saved;
  if (editingExpenseId) {
    saved = expenses.find((x) => x.id === editingExpenseId);
    Object.assign(saved, data);
  } else {
    saved = { id: "x" + Date.now(), ...data };
    expenses.push(saved);
  }
  const wasEditing = !!editingExpenseId;
  closeExpenseForm();
  renderExpenseReport();

  if (db) {
    const { error } = wasEditing
      ? await db.from("expenses").update(expToRow(saved)).eq("id", saved.id)
      : await db.from("expenses").insert([expToRow(saved)]);
    if (error) {
      console.error("Gagal menyimpan pengeluaran:", error);
      alert("Gagal menyimpan pengeluaran ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ================= ABSENSI PAGE ================= */
const todayKey = () => new Date().toDateString(); // dipakai buat cocokkan "hari ini" tanpa peduli jam

function todaysAttendance(employeeId) {
  return attendance.find((a) => a.employeeId === employeeId && a.date === todayKey());
}

/* Owner boleh mengelola semua karyawan; peran lain hanya data dirinya sendiri. */
const canActFor = (employeeId) => can("manageEmployees") || (currentUser && currentUser.employeeId === employeeId);

async function checkIn(employeeId, photo) {
  if (!canActFor(employeeId)) return;
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp || todaysAttendance(employeeId)) return;
  const now = new Date();
  const record = {
    id: "ABS" + Date.now(),
    employeeId,
    employeeName: emp.name,
    role: emp.role,
    date: todayKey(),
    checkIn: now,
    checkInPhoto: photo || null,
    checkOut: null,
    checkOutPhoto: null,
  };
  attendance.push(record);
  renderAbsensi(); // tampilkan dulu, biar kasir tidak nunggu jaringan
  if (db) {
    const { error } = await db.from("attendance").insert([attToRow(record)]);
    if (error) {
      console.error("Gagal menyimpan absen masuk:", error);
      alert("Absen masuk gagal tersimpan ke database. Cek koneksi internet kamu.");
    }
  }
}

async function checkOut(employeeId, photo) {
  if (!canActFor(employeeId)) return;
  const rec = todaysAttendance(employeeId);
  if (!rec || rec.checkOut) return;
  rec.checkOut = new Date();
  rec.checkOutPhoto = photo || null;
  renderAbsensi();
  if (db) {
    const { error } = await db.from("attendance")
      .update({ check_out: rec.checkOut, check_out_photo: rec.checkOutPhoto })
      .eq("id", rec.id);
    if (error) {
      console.error("Gagal menyimpan absen pulang:", error);
      alert("Absen pulang gagal tersimpan ke database. Cek koneksi internet kamu.");
    }
  }
}

/* ---- ambil foto lewat kamera perangkat ---- */
let cameraStream = null;
let cameraPendingAction = null; // { employeeId, type: 'checkin' | 'checkout' }
let capturedPhotoDataUrl = null;

async function openCamera(employeeId, type) {
  cameraPendingAction = { employeeId, type };
  capturedPhotoDataUrl = null;
  $("camera-title").textContent = type === "checkin" ? "Foto Absen Masuk" : "Foto Absen Pulang";
  $("camera-error").textContent = "";
  $("camera-video").style.display = "block";
  $("camera-preview").style.display = "none";
  $("camera-shoot").style.display = "inline-block";
  $("camera-retake").style.display = "none";
  $("camera-confirm").style.display = "none";
  $("camera-modal").classList.add("active");

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    $("camera-video").srcObject = cameraStream;
  } catch (err) {
    $("camera-error").textContent =
      "Kamera tidak bisa diakses. Pastikan browser diberi izin kamera. Di HP, kamera hanya berfungsi kalau halaman dibuka lewat alamat https:// (atau localhost), bukan lewat file atau http:// biasa.";
    $("camera-shoot").style.display = "none";
  }
}

function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
}

function closeCamera() {
  stopCameraStream();
  $("camera-modal").classList.remove("active");
  cameraPendingAction = null;
}
$("camera-x").addEventListener("click", closeCamera);

$("camera-shoot").addEventListener("click", () => {
  const video = $("camera-video");
  const canvas = $("camera-canvas");
  // Kamera HP bisa menghasilkan foto 1920px+; diperkecil ke maks. 640px agar
  // database dan halaman Absensi tetap ringan.
  const vw = video.videoWidth || 480, vh = video.videoHeight || 360;
  const scale = Math.min(1, 640 / Math.max(vw, vh));
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  capturedPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.7);

  $("camera-preview").src = capturedPhotoDataUrl;
  $("camera-preview").style.display = "block";
  $("camera-video").style.display = "none";
  $("camera-shoot").style.display = "none";
  $("camera-retake").style.display = "inline-block";
  $("camera-confirm").style.display = "inline-block";
});

$("camera-retake").addEventListener("click", () => {
  capturedPhotoDataUrl = null;
  $("camera-preview").style.display = "none";
  $("camera-video").style.display = "block";
  $("camera-shoot").style.display = "inline-block";
  $("camera-retake").style.display = "none";
  $("camera-confirm").style.display = "none";
});

$("camera-confirm").addEventListener("click", () => {
  if (!cameraPendingAction || !capturedPhotoDataUrl) return;
  const { employeeId, type } = cameraPendingAction;
  if (type === "checkin") checkIn(employeeId, capturedPhotoDataUrl);
  else checkOut(employeeId, capturedPhotoDataUrl);
  closeCamera();
});

/* ---- lihat foto ukuran penuh ---- */
function openPhotoViewer(src) {
  $("photo-viewer-img").src = src;
  $("photo-viewer-modal").classList.add("active");
}
$("photo-viewer-x").addEventListener("click", () => $("photo-viewer-modal").classList.remove("active"));

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function renderAbsensi() {
  $("absensi-date").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // kartu absen hari ini, satu per karyawan
  const grid = $("attendance-grid");
  grid.innerHTML = "";
  const visibleEmployees = can("manageEmployees") ? employees : employees.filter((e) => currentUser && e.id === currentUser.employeeId);
  if (visibleEmployees.length === 0) {
    grid.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Akun ini belum ditautkan ke data karyawan, jadi belum bisa absen. Hubungi owner.</p>';
  }
  visibleEmployees.forEach((emp) => {
    const rec = todaysAttendance(emp.id);
    const jamMasuk = rec ? rec.checkIn.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";
    const jamKeluar = rec && rec.checkOut ? rec.checkOut.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";
    const avatarPhoto = rec ? (rec.checkOutPhoto || rec.checkInPhoto) : null;

    let actionHtml;
    if (!rec) {
      actionHtml = `<button class="ec-btn checkin" data-action="checkin">📷 Absen Masuk</button>`;
    } else if (!rec.checkOut) {
      actionHtml = `<button class="ec-btn checkout" data-action="checkout">📷 Absen Pulang</button>`;
    } else {
      actionHtml = `<button class="ec-btn done" disabled>Selesai hari ini</button>`;
    }

    const card = document.createElement("div");
    card.className = "employee-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div class="ec-photo-row">
          <div class="ec-avatar">${avatarPhoto ? `<img src="${avatarPhoto}">` : initials(emp.name)}</div>
          <div>
            <div class="ec-name">${emp.name}</div>
            <span class="ec-role ${emp.role === "Owner" ? "owner" : ""}">${emp.role}</span>
          </div>
        </div>
        <div class="ec-manage" ${can("manageEmployees") ? "" : 'style="display:none"'}>
          <button class="icon-btn edit" data-action="edit-emp">✎</button>
          <button class="icon-btn danger" data-action="delete-emp">🗑</button>
        </div>
      </div>
      <div class="ec-times">Masuk ${jamMasuk} · Pulang ${jamKeluar}</div>
      <div class="ec-actions">${actionHtml}</div>`;

    const checkinBtn = card.querySelector('[data-action="checkin"]');
    if (checkinBtn) checkinBtn.addEventListener("click", () => openCamera(emp.id, "checkin"));
    const checkoutBtn = card.querySelector('[data-action="checkout"]');
    if (checkoutBtn) checkoutBtn.addEventListener("click", () => openCamera(emp.id, "checkout"));
    card.querySelector('[data-action="edit-emp"]').addEventListener("click", () => openEmployeeForm(emp.id));
    card.querySelector('[data-action="delete-emp"]').addEventListener("click", async () => {
      const id = emp.id;
      employees = employees.filter((e) => e.id !== id);
      attendance = attendance.filter((a) => a.employeeId !== id);
      renderAbsensi();
      if (db) {
        // "on delete cascade" di tabel attendance otomatis ikut menghapus
        // riwayat absen karyawan ini, tidak perlu dihapus manual terpisah.
        const { error } = await db.from("employees").delete().eq("id", id);
        if (error) {
          console.error("Gagal menghapus karyawan:", error);
          alert("Gagal menghapus karyawan dari database. Cek koneksi internet kamu.");
        }
      }
    });
    grid.appendChild(card);
  });

  // filter dropdown riwayat
  const filterEl = $("attendance-filter");
  const currentFilter = filterEl.value;
  filterEl.innerHTML = '<option value="">Semua karyawan</option>' +
    employees.map((e) => `<option value="${e.id}">${e.name}</option>`).join("");
  filterEl.value = currentFilter;

  renderAttendanceTable();
}

function renderAttendanceTable() {
  const body = $("attendance-table-body");
  body.innerHTML = "";
  let rows;
  if (can("manageEmployees")) {
    const filterId = $("attendance-filter").value;
    rows = [...attendance].filter((a) => !filterId || a.employeeId === filterId).reverse();
  } else {
    // peran lain: hanya riwayat absen miliknya sendiri
    const myId = currentUser && currentUser.employeeId;
    rows = myId ? [...attendance].filter((a) => a.employeeId === myId).reverse() : [];
  }

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="${can("deleteAttendance") ? 7 : 6}" style="text-align:center; color:#A3907A; padding:20px;">Belum ada data absensi.</td></tr>`;
    return;
  }

  rows.forEach((a) => {
    const tr = document.createElement("tr");
    const jamMasuk = a.checkIn.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const jamKeluar = a.checkOut ? a.checkOut.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";

    const photoCell = `<div class="attendance-photos">
      ${a.checkInPhoto ? `<img class="attendance-thumb" src="${a.checkInPhoto}" title="Foto masuk" data-photo="${a.checkInPhoto}">` : `<div class="attendance-thumb-placeholder"></div>`}
      ${a.checkOutPhoto ? `<img class="attendance-thumb" src="${a.checkOutPhoto}" title="Foto pulang" data-photo="${a.checkOutPhoto}">` : `<div class="attendance-thumb-placeholder"></div>`}
    </div>`;

    tr.innerHTML = `
      <td>${photoCell}</td>
      <td>${a.checkIn.toLocaleDateString("id-ID")}</td>
      <td>${a.employeeName}</td>
      <td>${a.role}</td>
      <td>${jamMasuk}</td>
      <td>${jamKeluar}</td>
      ${can("deleteAttendance") ? `<td class="num"><button class="icon-btn danger" data-action="delete" title="Hapus riwayat absen">🗑</button></td>` : ""}`;

    tr.querySelector('[data-action="delete"]')?.addEventListener("click", () => deleteAttendance(a));
    tr.querySelectorAll(".attendance-thumb").forEach((img) => {
      img.addEventListener("click", () => openPhotoViewer(img.dataset.photo));
    });
    body.appendChild(tr);
  });
}
$("attendance-filter").addEventListener("change", renderAttendanceTable);

async function deleteAttendance(a) {
  if (!can("deleteAttendance")) return; // pagar akses
  const tgl = a.checkIn.toLocaleDateString("id-ID");
  const ok = confirm(
    "Hapus riwayat absen " + a.employeeName + " tanggal " + tgl + "?\n\n" +
    "Jam masuk, jam pulang, dan fotonya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
  );
  if (!ok) return;

  const before = attendance;
  attendance = attendance.filter((x) => x.id !== a.id);
  renderAbsensi();

  if (db) {
    const { error } = await db.from("attendance").delete().eq("id", a.id);
    if (error) {
      console.error("Gagal menghapus riwayat absen:", error);
      attendance = before; // kembalikan di layar supaya sama dengan database
      renderAbsensi();
      alert("Gagal menghapus riwayat absen dari database. Data dikembalikan. Cek koneksi internet kamu.");
    }
  }
}

/* ---- kelola daftar karyawan (mirip pola form produk) ---- */
function openEmployeeForm(employeeId) {
  editingEmployeeId = employeeId || null;
  if (employeeId) {
    const emp = employees.find((e) => e.id === employeeId);
    $("employee-form-title").textContent = "Edit Karyawan";
    $("ef-name").value = emp.name;
    $("ef-role").value = emp.role;
  } else {
    $("employee-form-title").textContent = "Tambah Karyawan";
    $("employee-form").reset();
  }
  $("employee-form-modal").classList.add("active");
}
function closeEmployeeForm() { $("employee-form-modal").classList.remove("active"); }
$("add-employee-btn").addEventListener("click", () => openEmployeeForm(null));
$("employee-form-x").addEventListener("click", closeEmployeeForm);

$("employee-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("ef-name").value.trim();
  const role = $("ef-role").value;
  if (!name) return;

  let newEmployee = null;
  if (editingEmployeeId) {
    const emp = employees.find((x) => x.id === editingEmployeeId);
    emp.name = name;
    emp.role = role;
  } else {
    newEmployee = { id: "e" + Date.now(), name, role };
    employees.push(newEmployee);
  }
  closeEmployeeForm();
  renderAbsensi();

  if (db) {
    const { error } = editingEmployeeId
      ? await db.from("employees").update({ name, role }).eq("id", editingEmployeeId)
      : await db.from("employees").insert([newEmployee]);
    if (error) {
      console.error("Gagal menyimpan karyawan:", error);
      alert("Gagal menyimpan data karyawan ke database. Cek koneksi internet kamu.");
    }
  }
});

/* ================= INIT ================= */
function renderAll() {
  renderProductGrid();
  renderCart();
  renderProductTable();
  renderMaterialsTable();
  renderAbsensi();
}

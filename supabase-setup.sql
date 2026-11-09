-- =====================================================================
--  SMART CASHIER - SETUP DATABASE SUPABASE
--  Cara pakai: Supabase > SQL Editor > New query > tempel SEMUA isi
--  file ini > klik Run. Aman dijalankan ulang (tidak menghapus data).
--  File ini sudah termasuk tabel "expenses" dan akun login
--  (bagian 4 di paling bawah), jadi tidak ada file SQL lain.
-- =====================================================================


-- ---------- 1. TABEL ----------
-- Nama kolom harus SAMA dengan yang dipakai script.js.

-- Produk (halaman Kasir & Produk)
create table if not exists products (
  id        text primary key,
  name      text    not null,
  code      text    not null,
  category  text,
  price     numeric not null default 0,
  stock     integer not null default 0
);

-- Stok bahan baku
create table if not exists materials (
  id         text primary key,
  name       text    not null,
  unit       text    not null,
  stock      numeric not null default 0,
  min_stock  numeric not null default 0
);

-- Transaksi / riwayat penjualan
-- "items" menyimpan daftar barang yang dibeli (format JSON)
create table if not exists transactions (
  id            text primary key,
  date          timestamptz not null default now(),
  items         jsonb   not null default '[]'::jsonb,
  payment       text    not null,
  paid          numeric not null default 0,
  change        numeric not null default 0,
  subtotal      numeric not null default 0,
  discount_pct  numeric not null default 0,
  discount_amt  numeric not null default 0,
  tax_pct       numeric not null default 0,
  tax_amt       numeric not null default 0,
  total         numeric not null default 0
);

-- Karyawan
create table if not exists employees (
  id    text primary key,
  name  text not null,
  role  text not null
);

-- Absensi. Kalau karyawan dihapus, riwayat absennya ikut terhapus.
-- Catatan: "date" sengaja bertipe text karena script.js menyimpannya
-- dalam format toDateString() (contoh: "Tue Oct 20 2026").
create table if not exists attendance (
  id               text primary key,
  employee_id      text not null references employees(id) on delete cascade,
  employee_name    text not null,
  role             text not null,
  date             text not null,
  check_in         timestamptz not null,
  check_in_photo   text,
  check_out        timestamptz,
  check_out_photo  text
);

-- Pengeluaran (tab Pengeluaran di halaman Laporan)
create table if not exists expenses (
  id          text primary key,
  date        date    not null,
  category    text    not null,
  note        text,
  amount      numeric not null check (amount > 0),
  created_at  timestamptz default now()
);


-- Pengaman: kalau tabel sudah pernah dibuat versi lama tanpa kolom ini,
-- kolom ditambahkan otomatis (tidak menghapus data).
alter table products add column if not exists category text;
alter table products add column if not exists stock integer not null default 0;
alter table materials add column if not exists min_stock numeric not null default 0;


-- ---------- 2. KEAMANAN (Row Level Security) ----------
-- Supabase mewajibkan "policy" supaya tabel bisa diakses lewat API.
-- Policy di bawah membuka akses penuh untuk siapa pun yang memegang
-- kunci publik di script.js. Cocok untuk BELAJAR / DEMO / UJI COBA.
-- Sebelum dipakai sungguhan, ganti dengan Supabase Auth
-- (lihat catatan di panduan).
do $$
declare t text;
begin
  foreach t in array array[
    'products','materials','transactions','employees','attendance','expenses'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "demo_open_access" on %I', t);
    execute format(
      'create policy "demo_open_access" on %I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;


-- ---------- 3. DATA AWAL (sama seperti data contoh di script.js) ----------
insert into products (id, name, code, price, stock, category) values
  ('p1', 'Es Teh Manis',        'MNM-01',  5000, 42, 'Non Coffee'),
  ('p2', 'Nasi Goreng',         'MKN-01', 15000, 18, 'Makanan Berat'),
  ('p3', 'Kopi Hitam',          'MNM-02',  8000, 30, 'Coffee'),
  ('p4', 'Roti Bakar',          'MKN-02', 12000,  7, 'Camilan/Snack'),
  ('p5', 'Air Mineral 600ml',   'MNM-03',  4000, 60, 'Non Coffee'),
  ('p6', 'Kerupuk',             'SNK-01',  3000, 25, 'Camilan/Snack'),
  ('p7', 'Kopi Susu Gula Aren', 'MNM-04', 10000, 24, 'Coffee'),
  ('p8', 'Ayam Geprek',         'MKN-03', 18000, 12, 'Makanan Berat')
on conflict (id) do nothing;

insert into materials (id, name, unit, stock, min_stock) values
  ('m1', 'Biji Kopi Arabika', 'kg',    8,   3),
  ('m2', 'Susu Full Cream',   'liter', 12,  5),
  ('m3', 'Gula Aren',         'kg',    4,   2),
  ('m4', 'Cup Kertas 12oz',   'pcs',   150, 50),
  ('m5', 'Ayam Fillet',       'kg',    2,   3)
on conflict (id) do nothing;

insert into employees (id, name, role) values
  ('e1', 'Ateng',    'Kasir'),
  ('e2', 'Reyvan',   'Karyawan'),
  ('e3', 'RDB',      'Owner')
on conflict (id) do nothing;


-- =====================================================================
--  4. AKUN LOGIN (owner, karyawan, kasir)
--  Data akun sesuai PRD: ID, nama, email, nomor HP, password, tanggal dibuat.
--  Password disimpan sebagai HASH (bcrypt), bukan teks biasa.
--  Tabel ini SENGAJA tidak punya policy untuk anon, jadi tidak bisa
--  dibaca/ditulis langsung lewat API. Satu-satunya jalan masuk adalah
--  fungsi app_login() di bawah, yang hanya mengembalikan data akun
--  kalau username & password cocok (hash tidak pernah keluar ke browser).
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists app_users (
  id             uuid primary key default gen_random_uuid(),
  username       text not null unique,
  full_name      text not null,
  email          text,
  phone          text,
  role           text not null check (role in ('owner','karyawan','kasir')),
  employee_id    text references employees(id) on delete set null,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

alter table app_users enable row level security;
drop policy if exists "demo_open_access" on app_users;
revoke all on app_users from anon, authenticated;

-- Cek login. Mengembalikan 1 baris kalau cocok, 0 baris kalau salah.
drop function if exists app_login(text, text);
create function app_login(p_username text, p_password text)
returns table (id uuid, username text, full_name text, role text, employee_id text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
    select u.id, u.username, u.full_name, u.role, u.employee_id
    from public.app_users u
    where lower(u.username) = lower(trim(p_username))
      and u.password_hash = crypt(p_password, u.password_hash);
end;
$$;

revoke all on function app_login(text, text) from public;
grant execute on function app_login(text, text) to anon, authenticated;

-- Akun awal. "employee_id" menautkan akun ke data karyawan (dipakai untuk
-- absensi pribadi). Aman dijalankan ulang: akun yang sudah ada tidak ditimpa.
insert into app_users (username, full_name, role, employee_id, password_hash) values
  ('owner123',    'RDB',          'owner',    (select id from employees where id = 'e3'), crypt('11111111', gen_salt('bf'))),
  ('karyawan123', 'Reyvan',       'karyawan', (select id from employees where id = 'e2'), crypt('22222222', gen_salt('bf'))),
  ('kasir123',    'Ateng',        'kasir',    (select id from employees where id = 'e1'), crypt('33333333', gen_salt('bf')))
on conflict (username) do nothing;

-- Untuk mengganti password sebuah akun (jalankan manual kalau perlu):
-- update app_users set password_hash = crypt('PASSWORD_BARU', gen_salt('bf')) where username = 'kasir123';

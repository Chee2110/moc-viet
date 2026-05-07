require('dotenv').config();
const { Pool, types } = require('pg');
const bcrypt          = require('bcryptjs');
const fs              = require('fs');
const path            = require('path');

// Parse TIMESTAMPTZ (1184) and TIMESTAMP (1114) always as UTC
types.setTypeParser(1184, str => new Date(str));
types.setTypeParser(1114, str => new Date(str + 'Z'));

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'mocviet',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Force each new connection to UTC so NOW() in queries is always UTC
pool.on('connect', client => {
  setImmediate(() => {
    client.query("SET TIME ZONE 'UTC'").catch(err => console.warn('TZ:', err.message));
  });
});

async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}
async function queryOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

function getPool() { return pool; }

async function createTables() {
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  const schemaSql  = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, 'sql', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = new Set((await query('SELECT name FROM _migrations')).map(r => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations(name) VALUES($1)', [file]);
      console.log(`  ✅ Migration: ${file}`);
    } catch (err) {
      console.warn(`  ⚠️  Migration ${file}: ${err.message}`);
    }
  }
}

async function ensureSystemAccounts() {
  const ADMIN_EMAIL = 'dinhhchi2110@gmail.com';
  const NEW_PWD     = 'Dhc2110@';

  // Check by email first to avoid duplicate key errors
  const existing = await queryOne('SELECT id, role FROM users WHERE email=$1', [ADMIN_EMAIL]);
  if (existing) {
    if (existing.role !== 'admin') {
      await query("UPDATE users SET role='admin' WHERE id=$1", [existing.id]);
      console.log(`  ✅ Admin role đã cập nhật → ${ADMIN_EMAIL}`);
    }
    return;
  }

  // No user with that email — create new admin
  const hashed = bcrypt.hashSync(NEW_PWD, 10);
  await query(
    "INSERT INTO users(email,password,role,full_name) VALUES($1,$2,'admin','Quản trị viên') ON CONFLICT (email) DO NOTHING",
    [ADMIN_EMAIL, hashed]
  );
  console.log(`  ✅ Admin tạo mới → ${ADMIN_EMAIL}`);
}

async function seedData() {
  const count = await queryOne('SELECT COUNT(*)::int AS c FROM users');
  if (count.c > 0) return;

  const adminPwd = bcrypt.hashSync('Dhc2110@', 10);
  await queryOne(
    "INSERT INTO users(email,password,role,full_name) VALUES($1,$2,'admin','Quản trị viên') RETURNING id",
    ['dinhhchi2110@gmail.com', adminPwd]
  );

  console.log('\n📋 Tài khoản mặc định:');
  console.log('   Admin: dinhhchi2110@gmail.com / Dhc2110@\n');
}

async function initDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Kết nối PostgreSQL thành công');
  } catch (err) {
    console.error('\n❌ Không thể kết nối PostgreSQL:', err.message);
    console.error('   Kiểm tra lại thông tin trong file .env\n');
    process.exit(1);
  }
  await createTables();
  await runMigrations();
  await seedData();
  await ensureSystemAccounts();
  console.log('✅ Database sẵn sàng');
}

module.exports = { initDatabase, getPool, query, queryOne };

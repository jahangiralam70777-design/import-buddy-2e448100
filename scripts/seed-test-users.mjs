// ---------------------------------------------------------------------------
// TEMPORARY TEST SEED — remove before production launch.
// Creates (or updates) two predefined accounts so admin & student flows can be
// tested with real authentication instead of bypassing it.
//
//   Admin   → admin@test.com   / Admin@12345     (role: admin)
//   Student → student@test.com / Student@12345   (role: student)
//
// Idempotent: re-running will not create duplicates. Passwords are stored
// securely by Supabase Auth (bcrypt) — never as plain text.
//
// Run:  node scripts/seed-test-users.mjs
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  { email: "admin@test.com", password: "Admin@12345", role: "admin", display_name: "Test Admin" },
  { email: "student@test.com", password: "Student@12345", role: "student", display_name: "Test Student" },
];

async function findUserByEmail(email) {
  // Paginate through users until we find a match.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function upsertUser({ email, password, role, display_name }) {
  let user = await findUserByEmail(email);

  if (user) {
    // Ensure password & confirmation are in the known test state.
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`• Updated existing user ${email} (${user.id})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`• Created user ${email} (${user.id})`);
  }

  // Upsert profile (id = auth user id).
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, display_name, status: "active" }, { onConflict: "id" });
  if (pErr) throw pErr;

  // Upsert role (unique on user_id + role).
  const { error: rErr } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
  if (rErr) throw rErr;

  console.log(`  ↳ role: ${role}, profile: ${display_name}`);
}

for (const u of TEST_USERS) {
  await upsertUser(u);
}

console.log("\n✅ Test users ready.");

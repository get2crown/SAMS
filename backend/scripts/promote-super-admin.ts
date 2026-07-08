/**
 * Promotes an existing user to super_admin — the one platform-wide role
 * that can see and edit every company and every user across the system.
 *
 * There's deliberately no API endpoint that can mint the first super_admin
 * (nothing should be able to grant platform-wide access over HTTP without
 * an existing super_admin already approving it), so this is a direct DB
 * operation instead. Once you have one super_admin, further promotions can
 * happen through the Platform Admin UI.
 *
 * Usage: npm run promote-super-admin -- someone@example.com
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run promote-super-admin -- <email>');
    process.exit(1);
  }

  const result = await pool.query(
    `UPDATE users SET role = 'super_admin' WHERE email = $1 RETURNING id, email, first_name, last_name`,
    [email]
  );

  if (!result.rows.length) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const user = result.rows[0];
  console.log(`${user.first_name} ${user.last_name} (${user.email}) is now a super_admin.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

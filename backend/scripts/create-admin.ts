// Creates an admin, or turns an existing account into one.
//
//   npm run admin:create -- <email> <password> "<full name>"
//
// Admins review vetting applications. They cannot be created through
// sign-up, only by someone with access to the server.

import bcrypt from "bcrypt";
import { prisma } from "../src/shared/db.js";

const [email, password, fullName = "FoundersLink Admin"] = process.argv.slice(2);

if (!email || !password || password.length < 8) {
  console.error('Usage: npm run admin:create -- <email> <password of 8+ characters> "<full name>"');
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);
const admin = { role: "admin", approval_status: "approved", password_hash, full_name: fullName } as const;

await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  create: { email: email.toLowerCase(), ...admin },
  update: admin,
});

console.log(`${email} is an admin`);
await prisma.$disconnect();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function parseCSV(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines   = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    return headers.reduce((obj: any, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {});
  });
}

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // ── Default test accounts ──
  const defaults = [
    { name: "Super Admin",  email: "admin@deepiping.com",    password: await hash("admin123"),    role: "ADMIN",          department: "Administration", grade: 8, plant: "Palwal Plant" },
    { name: "Amit",         email: "employee@deepiping.com", password: await hash("password123"), role: "EMPLOYEE",       department: "Engineering",    grade: 3, plant: "Palwal Plant" },
    { name: "Amit",         email: "hod@deepiping.com",      password: await hash("password123"), role: "HOD",            department: "Engineering",    grade: 7, plant: "Palwal Plant" },
    { name: "Amit",         email: "director@deepiping.com", password: await hash("password123"), role: "DIRECTOR",       department: "Executive",      grade: 8, plant: "Palwal Plant" },
    { name: "Amit",         email: "manager@deepiping.com",  password: await hash("password123"), role: "TRAVEL_MANAGER", department: "Operations",     grade: 6, plant: "Palwal Plant" },
  ];

  for (const u of defaults) {
    await prisma.user.upsert({
  where: { email: u.email },
  update: u.role === "ADMIN"
    ? {
        password: u.password,
        isApproved: true,
      }
    : {},
  create: {
    ...u,
    role: u.role as any,
    isApproved: true,
  },
});
  }

  console.log("✅ Default accounts seeded");

  // ── CSV users ──
  const csvPath = "./prisma/users.csv";

  if (!fs.existsSync(csvPath)) {
    console.log("⚠️  No users.csv found — skipping CSV import");
    console.log("   Create prisma/users.csv to bulk import users");
  } else {
    const users = parseCSV(csvPath);
    console.log(`\n🌱 Seeding ${users.length} users from users.csv...\n`);

    for (const u of users) {
      const email    = u.email.toLowerCase().trim();
      const password = await hash(u.password || email);

      await prisma.user.upsert({
        where:  { email },
        update: {
          role:       u.role as any,
          grade:      parseInt(u.grade) || 1,
          plant:      u.plant,
          department: u.department,
          isApproved: true,
        },
        create: {
          name:       u.name,
          email,
          password,
          role:       u.role as any || "EMPLOYEE",
          department: u.department,
          grade:      parseInt(u.grade) || 1,
          plant:      u.plant || "Palwal Plant",
          isApproved: true,
        },
      });
      console.log(`✅ ${u.role.padEnd(14)} ${u.name} (${email})`);
    }

    console.log("\n✅ CSV seeding complete!");
  }

  console.log("\n📋 Default accounts:");
  console.log("   admin@deepiping.com    / admin123");
  console.log("   employee@deepiping.com / password123");
  console.log("   hod@deepiping.com      / password123");
  console.log("   director@deepiping.com / password123");
  console.log("   manager@deepiping.com  / password123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

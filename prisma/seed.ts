import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Tape Factory database seed...");

  // 1. Seed Demo Users with securely salted bcrypt passwords
  // Admin credentials: admin@apexdemo.local / Admin@ApexTape2026!
  // Staff credentials: staff@apexdemo.local / Staff@ApexTape2026!
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("Admin@ApexTape2026!", adminSalt);

  const staffSalt = await bcrypt.genSalt(10);
  const staffHash = await bcrypt.hash("Staff@ApexTape2026!", staffSalt);

  const admin = await prisma.user.upsert({
    where: { email: "admin@apexdemo.local" },
    update: { passwordHash: adminHash, role: Role.ADMIN, name: "System Administrator" },
    create: {
      email: "admin@apexdemo.local",
      name: "System Administrator",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@apexdemo.local" },
    update: { passwordHash: staffHash, role: Role.STAFF, name: "Production Operator" },
    create: {
      email: "staff@apexdemo.local",
      name: "Production Operator",
      passwordHash: staffHash,
      role: Role.STAFF,
    },
  });

  console.log(`✅ Demo users verified: Admin (${admin.email}), Staff (${staff.email})`);

  // 2. Seed Mandatory Dummy Tape Specification and an extra specification
  // Dummy spec required by assessment:
  // Width: 48 mm, Film GSM: 25, Dry adhesive: 22, Solids: 50%, Roll length: 1,000 m
  const dummySpec = await prisma.tapeSpecification.upsert({
    where: { code: "APEX-BOPP-48-1000" },
    update: {},
    create: {
      code: "APEX-BOPP-48-1000",
      name: "Standard Clear Packaging Tape 48mm x 1000m",
      widthMm: "48.00",
      filmGsm: "25.00",
      dryAdhesiveGsm: "22.00",
      adhesiveSolidsPercent: "50.00",
      rollLengthM: "1000.00",
      isUsedInProduction: false,
    },
  });

  const heavyDutySpec = await prisma.tapeSpecification.upsert({
    where: { code: "APEX-HEAVY-72-500" },
    update: {},
    create: {
      code: "APEX-HEAVY-72-500",
      name: "Heavy Duty Carton Sealing Tape 72mm x 500m",
      widthMm: "72.00",
      filmGsm: "28.00",
      dryAdhesiveGsm: "24.00",
      adhesiveSolidsPercent: "52.00",
      rollLengthM: "500.00",
      isUsedInProduction: false,
    },
  });

  console.log(
    `✅ Tape specifications seeded: ${dummySpec.code} and ${heavyDutySpec.code}`
  );

  // 3. Seed Realistic Dummy Customers
  const customersData = [
    {
      code: "CUST-ACME-001",
      name: "Acme Logistics & Distribution",
      contactPerson: "Jane Miller",
      email: "jane@acmelogistics.example",
      phone: "+1-555-0192",
      address: "100 Industrial Parkway, Sector 4, Ohio",
    },
    {
      code: "CUST-PACIFIC-002",
      name: "Pacific Packaging Supplies",
      contactPerson: "Carlos Gomez",
      email: "carlos@pacificpack.example",
      phone: "+1-555-0143",
      address: "742 Evergreen Freight Way, California",
    },
    {
      code: "CUST-METRO-003",
      name: "Metro Retail Fulfillment",
      contactPerson: "Sarah Chen",
      email: "orders@metrofulfillment.example",
      phone: "+1-555-0188",
      address: "50 Harbor Boulevard, New Jersey",
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log(`✅ ${customersData.length} dummy customers seeded.`);
  console.log("ℹ️  CRITICAL RULE: All inventory balances remain strictly at ZERO.");
  console.log("    No material receipts, production batches, finished rolls, or reservations seeded.");
  console.log("🎉 Database seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

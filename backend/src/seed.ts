// src/seed.ts
// Run with: npx ts-node src/seed.ts
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deloitteedge_expenses';

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection;
  console.log('✅ Connected.');

  // Clear collections
  await db.collection('departments').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('budgets').deleteMany({});
  await db.collection('claims').deleteMany({});
  await db.collection('items').deleteMany({});
  await db.collection('workflows').deleteMany({});
  await db.collection('attachments').deleteMany({});
  console.log('🗑️  Cleared existing data.');

  // ── Departments ────────────────────────────────────────────
  const depts = await db.collection('departments').insertMany([
    { departmentName: 'Audit & Assurance',     location: 'London',     managerName: 'Sarah Mitchell',   isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { departmentName: 'Management Consulting', location: 'Manchester', managerName: 'James Thornton',   isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { departmentName: 'Tax Advisory',          location: 'Birmingham', managerName: 'Rachel Edwards',   isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { departmentName: 'Technology Solutions',  location: 'London',     managerName: 'David Okonkwo',    isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { departmentName: 'Human Resources',       location: 'Edinburgh',  managerName: 'Claire Stevenson', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { departmentName: 'Finance & Operations',  location: 'London',     managerName: 'Michael Hartley',  isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);

  const [audit, consulting, tax, tech, hr, finance] = Object.values(depts.insertedIds);
  console.log('✅ Departments seeded.');

  // ── Users ──────────────────────────────────────────────────
  const hash = await bcrypt.hash('Password123!', 12);

  const users = await db.collection('users').insertMany([
    // Managers
    { firstName: 'Sarah',   lastName: 'Mitchell',  email: 'sarah.mitchell@deloitteedge.co.uk',   passwordHash: hash, jobTitle: 'Audit Director',          role: 'manager',         departmentId: audit,      isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'James',   lastName: 'Thornton',  email: 'james.thornton@deloitteedge.co.uk',   passwordHash: hash, jobTitle: 'Consulting Manager',       role: 'manager',         departmentId: consulting, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Rachel',  lastName: 'Edwards',   email: 'rachel.edwards@deloitteedge.co.uk',   passwordHash: hash, jobTitle: 'Tax Manager',              role: 'manager',         departmentId: tax,        isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'David',   lastName: 'Okonkwo',   email: 'david.okonkwo@deloitteedge.co.uk',    passwordHash: hash, jobTitle: 'IT Manager',               role: 'manager',         departmentId: tech,       isActive: true, createdAt: new Date(), updatedAt: new Date() },
    // Finance Officers
    { firstName: 'Michael', lastName: 'Hartley',   email: 'michael.hartley@deloitteedge.co.uk',  passwordHash: hash, jobTitle: 'Finance Director',         role: 'finance_officer', departmentId: finance,    isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Claire',  lastName: 'Stevenson', email: 'claire.stevenson@deloitteedge.co.uk', passwordHash: hash, jobTitle: 'Senior Finance Officer',    role: 'finance_officer', departmentId: finance,    isActive: true, createdAt: new Date(), updatedAt: new Date() },
    // Employees
    { firstName: 'Tom',     lastName: 'Bradley',   email: 'tom.bradley@deloitteedge.co.uk',      passwordHash: hash, jobTitle: 'Audit Analyst',            role: 'employee',        departmentId: audit,      isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Emma',    lastName: 'Collins',   email: 'emma.collins@deloitteedge.co.uk',     passwordHash: hash, jobTitle: 'Consulting Associate',      role: 'employee',        departmentId: consulting, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Priya',   lastName: 'Sharma',    email: 'priya.sharma@deloitteedge.co.uk',     passwordHash: hash, jobTitle: 'Tax Analyst',              role: 'employee',        departmentId: tax,        isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Oliver',  lastName: 'Hayes',     email: 'oliver.hayes@deloitteedge.co.uk',     passwordHash: hash, jobTitle: 'Software Developer',        role: 'employee',        departmentId: tech,       isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { firstName: 'Daniel',  lastName: 'Foster',    email: 'daniel.foster@deloitteedge.co.uk',    passwordHash: hash, jobTitle: 'Audit Senior',             role: 'employee',        departmentId: audit,      isActive: true, createdAt: new Date(), updatedAt: new Date() },
    // Admin
    { firstName: 'Admin',   lastName: 'User',      email: 'admin@deloitteedge.co.uk',            passwordHash: hash, jobTitle: 'System Administrator',     role: 'admin',           departmentId: finance,    isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);

  const uArr   = Object.values(users.insertedIds);
  const sarah   = uArr[0];  // manager audit
  const michael = uArr[4];  // finance officer
  const tom     = uArr[6];  // employee audit
  const emma    = uArr[7];  // employee consulting
  const priya   = uArr[8];  // employee tax
  const daniel  = uArr[10]; // employee audit
  console.log('✅ Users seeded.');

  // ── Budgets ────────────────────────────────────────────────
  const year = new Date().getFullYear();
  await db.collection('budgets').insertMany([
    { departmentId: audit,      fiscalYear: year, totalBudget: 130000, spentAmount: 8500,  createdAt: new Date(), updatedAt: new Date() },
    { departmentId: consulting, fiscalYear: year, totalBudget: 100000, spentAmount: 12000, createdAt: new Date(), updatedAt: new Date() },
    { departmentId: tax,        fiscalYear: year, totalBudget:  80000, spentAmount:  4500, createdAt: new Date(), updatedAt: new Date() },
    { departmentId: tech,       fiscalYear: year, totalBudget: 160000, spentAmount: 21000, createdAt: new Date(), updatedAt: new Date() },
    { departmentId: hr,         fiscalYear: year, totalBudget:  50000, spentAmount:  3200, createdAt: new Date(), updatedAt: new Date() },
    { departmentId: finance,    fiscalYear: year, totalBudget:  65000, spentAmount:  9800, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✅ Budgets seeded.');

  // ── Claims ─────────────────────────────────────────────────
  const claims = await db.collection('claims').insertMany([
    { employeeId: tom,    status: 'Submitted',    submissionDate: new Date('2025-03-10'), description: 'Client site visit - Birmingham', totalAmount: 376.50, currency: 'GBP', createdAt: new Date(), updatedAt: new Date() },
    { employeeId: emma,   status: 'Under Review', submissionDate: new Date('2025-03-05'), description: 'Manchester conference',          totalAmount: 1120.00, currency: 'GBP', createdAt: new Date(), updatedAt: new Date() },
    { employeeId: priya,  status: 'Approved',     submissionDate: new Date('2025-02-20'), description: 'Tax conference - London',        totalAmount: 1345.00, currency: 'GBP', createdAt: new Date(), updatedAt: new Date() },
    { employeeId: daniel, status: 'Rejected',     submissionDate: new Date('2025-03-01'), description: 'Client entertainment - London',  totalAmount: 420.00,  currency: 'GBP', createdAt: new Date(), updatedAt: new Date() },
    { employeeId: tom,    status: 'Draft',         submissionDate: null,                   description: 'Training course materials',      totalAmount: 0,       currency: 'GBP', createdAt: new Date(), updatedAt: new Date() },
  ]);

  const cArr   = Object.values(claims.insertedIds);
  const [c1, c2, c3, c4] = cArr;

  // ── Items ──────────────────────────────────────────────────
  await db.collection('items').insertMany([
    // Claim 1 (Tom - Birmingham)
    { claimId: c1, category: 'Travel',        amount: 145.00, expenseDate: new Date('2025-03-08'), itemDescription: 'Train London→Birmingham return', receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    { claimId: c1, category: 'Accommodation', amount: 189.00, expenseDate: new Date('2025-03-08'), itemDescription: 'Premier Inn Birmingham - 1 night', receiptRequired: true, createdAt: new Date(), updatedAt: new Date() },
    { claimId: c1, category: 'Meals',         amount:  42.50, expenseDate: new Date('2025-03-09'), itemDescription: 'Client dinner - 2 persons',        receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    // Claim 2 (Emma - Manchester)
    { claimId: c2, category: 'Travel',        amount: 210.00, expenseDate: new Date('2025-03-04'), itemDescription: 'Train London→Manchester return',   receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    { claimId: c2, category: 'Accommodation', amount: 350.00, expenseDate: new Date('2025-03-04'), itemDescription: 'Hilton Manchester - 2 nights',     receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    { claimId: c2, category: 'Meals',         amount:  65.00, expenseDate: new Date('2025-03-05'), itemDescription: 'Conference meals',                 receiptRequired: false, createdAt: new Date(), updatedAt: new Date() },
    { claimId: c2, category: 'Training',      amount: 495.00, expenseDate: new Date('2025-03-05'), itemDescription: 'Conference registration',          receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    // Claim 3 (Priya - approved)
    { claimId: c3, category: 'Travel',        amount: 320.00, expenseDate: new Date('2025-02-18'), itemDescription: 'Train Edinburgh→London return',    receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    { claimId: c3, category: 'Accommodation', amount: 275.00, expenseDate: new Date('2025-02-18'), itemDescription: 'Hotel London - 1 night',           receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    { claimId: c3, category: 'Training',      amount: 750.00, expenseDate: new Date('2025-02-19'), itemDescription: 'Tax Advisory Conference',          receiptRequired: true,  createdAt: new Date(), updatedAt: new Date() },
    // Claim 4 (Daniel - rejected)
    { claimId: c4, category: 'Entertainment', amount: 420.00, expenseDate: new Date('2025-02-28'), itemDescription: 'Client dinner - The Ivy (5 persons)', receiptRequired: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✅ Claims & items seeded.');

  // ── Workflows ──────────────────────────────────────────────
  await db.collection('workflows').insertMany([
    // Claim 1 (Submitted) — pending
    { claimId: c1, approverId: sarah,   stepNumber: 1, decision: 'Pending',  decisionDate: null,                   comments: null, createdAt: new Date(), updatedAt: new Date() },
    { claimId: c1, approverId: michael, stepNumber: 2, decision: 'Pending',  decisionDate: null,                   comments: null, createdAt: new Date(), updatedAt: new Date() },
    // Claim 2 (Under Review) — step 1 approved
    { claimId: c2, approverId: uArr[1], stepNumber: 1, decision: 'Approved', decisionDate: new Date('2025-03-06'), comments: 'Conference pre-approved.', createdAt: new Date(), updatedAt: new Date() },
    { claimId: c2, approverId: michael, stepNumber: 2, decision: 'Pending',  decisionDate: null,                   comments: null, createdAt: new Date(), updatedAt: new Date() },
    // Claim 3 (Approved) — both steps done
    { claimId: c3, approverId: uArr[2], stepNumber: 1, decision: 'Approved', decisionDate: new Date('2025-02-21'), comments: 'Approved - within budget', createdAt: new Date(), updatedAt: new Date() },
    { claimId: c3, approverId: michael, stepNumber: 2, decision: 'Approved', decisionDate: new Date('2025-02-22'), comments: 'Final approval granted',   createdAt: new Date(), updatedAt: new Date() },
    // Claim 4 (Rejected) — step 1 rejected
    { claimId: c4, approverId: sarah,   stepNumber: 1, decision: 'Rejected', decisionDate: new Date('2025-03-02'), comments: 'Entertainment requires Director pre-approval.', createdAt: new Date(), updatedAt: new Date() },
    { claimId: c4, approverId: michael, stepNumber: 2, decision: 'Pending',  decisionDate: null,                   comments: null, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✅ Workflows seeded.');

  await mongoose.disconnect();
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('   All users password: Password123!');
  console.log('   Admin:    admin@deloitteedge.co.uk');
  console.log('   Manager:  sarah.mitchell@deloitteedge.co.uk');
  console.log('   Finance:  michael.hartley@deloitteedge.co.uk');
  console.log('   Employee: tom.bradley@deloitteedge.co.uk');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

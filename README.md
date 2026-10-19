# Apex Tape Factory Stock Management System (ERP)

A complete, production-grade web application engineered for industrial tape manufacturing, raw material inventory ledgers, mass-balance production tracking, finished goods allocation, customer orders with whole-roll validation, atomic stock reservations, dispatches, and Admin-only audited corrections.

---

## 1. Executive Summary & Feature Matrix

| Functional Module | Key Architectural & Business Capabilities |
| :--- | :--- |
| **Authentication & RBAC** | Server-managed HttpOnly session cookies, salted bcrypt passwords, IP/email brute-force rate limiting, and strict role guards (`ADMIN` vs `STAFF`). |
| **Specification Management** | Full parametric definition (Width, Film GSM, Adhesive GSM, Solids %, Length). **Permanent immutability lock** once used in historical batches. |
| **Bill of Materials (BOM)** | Exact continuous decimal arithmetic (via Decimal.js). Single-roll and batch-scaled consumption formulas with no intermediate rounding errors. |
| **Raw Material Inventory** | Traceable double-entry style movement ledger for Film (kg), Liquid Adhesive (kg), and Cores (pcs). Stock starts at zero; negative inventory strictly prohibited with detailed shortage reporting. |
| **Production Execution** | Atomic batch posting: verifies mass-balance equation (`film + adhesive_solids = net_tape + wastage`), checks inventory, issues materials, credits finished rolls, and enforces idempotency. |
| **Finished Goods Stock** | Reconciles physical rolls, reserved rolls, available rolls, metres, and theoretical net kilograms directly from ledger movements. |
| **Customer Orders** | Server-side conversion of Rolls, Metres, or Net Kg into exact whole rolls. Rejects fractional quantities and calculates valid roll alternatives. |
| **Atomic Reservations** | Concurrency-safe stock reservations upon order confirmation with row-level transaction safety. Shortage reporting on insufficient stock. |
| **Dispatch Management** | Multi-part or full shipments against reserved orders. Automatically releases reservations, deducts finished goods, and transitions order status. |
| **Order Cancellation** | Atomically cancels remaining unshipped order balances and releases reservations while strictly preserving already dispatched goods. |
| **Admin-Only Corrections** | Dedicated interface restricted to Admin users. Staff users receive **HTTP 403 Forbidden**. Applies compensating ledger adjustments; preserves audit history without hard-deleting records. |
| **Unified Audit History** | Searchable and filterable chronological timeline spanning all movements, orders, dispatches, and corrections. |

---

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router with React Server Components & Route Handlers)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Database & ORM**: MySQL with Prisma ORM
- **Precision Arithmetic**: Decimal.js (30-digit precision arithmetic for all business-critical calculations)
- **Input Validation**: Zod (strict schema enforcement on all API routes and form submissions)
- **Authentication**: Bcrypt.js (salt factor 10) + Server-side Session Management with HttpOnly Cookies
- **Testing**: Vitest (52 automated unit, integration, and concurrency tests)
- **Package Manager**: npm

---

## 3. Demo Credentials & Access Roles

The application includes two pre-configured development/demo roles seeded via `npm run seed`:

| Role | Email | Password | Allowed Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@apexdemo.local` | `Admin@ApexTape2026!` | All operational capabilities + Audited transaction corrections (`/admin/corrections`). |
| **Staff** | `staff@apexdemo.local` | `Staff@ApexTape2026!` | Standard operational tasks (Receipts, Batches, Orders, Dispatches). **HTTP 403 Forbidden** on correction endpoints. |

> **Security Note**: Passwords in the database are stored as salted bcrypt hashes. Demo credentials can also be autofilled directly on the login page (`/login`) for convenience during technical evaluations.

---

## 4. Bill of Materials (BOM) Mathematical Specification

### Mandatory Formulas

1. **Area per roll ($m^2$)**:
   $$\text{area} = \left(\frac{\text{width\_mm}}{1000}\right) \times \text{roll\_length\_m}$$
2. **Film consumption per roll ($kg$)**:
   $$\text{film\_kg} = \frac{\text{area} \times \text{film\_gsm}}{1000}$$
3. **Dry adhesive weight per roll ($kg$)**:
   $$\text{dry\_adhesive\_kg} = \frac{\text{area} \times \text{dry\_adhesive\_gsm}}{1000}$$
4. **Liquid adhesive consumption per roll ($kg$)**:
   $$\text{liquid\_adhesive\_kg} = \frac{\text{dry\_adhesive\_kg}}{\text{solids\_percentage} / 100}$$
5. **Net tape weight per roll ($kg$)**:
   $$\text{net\_tape\_kg} = \text{film\_kg} + \text{dry\_adhesive\_kg}$$
6. **Cardboard cores**:
   $$\text{cores} = \text{number\_of\_rolls}$$

### Worked Example: Assessment Dummy Specification

- **Width**: $48\text{ mm}$
- **Film GSM**: $25\text{ g/m}^2$
- **Dry Adhesive GSM**: $22\text{ g/m}^2$
- **Adhesive Solids**: $50\%$ ($0.50$ fraction)
- **Roll Length**: $1,000\text{ metres}$

**Per-Roll Calculation Results**:
- **Area**: $(48 / 1000) \times 1000 = 48.00\text{ m}^2$
- **Film**: $48 \times 25 / 1000 = \mathbf{1.200\text{ kg}}$
- **Dry Adhesive**: $48 \times 22 / 1000 = \mathbf{1.056\text{ kg}}$
- **Liquid Adhesive**: $1.056 / 0.50 = \mathbf{2.112\text{ kg}}$
- **Net Tape Weight**: $1.200 + 1.056 = \mathbf{2.256\text{ kg}}$
- **Cores**: $1\text{ piece}$
- **Length**: $1,000\text{ metres}$

---

## 5. Mandatory Production Mass-Balance Equation

Every posted production batch must verify the mass-conservation equation within a calibrated measurement tolerance:

$$\text{film\_issued\_kg} + (\text{liquid\_adhesive\_issued\_kg} \times \text{solids\_fraction}) = \text{net\_tape\_produced\_kg} + \text{dry\_wastage\_kg}$$

Where:
$$\text{net\_tape\_produced\_kg} = \text{expected\_net\_tape\_kg\_per\_roll} \times \text{whole\_rolls}$$

### Calibration & Tolerance Policy:
- Weighing scales measure to 3 decimal places ($1\text{ gram} = 0.001\text{ kg}$).
- The cumulative measurement boundary across inputs and outputs is defined as $\mathbf{\pm 0.002\text{ kg}}$ ($2\text{ grams}$).
- If the absolute difference exceeds $0.002\text{ kg}$, the server **rejects the batch** and returns the signed mismatch:
  $$\text{Signed Difference} = \text{LHS (Total Input Solids)} - \text{RHS (Total Output Solids)}$$

---

## 6. Order Conversion & Whole-Roll Validation Policy

Customer orders can be submitted in **Rolls**, **Metres**, or **Net Kg**:
1. **Rolls**: Must be a positive integer $\ge 1$.
2. **Metres**: Must be a positive integer and an exact multiple of the specification's roll length:
   $$\text{metres} \pmod{\text{roll\_length}} = 0 \implies \text{rolls} = \frac{\text{metres}}{\text{roll\_length}}$$
3. **Net Kg**: Must correspond exactly (within $0.001\text{ kg}$ tolerance) to a whole number of rolls:
   $$\text{rolls} = \text{round}\left(\frac{\text{requested\_kg}}{\text{net\_tape\_kg\_per\_roll}}\right)$$

If an invalid quantity is submitted (e.g., $1,500\text{ m}$ or $3.000\text{ kg}$ for the dummy specification), the server **rejects the order** and returns the nearest valid lower and upper alternatives in rolls, metres, and net kg.

---

## 7. Database Schema & Concurrency Design

### Relational Schema Overview

1. `users`: System users with hashed credentials and roles (`ADMIN`, `STAFF`).
2. `sessions`: Database-persisted session tokens with expirations and IP attribution.
3. `tape_specifications`: Engineering specifications with `isUsedInProduction` immutability flag.
4. `customers`: Commercial client records.
5. `production_batches`: Production records storing issued weights, wastage, balance differences, and idempotency keys.
6. `material_inventory_movements`: Ledger movements for raw materials (`RECEIPT`, `PRODUCTION_ISSUE`, `DAMAGE`, `CORRECTION_ADJUSTMENT`).
7. `finished_goods_movements`: Ledger movements for finished rolls (`PRODUCTION_RECEIPT`, `ORDER_DISPATCH`, `CORRECTION_ADJUSTMENT`).
8. `customer_orders`: Order pipeline tracking requested and converted quantities, and statuses (`PENDING`, `CONFIRMED`, `PARTIALLY_DISPATCHED`, `FULFILLED`, `CANCELLED`).
9. `stock_reservations`: Atomic stock allocations linked to confirmed orders (`ACTIVE`, `RELEASED`, `FULFILLED`).
10. `dispatches`: Shipments with whole rolls, metres, and net kg.
11. `transaction_corrections`: Admin-only audit records storing before/after JSON payloads, delta adjustments, and reasons.
12. `audit_logs`: System audit trail across all operations.
13. `idempotency_records`: Client retry protection keys and cached responses.

### Concurrency and Transactional Guarantees

All inventory state changes occur inside atomic `prisma.$transaction` blocks:
- **Available finished stock** is calculated as:
  $$\text{Available Rolls} = \text{Physical Rolls (from movement ledger)} - \text{Active Reserved Rolls}$$
- Two concurrent requests attempting to reserve or dispatch the same stock cannot over-reserve: the transaction locks and recalculates available stock before committing.
- Idempotency keys (`x-idempotency-key`) prevent duplicate stock deductions when users double-click or client networks retry.

---

## 8. Installation & Setup Instructions

### Prerequisites
- Node.js `v18+` or `v20+` (tested on `v22.14.0`)
- npm `v10+`
- MySQL `8.0+` or MariaDB `10.5+`

### Step 1: Clone & Install Dependencies
```bash
cd apex-erp
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains your MySQL connection URL and a session secret:
```env
DATABASE_URL="mysql://root:password@localhost:3306/apex_tape_factory"
SESSION_SECRET="e9b2787c8801d9f58cb2e9d5df40b5413481fa79e9581979b183616238b72e5a"
NODE_ENV="development"
PORT=3000
```

### Step 3: Run Database Migrations & Seed
Generate Prisma Client:
```bash
npx prisma generate
```
Push the schema to MySQL:
```bash
npx prisma db push
```
Seed the demo users, dummy specification, and customers (**all initial inventory balances remain at strictly zero**):
```bash
npm run seed
```

### Step 4: Run the Automated Test Suite
Run the 52 automated tests:
```bash
npm run test
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Step 6: Production Build & Run
```bash
npm run build
npm start
```

---

## 9. Verification & Test Summary

The automated test suite (`src/tests/`) covers 52 distinct assertions across 7 test suites:
- `src/tests/bom.test.ts`: Dummy spec per-roll results, parameter sensitivity (width, GSM, solids), invalid percentages.
- `src/tests/production-balance.test.ts`: Mass-balance equation, zero dry wastage, signed difference reporting, tolerance limits.
- `src/tests/order-conversions.test.ts`: Whole rolls, metre multiples, net kg multiples, and alternative suggestions.
- `src/tests/validations.test.ts`: Zod schema bounds, negative quantities, email formats, and justification length.
- `src/tests/concurrency.test.ts`: Simulated concurrent order reservations, idempotency protection against duplicate deductions, unique constraint enforcement.
- `src/tests/inventory-transactions.test.ts`: Shortage error detection, non-negative inventory invariants, dispatch boundaries, unshipped balance release.
- `src/tests/authorization.test.ts`: Staff vs Admin role permissions, HTTP 403 Forbidden on corrections, bcrypt hash security.

---

## 10. Known Assumptions & Boundaries

1. **MySQL Availability in Target Environment**: When deployed against a live MySQL instance, configure `DATABASE_URL` in `.env`.
2. **Measurement Resolution**: Material weighings are recorded to 3 decimal places ($1\text{ gram}$). The production balance equation allows an engineered tolerance of $\pm 0.002\text{ kg}$ to account for standard industrial scale variances.
3. **Core Standard**: 1 cardboard core is consumed per completed whole roll of tape.

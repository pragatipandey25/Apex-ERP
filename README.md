<div align="center">

# Apex Tape Factory ERP

### Manufacturing Inventory · Production Planning · Order Fulfilment

A full-stack ERP application for managing tape specifications, raw materials, production batches, finished goods, customer orders, dispatches, and audited inventory corrections.

**Built with Next.js · TypeScript · Prisma · MySQL**

<br />

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![Tests](https://img.shields.io/badge/Tests-70%20passing-success)
![Status](https://img.shields.io/badge/Status-Academic%20Project-orange)

</div>

## Project Owner

**Pragati Pandey**  
Final-year B.Tech Computer Science & Engineering student  
Kanpur Institute of Technology  
Specialization: Cybersecurity

- **GitHub:** [@pragatipandey25](https://github.com/pragatipandey25)
- **LinkedIn:** [Pragati Pandey](https://www.linkedin.com/in/pragati-pandey-25f2006/)
- **Portfolio:** [pragati-pandey-portfolio.vercel.app](https://pragati-pandey-portfolio.vercel.app/)

---

## Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [System Workflow](#system-workflow)
- [Manufacturing Calculations](#manufacturing-calculations)
- [Inventory and Transaction Design](#inventory-and-transaction-design)
- [Roles and Security](#roles-and-security)
- [Database Overview](#database-overview)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [Testing and Verification](#testing-and-verification)
- [Project Structure](#project-structure)
- [Important Notes](#important-notes)

## Overview

Apex Tape Factory ERP is a manufacturing-focused inventory and order management application designed around the operational flow of an industrial tape factory.

Instead of treating inventory as a manually edited number, the system records stock changes as ledger movements. It connects raw-material receipts and issues to production, tracks finished rolls, reserves stock for customer orders, records dispatches, and preserves an audit trail for administrative corrections.

### What problem does it solve?

Tape manufacturing involves linked quantities: roll width and length determine area; area and GSM determine film and adhesive consumption; adhesive solids determine the liquid adhesive quantity to issue. Finished rolls then move through available stock, reservations, dispatch, and order fulfilment.

This application brings those calculations and operational steps into one workflow, with server-side validation and transactional inventory updates intended to prevent negative stock and duplicate processing.

## Core Features

| Module                          | Capabilities                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication and RBAC**     | Session-based authentication, bcrypt password hashing, and separate `ADMIN` and `STAFF` permissions.                               |
| **Tape Specifications**         | Create and manage width, film GSM, dry adhesive GSM, solids percentage, and roll length; lock specifications after production use. |
| **BOM Calculator**              | Calculate area, film consumption, dry and liquid adhesive, net tape weight, and core requirements.                                 |
| **Raw Material Inventory**      | Ledger-based receipts, damage deductions, and production issues for film, liquid adhesive, and cardboard cores.                    |
| **Production Batches**          | Validate material availability and production mass balance; record material issues and finished-roll receipts transactionally.     |
| **Finished Goods**              | Track physical, reserved, dispatched, and available rolls, with metre and net-weight conversions.                                  |
| **Customer Orders**             | Accept quantities in rolls, metres, or net kilograms and validate whole-roll requirements.                                         |
| **Stock Reservations**          | Reserve available finished goods when orders are confirmed.                                                                        |
| **Dispatches**                  | Support partial and full dispatches, update stock, and progress order status.                                                      |
| **Order Cancellation**          | Release unfulfilled reservations without reversing already dispatched goods.                                                       |
| **Admin Corrections**           | Record compensating ledger adjustments with reasons and user attribution rather than silently deleting history.                    |
| **Audit History and Dashboard** | Review operational movements, inventory indicators, order activity, and audit events.                                              |

## Technology Stack

| Layer                 | Technologies                                         |
| --------------------- | ---------------------------------------------------- |
| Application framework | Next.js 14 App Router                                |
| UI                    | React 18, TypeScript, Tailwind CSS, Lucide icons     |
| API                   | Next.js Route Handlers                               |
| Database              | MySQL                                                |
| ORM                   | Prisma 5.22                                          |
| Decimal arithmetic    | Decimal.js                                           |
| Validation            | Zod                                                  |
| Authentication        | bcrypt.js, server-managed sessions, HttpOnly cookies |
| Testing               | Vitest                                               |
| Package manager       | npm                                                  |

## System Workflow

```mermaid
flowchart TD
    A[Configure tape specification] --> B[Receive raw materials]
    B --> C[Calculate BOM]
    C --> D[Validate stock and mass balance]
    D --> E[Post production batch]
    E --> F[Finished rolls enter stock]
    F --> G[Create customer order]
    G --> H[Confirm and reserve stock]
    H --> I[Dispatch some or all rolls]
    I --> J{Order fulfilled?}
    J -- Yes --> K[Mark order fulfilled]
    J -- No --> L[Continue dispatch or cancel remainder]
    K --> M[Review audit history]
    L --> M
```

## Manufacturing Calculations

The BOM calculator uses the tape specification to calculate expected material requirements. Let:

- `width_mm` = tape width in millimetres
- `roll_length_m` = roll length in metres
- `film_gsm` = film grammage in grams per square metre
- `dry_adhesive_gsm` = dry adhesive grammage in grams per square metre
- `solids_percentage` = adhesive solids percentage

### Formulas

**1. Area per roll**

$$
\text{Area}_{m^2} = \frac{\text{width}_{mm}}{1000} \times \text{roll length}_{m}
$$

**2. Film consumption**

$$
\text{Film}_{kg} = \frac{\text{Area}_{m^2} \times \text{Film GSM}}{1000}
$$

**3. Dry adhesive weight**

$$
\text{Dry adhesive}_{kg} = \frac{\text{Area}_{m^2} \times \text{Dry adhesive GSM}}{1000}
$$

**4. Liquid adhesive consumption**

$$
\text{Liquid adhesive}_{kg} = \frac{\text{Dry adhesive}_{kg}}{\text{Solids percentage}/100}
$$

**5. Net tape weight**

$$
\text{Net tape}_{kg} = \text{Film}_{kg} + \text{Dry adhesive}_{kg}
$$

**6. Cardboard cores**

$$
\text{Cores required} = \text{Whole rolls produced}
$$

### Example specification

| Parameter        |   Value |
| ---------------- | ------: |
| Width            |   48 mm |
| Film GSM         | 25 g/m² |
| Dry adhesive GSM | 22 g/m² |
| Adhesive solids  |     50% |
| Roll length      | 1,000 m |

Expected results per roll:

| Output          |    Result |
| --------------- | --------: |
| Area            | 48.000 m² |
| Film            |  1.200 kg |
| Dry adhesive    |  1.056 kg |
| Liquid adhesive |  2.112 kg |
| Net tape weight |  2.256 kg |
| Cardboard cores |   1 piece |

### Production mass balance

The system checks the solids balance between materials issued and finished tape plus recorded dry wastage:

$$
\begin{aligned}
&\text{Film issued}_{kg} \\
&+ (\text{Liquid adhesive issued}_{kg} \times \text{Solids fraction}) \\
&= \text{Net tape produced}_{kg} + \text{Dry wastage}_{kg}
\end{aligned}
$$

The configured tolerance and rejection behaviour are enforced by the production validation logic. Check the current implementation before changing calibration assumptions for a real factory.

## Inventory and Transaction Design

### Ledger-based stock

Inventory is represented through recorded movements instead of relying only on a manually editable balance. The application records receipts, production issues, damage, finished-goods receipts, dispatches, and correction adjustments.

### Finished-goods availability

The intended availability calculation is:

$$
\text{Available rolls} = \text{Physical rolls} - \text{Active reserved rolls}
$$

### Transaction safety

Inventory-changing operations use database transactions so related changes can succeed or fail together. The project also includes concurrency tests for competing reservations and production requests, and idempotency support to help protect against duplicate processing on retries.

> **Engineering note:** Automated tests are evidence for the scenarios they cover, not a guarantee of correctness under every deployment or workload. Review database locking, transaction isolation, and all stock-changing paths before production use.

## Roles and Security

| Capability                            | Admin | Staff |
| ------------------------------------- | :---: | :---: |
| Standard operational workflows        |  Yes  |  Yes  |
| Receive and manage inventory          |  Yes  |  Yes  |
| Production and order workflows        |  Yes  |  Yes  |
| Dispatch orders                       |  Yes  |  Yes  |
| Perform audited inventory corrections |  Yes  |  No   |

Security measures implemented in the project include:

- Server-side authentication and role checks
- Password hashing with bcrypt
- HttpOnly session cookies
- Request-origin validation on state-changing endpoints
- Server-side input validation
- Inventory sufficiency checks before posting stock movements
- Audited compensating adjustments instead of silent history deletion

## Database Overview

The Prisma schema models the main business entities, including:

- `users` and `sessions`
- `tape_specifications`
- `customers`
- `production_batches`
- `material_inventory_movements`
- `finished_goods_movements`
- `customer_orders`
- `stock_reservations`
- `dispatches`
- `transaction_corrections`
- `audit_logs`
- `idempotency_records`

For the authoritative field names, relations, indexes, and constraints, refer to `prisma/schema.prisma`.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 10 or later
- MySQL 8.0 or a compatible supported MySQL/MariaDB installation

### 1. Clone the repository

```bash
git clone https://github.com/pragatipandey25/Apex-ERP.git
cd Apex-ERP
npm install
```

### 2. Configure environment variables

Create a local `.env` file using `.env.example` as a template, if the project includes one. Configure your own database connection and session secret. For example:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/apex_tape_factory"
SESSION_SECRET="replace-with-a-long-random-secret"
NODE_ENV="development"
PORT=3000
```

Use a URL-encoded password if it contains special characters. Never commit `.env` or real credentials to version control.

### 3. Prepare the database

After confirming that `DATABASE_URL` points to the intended **development database**, run:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

The seed script is expected to create demo users, sample specifications, and customers. Confirm the script's behaviour before running it against any database containing data you need to preserve.

### 4. Run the tests

```bash
npm run test
```

The latest reported local run passed **70 tests across 10 test files**.

### 5. Start the development server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 6. Verify the production build

```bash
npx tsc --noEmit
npm run build
```

To run the built application locally after a successful build:

```bash
npm start
```

## Demo Accounts

Use these credentials for the local seeded demo, provided the seed script creates these accounts:

| Role  | Email                  | Password              |
| ----- | ---------------------- | --------------------- |
| Admin | `admin@apexdemo.local` | `Admin@ApexTape2026!` |
| Staff | `staff@apexdemo.local` | `Staff@ApexTape2026!` |

These credentials only work if they match the current seed script and database. If login fails, inspect the seed script and reseed only a safe development database. Change demo credentials before any public deployment, and never use these credentials in production.

## Testing and Verification

The reported automated suite includes tests for:

- BOM calculations and input boundaries
- Production mass-balance validation
- Whole-roll order conversions
- Input and schema validation
- Inventory transactions and stock constraints
- Order reservation and production concurrency
- Role authorization
- Request-origin validation
- End-to-end operational workflows

### Latest local verification

| Check              | Result                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `npm run test`     | **70 / 70 tests passed**, 10 test files                                    |
| `npx tsc --noEmit` | **Passed**                                                                 |
| `npm run build`    | **Passed**; Prisma Client generated and Next.js production build completed |

These results reflect the local run reported during project development. Re-run the commands against the current checkout to reproduce them.

## Project Structure

```text
Apex-ERP/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                  # Pages and API route handlers
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Shared services, validation, auth and utilities
│   └── tests/                # Vitest unit, integration and workflow tests
├── .env.example              # Environment template, if present
├── package.json
└── README.md
```

The exact directory layout may vary slightly by branch; use the repository tree as the source of truth.

## Important Notes

- This is an academic/assessment project and should not be treated as certified manufacturing or accounting software without further review.
- The local demo starts with zero operational inventory unless the current seed script says otherwise.
- The application requires a reachable MySQL database configured through environment variables.
- Do not commit secrets, session keys, database passwords, or real customer data.
- Back up important databases before schema changes or seed operations.
- Before a public deployment, configure secure production secrets, HTTPS, database access controls, logging, backups, and a deployment-specific security review.

---

<div align="center">

### Apex Tape Factory ERP

_Bringing material traceability, production control, and order fulfilment into one workflow._

**Created and maintained by Pragati Pandey**

</div>

# ReviewReward - Micro-Task & Review Rewards Platform

A mobile-first full-stack web application where users complete genuine reviews for listed online shops, earn **₹10 INR** per verified review, transfer balances internally between users (**₹0 fee**), and withdraw once reaching **₹100 INR** via instant automated **USDT on Polygon** powered by the **NOWPayments Mass Payouts API**.

---

## Key Features

- **Micro-Tasks & ₹10 Rewards:** Users review listed shops and earn ₹10 per verified review.
- **Strict 1 ID = 1 Review Rule:** Each Google account can review a specific shop only once.
- **Automatic Platform Auto-Close:** When a shop reaches its admin-set `maxLimit` (e.g. 50 or 100 reviews), the task automatically closes for everyone.
- **₹0-Fee Peer-to-Peer Wallet Transfers:** Users can pool ₹10 rewards across multiple Google IDs they own into one primary account using User IDs (`USR-XXXXX`) or emails.
- **Instant Polygon USDT Payouts:** Minimum withdrawal threshold of ₹100 INR with automated 2FA verification.
- **6% Cash-Out Conversion Buffer:** Platform funds an extra 6% buffer (~₹106 worth of USDT) to cover Indian exchange spreads and 1% TDS when selling on CoinDCX, Mudrex, or CoinSwitch.
- **Role-Based Admin Portal:** Protected `/admin` dashboard for task management, Auto/Manual verification toggle, and audit logs.

---

## Tech Stack

- **Framework:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Database:** Supabase PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Google OAuth 2.0)
- **Crypto Payouts:** NOWPayments Mass Payouts REST API (USDT on Polygon `usdtmatic`) with TOTP 2FA

---

## Getting Started

1. Clone or open the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` with your Supabase, Google OAuth, and NOWPayments credentials.
4. Run database migrations:
   ```bash
   npx prisma db push
   ```
5. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

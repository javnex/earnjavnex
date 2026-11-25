-- =========================================================
-- ReviewReward - Supabase PostgreSQL Schema & Initial Data
-- Run this directly in your Supabase SQL Editor if needed
-- =========================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "userCode" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isWithdrawing" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- 2. Create Tasks Table
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "shopUrl" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "rewardInr" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maxLimit" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");

-- 3. Create Submissions Table (Enforces 1 review per user per shop & global unique proof link)
CREATE TABLE IF NOT EXISTS "Submission" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "proofLink" TEXT UNIQUE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rewardCredited" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_userId_taskId_unique" UNIQUE ("userId", "taskId")
);

CREATE INDEX IF NOT EXISTS "Submission_userId_idx" ON "Submission"("userId");
CREATE INDEX IF NOT EXISTS "Submission_taskId_idx" ON "Submission"("taskId");
CREATE INDEX IF NOT EXISTS "Submission_status_idx" ON "Submission"("status");

-- 4. Create WalletTransfer Table (Peer-to-Peer ₹0 Transfer Audit)
CREATE TABLE IF NOT EXISTS "WalletTransfer" (
    "id" TEXT PRIMARY KEY,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "receiverId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "amountInr" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WalletTransfer_senderId_idx" ON "WalletTransfer"("senderId");
CREATE INDEX IF NOT EXISTS "WalletTransfer_receiverId_idx" ON "WalletTransfer"("receiverId");

-- 5. Create Withdrawal Table (NOWPayments Mass Payouts)
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "amountInr" DOUBLE PRECISION NOT NULL,
    "bufferedInr" DOUBLE PRECISION NOT NULL,
    "usdtAmount" DOUBLE PRECISION NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'POLYGON',
    "walletAddress" TEXT NOT NULL,
    "nowpaymentsPayoutId" TEXT,
    "batchWithdrawalId" TEXT,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Withdrawal_userId_idx" ON "Withdrawal"("userId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");

-- 6. Create Settings Table
CREATE TABLE IF NOT EXISTS "Setting" (
    "id" TEXT PRIMARY KEY DEFAULT 'default',
    "verificationMode" TEXT NOT NULL DEFAULT 'AUTO',
    "cashoutBufferPercent" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
    "minWithdrawalInr" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "usdtInrRate" DOUBLE PRECISION NOT NULL DEFAULT 90.5,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Seed Initial Settings & 3 Tasks
INSERT INTO "Setting" ("id", "verificationMode", "cashoutBufferPercent", "minWithdrawalInr", "usdtInrRate", "updatedAt")
VALUES ('default', 'AUTO', 6.0, 100.0, 90.5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Task" ("id", "title", "shopUrl", "instructions", "rewardInr", "maxLimit", "completedCount", "status", "createdAt", "updatedAt")
VALUES 
(
    'task-chai-point',
    'Chai Point Indiranagar - Google Maps Review',
    'https://maps.google.com/?cid=10101010101',
    '1. Click Open Shop Link. 2. Leave a genuine 5-star review about the Masala Chai and cafe ambiance. 3. Copy public review link and paste below.',
    10.0,
    50,
    12,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'task-organic-earth',
    'Organic Earth Superstore - Trustpilot Feedback',
    'https://www.trustpilot.com/review/organicearth.example',
    '1. Visit the store review page. 2. Write a 4 or 5-star review highlighting delivery speed and organic honey quality. 3. Submit your review public URL.',
    10.0,
    100,
    45,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'task-urban-kicks',
    'Urban Kicks Footwear - Google Review (Filling Fast!)',
    'https://maps.google.com/?cid=20202020202',
    '1. Open Google Business page. 2. Post helpful review about shoe comfort and pricing. 3. Paste your review link to get ₹10 credited instantly. Auto-closes at 20!',
    10.0,
    20,
    19,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

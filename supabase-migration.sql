-- ═══ Reddit Rule Scanner - Supabase Migration ═══
-- Corré este SQL en: Supabase Dashboard → SQL Editor → New Query
-- Pegá todo esto y dale "Run"

-- CreateTable
CREATE TABLE IF NOT EXISTS "subreddits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "over18" BOOLEAN NOT NULL DEFAULT false,
    "allowPromo" BOOLEAN,
    "requiresVerify" BOOLEAN,
    "postLimit" TEXT,
    "promoDays" TEXT,
    "iconUrl" TEXT,
    "summaryEs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subreddits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rules" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleTextOriginal" TEXT NOT NULL,
    "ruleTextEs" TEXT,
    "category" TEXT,
    "isKeyRule" BOOLEAN NOT NULL DEFAULT false,
    "keyRuleType" TEXT,
    "aiExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "favorites" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "note" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trends" (
    "id" TEXT NOT NULL,
    "subredditId" TEXT NOT NULL,
    "fetishName" TEXT NOT NULL,
    "category" TEXT,
    "growthPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "competitionLevel" TEXT NOT NULL DEFAULT 'unknown',
    "isEmerging" BOOLEAN NOT NULL DEFAULT false,
    "weekDetected" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subreddits_name_key" ON "subreddits"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_anonId_key" ON "users"("anonId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trends" ADD CONSTRAINT "trends_subredditId_fkey" FOREIGN KEY ("subredditId") REFERENCES "subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

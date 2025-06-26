-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('FACILITY', 'SPORT', 'CATEGORY', 'ACTIVITY', 'GENERAL');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "last_edited" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "description" TEXT,
    "highlights" JSONB,
    "logo_url" TEXT,
    "last_edited" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seeded" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "establishment" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_opening_hours" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_images" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_tags" (
    "center_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_tags_pkey" PRIMARY KEY ("center_id","tag_id")
);

-- CreateTable
CREATE TABLE "center_facilities" (
    "center_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_facilities_pkey" PRIMARY KEY ("center_id","tag_id")
);

-- CreateTable
CREATE TABLE "center_links" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "type" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_socials" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "platform" TEXT,
    "url" TEXT,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_socials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GroupType" NOT NULL DEFAULT 'GENERAL',
    "tag_count" INTEGER NOT NULL DEFAULT 0,
    "last_edited" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_tags" (
    "group_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_tags_pkey" PRIMARY KEY ("group_id","tag_id")
);

-- CreateTable
CREATE TABLE "tag_images" (
    "id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tag_count" INTEGER NOT NULL DEFAULT 0,
    "center_count" INTEGER NOT NULL DEFAULT 0,
    "last_edited" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_tags" (
    "sport_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_tags_pkey" PRIMARY KEY ("sport_id","tag_id")
);

-- CreateTable
CREATE TABLE "sport_centers" (
    "sport_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_centers_pkey" PRIMARY KEY ("sport_id","center_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500),
    "imageUrl" TEXT,
    "buttonTitle" VARCHAR(30),
    "buttonLink" TEXT,
    "last_edited" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "activity_type_id" TEXT,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_activities" (
    "center_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "last_seeded" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_activities_pkey" PRIMARY KEY ("center_id","activity_id")
);

-- CreateTable
CREATE TABLE "activity_pricing" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "player_type" TEXT NOT NULL,
    "duration" TEXT,
    "price_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "centers_name_idx" ON "centers"("name");

-- CreateIndex
CREATE INDEX "centers_establishment_idx" ON "centers"("establishment");

-- CreateIndex
CREATE INDEX "centers_is_active_idx" ON "centers"("is_active");

-- CreateIndex
CREATE INDEX "centers_latitude_longitude_idx" ON "centers"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "center_opening_hours_center_id_dayOfWeek_idx" ON "center_opening_hours"("center_id", "dayOfWeek");

-- CreateIndex
CREATE INDEX "center_images_center_id_display_order_idx" ON "center_images"("center_id", "display_order");

-- CreateIndex
CREATE INDEX "center_tags_center_id_idx" ON "center_tags"("center_id");

-- CreateIndex
CREATE INDEX "center_tags_tag_id_idx" ON "center_tags"("tag_id");

-- CreateIndex
CREATE INDEX "center_facilities_center_id_idx" ON "center_facilities"("center_id");

-- CreateIndex
CREATE INDEX "center_facilities_tag_id_idx" ON "center_facilities"("tag_id");

-- CreateIndex
CREATE INDEX "center_links_center_id_idx" ON "center_links"("center_id");

-- CreateIndex
CREATE INDEX "center_socials_center_id_idx" ON "center_socials"("center_id");

-- CreateIndex
CREATE INDEX "groups_name_idx" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_type_idx" ON "groups"("type");

-- CreateIndex
CREATE INDEX "group_tags_group_id_idx" ON "group_tags"("group_id");

-- CreateIndex
CREATE INDEX "group_tags_tag_id_idx" ON "group_tags"("tag_id");

-- CreateIndex
CREATE INDEX "tag_images_tag_id_idx" ON "tag_images"("tag_id");

-- CreateIndex
CREATE INDEX "sports_name_idx" ON "sports"("name");

-- CreateIndex
CREATE INDEX "sport_tags_sport_id_idx" ON "sport_tags"("sport_id");

-- CreateIndex
CREATE INDEX "sport_tags_tag_id_idx" ON "sport_tags"("tag_id");

-- CreateIndex
CREATE INDEX "sport_centers_sport_id_idx" ON "sport_centers"("sport_id");

-- CreateIndex
CREATE INDEX "sport_centers_center_id_idx" ON "sport_centers"("center_id");

-- CreateIndex
CREATE INDEX "activities_title_idx" ON "activities"("title");

-- CreateIndex
CREATE INDEX "activities_activity_type_id_idx" ON "activities"("activity_type_id");

-- CreateIndex
CREATE INDEX "center_activities_center_id_display_order_idx" ON "center_activities"("center_id", "display_order");

-- CreateIndex
CREATE INDEX "center_activities_activity_id_idx" ON "center_activities"("activity_id");

-- CreateIndex
CREATE INDEX "activity_pricing_activity_id_idx" ON "activity_pricing"("activity_id");

-- CreateIndex
CREATE INDEX "activity_pricing_player_type_idx" ON "activity_pricing"("player_type");

-- CreateIndex
CREATE INDEX "activity_pricing_price_type_idx" ON "activity_pricing"("price_type");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centers" ADD CONSTRAINT "centers_establishment_fkey" FOREIGN KEY ("establishment") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_opening_hours" ADD CONSTRAINT "center_opening_hours_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_images" ADD CONSTRAINT "center_images_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_tags" ADD CONSTRAINT "center_tags_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_tags" ADD CONSTRAINT "center_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_facilities" ADD CONSTRAINT "center_facilities_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_facilities" ADD CONSTRAINT "center_facilities_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_links" ADD CONSTRAINT "center_links_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_socials" ADD CONSTRAINT "center_socials_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_tags" ADD CONSTRAINT "group_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_images" ADD CONSTRAINT "tag_images_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_tags" ADD CONSTRAINT "sport_tags_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_tags" ADD CONSTRAINT "sport_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_centers" ADD CONSTRAINT "sport_centers_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_centers" ADD CONSTRAINT "sport_centers_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_activities" ADD CONSTRAINT "center_activities_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_activities" ADD CONSTRAINT "center_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_pricing" ADD CONSTRAINT "activity_pricing_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

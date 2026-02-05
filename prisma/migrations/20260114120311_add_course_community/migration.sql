-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'ASSIGNMENT', 'DISCUSSION', 'MATERIAL');

-- CreateTable
CREATE TABLE "course_posts" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "classId" TEXT,
    "authorId" TEXT NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'DISCUSSION',
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "assignmentAreaId" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "submissionId" TEXT,
    "parentCommentId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_post_comment_likes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_post_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_posts_courseId_createdAt_idx" ON "course_posts"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "course_posts_classId_createdAt_idx" ON "course_posts"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "course_posts_authorId_idx" ON "course_posts"("authorId");

-- CreateIndex
CREATE INDEX "course_posts_type_idx" ON "course_posts"("type");

-- CreateIndex
CREATE INDEX "course_posts_assignmentAreaId_idx" ON "course_posts"("assignmentAreaId");

-- CreateIndex
CREATE INDEX "course_posts_isPinned_isArchived_createdAt_idx" ON "course_posts"("isPinned", "isArchived", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_post_comments_submissionId_key" ON "course_post_comments"("submissionId");

-- CreateIndex
CREATE INDEX "course_post_comments_postId_createdAt_idx" ON "course_post_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "course_post_comments_authorId_idx" ON "course_post_comments"("authorId");

-- CreateIndex
CREATE INDEX "course_post_comments_submissionId_idx" ON "course_post_comments"("submissionId");

-- CreateIndex
CREATE INDEX "course_post_comments_parentCommentId_idx" ON "course_post_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "course_post_comments_isDeleted_idx" ON "course_post_comments"("isDeleted");

-- CreateIndex
CREATE INDEX "course_post_likes_userId_idx" ON "course_post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_post_likes_postId_userId_key" ON "course_post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "course_post_comment_likes_userId_idx" ON "course_post_comment_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_post_comment_likes_commentId_userId_key" ON "course_post_comment_likes"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "course_posts" ADD CONSTRAINT "course_posts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_posts" ADD CONSTRAINT "course_posts_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_posts" ADD CONSTRAINT "course_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_posts" ADD CONSTRAINT "course_posts_assignmentAreaId_fkey" FOREIGN KEY ("assignmentAreaId") REFERENCES "assignment_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comments" ADD CONSTRAINT "course_post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "course_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comments" ADD CONSTRAINT "course_post_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comments" ADD CONSTRAINT "course_post_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comments" ADD CONSTRAINT "course_post_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "course_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_likes" ADD CONSTRAINT "course_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "course_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_likes" ADD CONSTRAINT "course_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comment_likes" ADD CONSTRAINT "course_post_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "course_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_post_comment_likes" ADD CONSTRAINT "course_post_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

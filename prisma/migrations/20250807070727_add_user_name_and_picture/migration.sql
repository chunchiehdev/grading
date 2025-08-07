/*
  Warnings:

  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `picture` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "picture" VARCHAR(500) NOT NULL;

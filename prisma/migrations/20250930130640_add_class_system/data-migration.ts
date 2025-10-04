/**
 * Data Migration: Create default classes for existing courses
 *
 * This script:
 * 1. Creates a "預設班次" (default class) for each existing course
 * 2. Updates all enrollments to link to the default class
 * 3. Updates assignment areas and invitation codes if needed
 *
 * Run this AFTER the schema migration:
 * npx tsx prisma/migrations/20250930130640_add_class_system/data-migration.ts
 */

import { PrismaClient } from '../../../app/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting data migration for Class system...\n');

  try {
    // Get all courses
    const courses = await prisma.course.findMany({
      include: {
        enrollments: true,
        assignmentAreas: true,
        invitationCodes: true,
      },
    });

    console.log(`📚 Found ${courses.length} courses to migrate\n`);

    for (const course of courses) {
      console.log(`\n📖 Processing course: ${course.name} (ID: ${course.id})`);

      // Check if default class already exists
      const existingClasses = await prisma.class.findMany({
        where: { courseId: course.id },
      });

      let defaultClass;

      if (existingClasses.length > 0) {
        console.log(`   ✅ Class already exists, skipping...`);
        defaultClass = existingClasses[0];
      } else {
        // Create default class
        console.log(`   🏗️  Creating default class...`);
        defaultClass = await prisma.class.create({
          data: {
            courseId: course.id,
            name: '預設班次',
            isActive: true,
            schedule: null,
            capacity: null,
          },
        });
        console.log(`   ✅ Created class: ${defaultClass.name} (ID: ${defaultClass.id})`);
      }

      // Migrate enrollments (only those without classId)
      const enrollmentsToUpdate = course.enrollments.filter(e => !e.classId);
      if (enrollmentsToUpdate.length > 0) {
        console.log(`   📝 Updating ${enrollmentsToUpdate.length} enrollments...`);
        await prisma.enrollment.updateMany({
          where: {
            courseId: course.id,
            classId: null,
          },
          data: {
            classId: defaultClass.id,
          },
        });
        console.log(`   ✅ Enrollments updated`);
      } else {
        console.log(`   ℹ️  No enrollments to update`);
      }

      // Migrate assignment areas (only those without classId and belong to this course)
      const assignmentsToUpdate = course.assignmentAreas.filter(a => !a.classId);
      if (assignmentsToUpdate.length > 0) {
        console.log(`   📋 Updating ${assignmentsToUpdate.length} assignment areas...`);
        await prisma.assignmentArea.updateMany({
          where: {
            courseId: course.id,
            classId: null,
          },
          data: {
            classId: defaultClass.id,
          },
        });
        console.log(`   ✅ Assignment areas updated`);
      } else {
        console.log(`   ℹ️  No assignment areas to update`);
      }

      // Migrate invitation codes (only those without classId)
      const invitesToUpdate = course.invitationCodes.filter(i => !i.classId);
      if (invitesToUpdate.length > 0) {
        console.log(`   🎫 Updating ${invitesToUpdate.length} invitation codes...`);
        await prisma.invitationCode.updateMany({
          where: {
            courseId: course.id,
            classId: null,
          },
          data: {
            classId: defaultClass.id,
          },
        });
        console.log(`   ✅ Invitation codes updated`);
      } else {
        console.log(`   ℹ️  No invitation codes to update`);
      }

      console.log(`   ✨ Course "${course.name}" migration completed`);
    }

    // Verification
    console.log('\n\n🔍 Verifying migration...\n');

    const totalClasses = await prisma.class.count();
    console.log(`✅ Total classes created: ${totalClasses}`);

    const enrollmentsWithoutClass = await prisma.enrollment.count({
      where: { classId: null },
    });
    console.log(`✅ Enrollments without classId: ${enrollmentsWithoutClass}`);

    const assignmentsWithoutClass = await prisma.assignmentArea.count({
      where: { classId: null },
    });
    console.log(`✅ Assignment areas without classId: ${assignmentsWithoutClass} (OK if > 0, means they target all classes)`);

    console.log('\n✨ Data migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
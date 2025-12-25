/**
 * Seed Script: Create First Admin
 * Usage: npx tsx scripts/seed-first-admin.ts
 * 
 * This script creates the first admin user for cold-start scenarios.
 * Configure the admin email below before running.
 */

import 'dotenv/config';
import { db } from '../app/lib/db.server';
import logger from '../app/utils/logger';

// CONFIGURATION: Set your admin email here
const ADMIN_EMAIL = process.env.FIRST_ADMIN_EMAIL || 'chunchiehdev@gmail.com';
const ADMIN_NAME = 'System Administrator';

async function seedFirstAdmin() {
  try {
    // Check if any admin exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      logger.info({ adminEmail: existingAdmin.email }, '✅ An admin already exists.');
      return;
    }

    // Check if the configured email exists as a user
    const user = await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (user) {
      // User exists - upgrade to admin
      const updatedUser = await db.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          role: 'ADMIN',
          hasSelectedRole: true,
        },
      });

      logger.info({ email: ADMIN_EMAIL }, '✅ Promoted existing user to ADMIN');
    } else {
      // User doesn't exist - create new admin
      const newAdmin = await db.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}`,
          role: 'ADMIN',
          hasSelectedRole: true,
        },
      });

      logger.info({ email: ADMIN_EMAIL }, '✅ Created first ADMIN user');
    }

    console.log('\n🎉 First admin setup complete!');
  } catch (error) {
    logger.error({ error }, '❌ Error creating first admin');
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedFirstAdmin();


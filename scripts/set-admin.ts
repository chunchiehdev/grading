/**
 * Script to set a user as ADMIN
 * Usage: npx tsx scripts/set-admin.ts <email>
 */

import 'dotenv/config';
import { db } from '../app/lib/db.server';

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Please provide an email address');
  console.log('Usage: tsx scripts/set-admin.ts <email>');
  process.exit(1);
}

async function setAdmin() {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, hasSelectedRole: true },
    });

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    if (user.role === 'ADMIN') {
      console.log(`✅ User "${user.name}" (${user.email}) is already an ADMIN`);
      process.exit(0);
    }

    console.log(`📝 Current user info:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Has Selected Role: ${user.hasSelectedRole}`);
    console.log();
    console.log(`🔄 Updating to ADMIN...`);

    const updated = await db.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        hasSelectedRole: true, // Ensure hasSelectedRole is true
      },
      select: { id: true, email: true, name: true, role: true, hasSelectedRole: true },
    });

    console.log(`✅ Successfully updated user to ADMIN!`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   New Role: ${updated.role}`);
    console.log(`   Has Selected Role: ${updated.hasSelectedRole}`);
    console.log();
    console.log(`🎉 You can now access:`);
    console.log(`   - /admin/users (User Management)`);
    console.log(`   - /admin/queues (Queue Monitoring)`);
    console.log(`   - /teacher/* (All Teacher Features)`);
  } catch (error) {
    console.error('❌ Error setting admin:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

setAdmin();

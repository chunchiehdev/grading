import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.FIRST_ADMIN_EMAIL || 's113524023@g.ncu.edu.tw';
const ADMIN_NAME = 'System Administrator';

async function seedFirstAdmin() {
  console.log('🌱 Starting Admin Seeding...');
  
  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log(`✅ An admin already exists: ${existingAdmin.email}`);
      return;
    }

    // Check if the configured email exists as a user
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (user) {
      // User exists - upgrade to admin
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          role: 'ADMIN',
          hasSelectedRole: true,
        },
      });
      console.log(`✅ Promoted existing user to ADMIN: ${ADMIN_EMAIL}`);
    } else {
      // User doesn't exist - create new admin
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_NAME)}`,
          role: 'ADMIN',
          hasSelectedRole: true,
        },
      });
      console.log(`✅ Created first ADMIN user: ${ADMIN_EMAIL}`);
    }

    console.log('\n🎉 First admin setup complete!');
  } catch (error) {
    console.error('❌ Error creating first admin:', error);
    process.exit(1);
  } finally {
    
    await prisma.$disconnect();
  }
}

seedFirstAdmin();
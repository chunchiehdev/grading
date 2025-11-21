import { PrismaClient } from '../app/generated/prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'test-user@example.com';
  
  console.log(`Checking if user ${email} exists...`);
  
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Updating role...`);
    await prisma.user.update({
      where: { email },
      data: {
        role: 'TEACHER',
        hasSelectedRole: true,
      },
    });
    console.log('User updated successfully.');
  } else {
    console.log(`Creating new user ${email}...`);
    await prisma.user.create({
      data: {
        email,
        name: 'Test Teacher',
        picture: 'https://ui-avatars.com/api/?name=Test+Teacher',
        role: 'TEACHER',
        hasSelectedRole: true,
      },
    });
    console.log('User created successfully.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

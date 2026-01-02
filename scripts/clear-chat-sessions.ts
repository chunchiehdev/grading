import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to clear chat sessions...');

  try {
    // Delete all AgentChatSession records
    // Due to onDelete: Cascade, this will also delete AgentChatMessage and AgentChatStepLog
    const { count } = await prisma.agentChatSession.deleteMany({});
    
    console.log(`Successfully deleted ${count} chat sessions and their related messages.`);
  } catch (error) {
    console.error('Error clearing chat sessions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

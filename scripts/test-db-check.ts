#!/usr/bin/env node

import { PrismaClient } from '../app/generated/prisma/client';

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://test_user:test_password@localhost:5433/grading_test_template";
  
  console.log('🔍 檢查測試資料庫連接...');
  console.log('📍 資料庫 URL:', databaseUrl.replace(/password=[^&@]+/, 'password=***'));
  
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  });
  
  try {
    await prisma.$connect();
    console.log('✅ 資料庫連接成功！');
    
    const result = await prisma.$queryRaw`SELECT version()` as any[];
    console.log('📦 PostgreSQL 版本:', result[0].version);
    
    // 檢查表格是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ` as any[];
    
    console.log('📋 已創建的表格:', tables.map(t => t.table_name).join(', '));
    
  } catch (error: any) {
    console.error('❌ 資料庫連接失敗:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error); 
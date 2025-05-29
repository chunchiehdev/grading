# Prisma TDD 測試架構

## 架構概述

這是一個為 Prisma 設計的完整 TDD (Test-Driven Development) 測試架構，包含：

- 獨立的測試資料庫設置 (與開發環境完全隔離)
- 資料工廠 (Data Factories) 
- 測試輔助函數
- 自動化清理機制

## 快速開始

### 1. 設置測試環境

```bash
# 啟動測試資料庫 (獨立的 PostgreSQL 容器)
make test-db-setup

# 檢查資料庫連接
make test-db-check

# 或手動啟動
docker compose -f docker-compose.test.yaml up -d test-db
```

### 2. 運行測試

```bash
# 運行所有測試
npm run test

# 監視模式 (TDD 推薦)
npm run test:watch

# 生成覆蓋率報告
npm run test:coverage

# 使用 Makefile (推薦)
make tdd  # 啟動資料庫 + 檢查連接 + 監視模式
```

### 3. 清理環境

```bash
make test-db-down
```

## 測試環境隔離

### 🔒 完全隔離的測試環境

- **獨立容器**: 測試資料庫運行在端口 `5433`，開發環境在 `5432`
- **獨立網路**: 使用 `test_network` 避免衝突
- **獨立 Volume**: 測試數據與開發數據完全分離
- **動態資料庫**: 每個測試套件創建臨時資料庫，測試完成後自動清理

### 📊 資料庫配置對比

| 環境 | 容器名稱 | 端口 | 資料庫名稱 | 用戶 |
|------|----------|------|------------|------|
| 開發 | db | 5432 | grading_db | admin |
| 測試 | test-db | 5433 | grading_test_template | test_user |

## 測試架構組件

### 資料庫設置 (`test/database.ts`)

- `createTestDatabase()`: 為每個測試套件創建獨立的臨時資料庫
- `resetDatabase()`: 清理測試數據
- 自動化的資料庫生命週期管理
- 測試完成後自動刪除臨時資料庫

### 資料工廠 (`test/factories/`)

#### UserFactory
```typescript
const user = await testContext.userFactory.create({
  email: 'test@example.com'
});
```

#### RubricFactory  
```typescript
const rubric = await testContext.rubricFactory.create({
  userId: user.id,
  name: 'Essay Grading Rubric',
  criteria: [...] // 可選，有預設值
});
```

### 測試輔助函數 (`test/test-helpers.ts`)

```typescript
import { setupTestDatabase, TestContext } from '../test-helpers';

describe('My Test Suite', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    testContext = await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestData(testContext.prisma);
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  it('should do something', async () => {
    // 你的測試邏輯
  });
});
```

## TDD 工作流程

### 1. 紅燈階段 (Red)
寫一個失敗的測試：

```typescript
it('should create user with Google OAuth', async () => {
  // Arrange
  const googleProfile = {
    email: 'user@gmail.com',
    googleId: 'google-12345'
  };

  // Act  
  const user = await userService.createFromGoogleAuth(googleProfile);

  // Assert
  expect(user.email).toBe(googleProfile.email);
  expect(user.googleId).toBe(googleProfile.googleId);
});
```

### 2. 綠燈階段 (Green)
寫最少的代碼使測試通過：

```typescript
// app/services/user.service.ts
export class UserService {
  constructor(private prisma: PrismaClient) {}

  async createFromGoogleAuth(profile: { email: string; googleId: string }) {
    return this.prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId
      }
    });
  }
}
```

### 3. 重構階段 (Refactor)
優化代碼但保持測試通過。

## 測試最佳實踐

### AAA 模式
所有測試都應該遵循 Arrange-Act-Assert 模式：

```typescript
it('should update rubric criteria', async () => {
  // Arrange - 設置測試數據
  const user = await testContext.userFactory.create();
  const rubric = await testContext.rubricFactory.create({ userId: user.id });
  const newCriteria = [...];

  // Act - 執行被測試的操作  
  const result = await testContext.prisma.rubric.update({
    where: { id: rubric.id },
    data: { criteria: newCriteria }
  });

  // Assert - 驗證結果
  expect(result.criteria).toEqual(newCriteria);
});
```

### 測試命名
- 使用描述性的測試名稱
- 包含預期的行為和條件
- 例如：`should create user when valid email is provided`

### 測試隔離
- 每個測試都應該是獨立的
- 使用 `afterEach` 清理數據
- 避免測試之間的依賴

## 環境配置

### 環境變數

測試環境使用以下環境變數：

```bash
DATABASE_URL="postgresql://test_user:test_password@localhost:5433/grading_test_template"
NODE_ENV="test"
```

### Docker Compose

測試環境使用 `docker-compose.test.yaml`:

```yaml
services:
  test-db:
    image: postgres:16-alpine
    ports:
      - "5433:5432"  # 不同端口避免衝突
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: grading_test_template
    volumes:
      - test_postgres_data:/var/lib/postgresql/data
    networks:
      - test_network
```

### 可用的 Make 命令

```bash
# 基本測試命令
make test              # 運行所有測試
make test-watch        # 監視模式
make test-coverage     # 生成覆蓋率報告

# 資料庫管理
make test-db-setup     # 啟動測試資料庫
make test-db-check     # 檢查資料庫連接
make test-db-down      # 關閉並清理測試資料庫

# TDD 工作流
make tdd              # 完整的 TDD 環境設置
make clean            # 清理並關閉所有測試環境
```

## 故障排除

### 常見問題

1. **端口衝突**
   - 測試資料庫使用端口 5433，確保該端口未被佔用
   - 開發資料庫使用端口 5432

2. **資料庫連接失敗**
   - 運行 `make test-db-check` 檢查連接
   - 確保測試容器正在運行：`docker ps | grep test-db`

3. **測試超時**  
   - 資料庫操作可能較慢，已設置 30 秒超時
   - 檢查 Docker 容器狀態和日誌

4. **Schema 同步問題**
   - 重新設置測試環境：`make test-db-down && make test-db-setup`

### 調試技巧

```typescript
// 在測試中查看創建的數據
console.log('Created user:', JSON.stringify(user, null, 2));

// 檢查資料庫狀態
const allUsers = await testContext.prisma.user.findMany();
console.log('All users:', allUsers);

// 檢查當前資料庫名稱
const result = await testContext.prisma.$queryRaw`SELECT current_database()`;
console.log('Current database:', result[0].current_database);
```

### 監控測試資料庫

```bash
# 檢查測試容器狀態
docker compose -f docker-compose.test.yaml ps

# 查看測試資料庫日誌
docker compose -f docker-compose.test.yaml logs test-db

# 連接到測試資料庫
docker exec -it $(docker compose -f docker-compose.test.yaml ps -q test-db) psql -U test_user -d grading_test_template
``` 
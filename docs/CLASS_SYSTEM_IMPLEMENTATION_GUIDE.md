# Class System Implementation Guide

## 總覽

此文檔說明如何在評分系統中實作完整的 **Class/Section（班次/班級）** 系統。

## 🎯 核心概念

### 三層架構

```
Course (課程) - 學科層級
  └─ Class/Section (班次/班級) - 實際教學單位
      └─ Enrollment (學生註冊) - 個別學生
```

### 設計原則

1. **一個課程，多個班次**：同一門課可以有多個上課時段
2. **班次獨立管理**：每個班次有獨立的學生名單、作業安排
3. **向後相容**：完全不破壞現有功能
4. **彈性設計**：作業可以指定給特定班次或全課程

## 📋 已完成的實作

### 1. 資料庫 Schema

**新增資料表**：
- ✅ `classes` - 班次資料表

**修改資料表**：
- ✅ `courses` - 新增 `code`, `syllabus`
- ✅ `assignment_areas` - 新增 `classId`
- ✅ `enrollments` - 新增 `classId`, `finalGrade`, `attendance`
- ✅ `invitation_codes` - 新增 `classId`

**檔案位置**：
- Schema: `/prisma/schema.prisma`
- Migration: `/prisma/migrations/20250930130640_add_class_system/`

### 2. Migration 腳本

**Schema Migration**：
- 檔案: `migration.sql`
- 功能: 創建表、新增欄位、建立索引和外鍵

**Data Migration**：
- 檔案: `data-migration.ts`
- 功能: 為現有課程創建預設班次，遷移現有資料

### 3. 服務層 API

**Class Service** (`app/services/class.server.ts`):
- ✅ `createClass()` - 創建班次
- ✅ `getClassById()` - 查詢班次
- ✅ `listClassesByCourse()` - 列出課程的所有班次
- ✅ `updateClass()` - 更新班次資訊
- ✅ `deleteClass()` - 刪除班次
- ✅ `getClassStatistics()` - 班次統計
- ✅ `getStudentClasses()` - 學生的班次列表

**Enrollment Service** (`app/services/enrollment.server.ts`):
- ✅ `enrollStudentInClass()` - 學生加入班次
- ✅ `isStudentEnrolledInClass()` - 檢查班次註冊狀態
- ✅ `getClassEnrollments()` - 查詢班次學生名單
- ✅ `unenrollStudentFromClass()` - 學生退出班次

## 🚀 執行 Migration 步驟

### Step 1: 執行 Schema Migration

```bash
npm run migrate:dev
```

這會：
1. 創建 `classes` 表
2. 為現有表新增欄位
3. 建立索引和外鍵約束
4. 重新生成 Prisma Client

### Step 2: 執行資料遷移

```bash
npx tsx prisma/migrations/20250930130640_add_class_system/data-migration.ts
```

這會：
1. 為每個現有課程創建「預設班次」
2. 將所有 enrollments 遷移到預設班次
3. 將所有 assignment areas 遷移到預設班次
4. 將所有 invitation codes 遷移到預設班次

### Step 3: 驗證結果

```sql
-- 檢查是否所有課程都有班次
SELECT c.id, c.name, COUNT(cl.id) as class_count
FROM courses c
LEFT JOIN classes cl ON cl."courseId" = c.id
GROUP BY c.id, c.name
HAVING COUNT(cl.id) = 0;
-- 應該返回 0 筆記錄

-- 檢查是否有孤立的 enrollments
SELECT COUNT(*) FROM enrollments WHERE "classId" IS NULL;
-- 應該返回 0
```

## 📊 使用範例

### 範例 1：老師創建多個班次

```typescript
import { createClass } from '@/services/class.server';

// 創建週五下午班
const class1 = await createClass(teacherId, {
  courseId: "course-uuid",
  name: "101班",
  schedule: {
    day: "Friday",
    startTime: "14:00",
    endTime: "17:00",
    room: "資訊館 301",
    weekday: 5
  },
  capacity: 30
});

// 創建週五晚上班
const class2 = await createClass(teacherId, {
  courseId: "course-uuid",
  name: "102班",
  schedule: {
    day: "Friday",
    startTime: "18:00",
    endTime: "21:00",
    room: "資訊館 302",
    weekday: 5
  },
  capacity: 35
});
```

### 範例 2：學生加入班次

```typescript
import { enrollStudentInClass } from '@/services/enrollment.server';

// 學生選擇加入 101班
await enrollStudentInClass(studentId, class1.id);
```

### 範例 3：創建班次專屬作業

```typescript
import { createAssignmentArea } from '@/services/assignment-area.server';

// 101班的作業（截止日期較早）
await createAssignmentArea(teacherId, courseId, {
  name: "作業一：鏈結串列",
  classId: class1.id,  // 指定給 101班
  rubricId: "rubric-uuid",
  dueDate: new Date("2025-10-10 23:59")
});

// 102班的作業（截止日期較晚）
await createAssignmentArea(teacherId, courseId, {
  name: "作業一：鏈結串列",
  classId: class2.id,  // 指定給 102班
  rubricId: "rubric-uuid",
  dueDate: new Date("2025-10-11 23:59")
});

// 全課程通用作業
await createAssignmentArea(teacherId, courseId, {
  name: "期中專案",
  classId: null,  // 所有班次都要做
  rubricId: "rubric-uuid",
  dueDate: new Date("2025-11-15 23:59")
});
```

### 範例 4：查詢班次統計

```typescript
import { getClassStatistics } from '@/services/class.server';

const stats = await getClassStatistics(classId, teacherId);

console.log(stats);
// {
//   totalEnrollments: 28,
//   totalAssignments: 5,
//   recentEnrollments: [...],
//   submissionsByStatus: {
//     SUBMITTED: 15,
//     GRADED: 10,
//     ...
//   },
//   capacityUtilization: 93.3  // 28/30 * 100
// }
```

### 範例 5：列出課程的所有班次

```typescript
import { listClassesByCourse } from '@/services/class.server';

const classes = await listClassesByCourse(courseId, teacherId);

classes.forEach(cls => {
  console.log(`${cls.name}: ${cls._count.enrollments} 人`);
});
// 101班: 28 人
// 102班: 35 人
```

## 🔄 向後相容性

### ✅ 完全向後相容

1. **現有 API 繼續運作**：
   - `enrollStudent(studentId, courseId)` 仍然可用
   - 舊的 `getCourseEnrollments()` 繼續工作

2. **資料自動遷移**：
   - 所有現有課程自動獲得「預設班次」
   - 現有 enrollments 自動關聯到預設班次

3. **漸進式升級**：
   - 可選擇性使用新功能
   - 不強制立即修改所有程式碼

## 📝 待完成任務

### 前端 UI（尚未實作）

1. **老師端**：
   - [ ] 課程詳情頁 - 顯示班次列表
   - [ ] 創建班次表單
   - [ ] 編輯班次功能
   - [ ] 班次學生名單管理
   - [ ] 創建作業時選擇班次

2. **學生端**：
   - [ ] 加入課程時選擇班次
   - [ ] 課程列表顯示班次資訊
   - [ ] 只看到自己班次的作業

### API Routes（尚未實作）

- [ ] `/api/classes` - CRUD endpoints
- [ ] `/api/classes/:classId/enrollments` - 班次學生管理
- [ ] `/api/classes/:classId/stats` - 班次統計

### 服務層（需要更新）

- [ ] `assignment-area.server.ts` - 支援班次過濾
- [ ] `invitation.server.ts` - 支援班次邀請碼

## 🎨 推薦 UI 設計

### 老師 - 課程詳情頁

```
┌─────────────────────────────────────────────┐
│ 資料結構 (CS 201)                            │
│ 王教授                                       │
├─────────────────────────────────────────────┤
│ 【班次列表】                  [+ 新增班次]    │
│                                              │
│ ┌─────────────────────────────────────┐     │
│ │ 101班 - 週五 14:00-17:00            │     │
│ │ 資訊館 301                           │     │
│ │ 📊 28/30 人  📝 5 個作業            │     │
│ │ [管理學生] [編輯] [刪除]             │     │
│ └─────────────────────────────────────┘     │
│                                              │
│ ┌─────────────────────────────────────┐     │
│ │ 102班 - 週五 18:00-21:00            │     │
│ │ 資訊館 302                           │     │
│ │ 📊 35/35 人  📝 5 個作業            │     │
│ │ [管理學生] [編輯] [刪除]             │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### 學生 - 加入課程

```
┌─────────────────────────────────────────────┐
│ 加入課程：資料結構                            │
│                                              │
│ 請選擇班次：                                 │
│                                              │
│ ○ 101班 - 週五 14:00-17:00                  │
│   資訊館 301  (28/30 人)                     │
│                                              │
│ ○ 102班 - 週五 18:00-21:00                  │
│   資訊館 302  (35/35 人) ⚠️ 已滿             │
│                                              │
│           [取消]  [確認加入]                 │
└─────────────────────────────────────────────┘
```

## 🐛 常見問題

### Q1: 如果課程已經有學生，執行 migration 會怎樣？

**A**: 完全安全！資料遷移腳本會：
1. 為該課程創建「預設班次」
2. 將所有現有學生自動加入預設班次
3. 所有作業自動關聯到預設班次

### Q2: 可以刪除預設班次嗎？

**A**: 不行。系統會檢查是否為課程的最後一個班次，防止刪除。如果要刪除，必須先創建另一個班次。

### Q3: 學生可以同時加入同一課程的多個班次嗎？

**A**: 理論上可以，但通常不合理。建議在前端 UI 加入檢查：
```typescript
// 檢查學生是否已加入該課程的任何班次
const existingEnrollment = await db.enrollment.findFirst({
  where: {
    studentId,
    courseId
  }
});

if (existingEnrollment) {
  throw new Error('您已加入此課程的其他班次');
}
```

### Q4: 作業的 classId 是 null 代表什麼？

**A**: 代表這是「全課程作業」，所有班次的學生都要做。例如期中考、期末專案等。

### Q5: 如何回滾 migration？

**A**:
```bash
# 回滾 schema
npx prisma migrate resolve --rolled-back 20250930130640_add_class_system

# 手動刪除 classes 表（如果需要）
DROP TABLE IF EXISTS classes CASCADE;
```

**⚠️ 警告**：回滾會刪除所有班次資料！

## 📚 相關文檔

- [Prisma Schema](/prisma/schema.prisma)
- [Migration README](/prisma/migrations/20250930130640_add_class_system/README.md)
- [ARCHITECTURE.md](/docs/ARCHITECTURE.md)

## 🎯 下一步

1. **執行 Migration**（必須）
2. **實作前端 UI**（建議）
3. **更新 API Routes**（建議）
4. **撰寫測試**（推薦）

## ✨ 貢獻

如有問題或建議，請聯繫開發團隊。

---

**最後更新**: 2025-09-30
**版本**: 1.0.0
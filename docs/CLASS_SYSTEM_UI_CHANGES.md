# Class System - UI 修改清單

## 總覽

此文檔列出所有需要修改的 UI 組件和路由，以支援 Class/Section（班次/班級）系統。

---

## 🎯 核心變更原則

### **當前邏輯**：
```
Teacher creates Course → Student joins Course → Student sees all Assignments
```

### **新邏輯**：
```
Teacher creates Course
  → Teacher creates Classes (班次)
    → Student joins specific Class
      → Student sees only their Class's Assignments
```

---

## 📋 需要修改的 UI（按優先級）

### 🔴 **Phase 1: 核心功能（必須）**

#### 1. 老師端 - 課程詳情頁

**檔案**: `/app/routes/teacher/courses/$courseId.tsx`

**當前狀態**：
- 顯示課程基本資訊
- 顯示作業列表
- 顯示邀請碼（課程級別）

**需要修改**：
```tsx
// 新增：班次列表區塊
┌────────────────────────────────────────┐
│ 【班次管理】                [+ 新增班次] │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 101班 - 週五 14:00-17:00           │ │
│ │ 📊 28/30 人  📝 5 個作業           │ │
│ │ [查看學生] [編輯] [刪除]           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 102班 - 週五 18:00-21:00           │ │
│ │ 📊 35/35 人 (已滿) 📝 5 個作業     │ │
│ │ [查看學生] [編輯] [刪除]           │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**修改內容**：
1. Loader 需要載入課程的所有班次
2. 新增「班次列表」UI 區塊
3. 每個班次顯示：名稱、時間、人數、作業數
4. 邀請碼改為「班次級別」（可選擇為哪個班次生成）

**程式碼修改**：
```tsx
// Loader 修改
export async function loader({ request, params }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;

  const [course, classes] = await Promise.all([
    getCoursePageData(courseId, teacher.id),
    listClassesByCourse(courseId, teacher.id)  // 新增
  ]);

  return { teacher, course, classes };
}

// Component 修改
export default function CourseDetail() {
  const { teacher, course, classes } = useLoaderData<typeof loader>();

  return (
    <div>
      {/* 現有內容 */}

      {/* 新增：班次管理區塊 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>班次管理</CardTitle>
            <Button asChild>
              <Link to={`/teacher/courses/${course.id}/classes/new`}>
                <Plus /> 新增班次
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <EmptyState
              title="尚未建立班次"
              description="請先建立至少一個班次，學生才能加入課程"
            />
          ) : (
            <div className="space-y-4">
              {classes.map(cls => (
                <ClassCard key={cls.id} class={cls} courseId={course.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 新增：ClassCard 組件
function ClassCard({ class: cls, courseId }) {
  const capacityInfo = cls.capacity
    ? `${cls._count.enrollments}/${cls.capacity}`
    : cls._count.enrollments;

  const isFull = cls.capacity && cls._count.enrollments >= cls.capacity;

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{cls.name}</h3>
          {cls.schedule && (
            <p className="text-sm text-muted-foreground">
              {formatSchedule(cls.schedule)}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={isFull ? "destructive" : "secondary"}>
              <Users className="w-3 h-3 mr-1" />
              {capacityInfo} 人 {isFull && "(已滿)"}
            </Badge>
            <Badge variant="outline">
              <FileText className="w-3 h-3 mr-1" />
              {cls._count.assignmentAreas} 個作業
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/teacher/courses/${courseId}/classes/${cls.id}/students`}>
              查看學生
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/teacher/courses/${courseId}/classes/${cls.id}/edit`}>
              編輯
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

#### 2. 老師端 - 新增班次頁面

**新檔案**: `/app/routes/teacher/courses/$courseId/classes/new.tsx`

**UI 設計**：
```
┌────────────────────────────────────────┐
│ 新增班次                                │
├────────────────────────────────────────┤
│ 班次名稱 *                              │
│ [101班                              ]  │
│                                        │
│ 上課時間                                │
│ 星期: [週五 ▼]                         │
│ 開始: [14:00]  結束: [17:00]          │
│                                        │
│ 教室                                   │
│ [資訊館 301                         ]  │
│                                        │
│ 人數上限                                │
│ [30                                 ]  │
│                                        │
│ 助教（選填）                            │
│ [選擇助教 ▼                         ]  │
│                                        │
│      [取消]  [建立班次]                │
└────────────────────────────────────────┘
```

**程式碼**：
```tsx
import { createClass } from '@/services/class.server';

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;
  const formData = await request.formData();

  const classData = {
    courseId,
    name: formData.get('name') as string,
    schedule: {
      day: formData.get('day') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      room: formData.get('room') as string,
    },
    capacity: parseInt(formData.get('capacity') as string) || null,
    assistantId: formData.get('assistantId') as string || null,
  };

  await createClass(teacher.id, classData);
  return redirect(`/teacher/courses/${courseId}`);
}

export default function NewClass() {
  // 表單實作
}
```

---

#### 3. 學生端 - 加入課程頁面

**檔案**: `/app/routes/join.tsx`

**當前狀態**：
- 驗證邀請碼
- 直接加入課程

**需要修改**：
```tsx
// 當前 UI：
┌────────────────────────────────────────┐
│ 加入課程：資料結構                      │
│                                        │
│ 課程資訊顯示...                        │
│                                        │
│           [確認加入]                   │
└────────────────────────────────────────┘

// 修改後 UI：
┌────────────────────────────────────────┐
│ 加入課程：資料結構                      │
│                                        │
│ 請選擇班次：                            │
│                                        │
│ ○ 101班 - 週五 14:00-17:00            │
│   資訊館 301  (28/30 人)               │
│                                        │
│ ○ 102班 - 週五 18:00-21:00            │
│   資訊館 302  (35/35 人) ⚠️ 已滿       │
│                                        │
│           [確認加入]                   │
└────────────────────────────────────────┘
```

**程式碼修改**：
```tsx
// Loader 修改
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // 驗證邀請碼
  const validation = await validateInvitationCode(code, user.id);

  // 新增：如果邀請碼是「課程級別」，載入所有可用班次
  let availableClasses = [];
  if (validation.isValid && !validation.invitationCode.classId) {
    availableClasses = await listClassesByCourse(
      validation.course.id,
      validation.course.teacher.id
    );
  }

  return {
    user,
    validation,
    invitationCode: code,
    availableClasses  // 新增
  };
}

// Action 修改
export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request);
  const formData = await request.formData();
  const code = formData.get('code') as string;
  const classId = formData.get('classId') as string;  // 新增：選擇的班次

  if (!classId) {
    return { success: false, error: '請選擇班次' };
  }

  // 使用新的 enrollStudentInClass 函數
  await enrollStudentInClass(user.id, classId);

  return redirect('/student/dashboard');
}

// Component 修改
export default function JoinCourse() {
  const { user, validation, invitationCode, availableClasses } = useLoaderData<typeof loader>();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // 如果邀請碼指定了班次，直接使用
  const targetClassId = validation.invitationCode?.classId || selectedClassId;

  return (
    <div>
      {validation.isValid && (
        <Card>
          <CardHeader>
            <CardTitle>加入課程：{validation.course.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {availableClasses.length > 0 ? (
              <div className="space-y-4">
                <Label>請選擇班次：</Label>
                <RadioGroup value={selectedClassId} onValueChange={setSelectedClassId}>
                  {availableClasses.map(cls => (
                    <ClassOption
                      key={cls.id}
                      class={cls}
                      disabled={cls.capacity && cls._count.enrollments >= cls.capacity}
                    />
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <p>此邀請碼專屬於特定班次</p>
            )}

            <Form method="post" className="mt-6">
              <input type="hidden" name="code" value={invitationCode} />
              <input type="hidden" name="classId" value={targetClassId} />
              <Button
                type="submit"
                disabled={!targetClassId}
              >
                確認加入
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 新增：ClassOption 組件
function ClassOption({ class: cls, disabled }) {
  const isFull = cls.capacity && cls._count.enrollments >= cls.capacity;

  return (
    <div className={`flex items-center space-x-2 border rounded-lg p-4 ${disabled ? 'opacity-50' : ''}`}>
      <RadioGroupItem value={cls.id} id={cls.id} disabled={disabled} />
      <Label htmlFor={cls.id} className="flex-1 cursor-pointer">
        <div>
          <div className="font-semibold">{cls.name}</div>
          {cls.schedule && (
            <div className="text-sm text-muted-foreground">
              {formatSchedule(cls.schedule)}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1">
            {cls._count.enrollments}{cls.capacity ? `/${cls.capacity}` : ''} 人
            {isFull && <span className="text-destructive ml-2">⚠️ 已滿</span>}
          </div>
        </div>
      </Label>
    </div>
  );
}
```

---

#### 4. 老師端 - 創建作業頁面

**檔案**: `/app/routes/teacher/courses/$courseId/assignments/new.tsx`

**需要修改**：新增「目標班次」選項

```tsx
// 當前表單：
┌────────────────────────────────────────┐
│ 作業名稱 *                              │
│ [作業一：鏈結串列                    ]  │
│                                        │
│ 作業說明                                │
│ [請實作一個...                       ]  │
│                                        │
│ 評分標準 *                              │
│ [選擇 Rubric ▼                      ]  │
│                                        │
│ 截止時間                                │
│ [2025-10-10 23:59                   ]  │
│                                        │
│         [取消]  [建立作業]             │
└────────────────────────────────────────┘

// 修改後表單：
┌────────────────────────────────────────┐
│ 作業名稱 *                              │
│ [作業一：鏈結串列                    ]  │
│                                        │
│ 目標班次                                │  ← 新增
│ ○ 所有班次                             │
│ ○ 指定班次: [101班 ▼]                 │
│                                        │
│ 作業說明                                │
│ [請實作一個...                       ]  │
│                                        │
│ 評分標準 *                              │
│ [選擇 Rubric ▼                      ]  │
│                                        │
│ 截止時間                                │
│ [2025-10-10 23:59                   ]  │
│                                        │
│         [取消]  [建立作業]             │
└────────────────────────────────────────┘
```

**程式碼修改**：
```tsx
// Loader 修改
export async function loader({ request, params }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;

  const [course, rubrics, classes] = await Promise.all([
    getCourseById(courseId, teacher.id),
    listRubrics(teacher.id),
    listClassesByCourse(courseId, teacher.id)  // 新增
  ]);

  return { teacher, course, rubrics, classes };
}

// Action 修改
export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;
  const formData = await request.formData();

  const assignmentData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    rubricId: formData.get('rubricId') as string,
    dueDate: new Date(formData.get('dueDate') as string),
    classId: formData.get('classId') as string || null,  // 新增
  };

  await createAssignmentArea(teacher.id, courseId, assignmentData);
  return redirect(`/teacher/courses/${courseId}`);
}

// Component 修改
export default function NewAssignment() {
  const { course, rubrics, classes } = useLoaderData<typeof loader>();
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');

  return (
    <Form method="post">
      {/* 現有欄位 */}

      {/* 新增：目標班次選擇 */}
      <div className="space-y-2">
        <Label>目標班次</Label>
        <RadioGroup value={targetType} onValueChange={setTargetType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">所有班次</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="specific" />
            <Label htmlFor="specific">指定班次</Label>
          </div>
        </RadioGroup>

        {targetType === 'specific' && (
          <Select name="classId" required>
            <SelectTrigger>
              <SelectValue placeholder="選擇班次" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} ({cls._count.enrollments} 人)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 其他欄位 */}
      <Button type="submit">建立作業</Button>
    </Form>
  );
}
```

---

#### 5. 學生端 - 作業列表

**檔案**: `/app/components/student/AssignmentsContent.tsx`

**當前邏輯**：顯示所有課程的所有作業

**需要修改**：只顯示學生所屬班次的作業

**程式碼修改**：
```tsx
// Service 層修改 (app/services/submission.server.ts)
export async function getStudentAssignments(studentId: string) {
  // 獲取學生註冊的所有班次
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    select: { classId: true }
  });

  const classIds = enrollments.map(e => e.classId).filter(Boolean);

  // 查詢作業：班次專屬 + 全課程通用
  const assignments = await db.assignmentArea.findMany({
    where: {
      OR: [
        { classId: { in: classIds } },  // 學生班次的作業
        {
          classId: null,  // 全課程通用作業
          courseId: {
            in: enrollments.map(e => e.courseId)
          }
        }
      ]
    },
    include: {
      course: true,
      rubric: true,
      class: true,  // 新增：包含班次資訊
      submissions: {
        where: { studentId }
      }
    }
  });

  return assignments;
}
```

**Component 修改**：
```tsx
// AssignmentsContent.tsx
function AssignmentCard({ assignment }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{assignment.name}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{assignment.course.name}</span>
          {assignment.class && (
            <>
              <span>•</span>
              <Badge variant="secondary">{assignment.class.name}</Badge>
            </>
          )}
          {!assignment.class && (
            <>
              <span>•</span>
              <Badge variant="outline">全課程</Badge>
            </>
          )}
        </div>
      </CardHeader>
      {/* 其他內容 */}
    </Card>
  );
}
```

---

### 🟡 **Phase 2: 增強功能（建議）**

#### 6. 老師端 - 班次學生名單

**新檔案**: `/app/routes/teacher/courses/$courseId/classes/$classId/students.tsx`

#### 7. 老師端 - 編輯班次

**新檔案**: `/app/routes/teacher/courses/$courseId/classes/$classId/edit.tsx`

#### 8. 學生端 - 課程詳情顯示班次資訊

**檔案**: `/app/components/student/CoursesContent.tsx`

**修改**：顯示學生所屬的班次名稱和時間

---

### 🟢 **Phase 3: 進階功能（可選）**

#### 9. 老師端 - 班次統計頁面
#### 10. 老師端 - 班次比較分析
#### 11. 學生端 - 班次課表視圖

---

## 📊 修改優先級總結

| 優先級 | 功能 | 檔案 | 難度 | 影響範圍 |
|--------|------|------|------|---------|
| 🔴 P0 | 課程詳情 - 班次列表 | `teacher/courses/$courseId.tsx` | 中 | 高 |
| 🔴 P0 | 新增班次頁面 | `teacher/courses/$courseId/classes/new.tsx` | 低 | 中 |
| 🔴 P0 | 加入課程 - 選擇班次 | `join.tsx` | 中 | 高 |
| 🔴 P1 | 創建作業 - 選擇班次 | `teacher/courses/$courseId/assignments/new.tsx` | 低 | 高 |
| 🔴 P1 | 作業列表 - 班次過濾 | `student/AssignmentsContent.tsx` | 中 | 高 |
| 🟡 P2 | 班次學生名單 | 新檔案 | 低 | 中 |
| 🟡 P2 | 編輯班次 | 新檔案 | 低 | 低 |
| 🟢 P3 | 統計與分析 | 新檔案 | 高 | 低 |

---

## 🛠️ 通用 Helper 函數

建議建立以下 helper 函數：

```typescript
// app/utils/class-helpers.ts

/**
 * 格式化班次時間表
 */
export function formatSchedule(schedule: any): string {
  if (!schedule) return '';

  const { day, startTime, endTime, room } = schedule;
  return `${day} ${startTime}-${endTime}${room ? ` @ ${room}` : ''}`;
}

/**
 * 檢查班次是否已滿
 */
export function isClassFull(classInfo: any): boolean {
  if (!classInfo.capacity) return false;
  return classInfo._count.enrollments >= classInfo.capacity;
}

/**
 * 獲取班次容量顯示字串
 */
export function getClassCapacityDisplay(classInfo: any): string {
  const current = classInfo._count.enrollments;
  const max = classInfo.capacity;

  if (!max) return `${current} 人`;
  return `${current}/${max} 人`;
}
```

---

## ✅ 測試檢查清單

完成修改後，請測試以下場景：

### 老師端
- [ ] 可以為課程創建多個班次
- [ ] 可以編輯班次資訊
- [ ] 可以刪除班次（但不能刪除最後一個）
- [ ] 可以為特定班次創建作業
- [ ] 可以創建全課程通用作業
- [ ] 可以查看班次學生名單
- [ ] 可以生成班次專屬邀請碼

### 學生端
- [ ] 使用課程級邀請碼時，可以選擇班次
- [ ] 使用班次級邀請碼時，自動加入該班次
- [ ] 已滿的班次無法加入
- [ ] 只能看到自己班次的作業
- [ ] 可以看到全課程通用作業
- [ ] 課程列表顯示班次資訊

---

## 📚 相關文檔

- [Class System Implementation Guide](./CLASS_SYSTEM_IMPLEMENTATION_GUIDE.md)
- [Prisma Schema](../prisma/schema.prisma)
- [Class Service API](../app/services/class.server.ts)

---

**最後更新**: 2025-09-30
**版本**: 1.0.0
# 課程社群功能 - 完整更新清單

## 📋 所有新增/修改的檔案

### 資料庫層
- ✅ `prisma/schema.prisma` - 新增 4 個模型（CoursePost, CoursePostComment, CoursePostLike, CoursePostCommentLike）
- ✅ `prisma/migrations/20260114120311_add_course_community/` - 資料庫遷移檔案

### 服務層（Backend Services）
- ✅ `app/services/coursePost.server.ts` - 貼文與留言的業務邏輯

### API 路由
- ✅ `app/routes/api.courses.$courseId.posts.ts` - 課程貼文列表與創建
- ✅ `app/routes/api.posts.$postId.ts` - 單一貼文的 CRUD
- ✅ `app/routes/api.posts.$postId.comments.ts` - 貼文留言
- ✅ `app/routes/api.posts.$postId.like.ts` - 按讚功能

### UI 組件
- ✅ `app/components/course-community/CoursePostCard.tsx` - 貼文卡片
- ✅ `app/components/course-community/CourseCommunityFeed.tsx` - 社群動態流
- ✅ `app/components/course-community/CreatePostDialog.tsx` - 發布貼文對話框
- ✅ `app/components/course-community/CommentSection.tsx` - 留言區組件

### 頁面路由
- ✅ `app/routes/student/courses/$courseId.tsx` - 學生課程社群頁（修改）
- ✅ `app/routes/student/courses/$courseId.posts.$postId.tsx` - 學生貼文詳情頁（新增）
- ✅ `app/routes/teacher/courses/$courseId.community.tsx` - 教師課程社群頁（新增）
- ✅ `app/routes/teacher/courses/$courseId.posts.$postId.tsx` - 教師貼文詳情頁（新增）
- ✅ `app/routes.ts` - 路由配置（更新）

---

## 🎯 功能完整度檢查

### Phase 1: MVP 核心功能 ✅
- [x] 資料庫 Schema 設計
- [x] 後端服務層實作
- [x] API 路由完整
- [x] 學生課程社群頁面
- [x] 教師課程社群頁面
- [x] 發布貼文功能（4 種類型）
- [x] 按讚功能
- [x] 留言功能
- [x] 貼文篩選功能
- [x] 貼文詳情與留言區
- [x] 路由配置更新

### Phase 2: 進階功能（待實作）
- [ ] 作業提交整合（透過留言提交作業）
- [ ] WebSocket 實時通知
- [ ] 檔案附件上傳
- [ ] 貼文編輯與刪除 UI
- [ ] 留言回覆功能 UI
- [ ] 留言按讚功能

### Phase 3: 增強功能（待規劃）
- [ ] 貼文搜尋
- [ ] 提及用戶 (@mention)
- [ ] 貼文草稿保存
- [ ] 圖片預覽
- [ ] Markdown 支援

---

## 🔧 需要的額外設定

### 1. 路由導航整合
建議在教師課程詳情頁添加「社群」分頁：

```typescript
// app/routes/teacher/courses/$courseId.tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="overview">概覽</TabsTrigger>
    <TabsTrigger value="community">社群</TabsTrigger> {/* 新增 */}
    <TabsTrigger value="assignments">作業</TabsTrigger>
    <TabsTrigger value="students">學生</TabsTrigger>
  </TabsList>
</Tabs>
```

### 2. 學生課程列表頁
在 `app/components/student/CoursesContent.tsx` 中，點擊課程卡片應該跳轉到 `/student/courses/{courseId}` 而非其他頁面。

### 3. 通知整合（可選）
當有新貼文時，可以創建通知：

```typescript
// In coursePost.server.ts createPost function
await db.notification.create({
  data: {
    type: 'COURSE_ANNOUNCEMENT',
    userId: enrolledStudent.id,
    courseId: post.courseId,
    title: '新貼文',
    message: `${author.name} 發布了新貼文：${post.title}`,
  },
});
```

---

## 🚀 啟動與測試

### 1. 確保資料庫已遷移
```bash
# 資料庫應該已經有新的資料表
npx prisma studio  # 檢查是否有 course_posts 等表
```

### 2. 啟動開發服務器
```bash
docker compose -f docker-compose.dev.yaml up -d
npm run dev
```

### 3. 測試流程

#### 教師端測試
1. 登入教師帳號
2. 進入任一課程頁面
3. 訪問 `/teacher/courses/{courseId}/community`
4. 點擊「發布貼文」
5. 選擇不同類型（公告/作業/討論/資料）
6. 發布後查看貼文列表
7. 點擊貼文進入詳情頁
8. 在詳情頁留言

#### 學生端測試
1. 登入學生帳號
2. 進入已加入的課程
3. 訪問 `/student/courses/{courseId}`（應顯示課程社群）
4. 瀏覽教師發布的貼文
5. 測試按讚功能
6. 測試篩選功能（切換不同類型）
7. 點擊留言數進入詳情頁
8. 在詳情頁發表留言

---

## 📊 資料庫結構

### CoursePost
- 支援 4 種類型：ANNOUNCEMENT, ASSIGNMENT, DISCUSSION, MATERIAL
- 可關聯到 AssignmentArea（作業貼文）
- 可關聯到 Class（班級特定貼文）或 null（全課程貼文）
- 支援置頂（isPinned）和封存（isArchived）

### CoursePostComment
- 支援巢狀回覆（parentCommentId）
- 可關聯到 Submission（作業提交留言）
- 支援軟刪除和編輯追蹤

### 互動功能
- CoursePostLike: 貼文按讚（每人每貼文一次）
- CoursePostCommentLike: 留言按讚（預留）

---

## 🎨 UI/UX 特色

### 設計一致性
- 沿用 Brutalist 設計風格
- 黑色邊框 (`border-[#2B2B2B]`)
- 橘色強調色 (`bg-[#E07A5F]`)
- 完整的深色模式支援

### 貼文類型視覺區分
- 📢 公告：橘色標籤
- 📝 作業：藍色標籤，顯示截止日期
- 💬 討論：綠色標籤
- 📚 資料：紫色標籤

### 互動反饋
- 按讚動畫（心形填充）
- 載入狀態提示
- 錯誤訊息顯示
- 時間戳（相對時間顯示）

---

## ⚠️ 已知限制

1. **檔案附件**：Schema 已預留欄位，但前端尚未實作上傳功能
2. **WebSocket**：目前沒有實時更新，需手動重新整理
3. **作業提交整合**：尚未實作透過留言提交作業的完整流程
4. **留言回覆 UI**：後端支援巢狀回覆，但前端尚未實作回覆按鈕
5. **編輯/刪除**：CoursePostCard 有編輯/刪除按鈕，但尚未連接實際功能

---

## 🔄 下一步建議

### 立即可做
1. 在教師課程頁面加入「社群」導航連結
2. 測試完整的發布-瀏覽-留言流程
3. 調整 UI 樣式以符合專案風格

### 短期規劃（1-2 週）
1. 實作貼文編輯與刪除功能
2. 實作留言回覆按鈕與 UI
3. 整合作業提交功能（Phase 2）

### 中期規劃（1 個月）
1. WebSocket 實時通知
2. 檔案附件上傳
3. 通知系統整合

---

## 📞 技術支援

如有問題或需要進一步開發，請確認：
1. 資料庫遷移是否成功執行
2. 所有新檔案是否已正確創建
3. routes.ts 是否已更新
4. Docker 容器是否正常運行

完成！🎉

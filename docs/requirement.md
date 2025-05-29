補充使用者對評分標準的管理功能，並整合至完整需求中如下：

---

# 專案需求說明

## 使用者流程

1. **Google 登入**

   * 使用者需先透過 Google 帳戶登入系統。

2. **上傳檔案**

   * 使用者可上傳一或多個檔案。
   * 上傳過程中需即時顯示進度條。

     * 採用 **Server-Sent Events (SSE)** 讓伺服器與前端同步上傳進度。

3. **選擇評分標準**

   * 每個上傳的檔案需搭配一個選擇的評分標準（例如從下拉選單選取）。

4. **管理評分標準**

   * 使用者可以新增、修改、刪除評分標準。

     * **新增**：自定義標準名稱與描述。
     * **修改**：更新既有標準的名稱與內容。
     * **刪除**：移除不需要的標準。
   * 所有變更應立即反映到前端選擇列表中。

5. **送出評分請求**

   * 檔案與其對應的評分標準會一起送交至 **大型語言模型** 進行分析與評分。

6. **結果顯示**

   * 每個檔案對應一個評分結果。
   * 若使用者上傳兩個檔案，就會看到兩個評分結果。

## 前端顯示（使用 shadcn UI）

* 評分結果以 Carousel 元件方式顯示。

```tsx
import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export function ResultCarousel({ results }: { results: { title: string; score: string }[] }) {
  return (
    <Carousel className="w-full max-w-xl">
      <CarouselContent>
        {results.map((result, index) => (
          <CarouselItem key={index}>
            <div className="p-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">{result.title}</h2>
                  <p className="text-lg">{result.score}</p>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}
```

## 備註

* 評分標準 CRUD 功能建議用 Modal 或頁面區塊管理。
* 上傳進度以 SSE 傳送，
* 使用者送出前需完成檔案與標準的配對。

---

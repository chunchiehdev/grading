// app/utils/validation.ts

// 添加回傳型別定義
interface ValidationResult {
  isValid: boolean;
  missingParts: string[];
}

export function validateAssignment(content: string): ValidationResult {
  // 確保 content 是字串
  const trimmedContent = String(content || "").trim();

  // 檢查基本條件
  if (!trimmedContent || trimmedContent.length < 50) {
    return {
      isValid: false,
      missingParts: ["內容長度不足（至少需要50字）"],
    };
  }

  // 檢查必要的部分
  const requiredParts = {
    摘要: content.includes("摘要"),
    反思: content.includes("反思"),
    問題: content.includes("問題"),
  } as const;

  // 收集缺少的部分
  const missingParts = Object.entries(requiredParts)
    .filter(([_, exists]) => !exists)
    .map(([part]) => part);

  return {
    isValid: missingParts.length === 0,
    missingParts,
  };
}

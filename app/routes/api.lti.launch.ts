import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { validateLtiRequest } from "@/services/api.server";

/**
 * LTI 啟動端點
 * 
 * POST /api/lti/launch
 * - 支援 LTI 1.1 和 1.3 標準
 * - 處理來自 LMS (如 Moodle, Canvas 等) 的 LTI 請求
 * - 驗證請求後轉至適當的頁面
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // 只接受 POST 請求
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    // 獲取 LTI 參數
    const formData = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    // 獲取 LTI 消費者密鑰 (從環境變數或配置文件)
    const consumerKey = params.oauth_consumer_key;
    if (!consumerKey) {
      return json({ error: "Missing oauth_consumer_key" }, { status: 400 });
    }

    // 獲取對應的消費者密鑰 (實際項目中應該從資料庫獲取)
    // 為簡化示例，這裡從環境變數獲取
    const consumerSecrets = JSON.parse(process.env.LTI_CONSUMER_SECRETS || "{}");
    const consumerSecret = consumerSecrets[consumerKey] || process.env.DEFAULT_LTI_SECRET;

    if (!consumerSecret) {
      return json({ error: "Invalid consumer key" }, { status: 401 });
    }

    // 驗證 LTI 請求
    const { isValid, context } = validateLtiRequest(params, consumerSecret);

    if (!isValid || !context) {
      return json({ error: "LTI validation failed" }, { status: 401 });
    }

    // 獲取必要的 LTI 參數
    const resourceLinkId = params.resource_link_id;
    const contextId = context.context_id;
    const userId = context.user_id;
    const roles = context.roles;

    // 檢查角色權限
    const isInstructor = roles.some(role => 
      role.toLowerCase().includes("instructor") || 
      role.toLowerCase().includes("teacher") || 
      role.toLowerCase().includes("admin")
    );

    // 將 LTI 參數存儲在會話中 (Remix 可以通過 session cookie 實現)
    // 創建一個臨時的 LTI 會話令牌
    const ltiSessionToken = generateLtiSessionToken();
    
    // 存儲 LTI 上下文信息 (應該存儲在 Redis 或其他會話存儲中)
    await storeLtiContext(ltiSessionToken, {
      consumer_key: context.consumer_key,
      context_id: contextId,
      user_id: userId,
      roles: context.roles,
      resource_link_id: resourceLinkId,
      custom_params: context.custom_params,
    });

    // 根據角色和自定義參數確定重定向目標
    let redirectUrl = "/assignments/lti-grading";
    
    // 添加查詢參數
    const urlParams = new URLSearchParams();
    urlParams.set("token", ltiSessionToken);
    
    // 如果有作業ID，添加到查詢參數
    if (context.custom_params.assignment_id) {
      urlParams.set("assignment_id", context.custom_params.assignment_id);
    }

    // 重定向到適當的頁面
    return redirect(`${redirectUrl}?${urlParams.toString()}`);
  } catch (error) {
    console.error("LTI launch error:", error);
    return json({ 
      error: error instanceof Error ? error.message : "LTI launch failed"
    }, { status: 500 });
  }
}

/**
 * 生成 LTI 會話令牌
 */
function generateLtiSessionToken(): string {
  return `lti_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 存儲 LTI 上下文信息
 */
async function storeLtiContext(token: string, context: any): Promise<void> {
  // TODO: 實際項目中應該存儲在 Redis 或其他會話存儲中
  // 例如:
  // await redis.set(`lti:${token}`, JSON.stringify(context), "EX", 3600); // 過期時間 1 小時
  
  // 這裡為簡化示例，使用內存存儲
  LTI_CONTEXT_CACHE.set(token, {
    context,
    createdAt: Date.now()
  });
}

// 臨時的 LTI 上下文緩存 (實際項目中應該使用 Redis)
const LTI_CONTEXT_CACHE = new Map<string, { context: any, createdAt: number }>();

// 每小時清理過期的 LTI 上下文
setInterval(() => {
  const now = Date.now();
  for (const [token, { createdAt }] of LTI_CONTEXT_CACHE.entries()) {
    // 1 小時過期
    if (now - createdAt > 3600 * 1000) {
      LTI_CONTEXT_CACHE.delete(token);
    }
  }
}, 15 * 60 * 1000); // 15 分鐘檢查一次

/**
 * GET 請求僅用於測試
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // 在生產環境中應該禁用
  if (process.env.NODE_ENV === "production") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  
  return json({ 
    message: "LTI launch endpoint is working. Please use POST method for LTI launch requests." 
  });
} 
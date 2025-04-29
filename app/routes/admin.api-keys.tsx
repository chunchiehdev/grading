import { useLoaderData, Form, useActionData } from "react-router";
import { requireUserId } from "@/services/auth.server";
import { useState } from "react";
import crypto from "crypto";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  created_at: string;
  last_used?: string;
  revoked: boolean;
}

interface Scope {
  id: string;
  label: string;
}

const AVAILABLE_SCOPES: Scope[] = [
  { id: "grading:read", label: "讀取評分數據" },
  { id: "grading:write", label: "提交評分請求" },
  { id: "batch:read", label: "讀取批量評分數據" },
  { id: "batch:write", label: "提交批量評分請求" },
  { id: "lti:launch", label: "LTI 整合" },
];

const API_KEYS: ApiKey[] = [
  {
    id: "1",
    name: "測試應用",
    key: "test_api_key_1",
    scopes: ["grading:read", "grading:write"],
    created_at: new Date().toISOString(),
    revoked: false,
  },
];

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);

  const apiKeys = API_KEYS.filter((key) => !key.revoked);

  return Response.json({ apiKeys, availableScopes: AVAILABLE_SCOPES });
}

interface ApiKeySuccessResponse {
  success: true;
  apiKey: ApiKey;
}

interface ApiKeyErrorResponse {
  error: string;
}

type ActionResponse =
  | ApiKeySuccessResponse
  | ApiKeyErrorResponse
  | { success: true };

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "create") {
    const name = formData.get("name") as string;
    const scopesArray = formData.getAll("scopes") as string[];

    if (!name || name.trim() === "") {
      return Response.json(
        { error: "API 金鑰名稱不能為空" },
        { status: 400 }
      );
    }

    if (scopesArray.length === 0) {
      return Response.json(
        { error: "至少需要選擇一個權限範圍" },
        { status: 400 }
      );
    }

    const newKey = generateApiKey();

    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      name: name.trim(),
      key: newKey,
      scopes: scopesArray,
      created_at: new Date().toISOString(),
      revoked: false,
    };

    API_KEYS.push(apiKey);

    return Response.json({ success: true, apiKey });
  }

  if (action === "revoke") {
    const id = formData.get("id") as string;

    if (!id) {
      return Response.json(
        { error: "需要提供 API 金鑰 ID" },
        { status: 400 }
      );
    }

    const keyIndex = API_KEYS.findIndex((key) => key.id === id);
    if (keyIndex !== -1) {
      API_KEYS[keyIndex].revoked = true;
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: "不支持的操作" }, { status: 400 });
}

function generateApiKey(): string {
  return `sk_${crypto.randomBytes(24).toString("hex")}`;
}

export default function ApiKeysPage() {
  const data = useLoaderData() as { apiKeys: ApiKey[]; availableScopes: Scope[] };
  const { apiKeys, availableScopes } = data;
  const actionData = useActionData() as ActionResponse;
  const [showNewKey, setShowNewKey] = useState(false);

  const hasSuccessWithApiKey =
    actionData && "success" in actionData && "apiKey" in actionData;
  const hasError = actionData && "error" in actionData;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">API 金鑰管理</h1>

      {hasSuccessWithApiKey && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p className="font-bold">API 金鑰創建成功</p>
          <p className="mt-2">
            請複製並安全存儲您的 API 金鑰，這是唯一一次能夠看到它：
          </p>
          <div className="mt-2 p-3 bg-gray-100 font-mono break-all">
            {(actionData as ApiKeySuccessResponse).apiKey.key}
          </div>
        </div>
      )}

      {hasError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{(actionData as ApiKeyErrorResponse).error}</p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">創建新 API 金鑰</h2>
        <Form method="post">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                API 金鑰名稱
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="例如：Moodle 整合"
                required
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                權限範圍
              </span>
              <div className="space-y-2">
                {availableScopes.map((scope) => (
                  <div key={scope.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`scope-${scope.id}`}
                      name="scopes"
                      value={scope.id}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`scope-${scope.id}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {scope.label} ({scope.id})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                name="_action"
                value="create"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                創建 API 金鑰
              </button>
            </div>
          </div>
        </Form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">API 金鑰列表</h2>
        {apiKeys.length === 0 ? (
          <div className="text-gray-500 italic">尚未創建 API 金鑰</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    權限範圍
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    創建時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {apiKey.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {apiKey.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {apiKey.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(apiKey.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Form method="post" className="inline-block">
                        <input type="hidden" name="id" value={apiKey.id} />
                        <button
                          type="submit"
                          name="_action"
                          value="revoke"
                          className="text-red-600 hover:text-red-900"
                          onClick={(e) => {
                            if (
                              !confirm(
                                "確定要撤銷此 API 金鑰嗎？撤銷後將無法恢復。"
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          撤銷
                        </button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">API 整合說明</h2>
        <div className="prose max-w-none">
          <h3>RESTful API 端點</h3>
          <ul>
            <li>
              <strong>單一評分請求:</strong> POST /api/grading
            </li>
            <li>
              <strong>批量評分請求:</strong> POST /api/batch-grading
            </li>
            <li>
              <strong>批量評分狀態查詢:</strong> GET
              /api/batch-grading?batch_id=xxx
            </li>
            <li>
              <strong>LTI 啟動端點:</strong> POST /api/lti/launch
            </li>
          </ul>

          <h3>身份驗證</h3>
          <p>所有 API 請求需要在 HTTP 標頭中包含 API 金鑰:</p>
          <pre>
            <code>Authorization: Bearer YOUR_API_KEY</code>
          </pre>

          <h3>範例請求</h3>
          <p>單一評分請求:</p>
          <pre>
            <code>{`
POST /api/grading
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "sections": [
    {
      "id": "summary",
      "title": "摘要",
      "content": "這是一個測試摘要內容...",
      "order": 1,
      "required": true
    },
    {
      "id": "reflection",
      "title": "反思",
      "content": "這是一個測試反思內容...",
      "order": 2,
      "required": true
    }
  ],
  "metadata": {
    "authorId": "student123",
    "submittedAt": "2023-06-01T10:30:00Z"
  }
}
          `}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

import axios from "axios";
import type { Rubric, RubricCriteria } from "@/types/grading";
import FormData from "form-data";

const API_URL = process.env.API_URL || "http://localhost:8000";
const AUTH_KEY = process.env.AUTH_KEY || "";

export async function createRubric(rubric: Omit<Rubric, "createdAt" | "updatedAt">): Promise<{ success: boolean; rubricId?: string; error?: string }> {
  try {
    console.log("Sending rubric to API:", JSON.stringify(rubric, null, 2));
    
    const response = await axios.post(
      `${API_URL}/rubrics/`,
      rubric,
      {
        headers: {
          "Content-Type": "application/json",
          "auth-key": AUTH_KEY,
        },
      }
    );

    console.log("API response:", response.data);
    
    return {
      success: true,
      rubricId: response.data.rubric_id,
    };
  } catch (error: any) {
    console.error("Error creating rubric:", error);
    // 獲取更詳細的錯誤信息
    const errorMessage = error.response?.data?.detail || error.message || "無法創建評分標準";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function listRubrics(): Promise<{ rubrics: Rubric[]; error?: string }> {
  try {
    const response = await axios.get(`${API_URL}/rubrics/`, {
      headers: {
        "auth-key": AUTH_KEY,
      },
    });

    return {
      rubrics: response.data.rubrics || [],
    };
  } catch (error) {
    console.error("Error listing rubrics:", error);
    return {
      rubrics: [],
      error: "無法獲取評分標準列表",
    };
  }
}

export async function getRubric(id: string): Promise<{ rubric?: Rubric; error?: string }> {
  try {
    const response = await axios.get(`${API_URL}/rubrics/${id}`, {
      headers: {
        "auth-key": AUTH_KEY,
      },
    });

    return {
      rubric: response.data,
    };
  } catch (error) {
    console.error(`Error getting rubric ${id}:`, error);
    return {
      error: "無法獲取評分標準詳情",
    };
  }
}

export async function deleteRubric(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await axios.delete(`${API_URL}/rubrics/${id}`, {
      headers: {
        "auth-key": AUTH_KEY,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error deleting rubric ${id}:`, error);
    return {
      success: false,
      error: "無法刪除評分標準",
    };
  }
}

export async function gradeDocument(fileKey: string, rubricId: string): Promise<{ 
  success: boolean; 
  gradingResult?: any; 
  error?: string 
}> {
  try {
    console.log(`開始評分文件: fileKey=${fileKey}, rubricId=${rubricId}`);
    
    // 生成唯一評分ID，方便跟踪每個評分請求
    const gradingId = `grade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`評分ID: ${gradingId} - 開始處理評分請求`);
    
    // 先從存儲中獲取文件
    console.log(`評分ID: ${gradingId} - 從存儲中獲取文件`);
    const { fetchFileFromStorage } = await import("@/services/document-processor.server");
    const fileResult = await fetchFileFromStorage(fileKey);
    
    if (fileResult.error) {
      console.error(`評分ID: ${gradingId} - 無法獲取文件:`, fileResult.error);
      return {
        success: false,
        error: `無法獲取文件: ${fileResult.error}`
      };
    }
    
    const buffer = fileResult.buffer;
    console.log(`評分ID: ${gradingId} - 已獲取文件，大小: ${buffer.length} 字節`);
    
    const originalFilename = fileKey.split('/').pop() || "document.pdf";
    console.log(`評分ID: ${gradingId} - 原始檔案名稱: ${originalFilename}`);
    
    // 創建FormData並添加文件和rubricId
    const formData = new FormData();
    
    // 正確處理 Node.js 環境中的文件添加，使用原始檔案名稱
    formData.append("file", Buffer.from(buffer), {
      filename: originalFilename,
      contentType: fileResult.contentType || "application/pdf"
    });
    
    formData.append("rubric_id", rubricId);
    
    console.log(`評分ID: ${gradingId} - 已準備FormData，將發送請求到API`);
    
    // 發送到API進行評分
    console.log(`評分ID: ${gradingId} - 發送請求到 ${API_URL}/grade-document/`);
    const startTime = Date.now();
    
    const response = await axios.post(
      `${API_URL}/grade-document/`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "auth-key": AUTH_KEY,
        },
        // 增加超時時間，因為評分可能需要較長時間
        timeout: 180000, // 3分鐘
      }
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`評分ID: ${gradingId} - 收到API響應，耗時: ${duration.toFixed(2)} 秒`);
    console.log(`評分ID: ${gradingId} - 評分分數: ${response.data.score || '未知'}`);

    return {
      success: true,
      gradingResult: response.data,
    };
  } catch (error: any) {
    console.error("評分文件時出錯:", error);
    const errorMessage = error.response?.data?.detail || error.message || "評分過程中發生錯誤";
    console.error("詳細錯誤信息:", errorMessage);
    
    if (error.response) {
      console.error("API 響應狀態:", error.response.status);
      console.error("API 響應數據:", error.response.data);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateRubric(id: string, rubric: Omit<Rubric, "createdAt" | "updatedAt">): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Updating rubric:", JSON.stringify(rubric, null, 2));
    
    const response = await axios.put(
      `${API_URL}/rubrics/${id}`,
      rubric,
      {
        headers: {
          "Content-Type": "application/json",
          "auth-key": AUTH_KEY,
        },
      }
    );

    console.log("API response:", response.data);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error(`Error updating rubric ${id}:`, error);
    const errorMessage = error.response?.data?.detail || error.message || "無法更新評分標準";
    return {
      success: false,
      error: errorMessage
    };
  }
}
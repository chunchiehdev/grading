import axios from 'axios';
import type { Rubric } from '@/types/grading';
import FormData from 'form-data';
import { fetchFileFromStorage } from '@/services/document-processor.server';
import logger from '@/utils/logger';
import { GradingProgressService } from './grading-progress.server';

const API_URL = process.env.API_URL || 'http://localhost:8001';
const AUTH_KEY = process.env.AUTH_KEY || '';

export async function createRubric(
  rubric: Omit<Rubric, 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; rubricId?: string; error?: string }> {
  try {
    logger.info({ rubric }, 'Sending rubric to API');

    const response = await axios.post(`${API_URL}/rubrics/`, rubric, {
      headers: {
        'Content-Type': 'application/json',
        'auth-key': AUTH_KEY,
      },
    });

    logger.info({ response: response.data }, 'API response received');

    return {
      success: true,
      rubricId: response.data.rubric_id,
    };

  } catch (error: any) {
    logger.error({ error }, 'Error creating rubric');
    const errorMessage = error.response?.data?.detail || error.message || '無法創建評分標準';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function listRubrics(): Promise<{ rubrics: Rubric[]; error?: string }> {
  try {
    logger.info('Starting listRubrics');
    logger.debug({ API_URL, hasAuthKey: !!AUTH_KEY }, 'API configuration');

    const response = await axios.get(`${API_URL}/rubrics/`, {
      headers: {
        'auth-key': AUTH_KEY,
      },
    });

    if (!response.data) {
      logger.error('API returned no data');
      return {
        rubrics: [],
        error: 'API returned no data',
      };
    }

    if (!response.data.rubrics) {
      logger.error({ dataKeys: Object.keys(response.data) }, 'API response missing rubrics field');
      return {
        rubrics: [],
        error: 'API response format is incorrect',
      };
    }

    return {
      rubrics: response.data.rubrics || [],
    };
  } catch (error: any) {
    logger.error({ 
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers 
    }, 'Error listing rubrics');
    
    return {
      rubrics: [],
      error: error.response?.data?.message || error.message || '無法獲取評分標準列表',
    };
  }
}

export async function getRubric(id: string): Promise<{ rubric?: Rubric; error?: string }> {
  try {
    const response = await axios.get(`${API_URL}/rubrics/${id}`, {
      headers: {
        'auth-key': AUTH_KEY,
      },
    });

    return {
      rubric: response.data,
    };
  } catch (error) {
    console.error(`Error getting rubric ${id}:`, error);
    return {
      error: '無法獲取評分標準詳情',
    };
  }
}

export async function deleteRubric(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await axios.delete(`${API_URL}/rubrics/${id}`, {
      headers: {
        'auth-key': AUTH_KEY,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error deleting rubric ${id}:`, error);
    return {
      success: false,
      error: '無法刪除評分標準',
    };
  }
}

export async function gradeDocument(
  fileKey: string,
  rubricId: string,
  gradingId?: string,
): Promise<{
  success: boolean;
  gradingResult?: any;
  error?: string;
}> {
  
  try {
    
    if (gradingId) {
      console.log('updateProgress', gradingId, new Date().toISOString());
      await GradingProgressService.updateProgress(gradingId, { phase: 'check', progress: 10, message: '檢查檔案...' });
    }
    await new Promise(r => setTimeout(r, 5000));

    logger.info({ fileKey, rubricId, gradingId }, 'Starting document grading');
    logger.debug({ gradingId }, 'Fetching file from storage');
    const fileResult = await fetchFileFromStorage(fileKey);

    if (fileResult.error) {
      logger.error({ gradingId, error: fileResult.error }, 'Failed to fetch file');
      return {
        success: false,
        error: `無法獲取文件: ${fileResult.error}`,
      };
    }

    if (gradingId) {
      console.log('updateProgress: grade');
      await GradingProgressService.updateProgress(gradingId, { phase: 'grade', progress: 40, message: 'AI 分析中...' });
    }
    await new Promise(r => setTimeout(r, 5000));


    const buffer = fileResult.buffer;
    logger.debug({ gradingId, fileSize: buffer.length }, 'File fetched successfully');

    const originalFilename = fileKey.split('/').pop() || 'document.pdf';
    logger.debug({ gradingId, originalFilename }, 'Processing file');

    const formData = new FormData();
    formData.append('file', Buffer.from(buffer), {
      filename: originalFilename,
      contentType: fileResult.contentType || 'application/pdf',
    });
    formData.append('rubric_id', rubricId);
    
    // Add grading instruction to handle L1-L4 levels
    formData.append('grading_format', 'level_based');
    formData.append('grading_instructions', `
      請注意評分標準使用了L1到L4的分級系統：
      - L4（最高級）：表示優秀的表現，應獲得該標準的最高分數（90-100%）
      - L3：表示良好的表現，應獲得該標準的較高分數（75-89%）
      - L2：表示基本達標的表現，應獲得該標準的中等分數（60-74%）
      - L1（最低級）：表示不足的表現，應獲得該標準的較低分數（0-59%）
      
      請為每個評分標準明確指出學生表現對應的級別（L1、L2、L3或L4），並根據該級別的描述給予百分比分數。
      在評語中，清楚說明為什麼學生達到了特定級別，並引用學生作品中的具體例子來支持您的評分。
      建議應該具體指出如何從目前的級別提升到更高級別。
    `);

    logger.info({ gradingId }, 'Sending request to API');
    const startTime = Date.now();

    const response = await axios.post(`${API_URL}/grade-document/`, formData, {
      headers: {
        ...formData.getHeaders(),
        'auth-key': AUTH_KEY,
      },
      timeout: 180000,
    });

    if (gradingId) {
      console.log('updateProgress: verify');
      await GradingProgressService.updateProgress(gradingId, { phase: 'verify', progress: 80, message: '驗證中...' });
    }
    await new Promise(r => setTimeout(r, 5000));
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    logger.info({ gradingId, duration }, 'Grading completed');

    let gradingResult = response.data;
    try {
      if (typeof response.data === 'string') {
        gradingResult = JSON.parse(response.data);
      }
    } catch (parseError) {
      logger.error({ gradingId, parseError }, 'Error parsing response data');
      gradingResult = response.data;
    }

    logger.debug({ gradingId, gradingResult }, 'Successfully processed grading result');

    return {
      success: true,
      gradingResult,
    };
  } catch (error: any) {
    logger.error({ 
      gradingId,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status 
    }, 'Error during grading');

    return {
      success: false,
      error: error.response?.data?.detail || error.message || '評分過程中發生錯誤',
    };
  }
}

export async function updateRubric(
  id: string,
  rubric: Omit<Rubric, 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Updating rubric:', JSON.stringify(rubric, null, 2));

    const response = await axios.put(`${API_URL}/rubrics/${id}`, rubric, {
      headers: {
        'Content-Type': 'application/json',
        'auth-key': AUTH_KEY,
      },
    });

    console.log('API response:', response.data);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(`Error updating rubric ${id}:`, error);
    const errorMessage = error.response?.data?.detail || error.message || '無法更新評分標準';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

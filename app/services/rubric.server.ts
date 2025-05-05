import axios from 'axios';
import type { Rubric } from '@/types/grading';
import FormData from 'form-data';
import { fetchFileFromStorage } from '@/services/document-processor.server';
import logger from '@/utils/logger';

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
  rubricId: string
): Promise<{
  success: boolean;
  gradingResult?: any;
  error?: string;
}> {
  const gradingId = `grade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  try {
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

    logger.info({ gradingId }, 'Sending request to API');
    const startTime = Date.now();

    // const response = await axios.post(`${API_URL}/grade-document/`, formData, {
    //   headers: {
    //     ...formData.getHeaders(),
    //     'auth-key': AUTH_KEY,
    //   },
    //   timeout: 180000,
    // });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    logger.info({ gradingId, duration }, 'Grading completed');

    return {
      success: true,
      gradingResult: null,
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

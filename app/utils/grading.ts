// utils/grading.ts
import { v4 as uuidv4 } from "uuid";
import type { NavigateFunction } from "@remix-run/react";

interface CreateGradingOptions {
  source?: string;
  onNavigate?: () => void;
}

export const createNewGrading = (navigate: NavigateFunction, options: CreateGradingOptions = {}) => {
  const { source = 'unknown', onNavigate } = options;
  const newTaskId = uuidv4();
  
  try {
    const history = JSON.parse(localStorage.getItem('gradingHistory') || '[]');
    history.push({
      id: newTaskId,
      createdAt: new Date().toISOString(),
      status: 'created',
      source
    });
    localStorage.setItem('gradingHistory', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving to history:', error);
  }

  navigate(`/assignments/grade/${newTaskId}`);
  
  if (onNavigate) {
    onNavigate();
  }
  
  return newTaskId;
};
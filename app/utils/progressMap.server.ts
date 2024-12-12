// app/utils/progressMap.server.ts

interface ProgressData {
  phase: string;
  progress: number;
  message: string;
}

export const progressMap = new Map<string, ProgressData>();

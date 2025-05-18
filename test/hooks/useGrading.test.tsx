import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGrading } from '@/hooks/useGrading';
import { useGradingStore } from '@/stores/gradingStore';
import { useUiStore } from '@/stores/uiStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock EventSource
const mockEventSource = {
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as (() => void) | null,
  close: vi.fn(),
  addEventListener: vi.fn(), 
  removeEventListener: vi.fn(), 
};

vi.stubGlobal('EventSource', vi.fn(() => mockEventSource));

// --- MODIFIED STORE MOCKS ---
// Define mock functions ONCE
const mockStartGrading = vi.fn();
const mockUpdateProgress = vi.fn();
const mockSetResult = vi.fn();
const mockSetError = vi.fn();

const mockSetStep = vi.fn();
const mockSetCanProceed = vi.fn();

// Mock the stores
vi.mock('@/stores/gradingStore', () => ({
  useGradingStore: vi.fn(() => ({
    startGrading: mockStartGrading,
    updateProgress: mockUpdateProgress,
    setResult: mockSetResult,
    setError: mockSetError,
  })),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: vi.fn(() => ({
    setStep: mockSetStep,
    setCanProceed: mockSetCanProceed,
  })),
}));

// Create a wrapper component with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useGrading', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventSource.onmessage = null;
    mockEventSource.onerror = null;
    mockEventSource.close.mockClear();
    mockEventSource.addEventListener.mockClear();
    mockEventSource.removeEventListener.mockClear();

    vi.stubGlobal('EventSource', vi.fn(() => mockEventSource));

    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle grading process correctly', async () => {
    const { result } = renderHook(() => useGrading(), {
      wrapper,
    });

    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ gradingId: 'test-grading-id' }),
    });

    // Start grading
    await act(async () => {
      result.current.gradeWithRubric({
        fileKey: 'test-file',
        rubricId: 'test-rubric',
      });
    });

    // Verify store calls
    expect(mockStartGrading).toHaveBeenCalled();
    expect(mockSetStep).toHaveBeenCalledWith('grading');
    expect(mockSetCanProceed).toHaveBeenCalledWith(false);

    // Ensure EventSource was instantiated and onmessage was set
    // This requires the fetch mock to resolve and the hook to process it.
    // We might need a small wait for the async mutationFn to complete and EventSource to be set up.
    await act(async () => {}); // Flush promises


    // Simulate progress update
    await act(async () => {
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify({ progress: 50, status: 'grading' }),
        } as MessageEvent);
      } else {
        // Fail test if onmessage was not set up, indicates an issue
        throw new Error("mockEventSource.onmessage was not set by the hook");
      }
    });

    expect(mockUpdateProgress).toHaveBeenCalledWith(50);

    // Simulate completion
    await act(async () => {
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify({
            progress: 100,
            status: 'completed',
            result: { score: 85 },
          }),
        } as MessageEvent);
      }
    });

    expect(mockSetResult).toHaveBeenCalledWith(expect.objectContaining({ score: 85 }));
    expect(mockSetStep).toHaveBeenCalledWith('result');
    expect(mockSetCanProceed).toHaveBeenCalledWith(true);
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should handle errors correctly', async () => {
    const { result } = renderHook(() => useGrading(), {
      wrapper,
    });
    // Mock a failed request
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    // Attempt grading
    await act(async () => {
      try {
        // gradeWithRubric (mutate) will cause the mutation to enter error state
        result.current.gradeWithRubric({
          fileKey: 'test-file',
          rubricId: 'test-rubric',
        });
      } catch (e) {
        // Mutations don't throw to the caller of mutate by default, they set error state
      }
    });

    // Wait for onError callback to be processed
    await act(async () => {}); // Flush promises


    // Verify error handling
    expect(mockSetError).toHaveBeenCalledWith('Network error');
    expect(mockSetCanProceed).toHaveBeenCalledWith(false);

  });

  it('should handle EventSource errors', async () => {
    const { result } = renderHook(() => useGrading(), {
      wrapper,
    });

    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ gradingId: 'test-grading-id' }),
    });

    // Start grading
    await act(async () => {
      result.current.gradeWithRubric({
        fileKey: 'test-file',
        rubricId: 'test-rubric',
      });
    });

    // Simulate EventSource error
    await act(async () => {
      if (mockEventSource.onerror) {
        mockEventSource.onerror();
      } else {
        throw new Error("mockEventSource.onerror was not set by the hook");
      }
    });

    expect(mockSetError).toHaveBeenCalledWith('進度追蹤連接失敗');
    expect(mockEventSource.close).toHaveBeenCalled();
    // expect(mockSetCanProceed).toHaveBeenCalledWith(false); // Check if this should also be called

  });
}); 
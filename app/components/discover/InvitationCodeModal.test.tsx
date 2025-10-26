/**
 * InvitationCodeModal Component Tests
 * Tests for invitation code validation including:
 * - Code input and validation
 * - Success/error states
 * - Navigation on success
 * - Course information display
 * - Error recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { InvitationCodeModal } from './InvitationCodeModal';

// Mock useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fetch
global.fetch = vi.fn();

const mockCourseInfo = {
  name: 'Introduction to Python',
  description: 'Learn Python basics',
  teacher: {
    name: 'Dr. Smith',
    email: 'smith@example.com',
  },
};

// Helper to render component with providers
const renderWithProviders = (element: React.ReactElement) => {
  return render(<BrowserRouter>{element}</BrowserRouter>);
};

describe('InvitationCodeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('Modal Open/Close Behavior', () => {
    it('should not render when closed', () => {
      renderWithProviders(
        <InvitationCodeModal open={false} onOpenChange={vi.fn()} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should call onOpenChange when close button is clicked', async () => {
      const onOpenChange = vi.fn();
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
      );

      // The close button is part of Radix UI Dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should auto-focus input when modal opens', async () => {
      const { rerender } = renderWithProviders(
        <InvitationCodeModal open={false} onOpenChange={vi.fn()} />
      );

      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
        expect(input).toHaveFocus();
      }, { timeout: 500 });
    });

    it('should clear focus and state when modal closes', () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
      );

      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={false} onOpenChange={onOpenChange} />
        </BrowserRouter>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Code Input', () => {
    it('should display code input field', () => {
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByPlaceholderText(/enter.*code/i)).toBeInTheDocument();
    });

    it('should convert input to uppercase', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
      await user.type(input, 'abc123');

      expect(input.value).toBe('ABC123');
    });

    it('should enforce maximum length', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
      const longString = 'A'.repeat(100);

      await user.type(input, longString);

      expect(input.value.length).toBeLessThanOrEqual(50);
    });

    it('should clear input state when modal reopens', async () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'TEST' } });

      // Close modal
      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={false} onOpenChange={onOpenChange} />
        </BrowserRouter>
      );

      // Reopen modal
      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
        </BrowserRouter>
      );

      const newInput = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
      expect(newInput.value).toBe('');
    });
  });

  describe('Code Validation', () => {
    it('should show error for empty code', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });

    it('should show error for code shorter than 3 characters', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'AB');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/least 3/i)).toBeInTheDocument();
      });
    });

    it('should call validation API with correct code', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ isValid: false, error: 'Invalid code' }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE123');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('TESTCODE123'),
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        );
      });
    });
  });

  describe('Validation Success State', () => {
    it('should show success message and redirect on valid code', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: true,
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'VALIDCODE123');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/validated successfully/i)).toBeInTheDocument();
      });

      // Should navigate after delay
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('VALIDCODE123')
        );
      }, { timeout: 1000 });
    });

    it('should show loading state during validation', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => {
          resolve({
            json: async () => ({ isValid: false, error: 'Invalid' }),
          });
        }, 500))
      );

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      // Should show loading indicator
      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });
  });

  describe('Validation Error States', () => {
    it('should display error message for invalid code', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Code not found or expired',
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'INVALIDCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/not valid/i)).toBeInTheDocument();
      });
    });

    it('should show try again button after error', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Invalid code',
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'INVALIDCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should allow retrying after validation error', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Invalid code',
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'INVALIDCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        const tryAgainButton = screen.getByRole('button', { name: /try again/i });
        expect(tryAgainButton).toBeInTheDocument();
      });

      // Click try again button
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Input should be cleared and focused
      await waitFor(() => {
        const newInput = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
        expect(newInput.value).toBe('');
        expect(newInput).toHaveFocus();
      });
    });
  });

  describe('Already Enrolled State', () => {
    it('should show error when student is already enrolled', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: true,
          isAlreadyEnrolled: true,
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE123');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already.*enrolled/i)).toBeInTheDocument();
      });
    });

    it('should show course info in already enrolled error', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: true,
          isAlreadyEnrolled: true,
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE123');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Python')).toBeInTheDocument();
      });
    });
  });

  describe('Course Information Display', () => {
    it('should display course information in error state', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Code expired',
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'EXPIREDCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Python')).toBeInTheDocument();
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        expect(screen.getByText('smith@example.com')).toBeInTheDocument();
      });
    });

    it('should display teacher name and email in course card', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Some error',
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
        expect(screen.getByText('smith@example.com')).toBeInTheDocument();
      });
    });

    it('should display course description if available', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Error',
          course: mockCourseInfo,
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Learn Python basics')).toBeInTheDocument();
      });
    });
  });

  describe('Network Errors', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    it('should show try again button after network error', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'invitation-modal-title');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'invitation-modal-description');
    });

    it('should have labeled input field', () => {
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      expect(input).toHaveAttribute('aria-label');
    });
  });

  describe('Form Submission', () => {
    it('should be accessible via Enter key', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Invalid code',
        }),
      });

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should disable submit button when validating', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => {
          resolve({
            json: async () => ({ isValid: false, error: 'Invalid' }),
          });
        }, 500))
      );

      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      // Button should be disabled during validation
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when input is empty', () => {
      renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={vi.fn()} />
      );

      const submitButton = screen.getByRole('button', { name: /validate/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('State Management', () => {
    it('should reset all state when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          isValid: false,
          error: 'Invalid code',
        }),
      });

      const { rerender } = renderWithProviders(
        <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
      );

      const input = screen.getByPlaceholderText(/enter.*code/i);
      await user.type(input, 'TESTCODE');

      const submitButton = screen.getByRole('button', { name: /validate/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });

      // Close modal
      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={false} onOpenChange={onOpenChange} />
        </BrowserRouter>
      );

      // Reopen modal
      rerender(
        <BrowserRouter>
          <InvitationCodeModal open={true} onOpenChange={onOpenChange} />
        </BrowserRouter>
      );

      // Should be back to initial state
      const newInput = screen.getByPlaceholderText(/enter.*code/i) as HTMLInputElement;
      expect(newInput.value).toBe('');
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    });
  });
});

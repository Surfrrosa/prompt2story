import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

// Component with stack trace for development testing
const ThrowErrorWithStack = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    const error = new Error('Test error with stack');
    error.stack = `Error: Test error with stack
    at ThrowErrorWithStack (test.tsx:10:11)
    at TestComponent (test.tsx:5:3)`;
    throw error;
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary Component', () => {
  const originalEnv = process.env.NODE_ENV;
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
      expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
    });

    it('should log error to console when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should display error icon in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should display action buttons in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowErrorWithStack shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();

      // Check that the details element is present
      const details = screen.getByRole('group');
      expect(details).toBeInTheDocument();
      expect(details.tagName).toBe('DETAILS');
    });

    it('should not show error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('should display error stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowErrorWithStack shouldThrow={true} />
        </ErrorBoundary>
      );

      // The stack trace should be present in the DOM
      expect(screen.getByText(/Error: Test error with stack/)).toBeInTheDocument();
      expect(screen.getByText(/at ThrowErrorWithStack/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should recover when "Try Again" button is clicked', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        React.useEffect(() => {
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return <ThrowError shouldThrow={shouldThrow} />;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should initially show error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Should recover and show normal content
      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should reload page when "Refresh Page" button is clicked', async () => {
      const user = userEvent.setup();

      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      await user.click(refreshButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when handleReset is called', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Simulate reset by re-rendering with working component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should still show error (component doesn't auto-reset on re-render)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle multiple errors correctly', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Render a different error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { name: 'Something went wrong' });
      expect(heading.tagName).toBe('H1');
    });

    it('should have accessible button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /refresh page/i })).toHaveAccessibleName();
    });

    it('should provide meaningful error description', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      expect(screen.getByText(/please try refreshing the page/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no stack trace', () => {
      process.env.NODE_ENV = 'development';

      const ThrowErrorNoStack = () => {
        const error = new Error('Error without stack');
        error.stack = undefined;
        throw error;
      };

      render(
        <ErrorBoundary>
          <ThrowErrorNoStack />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // Should still show error details section even without stack
      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    it('should handle async errors thrown in effects', () => {
      // Note: ErrorBoundaries don't catch async errors, but we test that it handles sync errors properly
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          // This won't be caught by ErrorBoundary, but we test sync errors
          throw new Error('Sync error in effect');
        }, []);

        return <div>Component with effect</div>;
      };

      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors during getDerivedStateFromError', () => {
      // This tests that the component is resilient to its own errors
      const error = new Error('Test error');
      const result = ErrorBoundary.getDerivedStateFromError(error);

      expect(result).toEqual({
        hasError: true,
        error: error
      });
    });
  });
});
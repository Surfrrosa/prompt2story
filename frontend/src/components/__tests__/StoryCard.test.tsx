import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryCard } from '../StoryCard';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('StoryCard Component', () => {
  const mockStory = {
    title: 'User Login Feature',
    story: 'As a user, I want to log into the system so that I can access my personalized dashboard',
    acceptance_criteria: [
      'Given valid credentials, when I submit the login form, then I should be redirected to the dashboard',
      'Given invalid credentials, when I submit the login form, then I should see an error message',
      'Given empty fields, when I submit the login form, then I should see validation errors'
    ]
  };

  const mockStoryWithMetadata = {
    ...mockStory,
    priority: 'High',
    story_points: 5
  };

  const mockOnRegenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render story title, description, and acceptance criteria', () => {
      render(<StoryCard story={mockStory} />);

      expect(screen.getByRole('heading', { name: mockStory.title })).toBeInTheDocument();
      expect(screen.getByText(mockStory.story)).toBeInTheDocument();
      expect(screen.getByText('✅ Acceptance Criteria')).toBeInTheDocument();

      mockStory.acceptance_criteria.forEach(criteria => {
        expect(screen.getByText(criteria)).toBeInTheDocument();
      });
    });

    it('should render copy button', () => {
      render(<StoryCard story={mockStory} />);

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should render regenerate button when onRegenerate is provided', () => {
      render(<StoryCard story={mockStory} onRegenerate={mockOnRegenerate} />);

      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    it('should not render regenerate button when onRegenerate is not provided', () => {
      render(<StoryCard story={mockStory} />);

      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
    });

    it('should not show metadata by default', () => {
      render(<StoryCard story={mockStoryWithMetadata} />);

      expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
      expect(screen.queryByText('5 Points')).not.toBeInTheDocument();
    });

    it('should show metadata when showMetadata is true', () => {
      render(<StoryCard story={mockStoryWithMetadata} showMetadata={true} />);

      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('5 Points')).toBeInTheDocument();
    });

    it('should handle empty acceptance criteria gracefully', () => {
      const storyWithoutCriteria = {
        ...mockStory,
        acceptance_criteria: []
      };

      render(<StoryCard story={storyWithoutCriteria} />);

      expect(screen.queryByText('✅ Acceptance Criteria')).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy story content to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();
      render(<StoryCard story={mockStory} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      const expectedText = `${mockStory.title}\n\n${mockStory.story}\n\nAcceptance Criteria:\n${mockStory.acceptance_criteria.map(c => `- ${c}`).join('\n')}`;

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedText);
    });

    it('should show "Copied!" feedback after copying', async () => {
      const user = userEvent.setup();
      render(<StoryCard story={mockStory} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
      });
    });

    it('should revert copy button text after 2 seconds', async () => {
      const user = userEvent.setup();
      render(<StoryCard story={mockStory} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Should show "Copied!" immediately
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
      });

      // Advance timers by 2 seconds
      vi.advanceTimersByTime(2000);

      // Should revert to "Copy"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
      });
    });

    it('should handle clipboard API errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock clipboard to reject
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Clipboard error'));

      render(<StoryCard story={mockStory} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });

      // Should not throw error
      await user.click(copyButton);

      consoleSpy.mockRestore();
    });
  });

  describe('Regenerate Functionality', () => {
    it('should call onRegenerate with the story when regenerate button is clicked', async () => {
      const user = userEvent.setup();
      render(<StoryCard story={mockStory} onRegenerate={mockOnRegenerate} />);

      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      await user.click(regenerateButton);

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
      expect(mockOnRegenerate).toHaveBeenCalledWith(mockStory);
    });
  });

  describe('Priority Colors', () => {
    it('should apply correct colors for different priorities', () => {
      const priorities = [
        { priority: 'High', expectedClass: 'bg-red-100 text-red-800' },
        { priority: 'Medium', expectedClass: 'bg-yellow-100 text-yellow-800' },
        { priority: 'Low', expectedClass: 'bg-green-100 text-green-800' },
        { priority: 'Unknown', expectedClass: 'bg-gray-100 text-gray-800' }
      ];

      priorities.forEach(({ priority, expectedClass }) => {
        const storyWithPriority = {
          ...mockStory,
          priority
        };

        const { unmount } = render(
          <StoryCard story={storyWithPriority} showMetadata={true} />
        );

        const priorityElement = screen.getByText(`${priority} Priority`);
        expect(priorityElement).toHaveClass(...expectedClass.split(' '));

        unmount();
      });
    });

    it('should handle case-insensitive priority matching', () => {
      const storyWithLowercasePriority = {
        ...mockStory,
        priority: 'high'
      };

      render(<StoryCard story={storyWithLowercasePriority} showMetadata={true} />);

      const priorityElement = screen.getByText('high Priority');
      expect(priorityElement).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<StoryCard story={mockStory} />);

      const storyTitle = screen.getByRole('heading', { name: mockStory.title });
      expect(storyTitle.tagName).toBe('H3');
    });

    it('should have accessible button labels', () => {
      render(<StoryCard story={mockStory} onRegenerate={mockOnRegenerate} />);

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    it('should have proper list structure for acceptance criteria', () => {
      render(<StoryCard story={mockStory} />);

      const criteriaList = screen.getByRole('list');
      expect(criteriaList).toBeInTheDocument();

      const criteriaItems = screen.getAllByRole('listitem');
      expect(criteriaItems).toHaveLength(mockStory.acceptance_criteria.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles gracefully', () => {
      const storyWithLongTitle = {
        ...mockStory,
        title: 'A'.repeat(200)
      };

      render(<StoryCard story={storyWithLongTitle} />);

      expect(screen.getByRole('heading', { name: storyWithLongTitle.title })).toBeInTheDocument();
    });

    it('should handle very long acceptance criteria', () => {
      const storyWithLongCriteria = {
        ...mockStory,
        acceptance_criteria: [
          'A'.repeat(500),
          'B'.repeat(500)
        ]
      };

      render(<StoryCard story={storyWithLongCriteria} />);

      storyWithLongCriteria.acceptance_criteria.forEach(criteria => {
        expect(screen.getByText(criteria)).toBeInTheDocument();
      });
    });

    it('should handle story without priority but with story points', () => {
      const storyWithOnlyPoints = {
        ...mockStory,
        story_points: 3
      };

      render(<StoryCard story={storyWithOnlyPoints} showMetadata={true} />);

      expect(screen.getByText('3 Points')).toBeInTheDocument();
      expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
    });

    it('should handle story with priority but without story points', () => {
      const storyWithOnlyPriority = {
        ...mockStory,
        priority: 'Medium'
      };

      render(<StoryCard story={storyWithOnlyPriority} showMetadata={true} />);

      expect(screen.getByText('Medium Priority')).toBeInTheDocument();
      expect(screen.queryByText(/points/i)).not.toBeInTheDocument();
    });

    it('should handle undefined priority gracefully', () => {
      const storyWithUndefinedPriority = {
        ...mockStory,
        priority: undefined
      };

      render(<StoryCard story={storyWithUndefinedPriority} showMetadata={true} />);

      // Should not render priority section when undefined
      expect(screen.queryByText(/priority/i)).not.toBeInTheDocument();
    });
  });
});
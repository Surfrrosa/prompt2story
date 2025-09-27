import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputForm } from '../InputForm';

describe('InputForm Component', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form elements correctly', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      expect(screen.getByRole('heading', { name: /generate user stories/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/describe your feature or requirement/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /describe your feature or requirement/i })).toBeInTheDocument();
      expect(screen.getByText('Quick Examples')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /advanced acceptance criteria/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /include metadata/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate user stories/i })).toBeInTheDocument();
    });

    it('should render example buttons', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const examples = [
        "Users need to be able to reset their password via email",
        "Create a dashboard showing sales metrics and charts",
        "Implement a shopping cart with add/remove items functionality",
        "Build a notification system for real-time alerts"
      ];

      examples.forEach(example => {
        expect(screen.getByRole('button', { name: example })).toBeInTheDocument();
      });
    });

    it('should have correct initial state', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const advancedCriteriaCheckbox = screen.getByRole('checkbox', { name: /advanced acceptance criteria/i });
      const metadataCheckbox = screen.getByRole('checkbox', { name: /include metadata/i });

      expect(promptTextarea).toHaveValue('');
      expect(advancedCriteriaCheckbox).toBeChecked(); // Default is true
      expect(metadataCheckbox).not.toBeChecked(); // Default is false
    });
  });

  describe('User Interactions', () => {
    it('should update prompt when user types', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const testPrompt = 'Test user story requirement';

      await user.type(promptTextarea, testPrompt);

      expect(promptTextarea).toHaveValue(testPrompt);
    });

    it('should populate prompt when example button is clicked', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const exampleButton = screen.getByRole('button', {
        name: "Users need to be able to reset their password via email"
      });

      await user.click(exampleButton);

      expect(promptTextarea).toHaveValue("Users need to be able to reset their password via email");
    });

    it('should toggle advanced criteria checkbox', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const advancedCriteriaCheckbox = screen.getByRole('checkbox', { name: /advanced acceptance criteria/i });

      expect(advancedCriteriaCheckbox).toBeChecked();

      await user.click(advancedCriteriaCheckbox);
      expect(advancedCriteriaCheckbox).not.toBeChecked();

      await user.click(advancedCriteriaCheckbox);
      expect(advancedCriteriaCheckbox).toBeChecked();
    });

    it('should toggle metadata checkbox', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const metadataCheckbox = screen.getByRole('checkbox', { name: /include metadata/i });

      expect(metadataCheckbox).not.toBeChecked();

      await user.click(metadataCheckbox);
      expect(metadataCheckbox).toBeChecked();

      await user.click(metadataCheckbox);
      expect(metadataCheckbox).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const metadataCheckbox = screen.getByRole('checkbox', { name: /include metadata/i });
      const submitButton = screen.getByRole('button', { name: /generate user stories/i });

      // Fill out form
      await user.type(promptTextarea, 'Test prompt for submission');
      await user.click(metadataCheckbox); // Toggle metadata to true

      // Submit form
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        prompt: 'Test prompt for submission',
        includeMetadata: true,
        includeAdvancedCriteria: true, // Default value
        persona: 'EndUser' // Default value
      });
    });

    it('should not submit form when prompt is empty', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const submitButton = screen.getByRole('button', { name: /generate user stories/i });

      // Try to submit with empty prompt
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not submit form when prompt contains only whitespace', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const submitButton = screen.getByRole('button', { name: /generate user stories/i });

      // Fill with only whitespace
      await user.type(promptTextarea, '   \n  \t  ');
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should submit using Enter key in form', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });

      await user.type(promptTextarea, 'Test prompt for enter submission');

      // Submit using Enter - but textareas don't submit on Enter by default
      // So we need to submit the form programmatically or click the button
      const form = promptTextarea.closest('form');
      fireEvent.submit(form!);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        prompt: 'Test prompt for enter submission',
        includeMetadata: false,
        includeAdvancedCriteria: true,
        persona: 'EndUser'
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when loading', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={true} />);

      const submitButton = screen.getByRole('button', { name: /generating stories/i });

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Generating Stories...')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={true} />);

      const spinner = screen.getByRole('button').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable submit button when prompt is empty', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const submitButton = screen.getByRole('button', { name: /generate user stories/i });

      // Initially disabled with empty prompt
      expect(submitButton).toBeDisabled();

      // Enable when text is added
      await user.type(promptTextarea, 'Some text');
      expect(submitButton).not.toBeDisabled();

      // Disable again when cleared
      await user.clear(promptTextarea);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and associations', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      expect(promptTextarea).toHaveAttribute('required');

      const advancedCriteriaCheckbox = screen.getByRole('checkbox', { name: /advanced acceptance criteria/i });
      const metadataCheckbox = screen.getByRole('checkbox', { name: /include metadata/i });

      expect(advancedCriteriaCheckbox).toHaveAttribute('id', 'advanced-criteria');
      expect(metadataCheckbox).toHaveAttribute('id', 'metadata');
    });

    it('should have proper heading hierarchy', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const heading = screen.getByRole('heading', { name: /generate user stories/i });
      expect(heading).toHaveAttribute('aria-level', '2'); // h2 element
    });

    it('should have descriptive helper text for options', () => {
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      expect(screen.getByText('Generate detailed Given/When/Then criteria')).toBeInTheDocument();
      expect(screen.getByText('Add priority levels and story points')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompts', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const longPrompt = 'A'.repeat(10000);

      await user.type(promptTextarea, longPrompt);

      expect(promptTextarea).toHaveValue(longPrompt);
    });

    it('should handle example click when prompt already has content', async () => {
      const user = userEvent.setup();
      render(<InputForm onSubmit={mockOnSubmit} loading={false} />);

      const promptTextarea = screen.getByRole('textbox', { name: /describe your feature or requirement/i });
      const exampleButton = screen.getByRole('button', {
        name: "Users need to be able to reset their password via email"
      });

      // Add some initial content
      await user.type(promptTextarea, 'Initial content');
      expect(promptTextarea).toHaveValue('Initial content');

      // Click example should replace content
      await user.click(exampleButton);
      expect(promptTextarea).toHaveValue("Users need to be able to reset their password via email");
    });
  });
});
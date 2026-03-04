import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from '../ChatInput';
import { useChatStore } from '../../stores/chatStore';

// Mock the store
jest.mock('../../stores/chatStore');

describe('ChatInput', () => {
  const mockSendMessage = jest.fn();
  const mockSetUseRag = jest.fn();
  const mockCreateNewSession = jest.fn();
  const mockClearMessages = jest.fn();

  beforeEach(() => {
    (useChatStore as unknown as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
      ui: { isLoading: false },
      useRag: true,
      setUseRag: mockSetUseRag,
      createNewSession: mockCreateNewSession,
      clearMessages: mockClearMessages,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders input field and send button', () => {
    render(<ChatInput />);

    expect(screen.getByPlaceholderText(/输入问题/)).toBeInTheDocument();
    expect(screen.getByText('发送')).toBeInTheDocument();
  });

  it('updates input value when typing', async () => {
    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/输入问题/);
    await userEvent.type(input, '测试消息');

    expect(input).toHaveValue('测试消息');
  });

  it('sends message when clicking send button', async () => {
    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/输入问题/);
    await userEvent.type(input, '测试消息');

    const sendButton = screen.getByText('发送');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('测试消息');
    });
  });

  it('sends message when pressing Enter', async () => {
    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/输入问题/);
    await userEvent.type(input, '测试消息');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('测试消息');
    });
  });

  it('does not send empty message', async () => {
    render(<ChatInput />);

    const sendButton = screen.getByText('发送');
    fireEvent.click(sendButton);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('toggles RAG switch', async () => {
    render(<ChatInput />);

    const ragSwitch = screen.getByRole('switch');
    fireEvent.click(ragSwitch);

    expect(mockSetUseRag).toHaveBeenCalledWith(false);
  });

  it('disables input when loading', () => {
    (useChatStore as unknown as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
      ui: { isLoading: true },
      useRag: true,
      setUseRag: mockSetUseRag,
      createNewSession: mockCreateNewSession,
      clearMessages: mockClearMessages,
    });

    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/输入问题/);
    expect(input).toBeDisabled();
  });

  it('calls createNewSession when clicking new chat button', async () => {
    render(<ChatInput />);

    const newChatButton = screen.getByText('新对话');
    fireEvent.click(newChatButton);

    expect(mockCreateNewSession).toHaveBeenCalled();
  });

  it('calls clearMessages when clicking clear button', async () => {
    render(<ChatInput />);

    const clearButton = screen.getByText('清空');
    fireEvent.click(clearButton);

    expect(mockClearMessages).toHaveBeenCalled();
  });

  it('shows correct placeholder based on RAG setting', () => {
    (useChatStore as unknown as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
      ui: { isLoading: false },
      useRag: false,
      setUseRag: mockSetUseRag,
      createNewSession: mockCreateNewSession,
      clearMessages: mockClearMessages,
    });

    render(<ChatInput />);

    expect(screen.getByPlaceholderText(/直接回答/)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types';

describe('ChatMessage', () => {
  const mockUserMessage: ChatMessageType = {
    id: '1',
    role: 'user',
    content: '你好，这是一个测试消息',
    timestamp: new Date('2024-01-01 12:00:00'),
  };

  const mockAssistantMessage: ChatMessageType = {
    id: '2',
    role: 'assistant',
    content: '你好！我是AI助手，很高兴为你服务。',
    timestamp: new Date('2024-01-01 12:00:01'),
    sources: [
      { id: 'doc1', title: '文档1', similarity: 0.95 },
      { id: 'doc2', title: '文档2', similarity: 0.87 },
    ],
  };

  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);
    
    expect(screen.getByText('你好，这是一个测试消息')).toBeInTheDocument();
    expect(screen.getByText('12:00:00')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage message={mockAssistantMessage} />);
    
    expect(screen.getByText('你好！我是AI助手，很高兴为你服务。')).toBeInTheDocument();
    expect(screen.getByText('参考来源：')).toBeInTheDocument();
    expect(screen.getByText('1. 文档1')).toBeInTheDocument();
    expect(screen.getByText('2. 文档2')).toBeInTheDocument();
  });

  it('renders streaming indicator when isStreaming is true', () => {
    const streamingMessage: ChatMessageType = {
      ...mockAssistantMessage,
      isStreaming: true,
    };
    
    render(<ChatMessage message={streamingMessage} />);
    
    expect(screen.getByText('正在输入...')).toBeInTheDocument();
  });

  it('renders markdown content for assistant', () => {
    const markdownMessage: ChatMessageType = {
      ...mockAssistantMessage,
      content: '# 标题\n\n这是**粗体**文字',
    };
    
    render(<ChatMessage message={markdownMessage} />);
    
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('这是粗体文字')).toBeInTheDocument();
  });

  it('displays similarity scores for sources', () => {
    render(<ChatMessage message={mockAssistantMessage} />);
    
    expect(screen.getByText('(95%)')).toBeInTheDocument();
    expect(screen.getByText('(87%)')).toBeInTheDocument();
  });

  it('does not show sources for user messages', () => {
    const userMessageWithSources: ChatMessageType = {
      ...mockUserMessage,
      sources: [{ id: 'doc1', title: '文档', similarity: 0.9 }],
    };
    
    render(<ChatMessage message={userMessageWithSources} />);
    
    expect(screen.queryByText('参考来源：')).not.toBeInTheDocument();
  });
});

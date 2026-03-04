import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types';

// Mock antd components
jest.mock('antd', () => {
  const React = require('react');
  
  // Simple Avatar mock
  const Avatar = ({ children, icon }: any) => <div data-testid="avatar">{icon || children}</div>;
  
  // Simple Card mock
  const Card = ({ children, title }: any) => <div data-testid="card">{title}{children}</div>;
  
  // Simple Tag mock
  const Tag = ({ children, color }: any) => <span data-testid="tag" style={{color}}>{children}</span>;
  
  // Simple Space mock
  const Space = ({ children }: any) => <div data-testid="space">{children}</div>;
  
  // Simple Modal mock
  const Modal = ({ open, children }: any) => open ? <div data-testid="modal">{children}</div> : null;
  
  // Simple Badge mock
  const Badge = ({ children, count }: any) => <div data-testid="badge" data-count={count}>{children}</div>;
  
  // Simple Tooltip mock
  const Tooltip = ({ children, title }: any) => <div data-testid="tooltip" title={title}>{children}</div>;
  
  // Simple Image mock
  const Image = ({ src, alt }: any) => <img data-testid="image" src={src} alt={alt} />;
  
  // Typography mock
  const Text = ({ children }: any) => <span data-testid="typography-text">{children}</span>;
  const Paragraph = ({ children }: any) => <p data-testid="typography-paragraph">{children}</p>;
  const Title = ({ children }: any) => <h1 data-testid="typography-title">{children}</h1>;
  
  const Typography = {
    Text,
    Paragraph,
    Title,
  };
  
  return {
    Avatar,
    Card,
    Tag,
    Space,
    Modal,
    Badge,
    Tooltip,
    Image,
    Typography,
  };
});

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Mock remark-gfm
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => ({}),
}));

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
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage message={mockAssistantMessage} />);
    
    expect(screen.getByText('你好！我是AI助手，很高兴为你服务。')).toBeInTheDocument();
  });

  it('renders streaming indicator when isStreaming is true', () => {
    const streamingMessage: ChatMessageType = {
      ...mockAssistantMessage,
      isStreaming: true,
    };
    
    render(<ChatMessage message={streamingMessage} />);
    
    expect(screen.getByText('正在输入...')).toBeInTheDocument();
  });

  it('does not show sources for user messages', () => {
    const userMessageWithSources: ChatMessageType = {
      ...mockUserMessage,
      sources: [{ id: 'doc1', title: '文档', similarity: 0.9 }],
    };
    
    render(<ChatMessage message={userMessageWithSources} />);
    
    // User messages should not show sources section
    expect(screen.queryByText('参考来源')).not.toBeInTheDocument();
  });
});

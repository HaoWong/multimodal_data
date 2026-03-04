import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types';

// Mock antd components
jest.mock('antd', () => {
  const React = require('react');
  
  const Avatar = ({ children, icon }: any) => <div data-testid="avatar">{icon || children}</div>;
  const Card = ({ children, title }: any) => <div data-testid="card">{title}{children}</div>;
  const Tag = ({ children, color }: any) => <span data-testid="tag" style={{color}}>{children}</span>;
  const Space = ({ children }: any) => <div data-testid="space">{children}</div>;
  const Modal = ({ open, children }: any) => open ? <div data-testid="modal">{children}</div> : null;
  const Badge = ({ children, count }: any) => <div data-testid="badge" data-count={count}>{children}</div>;
  const Tooltip = ({ children, title }: any) => <div data-testid="tooltip" title={title}>{children}</div>;
  const Image = ({ src, alt }: any) => <img data-testid="image" src={src} alt={alt} />;
  
  const Text = ({ children }: any) => <span data-testid="typography-text">{children}</span>;
  const Paragraph = ({ children }: any) => <p data-testid="typography-paragraph">{children}</p>;
  const Title = ({ children }: any) => <h1 data-testid="typography-title">{children}</h1>;
  
  const Typography = { Text, Paragraph, Title };
  
  return { Avatar, Card, Tag, Space, Modal, Badge, Tooltip, Image, Typography };
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

describe('ChatMessage Edge Cases', () => {
  it('renders message with very long content', () => {
    const longMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'A'.repeat(10000),
      timestamp: new Date(),
    };

    render(<ChatMessage message={longMessage} />);
    expect(screen.getByText('A'.repeat(10000))).toBeInTheDocument();
  });

  it('renders message with empty content', () => {
    const emptyMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    const { container } = render(<ChatMessage message={emptyMessage} />);
    // Just verify the component renders without error
    expect(container.firstChild).toBeTruthy();
  });

  it('renders message with special characters', () => {
    const specialMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '<script>alert("xss")</script>',
      timestamp: new Date(),
    };

    render(<ChatMessage message={specialMessage} />);
    // Should render as text, not execute as script
    expect(screen.getByText(/<script>/)).toBeInTheDocument();
  });

  it('renders message with unicode characters', () => {
    const unicodeMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '🎉 你好世界 🌍 日本語テキスト',
      timestamp: new Date(),
    };

    render(<ChatMessage message={unicodeMessage} />);
    expect(screen.getByText('🎉 你好世界 🌍 日本語テキスト')).toBeInTheDocument();
  });

  it('renders message with null sources', () => {
    const nullSourcesMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Test message',
      timestamp: new Date(),
      sources: null as any,
    };

    render(<ChatMessage message={nullSourcesMessage} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders message with undefined sources', () => {
    const undefinedSourcesMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Test message',
      timestamp: new Date(),
      sources: undefined,
    };

    render(<ChatMessage message={undefinedSourcesMessage} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});

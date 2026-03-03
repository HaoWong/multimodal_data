import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';
import { ChatMessage as ChatMessageType } from '../../types';

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

    render(<ChatMessage message={emptyMessage} />);
    expect(document.querySelector('.chat-message')).toBeInTheDocument();
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

  it('renders message with many sources', () => {
    const messageWithManySources: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      sources: Array.from({ length: 20 }, (_, i) => ({
        id: `doc${i}`,
        title: `Document ${i}`,
        similarity: 0.9 - i * 0.01,
      })),
    };

    render(<ChatMessage message={messageWithManySources} />);
    expect(screen.getByText('1. Document 0')).toBeInTheDocument();
    expect(screen.getByText('20. Document 19')).toBeInTheDocument();
  });

  it('renders message with zero similarity sources', () => {
    const messageWithZeroSimilarity: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Test',
      timestamp: new Date(),
      sources: [
        { id: 'doc1', title: 'Doc 1', similarity: 0 },
        { id: 'doc2', title: 'Doc 2', similarity: 0.0001 },
      ],
    };

    render(<ChatMessage message={messageWithZeroSimilarity} />);
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });

  it('renders message with very old timestamp', () => {
    const oldMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Old message',
      timestamp: new Date('2000-01-01'),
    };

    render(<ChatMessage message={oldMessage} />);
    expect(screen.getByText('Old message')).toBeInTheDocument();
  });

  it('renders streaming message without error', () => {
    const streamingMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: 'Partial',
      timestamp: new Date(),
      isStreaming: true,
    };

    render(<ChatMessage message={streamingMessage} />);
    expect(screen.getByText('正在输入...')).toBeInTheDocument();
  });

  it('renders code blocks in markdown', () => {
    const codeMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '```python\nprint("hello")\n```',
      timestamp: new Date(),
    };

    render(<ChatMessage message={codeMessage} />);
    expect(screen.getByText('print("hello")')).toBeInTheDocument();
  });

  it('renders tables in markdown', () => {
    const tableMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
      timestamp: new Date(),
    };

    render(<ChatMessage message={tableMessage} />);
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    const messageWithoutTimestamp = {
      id: '1',
      role: 'assistant',
      content: 'No timestamp',
    } as ChatMessageType;

    render(<ChatMessage message={messageWithoutTimestamp} />);
    expect(screen.getByText('No timestamp')).toBeInTheDocument();
  });

  it('renders nested lists correctly', () => {
    const listMessage: ChatMessageType = {
      id: '1',
      role: 'assistant',
      content: '- Item 1\n  - Subitem 1\n  - Subitem 2\n- Item 2',
      timestamp: new Date(),
    };

    render(<ChatMessage message={listMessage} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});

import { useState, useCallback } from 'react';
import { ChatMessage, MessageSource } from '../types';
import { chatApi } from '../services/api';

export interface UseChatOptions {
  useRag?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);

    // 添加用户消息
    const userId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userId,
      role: 'user',
      content,
      timestamp: new Date(),
    }]);

    // 添加助手消息（占位）
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      let response = '';
      let sources: MessageSource[] = [];
      
      await chatApi.sendMessageStream(
        {
          message: content,
          session_id: currentSessionId || undefined,
          use_rag: options.useRag ?? true,
        },
        {
          onContent: (chunk) => {
            response += chunk;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: response }
                  : msg
              )
            );
          },
          onSources: (receivedSources) => {
            sources = receivedSources;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, sources }
                  : msg
              )
            );
          },
          onDone: () => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
          },
        }
      );
    } catch (error) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: '抱歉，发生了错误。', isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, options.useRag]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    sessionId: currentSessionId,
  };
}

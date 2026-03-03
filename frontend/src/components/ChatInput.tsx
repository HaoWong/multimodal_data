import React, { useState, useRef } from 'react';
import { Input, Button, Upload, Space, Tooltip, message as antMessage } from 'antd';
import {
  SendOutlined,
  UploadOutlined,
  ClearOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../stores/chatStore';
import { contentApi, agentApi } from '../services/api';

const { TextArea } = Input;

interface ChatInputProps {
  useAgent?: boolean;
  onUploadSuccess?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ useAgent = false, onUploadSuccess }) => {
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<any>(null);

  const { sendMessage, isLoading, useRag, createNewSession, clearMessages } =
    useChatStore();

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    if (useAgent) {
      // Agent模式：调用Agent API
      await sendAgentMessage(message);
    } else {
      // 普通模式
      await sendMessage(message);
    }

    // 重新聚焦输入框
    inputRef.current?.focus();
  };

  const sendAgentMessage = async (message: string) => {
    // 添加用户消息
    const userMessageId = Date.now().toString();
    useChatStore.setState((state) => ({
      messages: [
        ...state.messages,
        {
          id: userMessageId,
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
      ],
      isLoading: true,
    }));

    try {
      // 调用Agent API（流式）
      let fullResponse = '';
      
      await agentApi.executeTaskStream(
        message,
        (chunk) => {
          fullResponse += chunk;
          // 更新消息内容
          useChatStore.setState((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = fullResponse;
            } else {
              messages.push({
                id: Date.now().toString(),
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date(),
              });
            }
            return { messages };
          });
        },
        { useRag }
      );
    } catch (error) {
      antMessage.error('Agent执行失败');
      console.error(error);
    } finally {
      useChatStore.setState({ isLoading: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await contentApi.uploadContent(file);
      antMessage.success(`文件 "${file.name}" 上传成功`);

      // 触发上传成功回调，刷新内容列表
      onUploadSuccess?.();

      // 自动发送一条关于上传文件的消息
      const message = useAgent
        ? `我已经上传了文件 "${file.name}"，请帮我分析处理这个文件。`
        : `我已经上传了文件 "${file.name}"，请帮我分析一下这个文件的内容。`;
      
      setInputValue(message);
    } catch (error) {
      antMessage.error('文件上传失败');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
    return false; // 阻止默认上传行为
  };

  return (
    <div
      style={{
        borderTop: '1px solid #e8e8e8',
        padding: '16px 24px',
        backgroundColor: '#fff',
      }}
    >
      <Space style={{ marginBottom: 12 }}>
        {!useAgent && (
          <Tooltip title="开启后，AI会基于知识库回答">
            <Space>
              <span style={{ fontSize: 13, color: '#666' }}>
                {useRag ? '使用知识库' : '直接回答'}
              </span>
            </Space>
          </Tooltip>
        )}

        <Upload
          beforeUpload={handleUpload}
          showUploadList={false}
          accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov,.zip"
          disabled={isUploading}
        >
          <Button
            icon={<UploadOutlined />}
            size="small"
            loading={isUploading}
          >
            上传文件
          </Button>
        </Upload>

        <Button
          icon={<PlusOutlined />}
          size="small"
          onClick={createNewSession}
        >
          新对话
        </Button>

        <Button
          icon={<ClearOutlined />}
          size="small"
          onClick={clearMessages}
          danger
        >
          清空
        </Button>
      </Space>

      <div style={{ display: 'flex', gap: 12 }}>
        <TextArea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            useAgent
              ? '输入任务描述，Agent将自动规划并执行...'
              : useRag
              ? '输入问题，AI将基于知识库回答...'
              : '输入问题，AI将直接回答...'
          }
          autoSize={{ minRows: 2, maxRows: 6 }}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={isLoading}
          disabled={!inputValue.trim()}
          style={{ height: 'auto' }}
        >
          {useAgent ? '执行' : '发送'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;

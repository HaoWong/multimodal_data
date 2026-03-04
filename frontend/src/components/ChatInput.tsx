import React, { useState, useRef, useCallback } from 'react';
import { Input, Button, Upload, Space, Tooltip, message as antMessage, Badge, Tag } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  SendOutlined,
  UploadOutlined,
  ClearOutlined,
  PlusOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../stores/chatStore';
import { contentApi, agentApi } from '../services/api';
import { ChatInputProps, UploadConfig } from '../types/components';

const { TextArea } = Input;

/**
 * 默认上传配置
 */
const defaultUploadConfig: UploadConfig = {
  accept: '.txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov,.zip',
  maxSize: 100, // 100MB
  maxCount: 10,
  multiple: true,
};

/**
 * 聊天输入组件
 *
 * 支持多文件上传、Agent模式、RAG模式
 * 统一的输入处理逻辑
 */
const ChatInput: React.FC<ChatInputProps> = ({
  placeholder,
  useAgent = false,
  useRag: propUseRag,
  onSend,
  onUploadSuccess,
  onNewSession,
  onClear,
  uploadConfig,
  value: controlledValue,
  onChange: onControlledChange,
  multiFileUpload = true,
  disabled = false,
  loading = false,
  className,
  style,
  testId,
}) => {
  // 内部状态（非受控模式）
  const [internalValue, setInternalValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const inputRef = useRef<any>(null);

  // 从 store 获取状态
  const { sendMessage, ui, useRag: storeUseRag, createNewSession, clearMessages } = useChatStore();
  const isLoading = loading || ui.isLoading;
  const effectiveUseRag = propUseRag !== undefined ? propUseRag : storeUseRag;

  // 确定当前是受控还是非受控模式
  const isControlled = controlledValue !== undefined;
  const inputValue = isControlled ? controlledValue : internalValue;

  // 合并上传配置
  const mergedUploadConfig = { ...defaultUploadConfig, ...uploadConfig };

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (isControlled) {
      onControlledChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  /**
   * 发送 Agent 消息
   */
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
        { useRag: effectiveUseRag }
      );
    } catch (error) {
      antMessage.error('Agent执行失败');
      console.error(error);
    } finally {
      useChatStore.setState((state) => ({ ui: { ...state.ui, isLoading: false } }));
    }
  };

  /**
   * 处理发送消息
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || disabled) return;

    const message = inputValue.trim();

    // 清空输入框
    if (isControlled) {
      onControlledChange?.('');
    } else {
      setInternalValue('');
    }

    // 收集待上传的文件
    const filesToUpload = fileList
      .filter((f) => f.originFileObj)
      .map((f) => f.originFileObj as File);

    // 调用外部 onSend 回调
    if (onSend) {
      onSend(message, filesToUpload.length > 0 ? filesToUpload : undefined);
    } else {
      // 使用默认逻辑
      if (useAgent) {
        await sendAgentMessage(message);
      } else {
        await sendMessage(message);
      }
    }

    // 清空文件列表
    setFileList([]);

    // 重新聚焦输入框
    inputRef.current?.focus();
  }, [inputValue, isLoading, disabled, isControlled, fileList, onSend, onControlledChange, useAgent, sendMessage, sendAgentMessage]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 处理文件上传前
   */
  const handleBeforeUpload = (file: File): boolean => {
    // 检查文件大小
    if (mergedUploadConfig.maxSize && file.size > mergedUploadConfig.maxSize * 1024 * 1024) {
      antMessage.error(`文件 "${file.name}" 超过最大限制 ${mergedUploadConfig.maxSize}MB`);
      return false;
    }

    // 检查文件数量
    if (mergedUploadConfig.maxCount && fileList.length >= mergedUploadConfig.maxCount) {
      antMessage.error(`最多只能上传 ${mergedUploadConfig.maxCount} 个文件`);
      return false;
    }

    return true;
  };

  /**
   * 处理文件变化
   */
  const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  };

  /**
   * 处理文件上传
   */
  const handleUpload = async () => {
    if (fileList.length === 0) return;

    setIsUploading(true);
    const files = fileList
      .filter((f) => f.originFileObj)
      .map((f) => f.originFileObj as File);

    try {
      for (const file of files) {
        await contentApi.uploadContent(file);
      }

      antMessage.success(`成功上传 ${files.length} 个文件`);

      // 触发上传成功回调
      onUploadSuccess?.(files);

      // 自动发送一条关于上传文件的消息
      const fileNames = files.map((f) => `"${f.name}"`).join('、');
      const message = useAgent
        ? `我已经上传了文件 ${fileNames}，请帮我分析处理这些文件。`
        : `我已经上传了文件 ${fileNames}，请帮我分析一下这些文件的内容。`;

      if (isControlled) {
        onControlledChange?.(message);
      } else {
        setInternalValue(message);
      }

      // 清空文件列表
      setFileList([]);
    } catch (error) {
      antMessage.error('文件上传失败');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 处理新建会话
   */
  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      createNewSession();
    }
  };

  /**
   * 处理清空消息
   */
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      clearMessages();
    }
  };

  /**
   * 移除文件
   */
  const handleRemoveFile = (file: UploadFile) => {
    setFileList(fileList.filter((f) => f.uid !== file.uid));
  };

  // 生成占位符文本
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (useAgent) return '输入任务描述，Agent将自动规划并执行...';
    if (effectiveUseRag) return '输入问题，AI将基于知识库回答...';
    return '输入问题，AI将直接回答...';
  };

  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        borderTop: '1px solid #e8e8e8',
        padding: '16px 24px',
        backgroundColor: '#fff',
        ...style,
      }}
    >
      {/* 工具栏 */}
      <Space style={{ marginBottom: 12 }}>
        {!useAgent && (
          <Tooltip title="开启后，AI会基于知识库回答">
            <Space>
              <span style={{ fontSize: 13, color: '#666' }}>
                {effectiveUseRag ? '使用知识库' : '直接回答'}
              </span>
            </Space>
          </Tooltip>
        )}

        {/* 文件上传 */}
        <Upload
          beforeUpload={handleBeforeUpload}
          onChange={handleFileChange}
          fileList={fileList}
          accept={mergedUploadConfig.accept}
          multiple={multiFileUpload && mergedUploadConfig.multiple}
          disabled={isUploading || disabled}
          showUploadList={false}
        >
          <Badge count={fileList.length} size="small" offset={[0, 0]}>
            <Button
              icon={<UploadOutlined />}
              size="small"
              loading={isUploading}
              disabled={disabled}
            >
              {multiFileUpload ? '上传文件' : '上传'}
            </Button>
          </Badge>
        </Upload>

        {/* 新会话按钮 */}
        <Button
          icon={<PlusOutlined />}
          size="small"
          onClick={handleNewSession}
          disabled={disabled}
        >
          新对话
        </Button>

        {/* 清空按钮 */}
        <Button
          icon={<ClearOutlined />}
          size="small"
          onClick={handleClear}
          danger
          disabled={disabled}
        >
          清空
        </Button>
      </Space>

      {/* 已选文件列表 */}
      {fileList.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fileList.map((file) => (
            <Tag
              key={file.uid}
              closable
              onClose={() => handleRemoveFile(file)}
              icon={<FileOutlined />}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {file.name}
            </Tag>
          ))}
          <Button
            type="primary"
            size="small"
            onClick={handleUpload}
            loading={isUploading}
            disabled={disabled}
          >
            确认上传
          </Button>
        </div>
      )}

      {/* 输入区域 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <TextArea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          autoSize={{ minRows: 2, maxRows: 6 }}
          disabled={isLoading || disabled}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={isLoading}
          disabled={!inputValue.trim() || disabled}
          style={{ height: 'auto' }}
        >
          {useAgent ? '执行' : '发送'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;

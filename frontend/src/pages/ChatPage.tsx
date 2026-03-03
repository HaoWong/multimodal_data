import React, { useEffect, useRef, useState } from 'react';
import { Spin, Switch, Tooltip, Card, Typography, Space, Button, Upload, Input, Badge, Drawer, Tag, message as antMessage, List } from 'antd';
import { 
  ThunderboltOutlined, 
  DatabaseOutlined, 
  FileTextOutlined, 
  FileImageOutlined, 
  VideoCameraOutlined, 
  SendOutlined,
  PlusOutlined,
  ClearOutlined,
  UploadOutlined,
  UnorderedListOutlined,
  FileOutlined,
} from '@ant-design/icons';
import ChatMessage from '../components/ChatMessage';
import UnifiedTaskMonitor from '../components/UnifiedTaskMonitor';
import { useChatStore } from '../stores/chatStore';
import { contentApi, agentApi } from '../services/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

// 文件类型图标映射
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <FileImageOutlined style={{ color: '#52c41a' }} />;
  }
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) {
    return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return <FileTextOutlined style={{ color: '#fa8c16' }} />;
  }
  return <FileOutlined style={{ color: '#666' }} />;
};

const ChatPage: React.FC = () => {
  const { messages, isLoading, sendMessage, createNewSession, clearMessages, addRecentFile } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [useAgent, setUseAgent] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [taskDrawerVisible, setTaskDrawerVisible] = useState(false);
  const [runningTaskCount, setRunningTaskCount] = useState(0);
  
  // 已上传文件历史记录（当前会话）
  const [uploadedFilesHistory, setUploadedFilesHistory] = useState<Array<{
    id: string;
    name: string;
    type: string;
    uploadedAt: Date;
  }>>([]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 定期检查运行中的任务数量
  useEffect(() => {
    if (!taskDrawerVisible) return;
    
    const checkTasks = async () => {
      try {
        const response = await fetch('/api/tasks/running');
        if (!response.ok) return;
        const data = await response.json();
        setRunningTaskCount(data.total || 0);
      } catch (error) {
        // 静默失败
      }
    };
    
    checkTasks();
    const interval = setInterval(checkTasks, 10000);
    return () => clearInterval(interval);
  }, [taskDrawerVisible]);

  // 处理文件选择（不立即上传）
  const handleFileSelect = (file: File) => {
    // 检查是否已选择
    if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
      antMessage.warning(`文件 "${file.name}" 已选择`);
      return false;
    }
    
    // 限制最多5个文件
    if (selectedFiles.length >= 5) {
      antMessage.warning('最多只能选择5个文件');
      return false;
    }
    
    setSelectedFiles(prev => [...prev, file]);
    antMessage.success(`已选择文件: ${file.name}`);
    return false; // 阻止默认上传行为
  };

  // 移除已选择的文件
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有选择的文件
  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  // 统一发送消息和文件
  const handleSend = async () => {
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading) return;

    const message = inputValue.trim();
    const files = [...selectedFiles];
    
    // 清空输入
    setInputValue('');
    setSelectedFiles([]);

    if (useAgent) {
      await sendAgentMessageWithFiles(message, files);
    } else {
      await sendMessageWithFiles(message, files);
    }
  };

  // 普通模式：发送消息和文件
  const sendMessageWithFiles = async (message: string, files: File[]) => {
    // 如果有文件，先上传文件
    let uploadedFiles: { name: string; id: string; type: string }[] = [];

    if (files.length > 0) {
      setIsUploading(true);
      try {
        for (const file of files) {
          const result = await contentApi.uploadContent(file);
          uploadedFiles.push({
            id: result.id,
            name: file.name,
            type: result.content_type
          });
        }
        antMessage.success(`成功上传 ${files.length} 个文件`);
      } catch (error) {
        antMessage.error('文件上传失败');
        console.error(error);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // 添加到上传历史记录和最近文件列表
    if (uploadedFiles.length > 0) {
      setUploadedFilesHistory(prev => [
        ...uploadedFiles.map(f => ({ ...f, uploadedAt: new Date() })),
        ...prev
      ].slice(0, 20)); // 只保留最近20个
      
      // 添加到最近文件列表（用于上下文关联）
      uploadedFiles.forEach(file => {
        addRecentFile(file);
      });
    }

    // 构建完整的消息
    let fullMessage = message;
    if (uploadedFiles.length > 0) {
      const fileList = uploadedFiles.map(f => `"${f.name}"`).join('、');
      if (message) {
        fullMessage = `${message}\n\n[已上传文件: ${fileList}]`;
      } else {
        fullMessage = `请分析以下文件：${fileList}`;
      }
    }

    // 发送消息
    await sendMessage(fullMessage);
  };

  // Agent模式：发送任务和文件
  const sendAgentMessageWithFiles = async (message: string, files: File[]) => {
    const userMessageId = Date.now().toString();
    
    // 显示用户消息（包含文件信息）
    let displayMessage = message || '请分析这些文件';
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join('、');
      displayMessage += `\n\n[待上传文件: ${fileNames}]`;
    }
    
    useChatStore.setState((state) => ({
      messages: [
        ...state.messages,
        {
          id: userMessageId,
          role: 'user',
          content: displayMessage,
          timestamp: new Date(),
        },
      ],
      isLoading: true,
    }));

    try {
      // 上传文件
      let uploadedFiles: { name: string; id: string; type: string }[] = [];

      if (files.length > 0) {
        setIsUploading(true);
        for (const file of files) {
          const result = await contentApi.uploadContent(file);
          uploadedFiles.push({
            id: result.id,
            name: file.name,
            type: result.content_type
          });
        }
        setIsUploading(false);
      }

      // 添加到上传历史记录和最近文件列表
      if (uploadedFiles.length > 0) {
        setUploadedFilesHistory(prev => [
          ...uploadedFiles.map(f => ({ ...f, uploadedAt: new Date() })),
          ...prev
        ].slice(0, 20));
        
        // 添加到最近文件列表（用于上下文关联）
        uploadedFiles.forEach(file => {
          addRecentFile(file);
        });
      }

      // 构建Agent任务上下文
      const context = {
        uploadedFiles: uploadedFiles,
        useRag: useRag,
        task: message || '分析上传的文件',
      };

      // 调用Agent API（流式）
      let fullResponse = '';
      
      await agentApi.executeTaskStream(
        message || '请分析上传的文件',
        (chunk) => {
          fullResponse += chunk;
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
        context
      );
    } catch (error) {
      antMessage.error('Agent执行失败');
      console.error(error);
    } finally {
      useChatStore.setState({ isLoading: false });
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 快捷功能按钮
  const quickActions = [
    { icon: <FileImageOutlined />, label: '图片', color: '#52c41a', type: 'image', accept: '.jpg,.jpeg,.png,.gif' },
    { icon: <VideoCameraOutlined />, label: '视频', color: '#1890ff', type: 'video', accept: '.mp4,.avi,.mov,.wmv' },
    { icon: <FileTextOutlined />, label: '文档', color: '#fa8c16', type: 'document', accept: '.txt,.pdf,.docx,.doc,.md' },
  ];

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      {/* 顶部工具栏 */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>💬 智能对话</h3>
          
          <Space size={24}>
            <Tooltip title="Agent模式：AI将自动规划并执行多个步骤来完成复杂任务">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ThunderboltOutlined style={{ color: useAgent ? '#faad14' : '#999' }} />
                <span style={{ fontSize: 14, color: '#666' }}>Agent模式</span>
                <Switch
                  checked={useAgent}
                  onChange={setUseAgent}
                  size="small"
                />
              </div>
            </Tooltip>

            <Tooltip title="RAG增强：使用向量检索增强回答">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DatabaseOutlined style={{ color: useRag ? '#52c41a' : '#999' }} />
                <span style={{ fontSize: 14, color: '#666' }}>RAG增强</span>
                <Switch
                  checked={useRag}
                  onChange={setUseRag}
                  size="small"
                />
              </div>
            </Tooltip>
          </Space>
        </div>

        <Space>
          <Button
            icon={<UnorderedListOutlined />}
            size="small"
            onClick={() => setTaskDrawerVisible(true)}
          >
            任务
            {runningTaskCount > 0 && (
              <Badge 
                count={runningTaskCount} 
                style={{ 
                  backgroundColor: '#1890ff',
                  marginLeft: 4,
                }} 
              />
            )}
          </Button>
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
      </div>

      {/* 主内容区 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 消息列表区域 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {messages.length === 0 ? (
            /* 空状态 */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: '10vh',
              }}
            >
              <Title level={3} style={{ marginBottom: 48, color: '#333' }}>
                👋 你好，我是AI助手
              </Title>
              
              {/* 输入框容器 */}
              <div style={{ width: '100%', maxWidth: 720 }}>
                {/* 已选择文件显示区域 */}
                {selectedFiles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text type="secondary">已选择 {selectedFiles.length} 个文件:</Text>
                      <Button type="link" size="small" onClick={clearSelectedFiles}>
                        清空
                      </Button>
                    </div>
                    <Space wrap>
                      {selectedFiles.map((file, index) => (
                        <Tag
                          key={index}
                          icon={getFileIcon(file.name)}
                          closable
                          onClose={() => removeSelectedFile(index)}
                          style={{ padding: '4px 8px' }}
                        >
                          {file.name}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 输入框 */}
                <Card
                  style={{
                    borderRadius: 16,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      selectedFiles.length > 0
                        ? (useAgent 
                          ? '描述您希望如何处理这些文件...'
                          : '输入问题，AI将结合文件内容回答...')
                        : (useAgent 
                          ? '输入任务描述，Agent将自动规划并执行...'
                          : '输入问题，AI将为您提供智能回答...')
                    }
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    bordered={false}
                    style={{ 
                      fontSize: 16,
                      resize: 'none',
                    }}
                  />
                  
                  {/* 底部工具栏 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid #f0f0f0',
                    }}
                  >
                    {/* 左侧上传按钮 */}
                    <Upload
                      beforeUpload={handleFileSelect}
                      showUploadList={false}
                      accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov,.zip"
                      disabled={isUploading || selectedFiles.length >= 5}
                      multiple
                    >
                      <Button 
                        type="text" 
                        icon={<UploadOutlined />}
                        disabled={selectedFiles.length >= 5}
                        style={{ color: selectedFiles.length >= 5 ? '#999' : '#666' }}
                      >
                        {selectedFiles.length >= 5 ? '最多5个文件' : '添加文件'}
                      </Button>
                    </Upload>

                    {/* 右侧发送按钮 */}
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={isLoading || isUploading}
                      disabled={!inputValue.trim() && selectedFiles.length === 0}
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: (inputValue.trim() || selectedFiles.length > 0) ? '#1890ff' : '#d9d9d9',
                      }}
                    />
                  </div>
                </Card>

                {/* 快捷功能区 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 32,
                    marginTop: 32,
                  }}
                >
                  {quickActions.map((action) => (
                    <Upload
                      key={action.type}
                      beforeUpload={handleFileSelect}
                      showUploadList={false}
                      accept={action.accept}
                      disabled={selectedFiles.length >= 5}
                      multiple
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          cursor: selectedFiles.length >= 5 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s',
                          padding: '8px 16px',
                          borderRadius: 8,
                          opacity: selectedFiles.length >= 5 ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFiles.length < 5) {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: `${action.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            color: action.color,
                          }}
                        >
                          {action.icon}
                        </div>
                        <Text style={{ fontSize: 13, color: '#666' }}>
                          {action.label}
                        </Text>
                      </div>
                    </Upload>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 有消息时 - 消息列表 */
            <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip={useAgent ? "Agent规划中..." : "AI思考中..."} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 有消息时的底部输入框 */}
        {messages.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#fff',
              borderTop: '1px solid #e8e8e8',
              flexShrink: 0,
            }}
          >
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {/* 已选择文件显示 */}
              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Space wrap>
                    {selectedFiles.map((file, index) => (
                      <Tag
                        key={index}
                        icon={getFileIcon(file.name)}
                        closable
                        onClose={() => removeSelectedFile(index)}
                        style={{ padding: '4px 8px' }}
                      >
                        {file.name}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}

              <Card
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      selectedFiles.length > 0
                        ? '描述您希望如何处理这些文件...'
                        : '输入问题...'
                    }
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    bordered={false}
                    style={{ flex: 1, resize: 'none' }}
                  />
                  <Space>
                    <Upload
                      beforeUpload={handleFileSelect}
                      showUploadList={false}
                      accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov"
                      disabled={isUploading || selectedFiles.length >= 5}
                      multiple
                    >
                      <Button 
                        type="text" 
                        icon={<UploadOutlined />}
                        disabled={selectedFiles.length >= 5}
                      />
                    </Upload>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={isLoading || isUploading}
                      disabled={!inputValue.trim() && selectedFiles.length === 0}
                    >
                      发送
                    </Button>
                  </Space>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 已上传文件历史记录 */}
      {uploadedFilesHistory.length > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📎 已上传文件 ({uploadedFilesHistory.length})</span>
              <Button type="text" size="small" onClick={() => setUploadedFilesHistory([])}>
                清空
              </Button>
            </div>
          }
          style={{
            position: 'fixed',
            bottom: 24,
            left: 280,
            width: 320,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <List
            dataSource={uploadedFilesHistory}
            renderItem={(file) => (
              <List.Item
                style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      // 根据文件类型跳转到相应页面
                      if (file.type === 'IMAGE') {
                        window.open(`/images?id=${file.id}`, '_blank');
                      } else if (file.type === 'VIDEO') {
                        window.open(`/videos?id=${file.id}`, '_blank');
                      } else {
                        window.open(`/documents?id=${file.id}`, '_blank');
                      }
                    }}
                  >
                    查看
                  </Button>,
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getFileIcon(file.name)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {file.type} · {file.uploadedAt.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              刷新页面后记录会清空，文件可在知识库/图片库/视频库中查看
            </Text>
          </div>
        </Card>
      )}

      {/* 任务监控抽屉 */}
      <Drawer
        title="任务监控"
        placement="right"
        onClose={() => setTaskDrawerVisible(false)}
        open={taskDrawerVisible}
        width={400}
      >
        <UnifiedTaskMonitor />
      </Drawer>
    </div>
  );
};

export default ChatPage;

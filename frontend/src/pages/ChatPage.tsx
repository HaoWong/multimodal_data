import React, { useEffect, useRef, useState } from 'react';
import { Spin, Switch, Tooltip, Card, Typography, Space, Button, Upload, Input, Badge, Drawer } from 'antd';
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
} from '@ant-design/icons';
import ChatMessage from '../components/ChatMessage';
import TaskMonitor from '../components/TaskMonitor';
import { useChatStore } from '../stores/chatStore';
import { contentApi, agentApi } from '../services/api';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ChatPage: React.FC = () => {
  const { messages, isLoading, sendMessage, createNewSession, clearMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [useAgent, setUseAgent] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [taskDrawerVisible, setTaskDrawerVisible] = useState(false);
  const [runningTaskCount, setRunningTaskCount] = useState(0);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 定期检查运行中的任务数量（仅在可能有任务时）
  useEffect(() => {
    // 初始不检查，等用户打开抽屉时再检查
    // 或者只在 drawer 打开时检查
    if (!taskDrawerVisible) return;
    
    const checkTasks = async () => {
      try {
        const response = await fetch('/api/tasks/running');
        if (!response.ok) return;
        const data = await response.json();
        setRunningTaskCount(data.total || 0);
      } catch (error) {
        // 静默失败，不阻塞UI
      }
    };
    
    checkTasks();
    const interval = setInterval(checkTasks, 10000); // 10秒检查一次
    return () => clearInterval(interval);
  }, [taskDrawerVisible]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    if (useAgent) {
      await sendAgentMessage(message);
    } else {
      await sendMessage(message);
    }
  };

  const sendAgentMessage = async (message: string) => {
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
      let fullResponse = '';
      
      await agentApi.executeTaskStream(
        message,
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
        { useRag }
      );
    } catch (error) {
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
      const result = await contentApi.uploadContent(file);
      // 添加到最近文件列表
      const { addRecentFile } = useChatStore.getState();
      addRecentFile({
        id: result.id || Date.now().toString(),
        name: file.name,
        type: result.content_type || 'unknown'
      });
      
      const message = useAgent
        ? `我已经上传了文件 "${file.name}"，请帮我分析处理这个文件。`
        : `我已经上传了文件 "${file.name}"，请帮我分析一下这个文件的内容。`;
      setInputValue(message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
    return false;
  };

  // 快捷功能按钮
  const quickActions = [
    { icon: <FileImageOutlined />, label: '图片', color: '#52c41a', type: 'image' },
    { icon: <VideoCameraOutlined />, label: '视频', color: '#1890ff', type: 'video' },
    { icon: <FileTextOutlined />, label: '文档', color: '#fa8c16', type: 'document' },
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
      {/* 顶部工具栏 - 简化版 */}
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
          {/* 任务监控按钮 */}
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
            /* 空状态 - 居中显示 */
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
                      useAgent 
                        ? '输入任务描述，Agent将自动规划并执行...'
                        : '输入问题，AI将为您提供智能回答...'
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
                      beforeUpload={handleUpload}
                      showUploadList={false}
                      accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov"
                      disabled={isUploading}
                    >
                      <Button 
                        type="text" 
                        icon={<UploadOutlined />}
                        loading={isUploading}
                        style={{ color: '#666' }}
                      >
                        上传文件
                      </Button>
                    </Upload>

                    {/* 右侧发送按钮 */}
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={isLoading}
                      disabled={!inputValue.trim()}
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: inputValue.trim() ? '#1890ff' : '#d9d9d9',
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
                    <div
                      key={action.type}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        padding: '8px 16px',
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
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
                    placeholder="输入问题..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    bordered={false}
                    style={{ flex: 1, resize: 'none' }}
                  />
                  <Space>
                    <Upload
                      beforeUpload={handleUpload}
                      showUploadList={false}
                      accept=".txt,.pdf,.docx,.doc,.jpg,.jpeg,.png,.mp4,.avi,.mov"
                      disabled={isUploading}
                    >
                      <Button 
                        type="text" 
                        icon={<UploadOutlined />}
                        loading={isUploading}
                      />
                    </Upload>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={isLoading}
                      disabled={!inputValue.trim()}
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

      {/* 任务监控抽屉 */}
      <Drawer
        title="任务监控"
        placement="right"
        onClose={() => setTaskDrawerVisible(false)}
        open={taskDrawerVisible}
        width={400}
      >
        <TaskMonitor />
      </Drawer>
    </div>
  );
};

export default ChatPage;

import React, { useState } from 'react';
import { Avatar, Card, Tag, Typography, Space, Modal, Badge, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined, FileTextOutlined, FileImageOutlined, VideoCameraOutlined, FileOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType, MessageSource } from '../types';

const { Text, Paragraph, Title } = Typography;

interface ChatMessageProps {
  message: ChatMessageType;
}

// 获取来源图标
const getSourceIcon = (contentType?: string) => {
  switch (contentType) {
    case 'IMAGE':
      return <FileImageOutlined style={{ color: '#52c41a' }} />;
    case 'VIDEO':
      return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
    case 'TEXT':
      return <FileTextOutlined style={{ color: '#fa8c16' }} />;
    default:
      return <FileOutlined />;
  }
};

// 获取来源类型标签
const getSourceTypeLabel = (contentType?: string) => {
  switch (contentType) {
    case 'IMAGE':
      return '图片';
    case 'VIDEO':
      return '视频';
    case 'TEXT':
      return '文档';
    default:
      return '文档';
  }
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [selectedSource, setSelectedSource] = useState<MessageSource | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 处理来源点击
  const handleSourceClick = (source: MessageSource) => {
    setSelectedSource(source);
    setModalVisible(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom: 16,
        gap: 12,
      }}
    >
      <Avatar
        size={40}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          backgroundColor: isUser ? '#1890ff' : '#52c41a',
          flexShrink: 0,
        }}
      />

      <div
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <Card
          size="small"
          style={{
            backgroundColor: isUser ? '#e6f7ff' : '#f6ffed',
            border: 'none',
            borderRadius: 12,
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          {isUser ? (
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Paragraph>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {message.isStreaming && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              正在输入...
            </Text>
          )}
        </Card>

        {/* 引用来源 */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <FileTextOutlined /> 参考来源（点击查看详情）：
            </Text>
            <Space size={4} wrap style={{ marginTop: 4 }}>
              {message.sources.map((source, index) => (
                <Tooltip 
                  key={source.id} 
                  title={`点击查看${getSourceTypeLabel(source.content_type)}详情`}
                >
                  <Tag
                    color="blue"
                    style={{ 
                      fontSize: 11, 
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => handleSourceClick(source)}
                    icon={getSourceIcon(source.content_type)}
                  >
                    {index + 1}. {source.title}
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({(source.similarity * 100).toFixed(0)}%)
                    </span>
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </div>
        )}

        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </div>

      {/* 来源详情弹窗 */}
      <Modal
        title={
          <Space>
            {selectedSource && getSourceIcon(selectedSource.content_type)}
            <span>来源详情</span>
            {selectedSource && (
              <Tag color="blue">
                {getSourceTypeLabel(selectedSource.content_type)}
              </Tag>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedSource && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">标题：</Text>
              <Title level={5} style={{ marginTop: 4, marginBottom: 0 }}>
                {selectedSource.title}
              </Title>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Space>
                <Badge 
                  count={`相似度: ${(selectedSource.similarity * 100).toFixed(1)}%`} 
                  style={{ backgroundColor: '#52c41a' }} 
                />
                <Tag color="default">ID: {selectedSource.id}</Tag>
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">来源库：</Text>
              <Tag color="purple">{selectedSource.source || '未知'}</Tag>
            </div>

            <div>
              <Text type="secondary">内容：</Text>
              <Card 
                size="small" 
                style={{ 
                  marginTop: 8, 
                  backgroundColor: '#f5f5f5',
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedSource.text || '无内容'}
                </Paragraph>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChatMessage;

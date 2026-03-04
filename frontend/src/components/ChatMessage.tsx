import React, { useState } from 'react';
import { Avatar, Card, Tag, Typography, Space, Modal, Badge, Tooltip, Image } from 'antd';
import { UserOutlined, RobotOutlined, FileTextOutlined, FileImageOutlined, VideoCameraOutlined, FileOutlined, PaperClipOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessageProps, MessageAttachment } from '../types/components';
import { MessageSource } from '../types';

const { Text, Paragraph, Title } = Typography;

/**
 * 获取来源图标
 */
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

/**
 * 获取来源类型标签
 */
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

/**
 * 渲染消息内容
 */
const renderMessageContent = (
  content: string,
  isUser: boolean,
  contentType?: string,
  isStreaming?: boolean
) => {
  // 根据内容类型渲染不同的格式
  switch (contentType) {
    case 'image':
      return (
        <Image
          src={content}
          alt="图片消息"
          style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
          preview={{ mask: '点击查看' }}
        />
      );
    case 'markdown':
    case 'text':
    default:
      return isUser ? (
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {content}
        </Paragraph>
      ) : (
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      );
  }
};

/**
 * 渲染附件列表
 */
const renderAttachments = (attachments?: MessageAttachment[]) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        <PaperClipOutlined /> 附件 ({attachments.length}):
      </Text>
      <Space size={4} wrap style={{ marginTop: 4 }}>
        {attachments.map((attachment) => (
          <Tag
            key={attachment.id}
            color="default"
            style={{ fontSize: 11, cursor: 'pointer' }}
            icon={attachment.type.startsWith('image/') ? <FileImageOutlined /> : <FileOutlined />}
          >
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit' }}
            >
              {attachment.name}
            </a>
          </Tag>
        ))}
      </Space>
    </div>
  );
};

/**
 * 聊天消息组件
 *
 * 支持多种消息类型：文本、图片、文件、Markdown
 * 支持消息来源显示和点击
 */
const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showTimestamp = true,
  showSources = true,
  onMessageClick,
  onSourceClick,
  avatar,
  contentType,
  attachments,
  className,
  style,
  testId,
}) => {
  const isUser = message.role === 'user';
  const [selectedSource, setSelectedSource] = useState<MessageSource | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 处理来源点击
  const handleSourceClick = (source: MessageSource) => {
    if (onSourceClick) {
      onSourceClick(source);
    } else {
      setSelectedSource(source);
      setModalVisible(true);
    }
  };

  // 处理消息点击
  const handleMessageClick = () => {
    onMessageClick?.(message);
  };

  // 确定消息内容类型
  const messageContentType = contentType || (isUser ? 'text' : 'markdown');

  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom: 16,
        gap: 12,
        ...style,
      }}
    >
      {/* 头像 */}
      {avatar || (
        <Avatar
          size={40}
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{
            backgroundColor: isUser ? '#1890ff' : '#52c41a',
            flexShrink: 0,
          }}
        />
      )}

      {/* 消息内容区域 */}
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
            cursor: onMessageClick ? 'pointer' : 'default',
          }}
          bodyStyle={{ padding: '12px 16px' }}
          onClick={handleMessageClick}
        >
          {/* 消息内容 */}
          {renderMessageContent(
            message.content,
            isUser,
            messageContentType,
            message.isStreaming
          )}

          {/* 流式输出指示器 */}
          {message.isStreaming && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              正在输入...
            </Text>
          )}

          {/* 附件列表 */}
          {renderAttachments(attachments)}
        </Card>

        {/* 引用来源 */}
        {!isUser && showSources && message.sources && message.sources.length > 0 && (
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

        {/* 时间戳 */}
        {showTimestamp && (
          <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
            {message.timestamp.toLocaleTimeString()}
          </Text>
        )}
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
                  overflow: 'auto',
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

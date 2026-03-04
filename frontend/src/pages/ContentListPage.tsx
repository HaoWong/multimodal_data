import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Upload,
  Button,
  message,
  Row,
  Col,
  Image,
  Typography,
  Spin,
  Empty,
  Modal,
  Divider,
  Tag,
  Popconfirm,
  Input,
  Space,
} from 'antd';
import {
  UploadOutlined,
  EyeOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { contentApi, imageApi, documentApi, MediaItem, MediaDetail } from '../services/api';
import { useUploadStore } from '../stores';
import UnifiedTaskMonitor from '../components/UnifiedTaskMonitor';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;
const { Search } = Input;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 内容类型
export type ContentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'ALL';

// 列表项数据
export interface ContentListItem {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  created_at?: string;
  original_name?: string;
  content_type?: string;
  metadata?: any;
  source?: 'document' | 'content';
  content?: string;
  doc_type?: string;
}

// 列配置
export interface ContentColumn {
  key: string;
  title: string;
  render?: (item: ContentListItem) => React.ReactNode;
}

// 组件 Props
export interface ContentListPageProps {
  contentType: ContentType;
  title: string;
  icon: React.ReactNode;
  uploadAccept: string;
  uploadButtonText: string;
  emptyText: string;
  emptyIcon?: React.ReactNode;
  showPreview?: boolean;
  showSearch?: boolean;
  extraActions?: React.ReactNode;
  analyzingText?: string;
  analyzingDuration?: number;
  renderCardContent?: (item: ContentListItem) => React.ReactNode;
  renderCardCover?: (item: ContentListItem, handlers: {
    onPreview: (url: string) => void;
    onViewDetail: (item: ContentListItem) => void;
    onDelete: (item: ContentListItem) => void;
  }) => React.ReactNode;
  renderDetailContent?: (item: ContentListItem) => React.ReactNode;
  getFullUrl?: (url: string) => string;
  formatDuration?: (seconds?: number) => string;
}

// 获取完整URL
const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

// 格式化时长
const formatDuration = (seconds?: number) => {
  if (!seconds) return '未知时长';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 获取文件图标
const getFileIcon = (docType: string) => {
  const iconStyle = { fontSize: 48, color: '#999' };
  switch (docType?.toLowerCase()) {
    case 'pdf':
      return <FilePdfOutlined style={{ ...iconStyle, color: '#ff4d4f' }} />;
    case 'docx':
    case 'doc':
      return <FileWordOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
    default:
      return <FileTextOutlined style={{ ...iconStyle, color: '#52c41a' }} />;
  }
};

// 获取标签颜色
const getTagColor = (docType: string) => {
  switch (docType?.toLowerCase()) {
    case 'pdf':
      return 'red';
    case 'docx':
    case 'doc':
      return 'blue';
    default:
      return 'green';
  }
};

const ContentListPage: React.FC<ContentListPageProps> = ({
  contentType,
  title,
  icon,
  uploadAccept,
  uploadButtonText,
  emptyText,
  emptyIcon,
  showPreview = true,
  showSearch = true,
  extraActions,
  analyzingText = 'AI分析内容...',
  analyzingDuration = 2500,
  renderCardContent,
  renderCardCover,
  renderDetailContent,
}) => {
  const [items, setItems] = useState<ContentListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentListItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    addTask,
    updateUploadProgress,
    startAnalyzing,
    updateAnalyzingProgress,
    completeTask,
    failTask,
    setPanelOpen,
  } = useUploadStore();

  // 加载内容列表
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      let data: ContentListItem[] = [];

      if (contentType === 'IMAGE') {
        const images = await imageApi.listImages();
        data = (images || []).map((img) => ({
          ...img,
          content_type: 'image',
          title: img.original_name || img.description || '未命名图片',
        }));
      } else if (contentType === 'VIDEO') {
        const response = await contentApi.listContents('VIDEO');
        data = (response.items || []).map((v: any) => ({
          id: v.id,
          url: v.url,
          title: v.original_name || '未命名视频',
          description: v.description,
          created_at: v.created_at,
          content_type: 'video',
          metadata: v.metadata,
        }));
      } else if (contentType === 'DOCUMENT') {
        // 同时获取 documents 和 contents
        const [docsResponse, contentsResponse] = await Promise.all([
          documentApi.getDocuments().catch(() => ({ items: [], total: 0 })),
          contentApi.listContents(undefined, 0, 100).catch(() => ({ items: [], total: 0 })),
        ]);

        // 转换 contents 为文档格式
        const contentDocs = (contentsResponse.items || []).map((content: any) => ({
          id: content.id,
          title: content.original_name || content.description || '未命名文件',
          content: content.extracted_text || '',
          doc_type: content.content_type?.toLowerCase() || 'unknown',
          created_at: content.created_at,
          metadata: content.content_metadata,
          source: 'content' as const,
          content_type: 'document',
        }));

        // 合并两个列表
        data = [
          ...(docsResponse.items || []).map((d: any) => ({
            ...d,
            source: 'document' as const,
            content_type: 'document',
            title: d.title || '未命名文档',
          })),
          ...contentDocs,
        ].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
      }

      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('加载内容失败:', error);
      message.error('加载内容失败');
    } finally {
      setLoading(false);
    }
  }, [contentType]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.original_name?.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  // 处理上传
  const handleUpload = async (file: File) => {
    setPanelOpen(true);

    const taskId = addTask({
      fileName: file.name,
      fileType: contentType.toLowerCase() as 'image' | 'video' | 'document',
      progress: 0,
      status: 'uploading',
    });

    try {
      // 阶段1：上传文件（进度 0-50%）
      if (contentType === 'IMAGE') {
        await imageApi.uploadImage(file, (progress) => {
          updateUploadProgress(taskId, progress);
        });
      } else if (contentType === 'DOCUMENT') {
        await documentApi.uploadFile(file, (progress) => {
          updateUploadProgress(taskId, progress);
        });
      } else {
        await contentApi.uploadContent(file, {}, (progress) => {
          updateUploadProgress(taskId, progress);
        });
      }

      // 阶段2：AI分析（进度 50-90%）
      startAnalyzing(taskId, analyzingText);

      // 模拟AI分析进度
      let analyzingProgress = 0;
      const progressStep = contentType === 'VIDEO' ? 5 : 10;
      const intervalTime = contentType === 'VIDEO' ? 300 : 200;
      const analyzingInterval = setInterval(() => {
        analyzingProgress += progressStep;
        updateAnalyzingProgress(taskId, Math.min(analyzingProgress, 100));
        if (analyzingProgress >= 100) {
          clearInterval(analyzingInterval);
        }
      }, intervalTime);

      // 等待AI分析完成
      setTimeout(() => {
        clearInterval(analyzingInterval);
        completeTask(taskId);
        message.success('上传成功');
        loadItems();
      }, analyzingDuration);
    } catch (error) {
      failTask(taskId, '上传失败');
      message.error('上传失败');
    }

    return false;
  };

  // 查看详情
  const handleViewDetail = async (item: ContentListItem) => {
    try {
      let detail: ContentListItem | null = null;

      if (contentType === 'IMAGE') {
        const imageDetail = await imageApi.getImageDetail(item.id);
        detail = { ...imageDetail, content_type: 'image', title: imageDetail.original_name };
      } else if (contentType === 'VIDEO') {
        const videoDetail = await contentApi.getContentDetail(item.id);
        detail = {
          ...videoDetail,
          content_type: 'video',
          title: videoDetail.original_name || '未命名视频',
        };
      } else if (contentType === 'DOCUMENT') {
        if (item.source === 'content') {
          const docDetail = await contentApi.getContentDetail(item.id);
          detail = {
            ...docDetail,
            title: docDetail.original_name || docDetail.description || '未命名文件',
            content: docDetail.extracted_text || '暂无内容',
            doc_type: docDetail.content_type?.toLowerCase() || 'unknown',
            source: 'content',
          };
        } else {
          detail = await documentApi.getDocument(item.id);
        }
      }

      if (detail) {
        setSelectedItem(detail);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  // 预览
  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewVisible(true);
  };

  // 删除
  const handleDelete = async (item: ContentListItem) => {
    try {
      if (contentType === 'IMAGE') {
        await imageApi.deleteImage(item.id);
      } else if (contentType === 'DOCUMENT' && item.source === 'content') {
        await contentApi.deleteContent(item.id);
      } else if (contentType === 'DOCUMENT') {
        await documentApi.deleteDocument(item.id);
      } else {
        await contentApi.deleteContent(item.id);
      }
      message.success('删除成功');
      loadItems();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 默认渲染卡片封面
  const defaultRenderCardCover = (item: ContentListItem, handlers: {
    onPreview: (url: string) => void;
    onViewDetail: (item: ContentListItem) => void;
    onDelete: (item: ContentListItem) => void;
  }) => {
    const { onPreview, onViewDetail, onDelete } = handlers;

    if (contentType === 'IMAGE') {
      return (
        <div style={{ position: 'relative' }}>
          <Image
            alt="图片"
            src={getFullUrl(item.url || '')}
            style={{ height: 200, objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => onPreview(getFullUrl(item.url || ''))}
            preview={false}
          />
          <Popconfirm
            title="确定要删除这张图片吗？"
            onConfirm={() => onDelete(item)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              icon={<CloseOutlined />}
              size="small"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: 0.8,
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              opacity: 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(item);
            }}
          >
            详情
          </Button>
        </div>
      );
    }

    if (contentType === 'VIDEO') {
      return (
        <div style={{ position: 'relative', height: 160, background: '#f0f0f0' }}>
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              color: '#999',
              cursor: 'pointer',
            }}
            onClick={() => onPreview(getFullUrl(item.url || ''))}
          >
            <PlayCircleOutlined />
          </div>
          <Popconfirm
            title="确定要删除这个视频吗？"
            onConfirm={() => onDelete(item)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              icon={<CloseOutlined />}
              size="small"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: 0.8,
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              opacity: 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(item);
            }}
          >
            详情
          </Button>
        </div>
      );
    }

    // DOCUMENT
    return (
      <div style={{ position: 'relative', height: 160, background: '#f5f5f5' }}>
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getFileIcon(item.doc_type || item.content_type || '')}
        </div>
        <Popconfirm
          title="确定要删除这个文档吗？"
          onConfirm={() => onDelete(item)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="primary"
            danger
            icon={<CloseOutlined />}
            size="small"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              opacity: 0.8,
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            opacity: 0.8,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(item);
          }}
        >
          详情
        </Button>
      </div>
    );
  };

  // 默认渲染卡片内容
  const defaultRenderCardContent = (item: ContentListItem) => {
    if (contentType === 'IMAGE') {
      return (
        <Text ellipsis={{ tooltip: item.description }}>
          {item.description || '暂无描述'}
        </Text>
      );
    }

    if (contentType === 'VIDEO') {
      return (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Tag color="blue">{formatDuration(item.metadata?.duration)}</Tag>
            <Tag color="green">{item.metadata?.frame_count || 0} 帧</Tag>
          </div>
          <Text type="secondary" ellipsis>
            {item.description || '暂无描述'}
          </Text>
        </div>
      );
    }

    // DOCUMENT
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Tag color={getTagColor(item.doc_type || '')}>
            {(item.doc_type || 'UNKNOWN').toUpperCase()}
          </Tag>
        </div>
        <Text type="secondary" ellipsis>
          {item.content?.slice(0, 100) || '暂无内容'}
        </Text>
      </div>
    );
  };

  // 默认渲染详情内容
  const defaultRenderDetailContent = (item: ContentListItem) => {
    if (contentType === 'IMAGE') {
      return (
        <div>
          <Image
            src={getFullUrl(item.url || '')}
            style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
          />
          <Divider />
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <Typography.Title level={5}>AI 分析内容</Typography.Title>
            <ReactMarkdown>{item.description || '暂无分析内容'}</ReactMarkdown>
          </div>
        </div>
      );
    }

    if (contentType === 'VIDEO') {
      return (
        <div>
          <video
            src={getFullUrl(item.url || '')}
            controls
            style={{ width: '100%', maxHeight: 300 }}
          />
          <Divider />
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <Typography.Title level={5}>AI 分析内容</Typography.Title>
            <ReactMarkdown>{item.description || '暂无分析内容'}</ReactMarkdown>
          </div>
        </div>
      );
    }

    // DOCUMENT
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Tag color={getTagColor(item.doc_type || '')}>
            {(item.doc_type || 'UNKNOWN').toUpperCase()}
          </Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {item.created_at && new Date(item.created_at).toLocaleString()}
          </Text>
        </div>
        <Typography.Title level={4}>{item.title}</Typography.Title>
        <Divider />
        <div
          style={{
            maxHeight: 500,
            overflow: 'auto',
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <ReactMarkdown>{item.content || '暂无内容'}</ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon}
            {title}
          </h2>
          <Space>
            {showSearch && (
              <Search
                placeholder="搜索..."
                allowClear
                onSearch={setSearchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
              />
            )}
            {extraActions}
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept={uploadAccept}
            >
              <Button icon={<UploadOutlined />} type="primary">
                {uploadButtonText}
              </Button>
            </Upload>
          </Space>
        </div>

        <Spin spinning={loading}>
          {filteredItems.length === 0 ? (
            <Empty
              image={emptyIcon || <FileOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description={items.length === 0 ? emptyText : '没有找到匹配的内容'}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredItems.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
                      renderCardCover
                        ? renderCardCover(item, {
                            onPreview: handlePreview,
                            onViewDetail: handleViewDetail,
                            onDelete: handleDelete,
                          })
                        : defaultRenderCardCover(item, {
                            onPreview: handlePreview,
                            onViewDetail: handleViewDetail,
                            onDelete: handleDelete,
                          })
                    }
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis={{ tooltip: item.title || item.original_name }}>
                          {item.title || item.original_name || '未命名'}
                        </Text>
                      }
                      description={
                        renderCardContent
                          ? renderCardContent(item)
                          : defaultRenderCardContent(item)
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </Card>

      {/* 预览模态框 */}
      {showPreview && contentType !== 'DOCUMENT' && (
        <Modal
          open={previewVisible}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width="80%"
          centered
          title={contentType === 'VIDEO' ? '视频播放' : undefined}
        >
          {contentType === 'IMAGE' ? (
            <Image src={previewUrl} style={{ width: '100%' }} preview={false} />
          ) : (
            <video src={previewUrl} controls style={{ width: '100%', maxHeight: 500 }} />
          )}
        </Modal>
      )}

      {/* 详情模态框 */}
      <Modal
        title={`${title.replace(/[🖼️🎬📚]/g, '').trim()}详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedItem &&
          (renderDetailContent
            ? renderDetailContent(selectedItem)
            : defaultRenderDetailContent(selectedItem))}
      </Modal>

      {/* 统一任务监控面板 */}
      <UnifiedTaskMonitor />
    </div>
  );
};

export default ContentListPage;

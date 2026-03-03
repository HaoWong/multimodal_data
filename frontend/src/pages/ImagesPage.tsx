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
  Popconfirm,
} from 'antd';
import { UploadOutlined, PictureOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { imageApi, MediaItem, MediaDetail } from '../services/api';
import { useUploadStore } from '../stores';
import UnifiedTaskMonitor from '../components/UnifiedTaskMonitor';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 获取完整图片URL
const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

const ImagesPage: React.FC = () => {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  const { addTask, updateUploadProgress, startAnalyzing, updateAnalyzingProgress, completeTask, failTask, setPanelOpen } = useUploadStore();

  // 加载图片列表
  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await imageApi.listImages();
      setImages(data || []);
    } catch (error) {
      console.error('加载图片失败:', error);
      message.error('加载图片失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // 处理图片上传（三阶段进度：上传 → AI分析 → 完成）
  const handleUpload = async (file: File) => {
    // 打开上传进度面板
    setPanelOpen(true);
    
    // 添加任务到上传队列
    const taskId = addTask({
      fileName: file.name,
      fileType: 'image',
      progress: 0,
      status: 'uploading',
    });

    try {
      // 阶段1：上传文件（进度 0-50%）
      await imageApi.uploadImage(file, (progress) => {
        updateUploadProgress(taskId, progress);
      });
      
      // 阶段2：AI分析（进度 50-90%）
      startAnalyzing(taskId, 'AI分析图片内容...');
      
      // 模拟AI分析进度
      let analyzingProgress = 0;
      const analyzingInterval = setInterval(() => {
        analyzingProgress += 10;
        updateAnalyzingProgress(taskId, Math.min(analyzingProgress, 100));
        if (analyzingProgress >= 100) {
          clearInterval(analyzingInterval);
        }
      }, 200);
      
      // 等待AI分析完成
      setTimeout(() => {
        clearInterval(analyzingInterval);
        // 阶段3：完成（100%）
        completeTask(taskId);
        message.success('图片上传成功');
        loadImages();
      }, 2500);
    } catch (error) {
      failTask(taskId, '上传失败');
      message.error('图片上传失败');
    }
    
    return false;
  };

  // 查看图片详情
  const handleViewDetail = async (image: MediaItem) => {
    try {
      const detail = await imageApi.getImageDetail(image.id);
      setSelectedImage(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  // 预览图片
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 删除图片
  const handleDelete = async (id: string) => {
    try {
      await imageApi.deleteImage(id);
      message.success('图片删除成功');
      loadImages();
    } catch (error) {
      message.error('删除失败');
    }
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
          }}
        >
          <h2 style={{ margin: 0 }}>🖼️ 图片库</h2>
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".jpg,.jpeg,.png,.gif,.webp"
          >
            <Button icon={<UploadOutlined />} type="primary">
              上传图片
            </Button>
          </Upload>
        </div>

        <Spin spinning={loading}>
          {images.length === 0 ? (
            <Empty
              image={<PictureOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description="暂无图片，请上传"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {images.map((img) => (
                <Col key={img.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ position: 'relative' }}>
                        <Image
                          alt="图片"
                          src={getFullImageUrl(img.url)}
                          style={{ height: 200, objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => handlePreview(getFullImageUrl(img.url))}
                          preview={false}
                        />
                        {/* 删除按钮 - 右上角X号 */}
                        <Popconfirm
                          title="确定要删除这张图片吗？"
                          onConfirm={() => handleDelete(img.id)}
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
                            handleViewDetail(img);
                          }}
                        >
                          详情
                        </Button>
                      </div>
                    }
                  >
                    <Card.Meta
                      description={
                        <Text ellipsis={{ tooltip: img.description }}>
                          {img.description || '暂无描述'}
                        </Text>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </Card>

      {/* 图片预览 */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        centered
      >
        <Image src={previewImage} style={{ width: '100%' }} preview={false} />
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="图片详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedImage && (
          <div>
            <Image
              src={getFullImageUrl(selectedImage.url)}
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
            />
            <Divider />
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <Typography.Title level={5}>AI 分析内容</Typography.Title>
              <ReactMarkdown>
                {selectedImage.description || '暂无分析内容'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>

      {/* 统一任务监控面板 */}
      <UnifiedTaskMonitor />
    </div>
  );
};

export default ImagesPage;

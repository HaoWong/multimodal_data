import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Upload,
  Button,
  message,
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Modal,
  Divider,
  Tag,
  Popconfirm,
} from 'antd';
import { UploadOutlined, VideoCameraOutlined, PlayCircleOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { contentApi, MediaItem, MediaDetail } from '../services/api';
import { useUploadStore } from '../stores';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

const VideosPage: React.FC = () => {
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewVideo, setPreviewVideo] = useState('');
  
  const { addTask, updateUploadProgress, startAnalyzing, updateAnalyzingProgress, completeTask, failTask } = useUploadStore();

  // 加载视频列表
  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contentApi.listContents('VIDEO');
      // 转换为 MediaItem 格式
      const formatted = (data || []).map((v: any) => ({
        id: v.id,
        url: v.url,
        type: 'video' as const,
        original_name: v.original_name,
        description: v.description,
        created_at: v.created_at,
        metadata: v.metadata,
      }));
      setVideos(formatted);
    } catch (error) {
      console.error('加载视频失败:', error);
      message.error('加载视频失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // 处理视频上传（三阶段进度：上传 → AI分析 → 完成）
  const handleUpload = async (file: File) => {
    // 添加任务到上传队列
    const taskId = addTask({
      fileName: file.name,
      fileType: 'video',
      progress: 0,
      status: 'uploading',
    });

    try {
      // 阶段1：上传文件（进度 0-50%）
      await contentApi.uploadContent(file, {}, (progress) => {
        updateUploadProgress(taskId, progress);
      });
      
      // 阶段2：AI分析（进度 50-90%）
      startAnalyzing(taskId, 'AI分析视频内容（可能需要转码）...');
      
      // 模拟AI分析进度（视频需要更长时间）
      let analyzingProgress = 0;
      const analyzingInterval = setInterval(() => {
        analyzingProgress += 5;
        updateAnalyzingProgress(taskId, Math.min(analyzingProgress, 100));
        if (analyzingProgress >= 100) {
          clearInterval(analyzingInterval);
        }
      }, 300);
      
      // 等待AI分析完成
      setTimeout(() => {
        clearInterval(analyzingInterval);
        // 阶段3：完成（100%）
        completeTask(taskId);
        message.success('视频上传成功');
        loadVideos();
      }, 6500);
    } catch (error) {
      failTask(taskId, '上传失败');
      message.error('视频上传失败');
    }
    
    return false;
  };

  // 查看视频详情
  const handleViewDetail = async (video: MediaItem) => {
    try {
      const detail = await contentApi.getContentDetail(video.id);
      setSelectedVideo(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  // 播放视频
  const handlePlay = (url: string) => {
    setPreviewVideo(url);
    setPreviewVisible(true);
  };

  // 格式化时长
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知时长';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 删除视频
  const handleDelete = async (id: string) => {
    try {
      await contentApi.deleteContent(id);
      message.success('视频删除成功');
      loadVideos();
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
          <h2 style={{ margin: 0 }}>🎬 视频库</h2>
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".mp4,.avi,.mov,.wmv,.mkv"
          >
            <Button icon={<UploadOutlined />} type="primary">
              上传视频
            </Button>
          </Upload>
        </div>

        <Spin spinning={loading}>
          {videos.length === 0 ? (
            <Empty
              image={<VideoCameraOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description="暂无视频，请上传"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {videos.map((video) => (
                <Col key={video.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
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
                          onClick={() => handlePlay(video.url)}
                        >
                          <PlayCircleOutlined />
                        </div>
                        {/* 删除按钮 - 右上角X号 */}
                        <Popconfirm
                          title="确定要删除这个视频吗？"
                          onConfirm={() => handleDelete(video.id)}
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
                            handleViewDetail(video);
                          }}
                        >
                          详情
                        </Button>
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis={{ tooltip: video.original_name }}>
                          {video.original_name || '未命名视频'}
                        </Text>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Tag color="blue">
                              {formatDuration(video.metadata?.duration)}
                            </Tag>
                            <Tag color="green">
                              {video.metadata?.frame_count || 0} 帧
                            </Tag>
                          </div>
                          <Text type="secondary" ellipsis>
                            {video.description || '暂无描述'}
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </Card>

      {/* 视频播放 */}
      <Modal
        title="视频播放"
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        centered
      >
        <video
          src={previewVideo}
          controls
          style={{ width: '100%', maxHeight: 500 }}
        />
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="视频详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedVideo && (
          <div>
            <video
              src={selectedVideo.url}
              controls
              style={{ width: '100%', maxHeight: 300 }}
            />
            <Divider />
            <div style={{ maxHeight: 300, overflow: 'auto' }}>
              <Typography.Title level={5}>AI 分析内容</Typography.Title>
              <ReactMarkdown>
                {selectedVideo.description || '暂无分析内容'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VideosPage;

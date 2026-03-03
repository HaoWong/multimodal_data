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
  Form,
  Input,
  Popconfirm,
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  EyeOutlined,
  FileOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { documentApi } from '../services/api';
import { useUploadStore } from '../stores';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

interface DocumentItem {
  id: string;
  title: string;
  content?: string;
  doc_type: string;
  created_at?: string;
  metadata?: any;
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const { addTask, updateUploadProgress, startAnalyzing, updateAnalyzingProgress, completeTask, failTask } = useUploadStore();

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await documentApi.getDocuments();
      setDocuments(docs || []);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 创建文档
  const handleCreate = async (values: { title: string; content: string }) => {
    try {
      await documentApi.createDocument({
        title: values.title,
        content: values.content,
        doc_type: 'text',
      });
      message.success('文档创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadDocuments();
    } catch (error) {
      message.error('创建文档失败');
    }
  };

  // 上传文件（三阶段进度：上传 → AI分析 → 完成）
  const handleUpload = async (file: File) => {
    // 添加任务到上传队列
    const taskId = addTask({
      fileName: file.name,
      fileType: 'document',
      progress: 0,
      status: 'uploading',
    });

    try {
      // 阶段1：上传文件（进度 0-50%）
      await documentApi.uploadFile(file, (progress) => {
        updateUploadProgress(taskId, progress);
      });
      
      // 阶段2：AI分析（进度 50-90%）
      startAnalyzing(taskId, 'AI分析文档内容...');
      
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
        message.success('文件上传成功');
        loadDocuments();
      }, 2500);
    } catch (error) {
      failTask(taskId, '上传失败');
      message.error('上传失败');
    }
    
    return false;
  };

  // 删除文档
  const handleDelete = async (id: string) => {
    try {
      await documentApi.deleteDocument(id);
      message.success('文档删除成功');
      loadDocuments();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 查看文档详情
  const handleViewDetail = async (doc: DocumentItem) => {
    try {
      const detail = await documentApi.getDocument(doc.id);
      setSelectedDoc(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  // 获取文件图标
  const getFileIcon = (docType: string) => {
    const iconStyle = { fontSize: 48, color: '#999' };
    switch (docType) {
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
    switch (docType) {
      case 'pdf':
        return 'red';
      case 'docx':
      case 'doc':
        return 'blue';
      default:
        return 'green';
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
          <h2 style={{ margin: 0 }}>📚 知识库</h2>
          <div>
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept=".txt,.pdf,.docx,.doc,.md"
              style={{ marginRight: 8 }}
            >
              <Button icon={<UploadOutlined />} style={{ marginRight: 8 }}>
                上传文件
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建文档
            </Button>
          </div>
        </div>

        <Spin spinning={loading}>
          {documents.length === 0 ? (
            <Empty
              image={<FileOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description="暂无文档，请上传或创建"
            />
          ) : (
            <Row gutter={[16, 16]}>
              {documents.map((doc) => (
                <Col key={doc.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ position: 'relative', height: 160, background: '#f5f5f5' }}>
                        <div
                          style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getFileIcon(doc.doc_type)}
                        </div>
                        {/* 删除按钮 - 右上角X号 */}
                        <Popconfirm
                          title="确定要删除这个文档吗？"
                          onConfirm={() => handleDelete(doc.id)}
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
                            handleViewDetail(doc);
                          }}
                        >
                          详情
                        </Button>
                      </div>
                    }
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis={{ tooltip: doc.title }}>
                          {doc.title}
                        </Text>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Tag color={getTagColor(doc.doc_type)}>
                              {doc.doc_type.toUpperCase()}
                            </Tag>
                          </div>
                          <Text type="secondary" ellipsis>
                            {doc.content?.slice(0, 100) || '暂无内容'}
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

      {/* 创建文档弹窗 */}
      <Modal
        title="新建文档"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        width={700}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea
              rows={10}
              placeholder="请输入文档内容..."
              showCount
              maxLength={50000}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="文档详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedDoc && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Tag color={getTagColor(selectedDoc.doc_type)}>
                {selectedDoc.doc_type.toUpperCase()}
              </Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                {selectedDoc.created_at && new Date(selectedDoc.created_at).toLocaleString()}
              </Text>
            </div>
            <Typography.Title level={4}>{selectedDoc.title}</Typography.Title>
            <Divider />
            <div style={{ maxHeight: 500, overflow: 'auto', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
              <ReactMarkdown>
                {selectedDoc.content || '暂无内容'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentsPage;

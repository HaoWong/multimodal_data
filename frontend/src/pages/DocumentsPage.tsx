import React, { useState } from 'react';
import { Button, Form, Input, Modal, message, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, FileOutlined, FilePdfOutlined, FileWordOutlined, FileTextOutlined } from '@ant-design/icons';
import ContentListPage, { ContentListItem } from './ContentListPage';
import { documentApi } from '../services/api';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

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

const DocumentsPage: React.FC = () => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [refreshKey, setRefreshKey] = useState(0);

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
      // 触发刷新
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      message.error('创建文档失败');
    }
  };

  // 自定义渲染详情内容
  const renderDetailContent = (item: ContentListItem) => {
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
    <>
      <ContentListPage
        key={refreshKey}
        contentType="DOCUMENT"
        title="知识库"
        icon={<span>📚</span>}
        uploadAccept=".txt,.pdf,.docx,.doc,.md"
        uploadButtonText="上传文件"
        emptyText="暂无文档，请上传或创建"
        emptyIcon={<FileOutlined style={{ fontSize: 64, color: '#ccc' }} />}
        analyzingText="AI分析文档内容..."
        analyzingDuration={2500}
        extraActions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建文档
          </Button>
        }
        renderDetailContent={renderDetailContent}
      />

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
    </>
  );
};

export default DocumentsPage;

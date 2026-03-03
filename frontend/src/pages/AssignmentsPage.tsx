import React, { useEffect, useState } from 'react';
import {
  Card, Button, List, Tag, Modal, Form, Input, Select, Tabs, Timeline, Empty, Spin, message, Badge, Typography, Drawer
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, FileImageOutlined, VideoCameraOutlined, RobotOutlined, LinkOutlined, DisconnectOutlined
} from '@ant-design/icons';
import { assignmentApi, Assignment, ContentItem } from '../services/assignmentApi';
import { contentApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const AssignmentTypeMap: Record<string, { label: string; color: string }> = {
  design: { label: '设计作业', color: 'blue' },
  experiment: { label: '实验报告', color: 'green' },
  project: { label: '项目作业', color: 'purple' },
  research: { label: '研究报告', color: 'orange' },
  other: { label: '其他', color: 'default' },
};

const StatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  in_progress: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  archived: { label: '已归档', color: 'default' },
};

const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [form] = Form.useForm();
  const [availableContents, setAvailableContents] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadAssignments();
    loadAvailableContents();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await assignmentApi.listAssignments();
      setAssignments(data);
    } catch (error) {
      message.error('加载作业列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableContents = async () => {
    try {
      const contents = await contentApi.listContents();
      setAvailableContents(contents);
    } catch (error) {
      console.error('加载内容失败', error);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await assignmentApi.createAssignment(values);
      message.success('作业创建成功');
      setModalVisible(false);
      form.resetFields();
      loadAssignments();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      onOk: async () => {
        try {
          await assignmentApi.deleteAssignment(id);
          message.success('删除成功');
          loadAssignments();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleAnalyze = async (assignment: Assignment) => {
    setAnalyzing(true);
    try {
      await assignmentApi.analyzeAssignment(assignment.id);
      message.success('分析完成');
      loadAssignments();
      // 刷新当前作业详情
      if (currentAssignment?.id === assignment.id) {
        const updated = await assignmentApi.getAssignment(assignment.id);
        setCurrentAssignment(updated);
      }
    } catch (error) {
      message.error('分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddContent = async (assignmentId: string, contentId: string, role: string) => {
    try {
      await assignmentApi.addContent(assignmentId, contentId, role);
      message.success('内容已添加');
      const updated = await assignmentApi.getAssignment(assignmentId);
      setCurrentAssignment(updated);
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleRemoveContent = async (assignmentId: string, contentId: string) => {
    try {
      await assignmentApi.removeContent(assignmentId, contentId);
      message.success('内容已移除');
      const updated = await assignmentApi.getAssignment(assignmentId);
      setCurrentAssignment(updated);
    } catch (error) {
      message.error('移除失败');
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !currentAssignment) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // 添加用户消息到界面
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, created_at: new Date().toISOString() }]);
    
    try {
      const result = await assignmentApi.chat(currentAssignment.id, userMessage);
      // 添加AI回复
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response, 
        created_at: new Date().toISOString(),
        referenced_contents: result.referenced_contents 
      }]);
    } catch (err) {
      message.error('对话失败');
    }
  };

  const openDetail = async (assignment: Assignment) => {
    setCurrentAssignment(assignment);
    setDetailVisible(true);
    // 加载对话历史
    try {
      const history = await assignmentApi.getChatHistory(assignment.id);
      setChatMessages(history);
    } catch (error) {
      console.error('加载对话历史失败', error);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'TEXT': return <FileTextOutlined />;
      case 'IMAGE': return <FileImageOutlined />;
      case 'VIDEO': return <VideoCameraOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>📚 作业管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          新建作业
        </Button>
      </div>

      <Spin spinning={loading}>
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
          dataSource={assignments}
          renderItem={(assignment) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => openDetail(assignment)}
                actions={[
                  <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openDetail(assignment); }}>查看</Button>,
                  <Button type="text" icon={<RobotOutlined />} onClick={(e) => { e.stopPropagation(); handleAnalyze(assignment); }} loading={analyzing}>分析</Button>,
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(assignment.id); }}>删除</Button>,
                ]}
              >
                <Card.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text ellipsis style={{ maxWidth: 150 }}>{assignment.title}</Text>
                      <Badge status={StatusMap[assignment.status]?.color as any} text={StatusMap[assignment.status]?.label} />
                    </div>
                  }
                  description={
                    <div>
                      <Tag color={AssignmentTypeMap[assignment.assignment_type]?.color}>
                        {AssignmentTypeMap[assignment.assignment_type]?.label}
                      </Tag>
                      <div style={{ marginTop: 8, color: '#666' }}>
                        <Text type="secondary">{assignment.content_count} 个文件</Text>
                      </div>
                      {assignment.ai_analysis && (
                        <div style={{ marginTop: 8 }}>
                          <Tag color="blue">已分析</Tag>
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      </Spin>

      {/* 新建作业模态框 */}
      <Modal
        title="新建作业"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="输入作业标题" />
          </Form.Item>
          <Form.Item name="assignment_type" label="类型" initialValue="other">
            <Select>
              <Option value="design">设计作业</Option>
              <Option value="experiment">实验报告</Option>
              <Option value="project">项目作业</Option>
              <Option value="research">研究报告</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="描述作业内容..." />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 作业详情抽屉 */}
      <Drawer
        title={currentAssignment?.title}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={900}
      >
        {currentAssignment && (
          <Tabs defaultActiveKey="overview">
            <Tabs.TabPane tab="概览" key="overview">
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Tag color={AssignmentTypeMap[currentAssignment.assignment_type]?.color}>
                    {AssignmentTypeMap[currentAssignment.assignment_type]?.label}
                  </Tag>
                  <Tag color={StatusMap[currentAssignment.status]?.color}>
                    {StatusMap[currentAssignment.status]?.label}
                  </Tag>
                </div>
                <Text>{currentAssignment.description || '暂无描述'}</Text>
              </Card>

              {currentAssignment.ai_analysis && (
                <Card title="🤖 AI 分析" style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>整体分析</Title>
                    <Text>{currentAssignment.ai_analysis}</Text>
                  </div>
                  
                  {currentAssignment.ai_suggestions && currentAssignment.ai_suggestions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>改进建议</Title>
                      <Timeline>
                        {currentAssignment.ai_suggestions.map((suggestion, idx) => (
                          <Timeline.Item key={idx}>{suggestion}</Timeline.Item>
                        ))}
                      </Timeline>
                    </div>
                  )}
                  
                  {currentAssignment.ai_steps && currentAssignment.ai_steps.length > 0 && (
                    <div>
                      <Title level={5}>执行步骤</Title>
                      <Timeline>
                        {currentAssignment.ai_steps.map((step, idx) => (
                          <Timeline.Item key={idx}>{step}</Timeline.Item>
                        ))}
                      </Timeline>
                    </div>
                  )}
                </Card>
              )}
            </Tabs.TabPane>

            <Tabs.TabPane tab="内容管理" key="contents">
              <Card title="已关联内容">
                <List
                  dataSource={currentAssignment.contents || []}
                  renderItem={(content: ContentItem) => (
                    <List.Item
                      actions={[
                        <Button 
                          type="text" 
                          danger 
                          icon={<DisconnectOutlined />}
                          onClick={() => handleRemoveContent(currentAssignment.id, content.id)}
                        >
                          移除
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={getContentIcon(content.content_type)}
                        title={content.original_name}
                        description={content.content_type}
                      />
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="添加内容" style={{ marginTop: 16 }}>
                <List
                  dataSource={availableContents.filter(c => 
                    !currentAssignment.contents?.some(ac => ac.id === c.id)
                  )}
                  renderItem={(content) => (
                    <List.Item
                      actions={[
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => handleAddContent(
                            currentAssignment.id, 
                            content.id, 
                            content.content_type.toLowerCase()
                          )}
                        >
                          添加
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={getContentIcon(content.content_type)}
                        title={content.original_name}
                        description={content.content_type}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Tabs.TabPane>

            <Tabs.TabPane tab="智能对话" key="chat">
              <Card>
                <div style={{ height: 400, overflowY: 'auto', marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  {chatMessages.length === 0 ? (
                    <Empty description="开始与AI助手对话" />
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} style={{ marginBottom: 16, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        <div style={{
                          display: 'inline-block',
                          maxWidth: '80%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: msg.role === 'user' ? '#1890ff' : '#fff',
                          color: msg.role === 'user' ? '#fff' : '#333',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <Text style={{ color: 'inherit' }}>{msg.content}</Text>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextArea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入问题，询问关于作业的任何内容..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleChat();
                      }
                    }}
                  />
                  <Button type="primary" onClick={handleChat}>发送</Button>
                </div>
              </Card>
            </Tabs.TabPane>
          </Tabs>
        )}
      </Drawer>
    </div>
  );
};

export default AssignmentsPage;

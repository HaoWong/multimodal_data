import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Progress, Button, Empty, Badge, Modal, Timeline, Tabs } from 'antd';
import {
  CloseOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useUploadStore, UploadTask } from '../stores/uploadStore';
import { agentApi } from '../services/api';

// Agent 任务类型
interface AgentTask {
  task_id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  step_count: number;
  has_result: boolean;
}

interface TaskDetail {
  task_id: string;
  description: string;
  status: string;
  final_result: string;
  created_at: string;
  completed_at?: string;
  steps: Array<{
    step_number: number;
    skill_name: string;
    reasoning: string;
    success?: boolean;
    error?: string;
  }>;
}

const UnifiedTaskMonitor: React.FC = () => {
  // 上传任务状态
  const { tasks: uploadTasks, isPanelOpen, setPanelOpen, removeTask, clearCompleted } = useUploadStore();
  
  // Agent 任务状态
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'agent'>('upload');

  // 获取 Agent 任务
  const fetchAgentTasks = async () => {
    setAgentLoading(true);
    try {
      const data = await agentApi.listTasks(20);
      setAgentTasks(data.tasks || []);
    } catch (error) {
      console.error('获取Agent任务失败:', error);
    } finally {
      setAgentLoading(false);
    }
  };

  // 获取 Agent 任务详情
  const fetchAgentTaskDetail = async (taskId: string) => {
    setDetailLoading(true);
    try {
      const data = await agentApi.getTask(taskId);
      setSelectedTask(data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取任务详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // 自动刷新 Agent 任务
  useEffect(() => {
    fetchAgentTasks();
    const interval = setInterval(fetchAgentTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // 上传任务图标
  const getUploadTaskIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
      case 'image':
        return <FileImageOutlined style={{ color: '#52c41a' }} />;
      case 'document':
        return <FileTextOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  // 上传任务状态标签
  const getUploadStatusTag = (task: UploadTask) => {
    switch (task.phase) {
      case 'uploading':
        return <Tag icon={<LoadingOutlined />} color="blue">上传中</Tag>;
      case 'analyzing':
        return <Tag icon={<LoadingOutlined />} color="orange">AI分析中</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="green">完成</Tag>;
      case 'error':
        return <Tag icon={<CloseCircleOutlined />} color="red">失败</Tag>;
      default:
        return <Tag color="default">等待中</Tag>;
    }
  };

  // Agent 任务状态标签
  const getAgentStatusTag = (status: string) => {
    switch (status) {
      case 'running':
        return <Tag icon={<LoadingOutlined />} color="blue">执行中</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="green">已完成</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="red">失败</Tag>;
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="orange">等待中</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 计算活动任务数
  const activeUploadCount = uploadTasks.filter(
    (t) => t.phase === 'uploading' || t.phase === 'analyzing'
  ).length;
  const activeAgentCount = agentTasks.filter(t => t.status === 'running').length;
  const totalActiveCount = activeUploadCount + activeAgentCount;

  // 如果没有任务且面板关闭，不显示
  if (!isPanelOpen && uploadTasks.length === 0 && agentTasks.length === 0) {
    return null;
  }

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              任务监控
              {totalActiveCount > 0 && (
                <Badge
                  count={totalActiveCount}
                  style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                />
              )}
            </span>
            <div>
              {activeTab === 'upload' && (
                <Button
                  type="text"
                  size="small"
                  onClick={clearCompleted}
                  style={{ marginRight: 8 }}
                >
                  清空已完成
                </Button>
              )}
              {activeTab === 'agent' && (
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={fetchAgentTasks}
                  loading={agentLoading}
                  style={{ marginRight: 8 }}
                >
                  刷新
                </Button>
              )}
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setPanelOpen(false)}
              />
            </div>
          </div>
        }
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 420,
          maxHeight: 600,
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'upload' | 'agent')}
          items={[
            {
              key: 'upload',
              label: (
                <span>
                  <CloudUploadOutlined />
                  上传任务
                  {activeUploadCount > 0 && (
                    <Badge count={activeUploadCount} style={{ marginLeft: 4 }} />
                  )}
                </span>
              ),
              children: uploadTasks.length === 0 ? (
                <Empty description="暂无上传任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={uploadTasks}
                  renderItem={(task) => (
                    <List.Item
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getUploadTaskIcon(task.fileType)}
                            <span style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.fileName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getUploadStatusTag(task)}
                            {(task.phase === 'completed' || task.phase === 'error') && (
                              <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={() => removeTask(task.id)}
                              />
                            )}
                          </div>
                        </div>

                        <Progress
                          percent={task.progress}
                          size="small"
                          status={task.phase === 'error' ? 'exception' : task.phase === 'completed' ? 'success' : 'active'}
                          style={{ marginBottom: 4 }}
                        />

                        {task.message && (
                          <div style={{ fontSize: 12, color: '#666' }}>
                            {task.message}
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'agent',
              label: (
                <span>
                  <RobotOutlined />
                  Agent任务
                  {activeAgentCount > 0 && (
                    <Badge count={activeAgentCount} style={{ marginLeft: 4 }} />
                  )}
                </span>
              ),
              children: agentTasks.length === 0 ? (
                <Empty description="暂无 Agent 任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={agentTasks}
                  renderItem={(task) => (
                    <List.Item
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                      actions={[
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => fetchAgentTaskDetail(task.task_id)}
                        >
                          详情
                        </Button>,
                      ]}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <RobotOutlined style={{ color: '#722ed1' }} />
                            <span style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {task.description}
                            </span>
                          </div>
                          {getAgentStatusTag(task.status)}
                        </div>

                        <div style={{ fontSize: 12, color: '#666' }}>
                          步骤: {task.step_count} |
                          时间: {new Date(task.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Agent 任务详情弹窗 */}
      <Modal
        title="任务详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
        loading={detailLoading}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>任务ID:</strong> {selectedTask.task_id}</p>
              <p><strong>描述:</strong> {selectedTask.description}</p>
              <p><strong>状态:</strong> {getAgentStatusTag(selectedTask.status)}</p>
              <p><strong>创建时间:</strong> {new Date(selectedTask.created_at).toLocaleString()}</p>
              {selectedTask.completed_at && (
                <p><strong>完成时间:</strong> {new Date(selectedTask.completed_at).toLocaleString()}</p>
              )}
            </div>

            {selectedTask.steps.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>执行步骤</h4>
                <Timeline>
                  {selectedTask.steps.map((step) => (
                    <Timeline.Item
                      key={step.step_number}
                      dot={
                        step.success === true ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                        step.success === false ? <CloseCircleOutlined style={{ color: '#f5222d' }} /> :
                        <LoadingOutlined style={{ color: '#1890ff' }} />
                      }
                    >
                      <p><strong>步骤 {step.step_number}:</strong> {step.skill_name}</p>
                      <p style={{ color: '#666', fontSize: 12 }}>{step.reasoning}</p>
                      {step.error && (
                        <p style={{ color: '#f5222d', fontSize: 12 }}>错误: {step.error}</p>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}

            {selectedTask.final_result && (
              <div>
                <h4>执行结果</h4>
                <div
                  style={{
                    background: '#f6ffed',
                    padding: 12,
                    borderRadius: 4,
                    border: '1px solid #b7eb8f',
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {selectedTask.final_result}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default UnifiedTaskMonitor;

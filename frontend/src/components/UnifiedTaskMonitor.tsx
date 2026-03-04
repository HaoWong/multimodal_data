import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  FileOutlined,
} from '@ant-design/icons';
import { useUploadStore, UploadTask } from '../stores/uploadStore';
import { agentApi, AgentTask, AgentTaskDetail } from '../services/api';
import { TaskMonitorProps, TaskItem, TaskStep, AgentTaskDetail as AgentTaskDetailType, TaskStatus } from '../types/components';

/**
 * 将上传任务转换为统一任务格式
 */
const mapUploadTaskToTaskItem = (task: UploadTask): TaskItem => ({
  id: task.id,
  type: 'upload',
  name: task.fileName,
  status: task.phase === 'completed' ? 'completed' : task.phase === 'error' ? 'failed' : 'running',
  progress: task.progress,
  message: task.message,
  createdAt: new Date(task.id), // 使用 id 作为时间戳
  meta: { fileType: task.fileType },
});

/**
 * 将 Agent 任务转换为统一任务格式
 */
const mapAgentTaskToTaskItem = (task: AgentTask): TaskItem => ({
  id: task.task_id,
  type: 'agent',
  name: task.description,
  status: task.status as TaskStatus,
  progress: task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0,
  createdAt: new Date(task.created_at),
  completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
  meta: { stepCount: task.step_count },
});

/**
 * 获取上传任务图标
 */
const getUploadTaskIcon = (fileType: string) => {
  switch (fileType) {
    case 'video':
      return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
    case 'image':
      return <FileImageOutlined style={{ color: '#52c41a' }} />;
    case 'document':
      return <FileTextOutlined style={{ color: '#fa8c16' }} />;
    default:
      return <FileOutlined />;
  }
};

/**
 * 获取上传任务状态标签
 */
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

/**
 * 获取 Agent 任务状态标签
 */
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

/**
 * 统一任务监控组件
 *
 * 支持上传任务和 Agent 任务的统一监控
 * 统一的任务状态显示
 */
const UnifiedTaskMonitor: React.FC<TaskMonitorProps> = ({
  tasks: propTasks,
  agentTasks: propAgentTasks,
  isOpen: propIsOpen,
  onOpenChange,
  onRemoveTask,
  onClearCompleted,
  onViewDetail,
  onRefresh,
  refreshInterval = 5000,
  defaultActiveTab = 'upload',
  position = 'bottom-right',
  className,
  style,
  testId,
}) => {
  // 上传任务状态（从 store 获取）
  const { tasks: uploadTasks, isPanelOpen, setPanelOpen, removeTask, clearCompleted } = useUploadStore();

  // Agent 任务状态
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AgentTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'agent'>(defaultActiveTab);

  // 使用外部传入的状态或内部状态
  const isOpen = propIsOpen !== undefined ? propIsOpen : isPanelOpen;
  const handleOpenChange = onOpenChange || setPanelOpen;

  // 获取 Agent 任务
  const fetchAgentTasks = useCallback(async () => {
    if (propAgentTasks) {
      // 如果外部传入了 Agent 任务，使用外部的
      return;
    }

    setAgentLoading(true);
    try {
      const response = await agentApi.listTasks(20);
      setAgentTasks(response.items || []);
    } catch (error) {
      console.error('获取Agent任务失败:', error);
    } finally {
      setAgentLoading(false);
    }
  }, [propAgentTasks]);

  // 获取 Agent 任务详情
  const fetchAgentTaskDetail = useCallback(async (taskId: string) => {
    if (onViewDetail) {
      onViewDetail(taskId);
      return;
    }

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
  }, [onViewDetail]);

  // 自动刷新 Agent 任务
  useEffect(() => {
    fetchAgentTasks();
    if (!propAgentTasks && refreshInterval > 0) {
      const interval = setInterval(fetchAgentTasks, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAgentTasks, propAgentTasks, refreshInterval]);

  // 计算活动任务数
  const activeUploadCount = useMemo(() =>
    uploadTasks.filter((t) => t.phase === 'uploading' || t.phase === 'analyzing').length,
    [uploadTasks]
  );

  // 计算活动任务数
  const activeAgentCount = useMemo(() => {
    if (propAgentTasks) {
      return propAgentTasks.filter((t) => t.status === 'running').length;
    }
    return agentTasks.filter((t) => t.status === 'running').length;
  }, [propAgentTasks, agentTasks]);

  const totalActiveCount = activeUploadCount + activeAgentCount;

  // 显示的 Agent 任务
   const displayAgentTasks: any[] = propAgentTasks || agentTasks;

   // 处理移除任务
  const handleRemoveTask = useCallback((taskId: string) => {
    if (onRemoveTask) {
      onRemoveTask(taskId);
    } else {
      removeTask(taskId);
    }
  }, [onRemoveTask, removeTask]);

  // 处理清空已完成任务
  const handleClearCompleted = useCallback(() => {
    if (onClearCompleted) {
      onClearCompleted();
    } else {
      clearCompleted();
    }
  }, [onClearCompleted, clearCompleted]);

  // 处理刷新
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchAgentTasks();
    }
  }, [onRefresh, fetchAgentTasks]);

  // 计算位置样式
  const positionStyle = useMemo(() => {
    switch (position) {
      case 'bottom-left':
        return { bottom: 24, left: 24 };
      case 'top-right':
        return { top: 24, right: 24 };
      case 'top-left':
        return { top: 24, left: 24 };
      case 'bottom-right':
      default:
        return { bottom: 24, right: 24 };
    }
  }, [position]);

  // 如果没有任务且面板关闭，不显示
  const agentTaskCount = propAgentTasks ? propAgentTasks.length : agentTasks.length;
  if (!isOpen && uploadTasks.length === 0 && agentTaskCount === 0) {
    return null;
  }

  return (
    <>
      <Card
        data-testid={testId}
        className={className}
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
                  onClick={handleClearCompleted}
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
                  onClick={handleRefresh}
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
                onClick={() => handleOpenChange(false)}
              />
            </div>
          </div>
        }
        style={{
          position: 'fixed',
          width: 420,
          maxHeight: 600,
          overflow: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          ...positionStyle,
          ...style,
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
                                onClick={() => handleRemoveTask(task.id)}
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
              children: displayAgentTasks.length === 0 ? (
                <Empty description="暂无 Agent 任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={displayAgentTasks}
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

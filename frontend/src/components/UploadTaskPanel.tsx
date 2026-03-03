/**
 * 上传任务面板组件 - 显示所有上传任务进度（三阶段：上传、AI分析、完成）
 */
import React from 'react';
import {
  Drawer,
  List,
  Progress,
  Typography,
  Button,
  Badge,
  Space,
  Tag,
  Empty,
  Tooltip,
  Steps,
} from 'antd';
import {
  DeleteOutlined,
  ClearOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useUploadStore, type UploadTask } from '../stores';

const { Text } = Typography;
const { Step } = Steps;

const getFileIcon = (fileType: UploadTask['fileType']) => {
  switch (fileType) {
    case 'image':
      return <FileImageOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
    case 'video':
      return <VideoCameraOutlined style={{ color: '#1890ff', fontSize: 24 }} />;
    case 'document':
      return <FileTextOutlined style={{ color: '#fa8c16', fontSize: 24 }} />;
    default:
      return <FileTextOutlined style={{ fontSize: 24 }} />;
  }
};

const getPhaseTag = (phase: UploadTask['phase']) => {
  switch (phase) {
    case 'uploading':
      return <Tag icon={<CloudUploadOutlined />} color="blue">上传中</Tag>;
    case 'analyzing':
      return <Tag icon={<RobotOutlined />} color="purple">AI分析中</Tag>;
    case 'completed':
      return <Tag icon={<CheckCircleOutlined />} color="success">完成</Tag>;
    case 'error':
      return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
    default:
      return null;
  }
};

// 获取当前步骤索引
const getCurrentStep = (phase: UploadTask['phase']) => {
  switch (phase) {
    case 'uploading':
      return 0;
    case 'analyzing':
      return 1;
    case 'completed':
      return 2;
    case 'error':
      return 2;
    default:
      return 0;
  }
};

interface UploadTaskPanelProps {
  visible: boolean;
  onClose: () => void;
}

const UploadTaskPanel: React.FC<UploadTaskPanelProps> = ({ visible, onClose }) => {
  const { tasks, removeTask, clearCompleted } = useUploadStore();

  const activeTasks = tasks.filter(
    (t) => t.phase === 'uploading' || t.phase === 'analyzing'
  );
  const completedTasks = tasks.filter(
    (t) => t.phase === 'completed' || t.phase === 'error'
  );

  return (
    <Drawer
      title={
        <Space>
          <CloudUploadOutlined />
          <span>上传任务</span>
          <Badge count={activeTasks.length} showZero color="#1890ff" />
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={450}
      extra={
        completedTasks.length > 0 && (
          <Tooltip title="清空已完成任务">
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={clearCompleted}
            >
              清空已完成
            </Button>
          </Tooltip>
        )
      }
    >
      {tasks.length === 0 ? (
        <Empty description="暂无上传任务" />
      ) : (
        <List
          dataSource={tasks}
          renderItem={(task) => (
            <List.Item
              key={task.id}
              actions={[
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeTask(task.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={getFileIcon(task.fileType)}
                title={
                  <Space>
                    <Text ellipsis style={{ maxWidth: 180 }} title={task.fileName}>
                      {task.fileName}
                    </Text>
                    {getPhaseTag(task.phase)}
                  </Space>
                }
                description={
                  <div style={{ marginTop: 12 }}>
                    {/* 三阶段进度条 */}
                    <Steps
                      size="small"
                      current={getCurrentStep(task.phase)}
                      status={task.phase === 'error' ? 'error' : 'process'}
                      style={{ marginBottom: 12 }}
                    >
                      <Step title="上传" icon={task.phase === 'uploading' ? <LoadingOutlined /> : undefined} />
                      <Step title="AI分析" icon={task.phase === 'analyzing' ? <LoadingOutlined /> : undefined} />
                      <Step title="完成" />
                    </Steps>
                    
                    {/* 当前阶段进度 */}
                    {(task.phase === 'uploading' || task.phase === 'analyzing') && (
                      <div style={{ marginBottom: 8 }}>
                        <Progress
                          percent={task.progress}
                          size="small"
                          status="active"
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.phase === 'uploading' 
                            ? `上传进度: ${task.phaseProgress}%` 
                            : `AI分析进度: ${task.phaseProgress}%`
                          }
                        </Text>
                      </div>
                    )}
                    
                    {task.message && task.phase === 'error' && (
                      <Text type="danger" style={{ fontSize: 12 }}>
                        {task.message}
                      </Text>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default UploadTaskPanel;

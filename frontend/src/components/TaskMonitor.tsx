import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Progress, Button, Empty } from 'antd';
import { 
  ReloadOutlined, 
  VideoCameraOutlined, 
  FileImageOutlined, 
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';

interface Task {
  task_id: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  metadata: {
    filename?: string;
    [key: string]: any;
  };
}

const TaskMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/');
      if (!response.ok) {
        console.log('任务API未就绪');
        setTasks([]);
        return;
      }
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.log('获取任务列表失败:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // 只在有运行中任务时才轮询
    const interval = setInterval(() => {
      const hasRunningTask = tasks.some(t => t.status === 'running');
      if (hasRunningTask) {
        fetchTasks();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'video_process':
        return <VideoCameraOutlined />;
      case 'image_analyze':
        return <FileImageOutlined />;
      case 'document_upload':
        return <FileTextOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'running':
        return <Tag icon={<LoadingOutlined />} color="blue">处理中</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="green">已完成</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="red">失败</Tag>;
      case 'cancelled':
        return <Tag icon={<PauseCircleOutlined />} color="orange">已取消</Tag>;
      default:
        return <Tag color="default">等待中</Tag>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button 
          icon={<ReloadOutlined />} 
          size="small" 
          onClick={fetchTasks}
          loading={loading}
        >
          刷新
        </Button>
      </div>
      
      {tasks.length === 0 ? (
        <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={tasks}
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
                    {getTaskIcon(task.task_type)}
                    <span style={{ fontWeight: 500 }}>
                      {task.metadata?.filename || task.task_id.slice(0, 8)}
                    </span>
                  </div>
                  {getStatusTag(task.status)}
                </div>
                
                {task.status === 'running' && (
                  <Progress 
                    percent={task.progress} 
                    size="small" 
                    status="active"
                    style={{ marginBottom: 4 }}
                  />
                )}
                
                {task.message && (
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {task.message}
                  </div>
                )}
                
                {task.duration && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    耗时: {task.duration.toFixed(1)}s
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default TaskMonitor;

// ==================== 基础组件 Props ====================

import { CSSProperties, ReactNode } from 'react';
import { ChatMessage, MessageSource } from './index';

/**
 * 基础组件 Props 接口
 * 所有组件都应继承此接口
 */
export interface BaseComponentProps {
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: CSSProperties;
  /** 子元素 */
  children?: ReactNode;
  /** 测试ID */
  testId?: string;
}

/**
 * 基础事件处理 Props
 */
export interface BaseEventProps {
  /** 点击事件 */
  onClick?: () => void;
  /** 禁用状态 */
  disabled?: boolean;
  /** 加载状态 */
  loading?: boolean;
}

// ==================== 聊天消息组件 Props ====================

/**
 * 消息内容类型
 */
export type MessageContentType = 'text' | 'image' | 'file' | 'markdown';

/**
 * 消息附件接口
 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}

/**
 * 聊天消息 Props 接口
 */
export interface ChatMessageProps extends BaseComponentProps {
  /** 消息数据 */
  message: ChatMessage;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示来源 */
  showSources?: boolean;
  /** 消息点击回调 */
  onMessageClick?: (message: ChatMessage) => void;
  /** 来源点击回调 */
  onSourceClick?: (source: MessageSource) => void;
  /** 头像自定义 */
  avatar?: ReactNode;
  /** 消息内容类型 */
  contentType?: MessageContentType;
  /** 消息附件列表 */
  attachments?: MessageAttachment[];
}

// ==================== 聊天输入组件 Props ====================

/**
 * 上传文件类型
 */
export type UploadFileType = 'image' | 'video' | 'document' | 'any';

/**
 * 上传文件配置
 */
export interface UploadConfig {
  /** 允许的文件类型 */
  accept?: string;
  /** 最大文件大小（MB） */
  maxSize?: number;
  /** 最大文件数量 */
  maxCount?: number;
  /** 是否允许多文件上传 */
  multiple?: boolean;
  /** 自定义上传处理 */
  customUpload?: (files: File[]) => Promise<void>;
}

/**
 * 聊天输入 Props 接口
 */
export interface ChatInputProps extends BaseComponentProps, BaseEventProps {
  /** 输入框占位符 */
  placeholder?: string;
  /** 是否使用 Agent 模式 */
  useAgent?: boolean;
  /** 是否使用 RAG */
  useRag?: boolean;
  /** 发送消息回调 */
  onSend?: (message: string, attachments?: File[]) => void;
  /** 上传成功回调 */
  onUploadSuccess?: (files: File[]) => void;
  /** 新会话回调 */
  onNewSession?: () => void;
  /** 清空消息回调 */
  onClear?: () => void;
  /** 上传配置 */
  uploadConfig?: UploadConfig;
  /** 输入值（受控模式） */
  value?: string;
  /** 输入值变化回调 */
  onChange?: (value: string) => void;
  /** 是否支持多文件上传 */
  multiFileUpload?: boolean;
}

// ==================== 导航组件 Props ====================

/**
 * 导航项接口
 */
export interface NavigationItem {
  /** 唯一标识 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 图标 */
  icon?: ReactNode;
  /** 路径 */
  path?: string;
  /** 子菜单 */
  children?: NavigationItem[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 徽章数量 */
  badge?: number;
  /** 自定义数据 */
  meta?: Record<string, any>;
}

/**
 * 导航 Props 接口
 */
export interface NavigationProps extends BaseComponentProps {
  /** 导航项列表 */
  items?: NavigationItem[];
  /** 当前选中项 */
  activeKey?: string;
  /** 导航项点击回调 */
  onItemClick?: (item: NavigationItem, key: string) => void;
  /** 导航模式 */
  mode?: 'horizontal' | 'vertical' | 'inline' | 'dock';
  /** 是否收起 */
  collapsed?: boolean;
  /** 主题 */
  theme?: 'light' | 'dark';
}

/**
 * Dock 导航 Props 接口
 */
export interface DockNavigationProps extends Omit<NavigationProps, 'mode'> {
  /** 是否固定在底部 */
  fixed?: boolean;
  /** 圆角大小 */
  borderRadius?: number;
}

/**
 * 侧边栏 Props 接口
 */
export interface SidebarProps extends NavigationProps {
  /** Logo 区域 */
  logo?: ReactNode;
  /** 底部区域 */
  footer?: ReactNode;
  /** 会话列表 */
  sessions?: SessionItem[];
  /** 当前会话ID */
  currentSessionId?: string | null;
  /** 切换会话回调 */
  onSessionSwitch?: (sessionId: string) => void;
  /** 删除会话回调 */
  onSessionDelete?: (sessionId: string) => void;
  /** 重命名会话回调 */
  onSessionRename?: (sessionId: string, newTitle: string) => void;
  /** 创建新会话回调 */
  onSessionCreate?: () => void;
  /** 宽度 */
  width?: number;
}

/**
 * 会话项接口
 */
export interface SessionItem {
  id: string;
  title: string;
  updatedAt?: Date;
  messageCount?: number;
}

// ==================== 任务监控组件 Props ====================

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * 任务类型
 */
export type TaskType = 'upload' | 'agent' | 'analysis' | 'export';

/**
 * 任务项接口
 */
export interface TaskItem {
  id: string;
  type: TaskType;
  name: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  meta?: Record<string, any>;
}

/**
 * Agent 任务步骤接口
 */
export interface TaskStep {
  stepNumber: number;
  skillName: string;
  reasoning: string;
  success?: boolean;
  error?: string;
  result?: string;
}

/**
 * Agent 任务详情接口
 */
export interface AgentTaskDetail extends TaskItem {
  description: string;
  steps: TaskStep[];
  finalResult?: string;
}

/**
 * 任务监控 Props 接口
 */
export interface TaskMonitorProps extends BaseComponentProps {
  /** 任务列表 */
  tasks?: TaskItem[];
  /** Agent 任务列表 */
  agentTasks?: AgentTaskDetail[];
  /** 面板是否打开 */
  isOpen?: boolean;
  /** 面板开关回调 */
  onOpenChange?: (open: boolean) => void;
  /** 移除任务回调 */
  onRemoveTask?: (taskId: string) => void;
  /** 清空已完成任务回调 */
  onClearCompleted?: () => void;
  /** 查看任务详情回调 */
  onViewDetail?: (taskId: string) => void;
  /** 刷新任务列表回调 */
  onRefresh?: () => void;
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 默认激活的标签页 */
  defaultActiveTab?: 'upload' | 'agent';
  /** 位置 */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

// ==================== 通用 UI 组件 Props ====================

/**
 * 图标按钮 Props 接口
 */
export interface IconButtonProps extends BaseComponentProps, BaseEventProps {
  /** 图标 */
  icon: ReactNode;
  /** 按钮类型 */
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 危险按钮 */
  danger?: boolean;
  /** 提示文字 */
  tooltip?: string;
}

/**
 * 状态标签 Props 接口
 */
export interface StatusTagProps extends BaseComponentProps {
  /** 状态 */
  status: TaskStatus | string;
  /** 显示文本 */
  text?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义颜色 */
  color?: string;
}

/**
 * 进度指示器 Props 接口
 */
export interface ProgressIndicatorProps extends BaseComponentProps {
  /** 进度百分比 */
  percent: number;
  /** 状态 */
  status?: 'active' | 'success' | 'exception' | 'normal';
  /** 显示文本 */
  text?: string;
  /** 大小 */
  size?: 'small' | 'default' | 'large';
  /** 是否显示百分比 */
  showPercent?: boolean;
}

/**
 * 空状态 Props 接口
 */
export interface EmptyStateProps extends BaseComponentProps {
  /** 描述文本 */
  description?: string;
  /** 自定义图标 */
  icon?: ReactNode;
  /** 操作按钮 */
  action?: ReactNode;
}

/**
 * 模态框 Props 接口
 */
export interface ModalProps extends BaseComponentProps {
  /** 是否可见 */
  visible: boolean;
  /** 标题 */
  title?: ReactNode;
  /** 关闭回调 */
  onClose?: () => void;
  /** 确认回调 */
  onConfirm?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 确认按钮加载状态 */
  confirmLoading?: boolean;
  /** 宽度 */
  width?: number | string;
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 点击遮罩关闭 */
  maskClosable?: boolean;
}

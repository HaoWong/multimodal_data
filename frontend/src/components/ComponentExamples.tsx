/**
 * 统一组件接口使用示例
 *
 * 本文件展示了如何使用重构后的统一组件接口
 */

import React, { useState } from 'react';
import { Space, Divider } from 'antd';
import {
  HomeOutlined,
  MessageOutlined,
  SettingOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons';

// 导入组件
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import DockNavigation from './DockNavigation';
import Sidebar from './Sidebar';
import UnifiedTaskMonitor from './UnifiedTaskMonitor';

// 导入类型
import {
  ChatMessageProps,
  ChatInputProps,
  DockNavigationProps,
  SidebarProps,
  TaskMonitorProps,
  NavigationItem,
  MessageAttachment,
} from '../types/components';
import { ChatMessage as ChatMessageType } from '../types';

// ==================== ChatMessage 示例 ====================

/**
 * ChatMessage 基础示例
 */
export const ChatMessageBasicExample: React.FC = () => {
  const message: ChatMessageType = {
    id: '1',
    role: 'user',
    content: '你好，请帮我分析这个文档',
    timestamp: new Date(),
  };

  return (
    <ChatMessage
      message={message}
      showTimestamp={true}
      showSources={true}
    />
  );
};

/**
 * ChatMessage 带附件示例
 */
export const ChatMessageWithAttachmentsExample: React.FC = () => {
  const message: ChatMessageType = {
    id: '2',
    role: 'assistant',
    content: '我已经分析了您上传的文件，以下是分析结果：',
    timestamp: new Date(),
    sources: [
      {
        id: 'doc-1',
        title: '产品需求文档.pdf',
        similarity: 0.95,
        content_type: 'TEXT',
        source: '知识库',
      },
    ],
  };

  const attachments: MessageAttachment[] = [
    {
      id: 'file-1',
      name: '数据分析报告.pdf',
      type: 'application/pdf',
      url: '/files/report.pdf',
      size: 1024000,
    },
  ];

  return (
    <ChatMessage
      message={message}
      attachments={attachments}
      onSourceClick={(source) => console.log('点击来源:', source)}
    />
  );
};

// ==================== ChatInput 示例 ====================

/**
 * ChatInput 基础示例
 */
export const ChatInputBasicExample: React.FC = () => {
  const handleSend = (message: string, files?: File[]) => {
    console.log('发送消息:', message);
    if (files) {
      console.log('附带文件:', files);
    }
  };

  return (
    <ChatInput
      placeholder="请输入消息..."
      onSend={handleSend}
      multiFileUpload={true}
    />
  );
};

/**
 * ChatInput Agent 模式示例
 */
export const ChatInputAgentExample: React.FC = () => {
  return (
    <ChatInput
      useAgent={true}
      useRag={true}
      placeholder="描述您的任务，Agent将自动执行..."
      uploadConfig={{
        accept: '.pdf,.docx,.txt',
        maxSize: 50,
        maxCount: 5,
        multiple: true,
      }}
      onUploadSuccess={(files) => console.log('上传成功:', files)}
    />
  );
};

/**
 * ChatInput 受控模式示例
 */
export const ChatInputControlledExample: React.FC = () => {
  const [value, setValue] = useState('');

  return (
    <ChatInput
      value={value}
      onChange={setValue}
      onSend={(msg) => {
        console.log('发送:', msg);
        setValue('');
      }}
    />
  );
};

// ==================== DockNavigation 示例 ====================

/**
 * DockNavigation 基础示例
 */
export const DockNavigationBasicExample: React.FC = () => {
  const items: NavigationItem[] = [
    { key: '/', icon: <HomeOutlined />, label: '首页', path: '/' },
    { key: '/chat', icon: <MessageOutlined />, label: '对话', path: '/chat' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', path: '/settings' },
  ];

  return (
    <DockNavigation
      items={items}
      fixed={true}
      borderRadius={20}
      onItemClick={(item, key) => console.log('点击:', item, key)}
    />
  );
};

/**
 * DockNavigation 带徽章示例
 */
export const DockNavigationWithBadgeExample: React.FC = () => {
  const items: NavigationItem[] = [
    { key: '/', icon: <HomeOutlined />, label: '首页', path: '/' },
    { key: '/chat', icon: <MessageOutlined />, label: '对话', path: '/chat', badge: 5 },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', path: '/settings' },
  ];

  return (
    <DockNavigation
      items={items}
      activeKey="/chat"
    />
  );
};

// ==================== Sidebar 示例 ====================

/**
 * Sidebar 基础示例
 */
export const SidebarBasicExample: React.FC = () => {
  const items: NavigationItem[] = [
    { key: 'chat', icon: <MessageOutlined />, label: '对话' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
  ];

  return (
    <Sidebar
      items={items}
      activeKey="chat"
      onItemClick={(item, key) => console.log('导航:', item, key)}
      width={260}
    />
  );
};

/**
 * Sidebar 自定义 Logo 和底部示例
 */
export const SidebarCustomExample: React.FC = () => {
  const customLogo = (
    <div style={{ color: '#fff' }}>
      <h2 style={{ margin: 0 }}>🚀 我的应用</h2>
    </div>
  );

  const customFooter = (
    <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 12 }}>
      v1.0.0
    </div>
  );

  return (
    <Sidebar
      logo={customLogo}
      footer={customFooter}
      onSessionCreate={() => console.log('创建新会话')}
      onSessionSwitch={(id) => console.log('切换会话:', id)}
    />
  );
};

// ==================== UnifiedTaskMonitor 示例 ====================

/**
 * UnifiedTaskMonitor 基础示例
 */
export const TaskMonitorBasicExample: React.FC = () => {
  return (
    <UnifiedTaskMonitor
      position="bottom-right"
      defaultActiveTab="upload"
      refreshInterval={5000}
    />
  );
};

/**
 * UnifiedTaskMonitor 受控模式示例
 */
export const TaskMonitorControlledExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <UnifiedTaskMonitor
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      position="top-right"
      onViewDetail={(taskId) => console.log('查看任务:', taskId)}
      onClearCompleted={() => console.log('清空已完成')}
    />
  );
};

// ==================== 综合示例 ====================

/**
 * 综合使用示例 - 展示所有组件一起使用
 */
export const ComponentIntegrationExample: React.FC = () => {
  const [activeNav, setActiveNav] = useState('/chat');

  const navItems: NavigationItem[] = [
    { key: '/', icon: <HomeOutlined />, label: '首页', path: '/' },
    { key: '/chat', icon: <MessageOutlined />, label: '对话', path: '/chat' },
    { key: '/settings', icon: <SettingOutlined />, label: '设置', path: '/settings' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* 侧边栏 */}
      <Sidebar
        items={[
          { key: 'chat', icon: <MessageOutlined />, label: '对话' },
          { key: 'settings', icon: <SettingOutlined />, label: '设置' },
        ]}
        activeKey="chat"
        width={240}
      />

      {/* 主内容区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 消息列表 */}
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <ChatMessage
            message={{
              id: '1',
              role: 'assistant',
              content: '欢迎使用统一组件接口示例！',
              timestamp: new Date(),
            }}
          />
        </div>

        {/* 输入框 */}
        <ChatInput
          placeholder="输入消息..."
          multiFileUpload={true}
        />
      </div>

      {/* Dock 导航 */}
      <DockNavigation
        items={navItems}
        activeKey={activeNav}
        onItemClick={(item, key) => setActiveNav(key)}
        fixed={true}
      />

      {/* 任务监控 */}
      <UnifiedTaskMonitor
        position="bottom-right"
        defaultActiveTab="upload"
      />
    </div>
  );
};

export default {
  ChatMessageBasicExample,
  ChatMessageWithAttachmentsExample,
  ChatInputBasicExample,
  ChatInputAgentExample,
  ChatInputControlledExample,
  DockNavigationBasicExample,
  DockNavigationWithBadgeExample,
  SidebarBasicExample,
  SidebarCustomExample,
  TaskMonitorBasicExample,
  TaskMonitorControlledExample,
  ComponentIntegrationExample,
};

import React, { useEffect, useState } from 'react';
import { Menu, Button, Empty, Modal, Input, message, Dropdown } from 'antd';
import {
  MessageOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../stores/chatStore';

interface SidebarProps {
  activeTab: string;
  onTabChange: (key: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { sessions, currentSessionId, createNewSession, switchSession, deleteSession, renameSession, loadSessions } =
    useChatStore();
  
  // 重命名对话框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingSession, setRenamingSession] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // 组件加载时从后端加载会话列表
  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 打开重命名对话框
  const openRenameModal = (session: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSession(session);
    setNewTitle(session.title);
    setRenameModalVisible(true);
  };

  // 确认重命名
  const handleRename = () => {
    if (renamingSession && newTitle.trim()) {
      renameSession(renamingSession.id, newTitle.trim());
      setRenameModalVisible(false);
      setRenamingSession(null);
      message.success('重命名成功');
    }
  };

  // 处理删除会话
  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '删除会话',
      content: '确定要删除这个会话吗？删除后将无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSession(sessionId);
          message.success('会话已删除');
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const menuItems = [
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: '对话',
    },
    {
      key: 'assignments',
      icon: <BookOutlined />,
      label: '作业管理',
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: '知识库',
    },
    {
      key: 'images',
      icon: <PictureOutlined />,
      label: '图片库',
    },
    {
      key: 'videos',
      icon: <VideoCameraOutlined />,
      label: '视频库',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  return (
    <div
      style={{
        width: 260,
        height: '100vh',
        backgroundColor: '#001529',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2
          style={{
            color: '#fff',
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          🤖 多模态RAG
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: 12 }}>
          智能文档检索与对话
        </p>
      </div>

      {/* 主导航 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[activeTab]}
        onClick={({ key }) => onTabChange(key)}
        items={menuItems}
        style={{ borderRight: 0 }}
      />

      {/* 会话列表 */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 16px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              历史会话
            </span>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={createNewSession}
              style={{ color: '#fff' }}
            >
              新建
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: 'rgba(255,255,255,0.3)' }}>暂无会话</span>}
              style={{ marginTop: 20 }}
            />
          ) : (
            <div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => switchSession(session.id)}
                  style={{
                    padding: '10px 16px',
                    margin: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor:
                      currentSessionId === session.id
                        ? '#1890ff'
                        : 'transparent',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {session.title}
                  </span>
                  {/* 操作菜单 */}
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'rename',
                          icon: <EditOutlined />,
                          label: '重命名',
                          onClick: (e) => openRenameModal(session, e.domEvent as React.MouseEvent),
                        },
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: '删除',
                          danger: true,
                          onClick: (e) => handleDelete(session.id, e.domEvent as React.MouseEvent),
                        },
                      ],
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                      }}
                      className="action-btn"
                    />
                  </Dropdown>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          textAlign: 'center',
        }}
      >
        Powered by Ollama + PostgreSQL
      </div>

      {/* 重命名对话框 */}
      <Modal
        title="重命名会话"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setRenamingSession(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入新名称"
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>

      <style>{`
        .action-btn:hover {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Menu, Button, Empty, Modal, Input, message, Dropdown, Card } from 'antd';
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
  RobotOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../stores/chatStore';
import { SidebarProps, NavigationItem, SessionItem } from '../types/components';

/**
 * 默认导航项配置
 */
const defaultNavigationItems: NavigationItem[] = [
  {
    key: 'chat',
    icon: <MessageOutlined />,
    label: '对话',
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

/**
 * 默认 Logo
 */
const defaultLogo = (
  <div>
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
);

/**
 * 默认底部信息
 */
const defaultFooter = (
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
);

/**
 * 侧边栏组件
 *
 * 统一的导航项配置和菜单配置
 * 支持会话管理（创建、切换、删除、重命名）
 */
const Sidebar: React.FC<SidebarProps> = ({
  items = defaultNavigationItems,
  activeKey: propActiveKey,
  onItemClick: propOnItemClick,
  logo = defaultLogo,
  footer = defaultFooter,
  sessions: propSessions,
  currentSessionId: propCurrentSessionId,
  onSessionSwitch,
  onSessionDelete,
  onSessionRename,
  onSessionCreate,
  width = 260,
  className,
  style,
  testId,
}) => {
  // 从 store 获取会话数据
  const {
    sessions: storeSessions,
    currentSessionId: storeCurrentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession,
    loadSessions,
  } = useChatStore();

  // 使用外部传入的数据或 store 的数据
  const sessions = propSessions || storeSessions;
  const currentSessionId = propCurrentSessionId !== undefined ? propCurrentSessionId : storeCurrentSessionId;

  // 重命名对话框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingSession, setRenamingSession] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // 组件加载时从后端加载会话列表
  useEffect(() => {
    if (!propSessions) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 处理导航项点击
   */
  const handleMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (propOnItemClick) {
        const clickedItem = items.find(item => item.key === key);
        if (clickedItem) {
          propOnItemClick(clickedItem, key);
        }
      }
    },
    [propOnItemClick, items]
  );

  /**
   * 打开重命名对话框
   */
  const openRenameModal = useCallback(
    (session: { id: string; title: string }, e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingSession(session);
      setNewTitle(session.title);
      setRenameModalVisible(true);
    },
    []
  );

  /**
   * 确认重命名
   */
  const handleRename = useCallback(() => {
    if (renamingSession && newTitle.trim()) {
      if (onSessionRename) {
        onSessionRename(renamingSession.id, newTitle.trim());
      } else {
        renameSession(renamingSession.id, newTitle.trim());
      }
      setRenameModalVisible(false);
      setRenamingSession(null);
      message.success('重命名成功');
    }
  }, [renamingSession, newTitle, onSessionRename, renameSession]);

  /**
   * 处理删除会话
   */
  const handleDelete = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      Modal.confirm({
        title: '删除会话',
        content: '确定要删除这个会话吗？删除后将无法恢复。',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            if (onSessionDelete) {
              await onSessionDelete(sessionId);
            } else {
              await deleteSession(sessionId);
            }
            message.success('会话已删除');
          } catch (error) {
            message.error('删除失败');
          }
        },
      });
    },
    [onSessionDelete, deleteSession]
  );

  /**
   * 处理创建新会话
   */
  const handleCreateSession = useCallback(() => {
    if (onSessionCreate) {
      onSessionCreate();
    } else {
      createNewSession();
    }
  }, [onSessionCreate, createNewSession]);

  /**
   * 处理切换会话
   */
  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      if (onSessionSwitch) {
        onSessionSwitch(sessionId);
      } else {
        switchSession(sessionId);
      }
    },
    [onSessionSwitch, switchSession]
  );

  /**
   * 转换导航项为 Menu 需要的格式
   */
  const menuItems = useMemo(() => {
    return items.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
      disabled: item.disabled,
    }));
  }, [items]);

  /**
   * 当前激活的标签
   */
  const activeKey = propActiveKey || 'chat';

  return (
    <aside
      data-testid={testId}
      className={className}
      style={{
        width,
        height: '100vh',
        backgroundColor: '#001529',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {logo}
      </div>

      {/* 主导航 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[activeKey]}
        onClick={handleMenuClick}
        items={menuItems}
        style={{ borderRight: 0 }}
      />

      {/* 会话列表 */}
      {activeKey === 'chat' && (
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
              onClick={handleCreateSession}
              style={{ color: '#fff' }}
            >
              新建
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>暂无会话</span>
              }
              style={{ marginTop: 20 }}
            />
          ) : (
            <div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  style={{
                    padding: '10px 16px',
                    margin: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor:
                      currentSessionId === session.id ? '#1890ff' : 'transparent',
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
                          onClick: (e) =>
                            openRenameModal(session, e.domEvent as React.MouseEvent),
                        },
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: '删除',
                          danger: true,
                          onClick: (e) =>
                            handleDelete(session.id, e.domEvent as React.MouseEvent),
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
      {footer}

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
    </aside>
  );
};

export default Sidebar;

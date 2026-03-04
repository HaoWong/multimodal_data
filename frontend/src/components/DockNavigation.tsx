import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  MessageOutlined,
  DatabaseOutlined,
  PictureOutlined,
  ProfileOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { DockNavigationProps, NavigationItem } from '../types/components';
import './DockNavigation.css';

/**
 * 默认导航项配置
 */
const defaultNavigationItems: NavigationItem[] = [
  { key: '/', icon: <HomeOutlined />, label: '首页', path: '/' },
  { key: '/chat', icon: <MessageOutlined />, label: '对话', path: '/chat' },
  { key: '/documents', icon: <DatabaseOutlined />, label: '知识', path: '/documents' },
  { key: '/media', icon: <PictureOutlined />, label: '媒体', path: '/media' },
  { key: '/tasks', icon: <ProfileOutlined />, label: '任务', path: '/tasks' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置', path: '/settings' },
];

/**
 * Dock 导航组件
 *
 * 统一的导航项配置，支持自定义导航项
 * 支持固定定位、圆角配置
 */
const DockNavigation: React.FC<DockNavigationProps> = ({
  items = defaultNavigationItems,
  activeKey,
  onItemClick,
  fixed = true,
  borderRadius = 16,
  className,
  style,
  testId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * 判断导航项是否激活
   */
  const isActive = useCallback(
    (item: NavigationItem): boolean => {
      // 如果提供了 activeKey，优先使用
      if (activeKey) {
        return item.key === activeKey;
      }

      // 否则根据当前路径判断
      const path = item.path || item.key;
      if (path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(path);
    },
    [activeKey, location.pathname]
  );

  /**
   * 处理导航项点击
   */
  const handleItemClick = useCallback(
    (item: NavigationItem) => {
      // 调用外部回调
      onItemClick?.(item, item.key);

      // 如果有 path，执行导航
      if (item.path && !item.disabled) {
        navigate(item.path);
      }
    },
    [navigate, onItemClick]
  );

  /**
   * 计算当前激活的 key
   */
  const currentActiveKey = useMemo(() => {
    if (activeKey) return activeKey;

    const activeItem = items.find((item) => isActive(item));
    return activeItem?.key;
  }, [activeKey, items, isActive]);

  return (
    <nav
      data-testid={testId}
      className={`dock-bar ${className || ''}`}
      style={{
        position: fixed ? 'fixed' : 'relative',
        bottom: fixed ? 20 : undefined,
        left: fixed ? '50%' : undefined,
        transform: fixed ? 'translateX(-50%)' : undefined,
        borderRadius,
        ...style,
      }}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className={`dock-item ${isActive(item) ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
          onClick={() => !item.disabled && handleItemClick(item)}
          style={{
            opacity: item.disabled ? 0.5 : 1,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span className="dock-icon">{item.icon}</span>
          <span className="dock-label">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                backgroundColor: '#ff4d4f',
                color: '#fff',
                fontSize: 10,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default DockNavigation;

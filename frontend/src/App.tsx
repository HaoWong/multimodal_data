import React, { useState } from 'react';
import { ConfigProvider, Layout, Button, Badge, Tooltip } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import ImagesPage from './pages/ImagesPage';
import VideosPage from './pages/VideosPage';
import AssignmentsPage from './pages/AssignmentsPage';
import UploadTaskPanel from './components/UploadTaskPanel';
import { useUploadStore } from './stores';

const { Header, Content } = Layout;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const { isPanelOpen, togglePanel, getActiveCount } = useUploadStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'images':
        return <ImagesPage />;
      case 'videos':
        return <VideosPage />;
      case 'assignments':
        return <AssignmentsPage />;
      case 'settings':
        return (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              backgroundColor: '#f5f5f5',
              minHeight: '100%',
            }}
          >
            <h2>⚙️ 设置</h2>
            <p>设置功能开发中...</p>
          </div>
        );
      default:
        return <ChatPage />;
    }
  };

  const activeCount = getActiveCount();

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* 左侧 Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* 右侧主内容区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 顶部 Header */}
          <Header
            style={{
              background: '#fff',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              zIndex: 1,
              height: 64,
              flexShrink: 0,
            }}
          >
            <Tooltip title="查看上传任务">
              <Button
                type="text"
                icon={
                  <Badge count={activeCount} size="small">
                    <CloudUploadOutlined style={{ fontSize: 20 }} />
                  </Badge>
                }
                onClick={togglePanel}
              >
                上传任务
              </Button>
            </Tooltip>
          </Header>
          
          {/* 内容区域 */}
          <Content style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
            {renderContent()}
          </Content>
        </div>
      </div>
      
      <UploadTaskPanel visible={isPanelOpen} onClose={() => togglePanel()} />
    </ConfigProvider>
  );
};

export default App;

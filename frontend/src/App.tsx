import React from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import DockNavigation from './components/DockNavigation';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import ImagesPage from './pages/ImagesPage';
import VideosPage from './pages/VideosPage';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <div className="app-container">
          {/* 极简顶部栏 */}
          <header className="app-header">
            <h1 className="app-title">多模态RAG</h1>
          </header>

          {/* 主内容区 */}
          <main className="app-content">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/media" element={<MediaLibraryPage />} />
              <Route path="/images" element={<ImagesPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/tasks" element={<TaskCenterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>

          {/* 底部 Dock 导航 */}
          <DockNavigation />
        </div>
      </Router>
    </ConfigProvider>
  );
};

// 媒体库页面（合并图片和视频）
const MediaLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'images' | 'videos'>('images');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标签切换 */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          padding: '16px 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <button
          onClick={() => setActiveTab('images')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'images' ? '#1890ff' : 'transparent',
            color: activeTab === 'images' ? '#fff' : 'rgba(0,0,0,0.65)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🖼️ 图片库
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: activeTab === 'videos' ? '#1890ff' : 'transparent',
            color: activeTab === 'videos' ? '#fff' : 'rgba(0,0,0,0.65)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🎬 视频库
        </button>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'images' ? <ImagesPage /> : <VideosPage />}
      </div>
    </div>
  );
};

// 任务中心页面
const TaskCenterPage: React.FC = () => {
  return (
    <div
      style={{
        padding: 24,
        background: '#f5f5f5',
        minHeight: '100%',
      }}
    >
      <h2>📊 任务中心</h2>
      <p>所有任务将在这里集中显示（开发中...）</p>
    </div>
  );
};

// 设置页面
const SettingsPage: React.FC = () => {
  return (
    <div
      style={{
        padding: 24,
        background: '#f5f5f5',
        minHeight: '100%',
      }}
    >
      <h2>⚙️ 设置</h2>
      <p>设置功能开发中...</p>
    </div>
  );
};

export default App;

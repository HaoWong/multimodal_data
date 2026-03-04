import React from 'react';
import { VideoCameraOutlined } from '@ant-design/icons';
import ContentListPage from './ContentListPage';

const VideosPage: React.FC = () => {
  return (
    <ContentListPage
      contentType="VIDEO"
      title="视频库"
      icon={<span>🎬</span>}
      uploadAccept=".mp4,.avi,.mov,.wmv,.mkv"
      uploadButtonText="上传视频"
      emptyText="暂无视频，请上传"
      emptyIcon={<VideoCameraOutlined style={{ fontSize: 64, color: '#ccc' }} />}
      analyzingText="AI分析视频内容（可能需要转码）..."
      analyzingDuration={6500}
    />
  );
};

export default VideosPage;

import React from 'react';
import { PictureOutlined } from '@ant-design/icons';
import ContentListPage from './ContentListPage';

const ImagesPage: React.FC = () => {
  return (
    <ContentListPage
      contentType="IMAGE"
      title="图片库"
      icon={<span>🖼️</span>}
      uploadAccept=".jpg,.jpeg,.png,.gif,.webp"
      uploadButtonText="上传图片"
      emptyText="暂无图片，请上传"
      emptyIcon={<PictureOutlined style={{ fontSize: 64, color: '#ccc' }} />}
      analyzingText="AI分析图片内容..."
      analyzingDuration={2500}
    />
  );
};

export default ImagesPage;

/**
 * ContentListPage 集成测试
 * 测试通用内容列表页面、不同内容类型的显示、上传、搜索、删除功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentListPage, { ContentType, ContentListItem } from '../ContentListPage';
import { contentApi, imageApi, documentApi } from '../../services/api';
import { useUploadStore } from '../../stores';

// Mock API services
jest.mock('../../services/api');
jest.mock('../../stores');

// Mock antd组件
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

describe('ContentListPage - Unified Content List', () => {
  const mockUploadStore = {
    addTask: jest.fn(() => 'task-123'),
    updateUploadProgress: jest.fn(),
    startAnalyzing: jest.fn(),
    updateAnalyzingProgress: jest.fn(),
    completeTask: jest.fn(),
    failTask: jest.fn(),
    setPanelOpen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUploadStore as unknown as jest.Mock).mockReturnValue(mockUploadStore);
  });

  describe('Image Content Type', () => {
    const imageProps = {
      contentType: 'IMAGE' as ContentType,
      title: '🖼️ 图片管理',
      icon: <span>🖼️</span>,
      uploadAccept: 'image/*',
      uploadButtonText: '上传图片',
      emptyText: '暂无图片',
    };

    const mockImages: ContentListItem[] = [
      {
        id: 'img-1',
        url: '/uploads/images/1.jpg',
        title: '测试图片1',
        description: '这是第一张测试图片',
        created_at: '2024-01-01T00:00:00Z',
        content_type: 'image',
      },
      {
        id: 'img-2',
        url: '/uploads/images/2.jpg',
        title: '测试图片2',
        description: '这是第二张测试图片',
        created_at: '2024-01-02T00:00:00Z',
        content_type: 'image',
      },
    ];

    it('should render image list correctly', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockImages);

      render(<ContentListPage {...imageProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试图片1')).toBeInTheDocument();
        expect(screen.getByText('测试图片2')).toBeInTheDocument();
      });
    });

    it('should display image descriptions', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockImages);

      render(<ContentListPage {...imageProps} />);

      await waitFor(() => {
        expect(screen.getByText('这是第一张测试图片')).toBeInTheDocument();
        expect(screen.getByText('这是第二张测试图片')).toBeInTheDocument();
      });
    });

    it('should handle image upload', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);
      (imageApi.uploadImage as jest.Mock).mockResolvedValue({
        id: 'img-new',
        message: '上传成功',
      });

      render(<ContentListPage {...imageProps} />);

      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadInput = screen.getByLabelText(/上传图片/i);

      await userEvent.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockUploadStore.addTask).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'test.jpg',
            fileType: 'image',
          })
        );
      });
    });

    it('should handle image search', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockImages);

      render(<ContentListPage {...imageProps} showSearch={true} />);

      await waitFor(() => {
        expect(screen.getByText('测试图片1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '图片1');

      await waitFor(() => {
        expect(screen.getByText('测试图片1')).toBeInTheDocument();
        expect(screen.queryByText('测试图片2')).not.toBeInTheDocument();
      });
    });

    it('should handle image deletion', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockImages);
      (imageApi.deleteImage as jest.Mock).mockResolvedValue({});

      render(<ContentListPage {...imageProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试图片1')).toBeInTheDocument();
      });

      // 找到删除按钮并点击
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(imageApi.deleteImage).toHaveBeenCalledWith('img-1');
      });
    });
  });

  describe('Video Content Type', () => {
    const videoProps = {
      contentType: 'VIDEO' as ContentType,
      title: '🎬 视频管理',
      icon: <span>🎬</span>,
      uploadAccept: 'video/*',
      uploadButtonText: '上传视频',
      emptyText: '暂无视频',
    };

    const mockVideos: ContentListItem[] = [
      {
        id: 'video-1',
        url: '/uploads/contents/video1.mp4',
        title: '测试视频1',
        description: '这是第一个测试视频',
        created_at: '2024-01-01T00:00:00Z',
        content_type: 'video',
        metadata: { duration: 120, frame_count: 8 },
      },
    ];

    it('should render video list with metadata', async () => {
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: mockVideos,
        total: 1,
      });

      render(<ContentListPage {...videoProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试视频1')).toBeInTheDocument();
        expect(screen.getByText('2:00')).toBeInTheDocument(); // 格式化后的时长
        expect(screen.getByText('8 帧')).toBeInTheDocument();
      });
    });

    it('should handle video upload', async () => {
      (contentApi.listContents as jest.Mock).mockResolvedValue({ items: [], total: 0 });
      (contentApi.uploadContent as jest.Mock).mockResolvedValue({
        id: 'video-new',
        content_type: 'VIDEO',
        message: '上传成功',
      });

      render(<ContentListPage {...videoProps} />);

      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const uploadInput = screen.getByLabelText(/上传视频/i);

      await userEvent.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockUploadStore.addTask).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'test.mp4',
            fileType: 'video',
          })
        );
      });
    });
  });

  describe('Document Content Type', () => {
    const documentProps = {
      contentType: 'DOCUMENT' as ContentType,
      title: '📚 文档管理',
      icon: <span>📚</span>,
      uploadAccept: '.txt,.pdf,.docx,.doc,.md',
      uploadButtonText: '上传文档',
      emptyText: '暂无文档',
    };

    const mockDocuments: ContentListItem[] = [
      {
        id: 'doc-1',
        title: '测试文档1',
        content: '这是文档内容的前100个字符...',
        doc_type: 'pdf',
        created_at: '2024-01-01T00:00:00Z',
        source: 'document',
        content_type: 'document',
      },
      {
        id: 'doc-2',
        title: '测试文档2',
        content: '这是第二个文档的内容...',
        doc_type: 'text',
        created_at: '2024-01-02T00:00:00Z',
        source: 'content',
        content_type: 'document',
      },
    ];

    it('should render document list with file type tags', async () => {
      (documentApi.getDocuments as jest.Mock).mockResolvedValue({
        items: [mockDocuments[0]],
        total: 1,
      });
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: [mockDocuments[1]],
        total: 1,
      });

      render(<ContentListPage {...documentProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
        expect(screen.getByText('测试文档2')).toBeInTheDocument();
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('TEXT')).toBeInTheDocument();
      });
    });

    it('should handle document upload', async () => {
      (documentApi.getDocuments as jest.Mock).mockResolvedValue({ items: [], total: 0 });
      (contentApi.listContents as jest.Mock).mockResolvedValue({ items: [], total: 0 });
      (documentApi.uploadFile as jest.Mock).mockResolvedValue({
        id: 'doc-new',
        message: '上传成功',
      });

      render(<ContentListPage {...documentProps} />);

      const file = new File(['document content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/上传文档/i);

      await userEvent.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockUploadStore.addTask).toHaveBeenCalledWith(
          expect.objectContaining({
            fileName: 'test.pdf',
            fileType: 'document',
          })
        );
      });
    });

    it('should handle document search', async () => {
      (documentApi.getDocuments as jest.Mock).mockResolvedValue({
        items: [mockDocuments[0]],
        total: 1,
      });
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: [mockDocuments[1]],
        total: 1,
      });

      render(<ContentListPage {...documentProps} showSearch={true} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
        expect(screen.getByText('测试文档2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '文档1');

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
        expect(screen.queryByText('测试文档2')).not.toBeInTheDocument();
      });
    });

    it('should handle document deletion from different sources', async () => {
      (documentApi.getDocuments as jest.Mock).mockResolvedValue({
        items: [mockDocuments[0]],
        total: 1,
      });
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: [mockDocuments[1]],
        total: 1,
      });
      (documentApi.deleteDocument as jest.Mock).mockResolvedValue({});
      (contentApi.deleteContent as jest.Mock).mockResolvedValue({});

      render(<ContentListPage {...documentProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试文档1')).toBeInTheDocument();
      });

      // 删除第一个文档（来自document源）
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(documentApi.deleteDocument).toHaveBeenCalledWith('doc-1');
      });
    });
  });

  describe('Common Functionality', () => {
    const commonProps = {
      contentType: 'IMAGE' as ContentType,
      title: '内容管理',
      icon: <span>📁</span>,
      uploadAccept: '*/*',
      uploadButtonText: '上传',
      emptyText: '暂无内容',
    };

    it('should show loading state', () => {
      (imageApi.listImages as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // 永不resolve以显示loading
      );

      render(<ContentListPage {...commonProps} />);

      expect(screen.getByText('内容管理')).toBeInTheDocument();
    });

    it('should show empty state when no content', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);

      render(<ContentListPage {...commonProps} />);

      await waitFor(() => {
        expect(screen.getByText('暂无内容')).toBeInTheDocument();
      });
    });

    it('should handle refresh after upload', async () => {
      (imageApi.listImages as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'img-new',
            url: '/uploads/images/new.jpg',
            title: '新图片',
            description: '新上传的图片',
          },
        ]);
      (imageApi.uploadImage as jest.Mock).mockResolvedValue({
        id: 'img-new',
        message: '上传成功',
      });

      render(<ContentListPage {...commonProps} />);

      await waitFor(() => {
        expect(screen.getByText('暂无内容')).toBeInTheDocument();
      });

      const file = new File(['image'], 'new.jpg', { type: 'image/jpeg' });
      const uploadInput = screen.getByLabelText(/上传/i);

      await userEvent.upload(uploadInput, file);

      // 等待上传完成后的刷新
      await waitFor(() => {
        expect(imageApi.listImages).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle API errors gracefully', async () => {
      (imageApi.listImages as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(<ContentListPage {...commonProps} />);

      // 应该显示错误状态或空状态，而不是崩溃
      await waitFor(() => {
        expect(screen.getByText('内容管理')).toBeInTheDocument();
      });
    });

    it('should open detail modal when clicking view button', async () => {
      const mockItem: ContentListItem = {
        id: 'img-1',
        url: '/uploads/images/1.jpg',
        title: '测试图片',
        description: '详细描述',
        content_type: 'image',
      };

      (imageApi.listImages as jest.Mock).mockResolvedValue([mockItem]);
      (imageApi.getImageDetail as jest.Mock).mockResolvedValue({
        ...mockItem,
        metadata: { width: 1920, height: 1080 },
      });

      render(<ContentListPage {...commonProps} />);

      await waitFor(() => {
        expect(screen.getByText('测试图片')).toBeInTheDocument();
      });

      const detailButtons = screen.getAllByRole('button', { name: /详情/i });
      fireEvent.click(detailButtons[0]);

      await waitFor(() => {
        expect(imageApi.getImageDetail).toHaveBeenCalledWith('img-1');
      });
    });
  });

  describe('Content Type Display', () => {
    it('should display correct icons for different content types', async () => {
      const imageProps = {
        contentType: 'IMAGE' as ContentType,
        title: '🖼️ 图片管理',
        icon: <span data-testid="image-icon">🖼️</span>,
        uploadAccept: 'image/*',
        uploadButtonText: '上传图片',
        emptyText: '暂无图片',
      };

      (imageApi.listImages as jest.Mock).mockResolvedValue([]);

      render(<ContentListPage {...imageProps} />);

      expect(screen.getByTestId('image-icon')).toBeInTheDocument();
      expect(screen.getByText('🖼️ 图片管理')).toBeInTheDocument();
    });

    it('should display correct file type tags', async () => {
      const documentProps = {
        contentType: 'DOCUMENT' as ContentType,
        title: '📚 文档管理',
        icon: <span>📚</span>,
        uploadAccept: '.txt,.pdf',
        uploadButtonText: '上传文档',
        emptyText: '暂无文档',
      };

      (documentApi.getDocuments as jest.Mock).mockResolvedValue({
        items: [
          { id: '1', title: 'PDF文档', doc_type: 'pdf', content: '', source: 'document' },
          { id: '2', title: 'Word文档', doc_type: 'docx', content: '', source: 'document' },
          { id: '3', title: '文本文件', doc_type: 'text', content: '', source: 'document' },
        ],
        total: 3,
      });
      (contentApi.listContents as jest.Mock).mockResolvedValue({ items: [], total: 0 });

      render(<ContentListPage {...documentProps} />);

      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('DOCX')).toBeInTheDocument();
        expect(screen.getByText('TEXT')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    const searchProps = {
      contentType: 'IMAGE' as ContentType,
      title: '图片管理',
      icon: <span>🖼️</span>,
      uploadAccept: 'image/*',
      uploadButtonText: '上传图片',
      emptyText: '暂无图片',
      showSearch: true,
    };

    const mockItems: ContentListItem[] = [
      { id: '1', title: '苹果图片', description: '红色的苹果', content_type: 'image' },
      { id: '2', title: '香蕉图片', description: '黄色的香蕉', content_type: 'image' },
      { id: '3', title: '橙子图片', description: '橙色的橙子', content_type: 'image' },
    ];

    it('should filter by title', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockItems);

      render(<ContentListPage {...searchProps} />);

      await waitFor(() => {
        expect(screen.getByText('苹果图片')).toBeInTheDocument();
        expect(screen.getByText('香蕉图片')).toBeInTheDocument();
        expect(screen.getByText('橙子图片')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '苹果');

      await waitFor(() => {
        expect(screen.getByText('苹果图片')).toBeInTheDocument();
        expect(screen.queryByText('香蕉图片')).not.toBeInTheDocument();
        expect(screen.queryByText('橙子图片')).not.toBeInTheDocument();
      });
    });

    it('should filter by description', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockItems);

      render(<ContentListPage {...searchProps} />);

      await waitFor(() => {
        expect(screen.getByText('红色的苹果')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '黄色');

      await waitFor(() => {
        expect(screen.queryByText('红色的苹果')).not.toBeInTheDocument();
        expect(screen.getByText('黄色的香蕉')).toBeInTheDocument();
      });
    });

    it('should show no results message when filter matches nothing', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockItems);

      render(<ContentListPage {...searchProps} />);

      await waitFor(() => {
        expect(screen.getByText('苹果图片')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '不存在的搜索词');

      await waitFor(() => {
        expect(screen.getByText('没有找到匹配的内容')).toBeInTheDocument();
      });
    });

    it('should clear filter and show all items', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockItems);

      render(<ContentListPage {...searchProps} />);

      await waitFor(() => {
        expect(screen.getByText('苹果图片')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/搜索/i);
      await userEvent.type(searchInput, '苹果');

      await waitFor(() => {
        expect(screen.queryByText('香蕉图片')).not.toBeInTheDocument();
      });

      // 清除搜索
      const clearButton = screen.getByRole('button', { name: /close-circle/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('苹果图片')).toBeInTheDocument();
        expect(screen.getByText('香蕉图片')).toBeInTheDocument();
        expect(screen.getByText('橙子图片')).toBeInTheDocument();
      });
    });
  });

  describe('Upload Progress Tracking', () => {
    const uploadProps = {
      contentType: 'IMAGE' as ContentType,
      title: '图片管理',
      icon: <span>🖼️</span>,
      uploadAccept: 'image/*',
      uploadButtonText: '上传图片',
      emptyText: '暂无图片',
    };

    it('should track upload progress', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);
      (imageApi.uploadImage as jest.Mock).mockImplementation(
        (file, onProgress) => {
          // 模拟进度回调
          if (onProgress) {
            onProgress(50);
          }
          return Promise.resolve({ id: 'img-new', message: '上传成功' });
        }
      );

      render(<ContentListPage {...uploadProps} />);

      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadInput = screen.getByLabelText(/上传图片/i);

      await userEvent.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockUploadStore.updateUploadProgress).toHaveBeenCalledWith('task-123', 50);
      });
    });

    it('should handle upload failure', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);
      (imageApi.uploadImage as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      render(<ContentListPage {...uploadProps} />);

      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const uploadInput = screen.getByLabelText(/上传图片/i);

      await userEvent.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockUploadStore.failTask).toHaveBeenCalledWith('task-123', '上传失败');
      });
    });
  });
});

/**
 * ContentListPage Unit Tests
 * Testing the unified content list page component
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ContentListPage, { ContentType, ContentListItem } from '../ContentListPage';
import { contentApi, imageApi, documentApi } from '../../services/api';
import { useUploadStore } from '../../stores';

// Mock API services
jest.mock('../../services/api');
jest.mock('../../stores');

// Mock antd components completely
jest.mock('antd', () => {
  const React = require('react');
  
  // Simple Card mock
  const Card = ({ children, title, extra, cover }: any) => (
    <div data-testid="card">
      {title && <div data-testid="card-title">{title}</div>}
      {extra && <div data-testid="card-extra">{extra}</div>}
      {cover && <div data-testid="card-cover">{cover}</div>}
      <div data-testid="card-content">{children}</div>
    </div>
  );
  
  // Card.Meta mock
  Card.Meta = ({ title, description }: any) => (
    <div data-testid="card-meta">
      {title && <div data-testid="card-meta-title">{title}</div>}
      {description && <div data-testid="card-meta-description">{description}</div>}
    </div>
  );
  
  // Simple Row mock
  const Row = ({ children }: any) => <div data-testid="row">{children}</div>;
  
  // Simple Col mock
  const Col = ({ children }: any) => <div data-testid="col">{children}</div>;
  
  // Simple Spin mock
  const Spin = ({ children, spinning }: any) => (
    <div data-testid="spin" data-spinning={spinning}>{children}</div>
  );
  
  // Simple Empty mock
  const Empty = ({ description }: any) => (
    <div data-testid="empty">{description}</div>
  );
  
  // Simple Button mock
  const Button = ({ children, onClick }: any) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  );
  
  // Simple Upload mock
  const Upload = ({ children }: any) => (
    <div data-testid="upload">{children}</div>
  );
  
  // Simple Input mock
  const Input = {
    Search: ({ placeholder, onSearch }: any) => (
      <input 
        data-testid="search-input" 
        placeholder={placeholder}
        onChange={(e) => onSearch && onSearch(e.target.value)}
      />
    ),
  };
  
  // Simple Tag mock
  const Tag = ({ children }: any) => <span data-testid="tag">{children}</span>;
  
  // Simple Modal mock
  const Modal = ({ open, children }: any) => (
    open ? <div data-testid="modal">{children}</div> : null
  );
  
  // Simple Image mock
  const Image = ({ src, alt }: any) => (
    <img data-testid="image" src={src} alt={alt} />
  );
  
  // Simple Divider mock
  const Divider = () => <hr data-testid="divider" />;
  
  // Simple Popconfirm mock
  const Popconfirm = ({ children }: any) => (
    <div data-testid="popconfirm">{children}</div>
  );
  
  // Simple Space mock
  const Space = ({ children }: any) => (
    <div data-testid="space">{children}</div>
  );
  
  // Typography mock
  const Title = ({ children, level }: any) => {
    const Tag = `h${level || 1}`;
    return <Tag data-testid="typography-title">{children}</Tag>;
  };
  
  const Text = ({ children }: any) => <span data-testid="typography-text">{children}</span>;
  
  const Typography = {
    Title,
    Text,
  };
  
  return {
    Card,
    Row,
    Col,
    Spin,
    Empty,
    Button,
    Upload,
    Input,
    Tag,
    Modal,
    Image,
    Divider,
    Popconfirm,
    Space,
    Typography,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

// Mock @ant-design/icons
jest.mock('@ant-design/icons', () => ({
  UploadOutlined: () => <span data-testid="icon-upload">Upload</span>,
  EyeOutlined: () => <span data-testid="icon-eye">Eye</span>,
  CloseOutlined: () => <span data-testid="icon-close">Close</span>,
  PlayCircleOutlined: () => <span data-testid="icon-play">Play</span>,
  SearchOutlined: () => <span data-testid="icon-search">Search</span>,
  FilePdfOutlined: () => <span data-testid="icon-pdf">PDF</span>,
  FileWordOutlined: () => <span data-testid="icon-word">Word</span>,
  FileTextOutlined: () => <span data-testid="icon-text">Text</span>,
  FileOutlined: () => <span data-testid="icon-file">File</span>,
}));

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Mock UnifiedTaskMonitor component
jest.mock('../../components/UnifiedTaskMonitor', () => {
  return function MockUnifiedTaskMonitor() {
    return <div data-testid="unified-task-monitor">Task Monitor</div>;
  };
});

describe('ContentListPage', () => {
  const mockUploadStore = {
    tasks: [],
    isUploadPanelOpen: false,
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

  describe('Image Content', () => {
    const imageProps = {
      contentType: 'IMAGE' as ContentType,
      title: 'Image Management',
      icon: <span>IMG</span>,
      uploadAccept: 'image/*',
      uploadButtonText: 'Upload Image',
      emptyText: 'No images',
    };

    const mockImages: ContentListItem[] = [
      {
        id: 'img-1',
        url: '/uploads/images/1.jpg',
        title: 'Test Image 1',
        description: 'Test Image 1',
        created_at: '2024-01-01T00:00:00Z',
        content_type: 'image',
      },
      {
        id: 'img-2',
        url: '/uploads/images/2.jpg',
        title: 'Test Image 2',
        description: 'Test Image 2',
        created_at: '2024-01-02T00:00:00Z',
        content_type: 'image',
      },
    ];

    it('should render image list', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue(mockImages);

      await act(async () => {
        render(<ContentListPage {...imageProps} />);
      });

      await waitFor(() => {
        // Use getAllByText because title and description both show the same text
        expect(screen.getAllByText('Test Image 1').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Test Image 2').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display empty state when no images', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        render(<ContentListPage {...imageProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText('No images')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      (imageApi.listImages as jest.Mock).mockRejectedValue(new Error('API Error'));

      await act(async () => {
        render(<ContentListPage {...imageProps} />);
      });

      // Should not throw, component should handle error
      await waitFor(() => {
        expect(screen.getByText('Image Management')).toBeInTheDocument();
      });
    });
  });

  describe('Document Content', () => {
    const documentProps = {
      contentType: 'DOCUMENT' as ContentType,
      title: 'Document Management',
      icon: <span>DOC</span>,
      uploadAccept: '.pdf,.doc,.docx',
      uploadButtonText: 'Upload Document',
      emptyText: 'No documents',
    };

    const mockDocuments: ContentListItem[] = [
      {
        id: 'doc-1',
        url: '/uploads/docs/1.pdf',
        title: 'Test Document 1',
        description: 'First test document',
        created_at: '2024-01-01T00:00:00Z',
        content_type: 'document',
        doc_type: 'pdf',
      },
    ];

    it('should render document list', async () => {
      (documentApi.getDocuments as jest.Mock).mockResolvedValue({
        items: mockDocuments,
        total: 1,
      });
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      await act(async () => {
        render(<ContentListPage {...documentProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Document 1')).toBeInTheDocument();
      });
    });
  });

  describe('Video Content', () => {
    const videoProps = {
      contentType: 'VIDEO' as ContentType,
      title: 'Video Management',
      icon: <span>VID</span>,
      uploadAccept: 'video/*',
      uploadButtonText: 'Upload Video',
      emptyText: 'No videos',
    };

    const mockVideos: ContentListItem[] = [
      {
        id: 'vid-1',
        url: '/uploads/videos/1.mp4',
        title: 'Test Video 1',
        original_name: 'Test Video 1',
        description: 'Test Video 1',
        created_at: '2024-01-01T00:00:00Z',
        content_type: 'video',
      },
    ];

    it('should render video list', async () => {
      (contentApi.listContents as jest.Mock).mockResolvedValue({
        items: mockVideos,
        total: 1,
      });

      await act(async () => {
        render(<ContentListPage {...videoProps} />);
      });

      await waitFor(() => {
        // Use getAllByText because title and description both show the same text
        expect(screen.getAllByText('Test Video 1').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Common Functionality', () => {
    const commonProps = {
      contentType: 'IMAGE' as ContentType,
      title: 'Content Management',
      icon: <span>ICON</span>,
      uploadAccept: '*/*',
      uploadButtonText: 'Upload',
      emptyText: 'No content',
    };

    it('should render page title', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        render(<ContentListPage {...commonProps} />);
      });

      expect(screen.getByText('Content Management')).toBeInTheDocument();
    });

    it('should render upload button', async () => {
      (imageApi.listImages as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        render(<ContentListPage {...commonProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument();
      });
    });
  });
});

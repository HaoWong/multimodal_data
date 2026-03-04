/**
 * Upload Store 单元测试
 * 测试上传任务管理、状态更新和错误处理
 */

import { useAppStore } from '../appStore';
import { useUploadState, useUploadActions } from '../appStore';

// Mock the API
jest.mock('../../services/api');

describe('uploadStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      tasks: [],
      ui: {
        isLoading: false,
        error: null,
        sidebarOpen: true,
        uploadPanelOpen: false,
        theme: 'light',
      },
    });
    jest.clearAllMocks();
  });

  describe('addUploadTask', () => {
    it('should add a new upload task', () => {
      const { addUploadTask } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 0,
        status: 'pending',
      });

      const { tasks } = useUploadState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].fileName).toBe('test.pdf');
      expect(tasks[0].fileType).toBe('document');
      expect(tasks[0].status).toBe('pending');
      expect(taskId).toBeDefined();
    });

    it('should add multiple tasks', () => {
      const { addUploadTask } = useUploadActions();

      addUploadTask({ fileName: 'file1.pdf', fileType: 'document', progress: 0, status: 'pending' });
      addUploadTask({ fileName: 'file2.jpg', fileType: 'image', progress: 0, status: 'pending' });
      addUploadTask({ fileName: 'file3.mp4', fileType: 'video', progress: 0, status: 'pending' });

      const { tasks } = useUploadState();
      expect(tasks).toHaveLength(3);
    });
  });

  describe('updateUploadProgress', () => {
    it('should update task progress', () => {
      const { addUploadTask, updateUploadProgress } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 0,
        status: 'uploading',
      });

      updateUploadProgress(taskId, 50);

      const { tasks } = useUploadState();
      const task = tasks.find(t => t.id === taskId);
      expect(task?.progress).toBe(50);
    });

    it('should not update non-existent task', () => {
      const { updateUploadProgress } = useUploadActions();

      // Should not throw error
      expect(() => {
        updateUploadProgress('non-existent-id', 50);
      }).not.toThrow();
    });
  });

  describe('startAnalyzing', () => {
    it('should start analyzing phase', () => {
      const { addUploadTask, startAnalyzing } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 100,
        status: 'uploading',
      });

      startAnalyzing(taskId);

      const { tasks } = useUploadState();
      const task = tasks.find(t => t.id === taskId);
      expect(task?.phase).toBe('analyzing');
      expect(task?.phaseProgress).toBe(0);
      expect(task?.status).toBe('processing');
    });
  });

  describe('updateAnalyzingProgress', () => {
    it('should update analyzing progress', () => {
      const { addUploadTask, startAnalyzing, updateAnalyzingProgress } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 100,
        status: 'uploading',
      });

      startAnalyzing(taskId);
      updateAnalyzingProgress(taskId, 50);

      const { tasks } = useUploadState();
      const task = tasks.find(t => t.id === taskId);
      expect(task?.phaseProgress).toBe(50);
    });
  });

  describe('completeUploadTask', () => {
    it('should mark task as completed', () => {
      const { addUploadTask, completeUploadTask } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 50,
        status: 'uploading',
      });

      completeUploadTask(taskId, { id: 'content-123', message: 'Success' });

      const { tasks } = useUploadState();
      const task = tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('completed');
      expect(task?.progress).toBe(100);
      expect(task?.result).toEqual({ id: 'content-123', message: 'Success' });
    });
  });

  describe('failUploadTask', () => {
    it('should mark task as failed', () => {
      const { addUploadTask, failUploadTask } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 50,
        status: 'uploading',
      });

      failUploadTask(taskId, 'Upload failed');

      const { tasks } = useUploadState();
      const task = tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('error');
      expect(task?.message).toBe('Upload failed');
    });
  });

  describe('removeUploadTask', () => {
    it('should remove task from list', () => {
      const { addUploadTask, removeUploadTask } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'test.pdf',
        fileType: 'document',
        progress: 100,
        status: 'completed',
      });

      removeUploadTask(taskId);

      const { tasks } = useUploadState();
      expect(tasks).toHaveLength(0);
    });

    it('should only remove specified task', () => {
      const { addUploadTask, removeUploadTask } = useUploadActions();

      const taskId1 = addUploadTask({ fileName: 'file1.pdf', fileType: 'document', progress: 0, status: 'pending' });
      const taskId2 = addUploadTask({ fileName: 'file2.pdf', fileType: 'document', progress: 0, status: 'pending' });

      removeUploadTask(taskId1);

      const { tasks } = useUploadState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(taskId2);
    });
  });

  describe('clearCompletedUploads', () => {
    it('should remove all completed tasks', () => {
      const { addUploadTask, completeUploadTask, clearCompletedUploads } = useUploadActions();

      const taskId1 = addUploadTask({ fileName: 'file1.pdf', fileType: 'document', progress: 0, status: 'pending' });
      const taskId2 = addUploadTask({ fileName: 'file2.pdf', fileType: 'document', progress: 0, status: 'pending' });

      completeUploadTask(taskId1, { id: 'content-1' });

      clearCompletedUploads();

      const { tasks } = useUploadState();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(taskId2);
    });
  });

  describe('getActiveUploadCount', () => {
    it('should return count of active uploads', () => {
      const { addUploadTask, getActiveUploadCount } = useUploadActions();

      addUploadTask({ fileName: 'file1.pdf', fileType: 'document', progress: 0, status: 'uploading' });
      addUploadTask({ fileName: 'file2.pdf', fileType: 'document', progress: 0, status: 'processing' });
      addUploadTask({ fileName: 'file3.pdf', fileType: 'document', progress: 0, status: 'completed' });
      addUploadTask({ fileName: 'file4.pdf', fileType: 'document', progress: 0, status: 'error' });

      const count = getActiveUploadCount();

      expect(count).toBe(2); // uploading and processing
    });
  });

  describe('task lifecycle', () => {
    it('should handle complete upload lifecycle', () => {
      const {
        addUploadTask,
        updateUploadProgress,
        startAnalyzing,
        updateAnalyzingProgress,
        completeUploadTask,
      } = useUploadActions();

      // 1. Add task
      const taskId = addUploadTask({
        fileName: 'document.pdf',
        fileType: 'document',
        progress: 0,
        status: 'pending',
      });

      let { tasks } = useUploadState();
      expect(tasks[0].status).toBe('pending');

      // 2. Update progress during upload
      updateUploadProgress(taskId, 25);
      tasks = useUploadState().tasks;
      expect(tasks[0].progress).toBe(25);

      updateUploadProgress(taskId, 50);
      tasks = useUploadState().tasks;
      expect(tasks[0].progress).toBe(50);

      // 3. Start analyzing phase
      startAnalyzing(taskId);
      tasks = useUploadState().tasks;
      expect(tasks[0].phase).toBe('analyzing');
      expect(tasks[0].status).toBe('processing');

      // 4. Update analyzing progress
      updateAnalyzingProgress(taskId, 30);
      tasks = useUploadState().tasks;
      expect(tasks[0].phaseProgress).toBe(30);

      updateAnalyzingProgress(taskId, 60);
      tasks = useUploadState().tasks;
      expect(tasks[0].phaseProgress).toBe(60);

      // 5. Complete task
      completeUploadTask(taskId, { id: 'content-123' });
      tasks = useUploadState().tasks;
      expect(tasks[0].status).toBe('completed');
      expect(tasks[0].progress).toBe(100);
    });

    it('should handle failed upload', () => {
      const { addUploadTask, updateUploadProgress, failUploadTask } = useUploadActions();

      const taskId = addUploadTask({
        fileName: 'large-file.pdf',
        fileType: 'document',
        progress: 0,
        status: 'uploading',
      });

      updateUploadProgress(taskId, 30);

      // Simulate failure
      failUploadTask(taskId, 'Network error');

      const { tasks } = useUploadState();
      expect(tasks[0].status).toBe('error');
      expect(tasks[0].message).toBe('Network error');
    });
  });

  describe('selectors', () => {
    it('useUploadState should return only upload state', () => {
      const { addUploadTask } = useUploadActions();
      addUploadTask({ fileName: 'test.pdf', fileType: 'document', progress: 0, status: 'pending' });

      const uploadState = useUploadState();

      expect(uploadState).toHaveProperty('tasks');
      expect(uploadState).not.toHaveProperty('messages');
      expect(uploadState).not.toHaveProperty('sessions');
    });

    it('useUploadActions should return only upload actions', () => {
      const actions = useUploadActions();

      expect(actions).toHaveProperty('addUploadTask');
      expect(actions).toHaveProperty('updateUploadProgress');
      expect(actions).toHaveProperty('completeUploadTask');
      expect(actions).not.toHaveProperty('sendMessage');
      expect(actions).not.toHaveProperty('createNewSession');
    });
  });
});

/**
 * 上传任务状态管理 - 支持三阶段进度：上传、AI分析、完成
 */
import { create } from 'zustand';

export interface UploadTask {
  id: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document';
  // 总进度 0-100
  progress: number;
  // 当前阶段
  phase: 'uploading' | 'analyzing' | 'completed' | 'error';
  // 阶段进度 0-100
  phaseProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  result?: any;
  createdAt: number;
}

interface UploadStore {
  tasks: UploadTask[];
  isPanelOpen: boolean;
  
  // 添加任务
  addTask: (task: Omit<UploadTask, 'id' | 'createdAt' | 'phase' | 'phaseProgress'>) => string;
  // 更新上传进度 (0-50% 占总进度的比例)
  updateUploadProgress: (id: string, percent: number) => void;
  // 开始 AI 分析阶段
  startAnalyzing: (id: string, message?: string) => void;
  // 更新 AI 分析进度 (50-90% 占总进度的比例)
  updateAnalyzingProgress: (id: string, percent: number) => void;
  // 完成任务 (100%)
  completeTask: (id: string, result?: any) => void;
  // 失败任务
  failTask: (id: string, message: string) => void;
  // 移除任务
  removeTask: (id: string) => void;
  // 清空已完成任务
  clearCompleted: () => void;
  // 打开/关闭面板
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  // 获取进行中的任务数
  getActiveCount: () => number;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  tasks: [],
  isPanelOpen: false,

  addTask: (task) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: UploadTask = {
      ...task,
      id,
      phase: 'uploading',
      phaseProgress: 0,
      createdAt: Date.now(),
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
    }));
    return id;
  },

  // 上传阶段占总进度的 0-50%
  updateUploadProgress: (id, percent) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              phase: 'uploading',
              phaseProgress: percent,
              progress: Math.round(percent * 0.5), // 0-50%
            }
          : t
      ),
    }));
  },

  // 开始 AI 分析阶段
  startAnalyzing: (id, message) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              phase: 'analyzing',
              phaseProgress: 0,
              progress: 50,
              message: message || 'AI分析中...',
            }
          : t
      ),
    }));
  },

  // AI分析阶段占总进度的 50-90%
  updateAnalyzingProgress: (id, percent) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              phase: 'analyzing',
              phaseProgress: percent,
              progress: Math.round(50 + percent * 0.4), // 50-90%
            }
          : t
      ),
    }));
  },

  // 完成阶段 100%
  completeTask: (id, result) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              phase: 'completed',
              phaseProgress: 100,
              progress: 100,
              status: 'completed',
              message: '完成',
              result,
            }
          : t
      ),
    }));
  },

  failTask: (id, message) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? { ...t, phase: 'error', status: 'error', message }
          : t
      ),
    }));
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'error'
      ),
    }));
  },

  togglePanel: () => {
    set((state) => ({ isPanelOpen: !state.isPanelOpen }));
  },

  setPanelOpen: (open) => {
    set({ isPanelOpen: open });
  },

  getActiveCount: () => {
    return get().tasks.filter(
      (t) => t.status === 'pending' || t.status === 'uploading' || t.status === 'processing'
    ).length;
  },
}));

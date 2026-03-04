/**
 * Upload Store - 复用 AppStore 的统一状态管理
 * 保持向后兼容的接口，内部调用 appStore 的方法
 * @deprecated 建议直接使用 useAppStore 或 useUploadState/useUploadActions
 */
import {
  useAppStore,
  useUploadState,
  useUploadActions,
  type UploadTask,
} from './appStore';

// 为了保持向后兼容，导出 useUploadStore
// 它返回与原来相同的接口，但内部使用 appStore
export const useUploadStore = () => {
  const { tasks } = useUploadState();
  const {
    addUploadTask,
    updateUploadProgress,
    startAnalyzing,
    updateAnalyzingProgress,
    completeUploadTask,
    failUploadTask,
    removeUploadTask,
    clearCompletedUploads,
    getActiveUploadCount,
  } = useUploadActions();
  const { uploadPanelOpen, sidebarOpen } = useAppStore((state) => ({
    uploadPanelOpen: state.ui.uploadPanelOpen,
    sidebarOpen: state.ui.sidebarOpen,
  }));
  const { toggleUploadPanel, setUploadPanelOpen } = useAppStore((state) => ({
    toggleUploadPanel: state.toggleUploadPanel,
    setUploadPanelOpen: state.setUploadPanelOpen,
  }));

  return {
    // 状态
    tasks,
    isPanelOpen: uploadPanelOpen,

    // 方法 - 保持与原接口一致
    addTask: addUploadTask,
    updateUploadProgress,
    startAnalyzing,
    updateAnalyzingProgress,
    completeTask: completeUploadTask,
    failTask: failUploadTask,
    removeTask: removeUploadTask,
    clearCompleted: clearCompletedUploads,
    togglePanel: toggleUploadPanel,
    setPanelOpen: setUploadPanelOpen,
    getActiveCount: getActiveUploadCount,
  };
};

// 导出类型
export type { UploadTask };

// 导出便捷的选择器 hooks
export { useUploadState, useUploadActions };

/**
 * 使用示例:
 *
 * // 方式1: 使用兼容的 useUploadStore (获取完整状态)
 * const { tasks, addTask, isPanelOpen, togglePanel } = useUploadStore();
 *
 * // 方式2: 使用选择器优化性能 (推荐)
 * const { tasks } = useUploadState();
 * const { addUploadTask, completeUploadTask } = useUploadActions();
 *
 * // 方式3: 直接使用 useAppStore
 * const tasks = useAppStore(state => state.tasks);
 * const addTask = useAppStore(state => state.addUploadTask);
 */

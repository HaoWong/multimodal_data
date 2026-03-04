/**
 * Stores 统一导出
 * 提供多种使用方式，满足不同场景需求
 */

// ==================== 核心 Store ====================
export {
  // 统一应用 Store (推荐新项目使用)
  useAppStore,
  // 类型定义
  type AppStoreState,
  type ChatState,
  type UploadState,
  type UIState,
  type UserState,
  type UploadTask,
} from './appStore';

// ==================== 选择器 Hooks (性能优化) ====================
export {
  // Chat 相关
  useChatState,
  useChatActions,
  // Upload 相关
  useUploadState,
  useUploadActions,
  // UI 相关
  useUIState,
  useUIActions,
  // User 相关
  useUserState,
  useUserActions,
} from './appStore';

// ==================== 向后兼容的 Store ====================
// @deprecated 建议迁移到 useAppStore 或选择器 hooks
export { useChatStore, type AppState } from './chatStore';

// @deprecated 建议迁移到 useAppStore 或选择器 hooks
export { useUploadStore, type UploadTask as UploadTaskLegacy } from './uploadStore';

/**
 * 使用指南：
 *
 * 1. 新项目推荐 - 使用统一 Store:
 *    const { messages, sendMessage } = useAppStore();
 *
 * 2. 性能优化 - 使用选择器 (防止不必要的重渲染):
 *    const { messages } = useChatState();
 *    const { sendMessage } = useChatActions();
 *
 * 3. 只获取单个状态 (最佳性能):
 *    const messages = useAppStore(state => state.messages);
 *    const sendMessage = useAppStore(state => state.sendMessage);
 *
 * 4. 向后兼容 (旧代码无需修改):
 *    const { messages, sendMessage } = useChatStore();
 *    const { tasks, addTask } = useUploadStore();
 */

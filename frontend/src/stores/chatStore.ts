/**
 * Chat Store - 复用 AppStore 的统一状态管理
 * 保持向后兼容的接口，内部调用 appStore 的方法
 * @deprecated 建议直接使用 useAppStore 或 useChatState/useChatActions
 */
import { useAppStore, useChatState, useChatActions } from './appStore';
import { AppState } from '../types';

// 为了保持向后兼容，导出 useChatStore
// 它返回与原来相同的接口，但内部使用 appStore
export const useChatStore = useAppStore;

// 导出便捷的选择器 hooks
export { useChatState, useChatActions };

// 为了保持类型兼容，重新导出 AppState 作为默认导出
export type { AppState };

/**
 * 使用示例:
 *
 * // 方式1: 使用兼容的 useChatStore (获取完整状态)
 * const { messages, sendMessage, isLoading } = useChatStore();
 *
 * // 方式2: 使用选择器优化性能 (推荐)
 * const { messages, sessions } = useChatState();
 * const { sendMessage, createNewSession } = useChatActions();
 *
 * // 方式3: 直接使用 useAppStore
 * const messages = useAppStore(state => state.messages);
 */

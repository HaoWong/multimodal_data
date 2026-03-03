# Tasks

## Phase 1: 重构数据模型 (Foundation)

- [x] Task 1: 创建统一内容模型 (UnifiedContent)
  - [x] SubTask 1.1: 设计Content模型替代Document/Image/Video
  - [x] SubTask 1.2: 创建数据库迁移脚本
  - [x] SubTask 1.3: 实现内容提取管道 (文本/图片/视频)

- [x] Task 2: 移除作业审查专用代码
  - [x] SubTask 2.1: 删除assignment_models.py
  - [x] SubTask 2.2: 删除assignment_service.py
  - [x] SubTask 2.3: 删除assignments API
  - [x] SubTask 2.4: 删除前端AssignmentsPage

## Phase 2: Agent Skill系统 (Core)

- [x] Task 3: 实现Skill注册和发现机制
  - [x] SubTask 3.1: 创建Skill基类和注册器
  - [x] SubTask 3.2: 实现Skill元数据管理
  - [x] SubTask 3.3: 创建Skills API (/skills/list, /skills/invoke)

- [x] Task 4: 实现内置Skills
  - [x] SubTask 4.1: content_extract skill (文件内容提取)
  - [x] SubTask 4.2: image_analyze skill (图像分析)
  - [x] SubTask 4.3: video_analyze skill (视频分析)
  - [x] SubTask 4.4: text_embed skill (文本向量化)
  - [x] SubTask 4.5: vector_search skill (向量检索)
  - [x] SubTask 4.6: llm_chat skill (LLM对话)

## Phase 3: 智能体执行引擎 (Engine)

- [x] Task 5: 实现Agent执行引擎
  - [x] SubTask 5.1: 创建Agent执行器类
  - [x] SubTask 5.2: 实现任务规划和技能选择
  - [x] SubTask 5.3: 实现技能编排执行
  - [x] SubTask 5.4: 实现执行日志和观察

- [x] Task 6: 实现RAG增强机制
  - [x] SubTask 6.1: 集成vector_search到Agent上下文
  - [x] SubTask 6.2: 实现检索结果注入Prompt
  - [x] SubTask 6.3: 实现多轮对话上下文管理

## Phase 4: API和前端 (Interface)

- [x] Task 7: 创建新的API端点
  - [x] SubTask 7.1: /contents API (统一内容管理)
  - [x] SubTask 7.2: /skills API (技能管理)
  - [x] SubTask 7.3: /agent API (智能体执行)

- [x] Task 8: 重构前端界面
  - [x] SubTask 8.1: 更新API客户端
  - [x] SubTask 8.2: 移除AssignmentsPage
  - [x] SubTask 8.3: 增强ChatPage支持Agent交互
  - [x] SubTask 8.4: 添加技能执行状态显示

## Phase 5: 测试和错误处理 (Validation)

- [x] Task 9: 补充核心测试用例
  - [x] SubTask 9.1: Skill系统测试 (test_skills.py)
  - [x] SubTask 9.2: Agent引擎测试 (test_agent.py)
  - [x] SubTask 9.3: Contents API测试 (test_api_contents.py)
  - [x] SubTask 9.4: 集成测试框架

- [x] Task 10: 添加错误处理机制
  - [x] SubTask 10.1: 重试机制 (async_retry/sync_retry)
  - [x] SubTask 10.2: 超时处理 (with_timeout)
  - [x] SubTask 10.3: 错误日志记录 (ErrorLogger)
  - [x] SubTask 10.4: 全局异常捕获

## Phase 6: 文档和示例 (Documentation)

- [ ] Task 11: 完善使用文档
  - [ ] SubTask 11.1: API使用文档
  - [ ] SubTask 11.2: Skill开发指南
  - [ ] SubTask 11.3: Agent使用教程

- [ ] Task 12: 创建示例场景
  - [ ] SubTask 12.1: "审查作业"Agent任务示例
  - [ ] SubTask 12.2: "搜索相关内容"Agent任务示例

# Task Dependencies

```
Task 1 (数据模型) -> Task 4 (Skills需要存储数据)
Task 2 (移除旧代码) -> Task 7 (新API)
Task 3 (Skill系统) -> Task 4 (内置Skills)
Task 4 (内置Skills) -> Task 5 (Agent引擎)
Task 5 (Agent引擎) -> Task 6 (RAG增强)
Task 6 (RAG增强) -> Task 7 (Agent API)
Task 7 (API) -> Task 8 (前端)
Task 8 (前端) -> Task 9 (测试)
Task 9 (测试) -> Task 10 (错误处理)
Task 10 (错误处理) -> Task 11 (文档)
```

# Parallel Work

- Task 1 和 Task 2 可以并行
- Task 3 和 Task 4 可以并行（部分）
- Task 5 和 Task 6 紧密耦合，建议顺序执行
- Task 9 和 Task 10 可以并行

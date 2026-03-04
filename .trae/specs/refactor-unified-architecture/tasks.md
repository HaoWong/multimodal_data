# 重构任务列表

## 后端重构任务

### Task 1: 重构Service层 - 建立BaseService抽象基类
- [x] 分析现有Service层代码，提取通用模式
- [ ] 设计BaseService抽象基类接口（CRUD、搜索、向量操作）
- [ ] 实现BaseService基类
- [ ] 重构ContentService继承BaseService
- [ ] 重构ChatService复用BaseService能力
- [ ] 删除DocumentService（合并到ContentService）
- [ ] 运行测试验证功能正常

**依赖**: 无
**预计工时**: 4小时

### Task 2: 统一任务执行引擎
- [ ] 分析Skill和Agent当前执行流程
- [ ] 设计统一任务执行引擎接口
- [ ] 实现TaskExecutionEngine类
- [ ] 重构Skill基类使用统一引擎
- [ ] 重构Agent引擎复用执行逻辑
- [ ] 统一参数验证和结果处理流程
- [ ] 运行测试验证Skill和Agent功能

**依赖**: Task 1
**预计工时**: 6小时

### Task 3: 统一API响应格式
- [x] 设计统一响应格式标准
- [ ] 实现APIResponse包装类
- [ ] 重构所有API路由使用统一响应格式
- [ ] 实现全局错误处理中间件
- [ ] 更新API文档
- [ ] 运行测试验证所有端点

**依赖**: 无
**预计工时**: 3小时

### Task 4: 精简API路由
- [ ] 分析现有7个路由文件的功能
- [ ] 设计精简后的路由结构（3个核心路由）
- [ ] 合并images.py到contents.py
- [ ] 合并documents.py到contents.py
- [ ] 更新main.py路由注册
- [ ] 保持向后兼容的端点重定向
- [ ] 运行测试验证所有端点可用

**依赖**: Task 3
**预计工时**: 4小时

### Task 5: 统一文件处理逻辑
- [x] 分析现有文件处理代码（file_parser, video_processor等）
- [ ] 设计统一文件处理器接口
- [ ] 实现FileProcessor基类
- [ ] 重构各类型处理器继承基类
- [ ] 统一文件存储路径管理
- [ ] 运行测试验证文件上传处理

**依赖**: 无
**预计工时**: 3小时

## 前端重构任务

### Task 6: 统一状态管理
- [ ] 分析chatStore和uploadStore的重复逻辑
- [ ] 设计统一store架构
- [ ] 创建appStore统一状态管理
- [ ] 重构chatStore复用appStore
- [ ] 重构uploadStore复用appStore
- [ ] 更新所有组件使用新store
- [ ] 运行测试验证状态管理正常

**依赖**: 无
**预计工时**: 4小时

### Task 7: 统一API服务封装
- [ ] 分析api.ts中的重复代码模式
- [ ] 设计统一API调用封装
- [ ] 实现BaseApiService类
- [ ] 重构contentApi使用统一封装
- [ ] 重构chatApi使用统一封装
- [ ] 重构agentApi使用统一封装
- [ ] 删除重复的API定义
- [ ] 运行测试验证API调用正常

**依赖**: 无
**预计工时**: 3小时

### Task 8: 合并页面组件
- [ ] 分析ImagesPage/VideosPage/DocumentsPage的相似性
- [ ] 设计ContentListPage通用组件
- [ ] 实现ContentListPage组件
- [ ] 配置不同内容类型的显示参数
- [ ] 重构ImagesPage使用ContentListPage
- [ ] 重构VideosPage使用ContentListPage
- [ ] 重构DocumentsPage使用ContentListPage
- [ ] 更新路由配置
- [ ] 运行测试验证页面显示正常

**依赖**: Task 6, Task 7
**预计工时**: 5小时

### Task 9: 统一组件接口
- [ ] 分析现有组件的props接口
- [ ] 设计统一组件props标准
- [ ] 重构ChatMessage组件接口
- [ ] 重构ChatInput组件接口
- [ ] 重构DockNavigation组件接口
- [ ] 更新类型定义文件
- [ ] 运行测试验证组件正常

**依赖**: 无
**预计工时**: 3小时

## 集成测试任务

### Task 10: 端到端集成测试
- [ ] 设计重构后的端到端测试用例
- [ ] 实现API集成测试
- [ ] 实现前端组件集成测试
- [ ] 实现全链路集成测试
- [ ] 修复发现的兼容性问题
- [ ] 验证所有功能正常

**依赖**: Task 1-9
**预计工时**: 6小时

## 文档更新任务

### Task 11: 更新架构文档
- [ ] 更新ARCHITECTURE.md反映新架构
- [ ] 更新API文档
- [ ] 更新开发指南
- [ ] 编写迁移指南
- [ ] 更新CHANGELOG

**依赖**: Task 1-10
**预计工时**: 2小时

# 任务依赖关系

```
Task 1 (Service层) ──────┐
                         ├──▶ Task 2 (执行引擎) ──────┐
Task 3 (API响应) ────────┘                            │
                         ─────────────────────────────┤
Task 4 (精简路由) ───────┘                            │
                                                      ▼
Task 5 (文件处理) ─────────────────────────────────▶ Task 10 (集成测试)
                                                      ▲
Task 6 (状态管理) ──────┐                             │
                       ├──▶ Task 8 (合并页面) ────────┘
Task 7 (API封装) ───────┘                             │
                                                      │
Task 9 (组件接口) ────────────────────────────────────┘
                                                      │
Task 11 (文档) ◀──────────────────────────────────────┘
```

# 执行顺序建议

## 阶段1: 后端基础重构（第1-2天）
- Task 1: Service层重构
- Task 3: API响应格式统一
- Task 5: 文件处理统一

## 阶段2: 后端核心重构（第3-4天）
- Task 2: 任务执行引擎统一
- Task 4: API路由精简

## 阶段3: 前端重构（第5-7天）
- Task 6: 状态管理统一
- Task 7: API服务封装
- Task 9: 组件接口统一
- Task 8: 页面合并

## 阶段4: 集成与文档（第8-9天）
- Task 10: 集成测试
- Task 11: 文档更新

# 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| API兼容性破坏 | 高 | 保持旧端点重定向，逐步迁移 |
| 功能回归 | 高 | 完善的测试覆盖，分阶段部署 |
| 开发时间超期 | 中 | 任务可并行执行，优先核心功能 |
| 前端状态迁移 | 中 | 保持旧store接口，内部调用新store |

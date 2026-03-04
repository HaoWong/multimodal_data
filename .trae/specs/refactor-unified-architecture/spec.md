# 项目重构 - 统一架构规格说明

## Why

当前项目存在代码重复、逻辑分散的问题：
1. API层多个路由文件（documents.py, images.py, contents.py）处理相似的内容管理逻辑
2. Service层缺乏统一抽象，chat_service和document_service有重复代码
3. Skill系统和Agent引擎之间缺乏统一的任务处理流程
4. 前端多个页面（ImagesPage, VideosPage, DocumentsPage）有相似的列表展示逻辑

通过重构建立统一的抽象层，减少重复代码，使所有任务逻辑走一套流程。

## What Changes

### 后端重构
- **BREAKING**: 统一API路由，合并相似端点到通用内容管理接口
- **BREAKING**: 重构Service层，建立BaseService抽象基类
- 统一任务处理流程，Skill和Agent共用一套执行引擎
- 统一错误处理和响应格式
- 统一文件处理和存储逻辑

### 前端重构
- **BREAKING**: 合并ImagesPage/VideosPage/DocumentsPage为统一的ContentListPage
- 统一API调用封装，减少重复代码
- 统一状态管理，合并chatStore和uploadStore
- 统一组件props接口

## Impact

### Affected Specs
- 内容管理API规范
- Skill执行流程规范
- 前端页面路由规范

### Affected Code
- backend/app/api/*.py (7个文件)
- backend/app/services/*.py (3个文件)
- backend/app/skills/*.py (4个文件)
- backend/app/agent/*.py (2个文件)
- frontend/src/pages/*.tsx (4个文件)
- frontend/src/services/*.ts (1个文件)
- frontend/src/stores/*.ts (2个文件)

## ADDED Requirements

### Requirement: 统一Service层架构
The system SHALL provide a unified service layer architecture with BaseService abstract class.

#### Scenario: Service继承
- **GIVEN** 需要创建新的业务服务
- **WHEN** 继承BaseService基类
- **THEN** 自动获得CRUD、搜索、向量操作等通用能力

#### Scenario: 通用方法复用
- **GIVEN** ContentService处理内容数据
- **WHEN** 调用create/update/delete/search方法
- **THEN** 使用BaseService提供的统一实现

### Requirement: 统一任务执行引擎
The system SHALL provide a unified task execution engine for both Skills and Agent.

#### Scenario: Skill执行
- **GIVEN** 调用任意Skill
- **WHEN** 通过统一执行引擎
- **THEN** 走相同的参数验证、执行、结果处理流程

#### Scenario: Agent任务执行
- **GIVEN** Agent规划出多个步骤
- **WHEN** 执行每个步骤
- **THEN** 复用Skill执行流程，保持一致性

### Requirement: 统一API响应格式
The system SHALL provide unified API response format across all endpoints.

#### Scenario: 成功响应
- **WHEN** API调用成功
- **THEN** 返回 {success: true, data: ..., message: ...} 格式

#### Scenario: 错误响应
- **WHEN** API调用失败
- **THEN** 返回 {success: false, error: ..., code: ...} 格式

### Requirement: 统一内容管理接口
The system SHALL provide unified content management interface for all content types.

#### Scenario: 上传内容
- **GIVEN** 上传任意类型文件（文档/图片/视频）
- **WHEN** 调用统一上传接口
- **THEN** 自动识别类型并路由到对应处理器

#### Scenario: 搜索内容
- **GIVEN** 搜索查询
- **WHEN** 调用统一搜索接口
- **THEN** 支持按类型过滤和语义搜索

### Requirement: 前端统一页面组件
The system SHALL provide unified page components for content management.

#### Scenario: 内容列表页
- **GIVEN** 查看任意类型内容列表
- **WHEN** 使用ContentListPage组件
- **THEN** 通过配置props显示不同类型数据

#### Scenario: 统一状态管理
- **GIVEN** 管理应用状态
- **WHEN** 使用统一store
- **THEN** 所有状态操作走同一套流程

## MODIFIED Requirements

### Requirement: Skill基类增强
**Current**: Skill基类只定义基本接口
**Modified**: Skill基类增加通用执行逻辑，支持同步/异步执行、自动重试、结果缓存

### Requirement: Agent引擎简化
**Current**: Agent引擎独立实现任务执行
**Modified**: Agent引擎复用统一任务执行引擎，只负责任务规划

### Requirement: API路由精简
**Current**: 7个独立路由文件
**Modified**: 3个核心路由文件（contents.py, agent.py, chat.py）

## REMOVED Requirements

### Requirement: 独立Image API
**Reason**: 合并到统一内容管理接口
**Migration**: 前端调用从 /api/images/ 迁移到 /api/contents/?content_type=IMAGE

### Requirement: 独立Document API  
**Reason**: 合并到统一内容管理接口
**Migration**: 前端调用从 /api/documents/ 迁移到 /api/contents/?content_type=TEXT

### Requirement: 独立Video API
**Reason**: 合并到统一内容管理接口
**Migration**: 前端调用从 /api/videos/ 迁移到 /api/contents/?content_type=VIDEO

### Requirement: Skill独立执行流程
**Reason**: 统一到任务执行引擎
**Migration**: Skill通过统一引擎执行，保持相同接口

# 通用智能体RAG平台 Spec

## Why
当前系统是一个固定的作业审查应用，但用户需要一个**通用智能体平台**，能够通过Agent Skills灵活调用多模态RAG能力，实现数据增强的智能处理。平台应该支持任意类型的多模态数据处理任务，而不仅限于作业审查。

## What Changes
- **BREAKING**: 移除固定的作业审查流程（assignments API、assignment_models、assignment_service）
- **BREAKING**: 重构为多模态统一存储（UnifiedContent模型替代分离的Document/Image/Video模型）
- **新增**: Agent Skill系统 - 可注册、发现、调用的技能框架
- **新增**: 通用智能体执行引擎 - 支持技能编排和RAG增强
- **新增**: 多模态内容统一处理管道
- **修改**: 前端从固定页面改为智能体交互界面

## Impact
- Affected specs: 多模态RAG存储、Agent Skill系统、智能体执行引擎
- Affected code: backend/models/, backend/services/, backend/api/, frontend/pages/

## ADDED Requirements

### Requirement: 多模态统一存储
The system SHALL provide unified storage for multimodal content (text, image, video).

#### Scenario: Content ingestion
- **WHEN** user uploads any content (document, image, video, zip)
- **THEN** system extracts content, generates embeddings, stores in unified schema
- **AND** content is searchable via vector similarity

#### Scenario: Unified query
- **WHEN** user queries the system
- **THEN** results can contain mixed content types ranked by relevance

### Requirement: Agent Skill System
The system SHALL provide a pluggable skill system where agents can discover and invoke capabilities.

#### Scenario: Skill registration
- **WHEN** developer registers a new skill
- **THEN** skill is discoverable by agents
- **AND** skill has defined input/output schema

#### Scenario: Skill invocation
- **WHEN** agent needs to perform an action
- **THEN** agent can discover and invoke appropriate skill
- **AND** skill execution is logged and observable

#### Scenario: Built-in skills
The system SHALL provide these built-in skills:
- `content_extract`: Extract content from files
- `image_analyze`: Analyze images using vision model
- `video_analyze`: Extract frames and analyze video
- `text_embed`: Generate embeddings for text
- `vector_search`: Search RAG database
- `llm_chat`: Chat with LLM

### Requirement: 通用智能体执行引擎
The system SHALL provide an agent execution engine that can orchestrate skills and use RAG data.

#### Scenario: Simple task execution
- **WHEN** user submits a task (e.g., "审查这份作业")
- **THEN** agent analyzes task requirements
- **AND** agent selects appropriate skills
- **AND** agent executes skills in sequence
- **AND** agent returns results with reasoning

#### Scenario: RAG-enhanced execution
- **WHEN** agent needs context for a task
- **THEN** agent can query RAG database via vector_search skill
- **AND** retrieved context is included in LLM prompts

#### Scenario: Multi-step reasoning
- **WHEN** task requires multiple steps
- **THEN** agent can break down task
- **AND** execute skills step by step
- **AND** use intermediate results

### Requirement: 智能体交互界面
The system SHALL provide a chat-based interface for agent interaction.

#### Scenario: Task submission
- **WHEN** user sends message in chat
- **THEN** agent interprets intent
- **AND** executes appropriate skills
- **AND** returns formatted results

#### Scenario: Multi-turn interaction
- **WHEN** user asks follow-up questions
- **THEN** agent maintains context
- **AND** can reference previous results

## MODIFIED Requirements

### Requirement: Data Models
**Current**: Separate Document, Image models
**Modified**: Unified Content model with type field

```
Content:
  - id: UUID
  - content_type: enum[text, image, video, audio]
  - source_path: string
  - extracted_text: text (for documents)
  - description: text (for image/video)
  - embedding: vector
  - metadata: JSON
  - created_at: datetime
```

### Requirement: API Structure
**Current**: /documents, /images, /assignments endpoints
**Modified**: 
- /contents - unified content management
- /skills - skill registry and invocation
- /agent - agent execution and conversation

## REMOVED Requirements

### Requirement: Fixed Assignment Review Flow
**Reason**: Replaced by generic agent platform
**Migration**: Assignment review becomes one possible agent task using skills

### Requirement: Assignment-specific Models
**Reason**: Replaced by unified content model
**Migration**: Data migration to Content model with metadata

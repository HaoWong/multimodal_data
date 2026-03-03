"""
作业管理模型
支持多模态内容关联：文档 + 图片 + 视频
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Table, JSON, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from enum import Enum
import uuid

from app.core.database import Base


class AssignmentStatus(str, Enum):
    """作业状态"""
    DRAFT = "draft"           # 草稿
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"   # 已完成
    ARCHIVED = "archived"     # 已归档


class AssignmentType(str, Enum):
    """作业类型"""
    DESIGN = "design"         # 设计作业
    EXPERIMENT = "experiment" # 实验报告
    PROJECT = "project"       # 项目作业
    RESEARCH = "research"     # 研究报告
    OTHER = "other"           # 其他


# 作业与内容关联表
assignment_content_association = Table(
    'assignment_content_association',
    Base.metadata,
    Column('assignment_id', UUID(as_uuid=True), ForeignKey('assignments.id'), primary_key=True),
    Column('content_id', UUID(as_uuid=True), ForeignKey('contents.id'), primary_key=True),
    Column('content_role', String(50)),  # 内容的角色：design_doc, demo_image, demo_video 等
    Column('added_at', DateTime, default=datetime.utcnow)
)


class Assignment(Base):
    """作业模型"""
    __tablename__ = "assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text)  # 作业描述
    assignment_type = Column(SQLEnum(AssignmentType), default=AssignmentType.OTHER)
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.DRAFT)
    
    # AI 生成的分析和建议
    ai_analysis = Column(Text)  # 整体分析
    ai_suggestions = Column(JSONB, default=list)  # 改进建议列表
    ai_steps = Column(JSONB, default=list)  # 执行步骤建议
    
    # 关联的内容
    contents = relationship(
        "Content",
        secondary=assignment_content_association,
        back_populates="assignments"
    )
    
    # 元数据
    tags = Column(JSONB, default=list)  # 标签
    extra_metadata = Column(JSONB, default=dict)  # 额外元数据（避免使用保留名metadata）
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    def to_dict(self, include_contents: bool = False):
        """转换为字典"""
        data = {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "assignment_type": self.assignment_type.value if self.assignment_type else None,
            "status": self.status.value if self.status else None,
            "ai_analysis": self.ai_analysis,
            "ai_suggestions": self.ai_suggestions,
            "ai_steps": self.ai_steps,
            "tags": self.tags,
            "metadata": self.extra_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
        
        if include_contents:
            data["contents"] = [self._content_to_dict(c) for c in self.contents]
        else:
            data["content_count"] = len(self.contents)
        
        return data
    
    def _content_to_dict(self, content):
        """转换关联内容为字典"""
        return {
            "id": str(content.id),
            "original_name": content.original_name,
            "content_type": content.content_type.value if hasattr(content.content_type, 'value') else str(content.content_type),
            "description": content.description,
            "created_at": content.created_at.isoformat() if content.created_at else None,
        }


# 在 Content 模型中添加反向关系
# 需要在 content_models.py 中添加：
# assignments = relationship("Assignment", secondary=assignment_content_association, back_populates="contents")


class AssignmentVersion(Base):
    """作业版本历史"""
    __tablename__ = "assignment_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    
    # 版本内容快照
    title = Column(String(200))
    description = Column(Text)
    ai_analysis = Column(Text)
    
    # 变更说明
    change_summary = Column(Text)
    changed_by = Column(String(100))  # 可以是用户ID或 "AI"
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "assignment_id": str(self.assignment_id),
            "version_number": self.version_number,
            "title": self.title,
            "description": self.description,
            "change_summary": self.change_summary,
            "changed_by": self.changed_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AssignmentChat(Base):
    """作业对话历史"""
    __tablename__ = "assignment_chats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    
    # 对话上下文
    context_type = Column(String(50))  # general, document, image, video, analysis
    referenced_content_ids = Column(JSONB, default=list)  # 引用的内容ID
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "assignment_id": str(self.assignment_id),
            "role": self.role,
            "content": self.content,
            "context_type": self.context_type,
            "referenced_content_ids": self.referenced_content_ids,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

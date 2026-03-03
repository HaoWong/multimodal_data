"""
作业管理 API
支持多模态内容关联和智能分析
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.assignment_models import Assignment, AssignmentStatus, AssignmentType, AssignmentChat
from app.models.content_models import Content
from app.services.ollama_client import ollama_client

router = APIRouter(prefix="/api/assignments", tags=["作业管理"])


# ============ 请求/响应模型 ============

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assignment_type: str = "other"
    tags: Optional[List[str]] = []


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class ContentAddRequest(BaseModel):
    content_id: str
    content_role: str  # design_doc, demo_image, demo_video, reference 等


class ChatMessageRequest(BaseModel):
    message: str
    context_type: Optional[str] = "general"  # general, document, image, video


# ============ 作业 CRUD ============

@router.post("/", response_model=dict)
async def create_assignment(
    request: AssignmentCreate,
    db: Session = Depends(get_db)
):
    """创建新作业"""
    assignment = Assignment(
        id=uuid.uuid4(),
        title=request.title,
        description=request.description,
        assignment_type=AssignmentType(request.assignment_type) if request.assignment_type else AssignmentType.OTHER,
        status=AssignmentStatus.DRAFT,
        tags=request.tags or []
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return {
        "success": True,
        "message": "作业创建成功",
        "data": assignment.to_dict()
    }


@router.get("/")
async def list_assignments(
    status: Optional[str] = None,
    assignment_type: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """获取作业列表"""
    query = db.query(Assignment)
    
    if status:
        query = query.filter(Assignment.status == AssignmentStatus(status))
    if assignment_type:
        query = query.filter(Assignment.assignment_type == AssignmentType(assignment_type))
    
    assignments = query.order_by(Assignment.created_at.desc()).limit(limit).all()
    
    return {
        "assignments": [a.to_dict() for a in assignments],
        "total": len(assignments)
    }


@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """获取作业详情"""
    assignment = db.query(Assignment).options(
        joinedload(Assignment.contents)
    ).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    return {
        "success": True,
        "data": assignment.to_dict(include_contents=True)
    }


@router.put("/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    request: AssignmentUpdate,
    db: Session = Depends(get_db)
):
    """更新作业信息"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    if request.title is not None:
        assignment.title = request.title
    if request.description is not None:
        assignment.description = request.description
    if request.status is not None:
        assignment.status = AssignmentStatus(request.status)
        if request.status == "completed":
            assignment.completed_at = datetime.utcnow()
    if request.tags is not None:
        assignment.tags = request.tags
    
    db.commit()
    db.refresh(assignment)
    
    return {
        "success": True,
        "message": "作业更新成功",
        "data": assignment.to_dict()
    }


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """删除作业"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    db.delete(assignment)
    db.commit()
    
    return {
        "success": True,
        "message": "作业已删除"
    }


# ============ 内容关联管理 ============

@router.post("/{assignment_id}/contents")
async def add_content_to_assignment(
    assignment_id: str,
    request: ContentAddRequest,
    db: Session = Depends(get_db)
):
    """添加内容到作业"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    content = db.query(Content).filter(Content.id == request.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")
    
    # 检查是否已关联
    if content in assignment.contents:
        return {
            "success": False,
            "message": "该内容已关联到此作业"
        }
    
    assignment.contents.append(content)
    db.commit()
    
    return {
        "success": True,
        "message": "内容已添加到作业",
        "data": {
            "content_id": str(content.id),
            "content_role": request.content_role,
            "original_name": content.original_name
        }
    }


@router.delete("/{assignment_id}/contents/{content_id}")
async def remove_content_from_assignment(
    assignment_id: str,
    content_id: str,
    db: Session = Depends(get_db)
):
    """从作业中移除内容"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content or content not in assignment.contents:
        raise HTTPException(status_code=404, detail="内容未关联到此作业")
    
    assignment.contents.remove(content)
    db.commit()
    
    return {
        "success": True,
        "message": "内容已从作业中移除"
    }


# ============ AI 智能分析 ============

@router.post("/{assignment_id}/analyze")
async def analyze_assignment(
    assignment_id: str,
    db: Session = Depends(get_db)
):
    """AI 分析作业整体情况"""
    assignment = db.query(Assignment).options(
        joinedload(Assignment.contents)
    ).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    # 构建分析提示
    prompt = f"""请分析以下作业的整体情况，并给出建议：

作业标题：{assignment.title}
作业描述：{assignment.description or '无'}
作业类型：{assignment.assignment_type.value if assignment.assignment_type else '其他'}

关联内容：
"""
    
    for content in assignment.contents:
        content_type = content.content_type.value if hasattr(content.content_type, 'value') else str(content.content_type)
        prompt += f"\n- [{content_type}] {content.original_name}"
        if content.description:
            prompt += f"\n  描述：{content.description[:200]}..."
        if content.extracted_text:
            prompt += f"\n  内容摘要：{content.extracted_text[:200]}..."
    
    prompt += """

请提供：
1. 整体分析（作业完整性、内容质量等）
2. 改进建议（至少3条具体建议）
3. 执行步骤（完成此作业的推荐步骤）

请以JSON格式返回：
{
    "analysis": "整体分析文本",
    "suggestions": ["建议1", "建议2", "建议3"],
    "steps": ["步骤1", "步骤2", "步骤3"]
}
"""
    
    try:
        # 调用 AI 生成分析
        response = await ollama_client.generate(prompt)
        
        # 尝试解析 JSON
        import json
        import re
        
        # 提取 JSON 部分
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            
            # 保存分析结果
            assignment.ai_analysis = result.get("analysis", "")
            assignment.ai_suggestions = result.get("suggestions", [])
            assignment.ai_steps = result.get("steps", [])
            db.commit()
            
            return {
                "success": True,
                "message": "分析完成",
                "data": result
            }
        else:
            # 保存原始响应
            assignment.ai_analysis = response
            db.commit()
            
            return {
                "success": True,
                "message": "分析完成（非结构化）",
                "data": {"analysis": response}
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


# ============ 作业对话 ============

@router.post("/{assignment_id}/chat")
async def chat_with_assignment(
    assignment_id: str,
    request: ChatMessageRequest,
    db: Session = Depends(get_db)
):
    """与作业进行对话（使用Agent架构）"""
    from app.agent import agent
    
    assignment = db.query(Assignment).options(
        joinedload(Assignment.contents)
    ).filter(Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    # 保存用户消息
    user_chat = AssignmentChat(
        id=uuid.uuid4(),
        assignment_id=assignment_id,
        role="user",
        content=request.message,
        context_type=request.context_type
    )
    db.add(user_chat)
    db.commit()
    
    # 构建作业上下文
    contents_info = []
    for content in assignment.contents:
        content_type = content.content_type.value if hasattr(content.content_type, 'value') else str(content.content_type)
        contents_info.append({
            "id": str(content.id),
            "name": content.original_name,
            "type": content_type,
            "has_description": bool(content.description),
            "has_extracted_text": bool(content.extracted_text)
        })
    
    # 使用Agent处理请求
    task_description = f"""作业项目：{assignment.title}

用户问题：{request.message}

关联文件：
"""
    for c in contents_info:
        task_description += f"- [{c['type']}] {c['name']}\n"
    
    task_context = {
        "assignment_id": assignment_id,
        "assignment_title": assignment.title,
        "assignment_description": assignment.description,
        "contents": contents_info,
        "context_type": request.context_type
    }
    
    try:
        # 使用Agent执行任务
        response_text = ""
        async for chunk in agent.execute_task(
            task_id=str(uuid.uuid4()),
            description=task_description,
            context=task_context
        ):
            response_text += chunk
        
        # 提取Agent的最终结果
        # Agent的输出包含执行过程，我们需要提取最后一部分作为回复
        lines = response_text.split('\n')
        # 找到 "任务完成!" 之后的部分
        final_result_start = -1
        for i, line in enumerate(lines):
            if '任务完成!' in line or '✨ 任务完成!' in line:
                final_result_start = i + 1
                break
        
        if final_result_start > 0 and final_result_start < len(lines):
            response_text = '\n'.join(lines[final_result_start:]).strip()
        
        # 保存 AI 回复
        assistant_chat = AssignmentChat(
            id=uuid.uuid4(),
            assignment_id=assignment_id,
            role="assistant",
            content=response_text,
            context_type=request.context_type,
            referenced_content_ids=[c['id'] for c in contents_info]
        )
        db.add(assistant_chat)
        db.commit()
        
        return {
            "success": True,
            "data": {
                "response": response_text,
                "referenced_contents": [c['id'] for c in contents_info]
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@router.get("/{assignment_id}/chat")
async def get_assignment_chat_history(
    assignment_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取作业对话历史"""
    chats = db.query(AssignmentChat).filter(
        AssignmentChat.assignment_id == assignment_id
    ).order_by(AssignmentChat.created_at.desc()).limit(limit).all()
    
    return {
        "chats": [c.to_dict() for c in reversed(chats)],
        "total": len(chats)
    }

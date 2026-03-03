"""对话API - 重构后"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.schemas import ChatRequest, ChatMessage, BaseResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["对话"])


def get_service(db: Session = Depends(get_db)) -> ChatService:
    """依赖注入"""
    return ChatService(db)


@router.post("/")
async def chat(request: ChatRequest, service: ChatService = Depends(get_service)):
    """非流式对话 - 返回完整响应和引用来源"""
    result = await service.chat(request)
    return result


@router.post("/stream")
async def chat_stream(request: ChatRequest, service: ChatService = Depends(get_service)):
    """流式对话 - 先返回sources，再返回content"""
    async def generate():
        async for chunk in service.chat_stream(request):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


@router.get("/history/{session_id}", response_model=List[ChatMessage])
def get_history(session_id: str, limit: int = 50, service: ChatService = Depends(get_service)):
    """获取对话历史"""
    convs = service.get_history(session_id, limit)
    return [ChatMessage(role=c.role, content=c.content, sources=c.sources, timestamp=c.created_at) 
            for c in reversed(convs)]


@router.get("/sessions")
def get_sessions(limit: int = 50, service: ChatService = Depends(get_service)):
    """获取会话列表"""
    from sqlalchemy import func
    from app.models.database_models import Conversation
    
    db = service.db
    subq = db.query(
        Conversation.session_id,
        func.max(Conversation.created_at).label("t"),
        func.count().label("n")
    ).group_by(Conversation.session_id).subquery()
    
    rs = db.query(Conversation, subq.c.t, subq.c.n).join(
        subq, Conversation.session_id == subq.c.session_id
    ).filter(Conversation.created_at == subq.c.t).order_by(subq.c.t.desc()).limit(limit).all()
    
    return [{"session_id": r[0].session_id, 
             "last_message": r[0].content[:100], 
             "last_time": r[1], 
             "message_count": r[2]} for r in rs]


@router.delete("/sessions/{session_id}", response_model=BaseResponse)
def delete_session(
    session_id: str,
    service: ChatService = Depends(get_service)
):
    """删除会话（删除该会话的所有对话记录）"""
    from app.models.database_models import Conversation
    
    db = service.db
    
    # 检查会话是否存在
    count = db.query(Conversation).filter(Conversation.session_id == session_id).count()
    if count == 0:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    # 删除该会话的所有对话记录
    db.query(Conversation).filter(Conversation.session_id == session_id).delete()
    db.commit()
    
    return BaseResponse(success=True, message=f"会话删除成功，共删除 {count} 条对话记录")

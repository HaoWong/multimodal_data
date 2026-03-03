from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.schemas import (
    DocumentCreate, DocumentResponse, BaseResponse, SearchRequest, SearchResponse
)
from app.services.document_service import DocumentService
from app.utils.file_parser import parse_file

router = APIRouter(prefix="/documents", tags=["文档管理"])


@router.post("/", response_model=DocumentResponse)
async def create_document(
    doc_data: DocumentCreate,
    db: Session = Depends(get_db)
):
    """创建文档"""
    service = DocumentService(db)
    return await service.create_document(doc_data)


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传文件并创建文档"""
    # 解析文件内容
    content = await parse_file(file)
    
    # 确定文档类型
    doc_type = "text"
    if file.filename.endswith('.pdf'):
        doc_type = "pdf"
    elif file.filename.endswith(('.docx', '.doc')):
        doc_type = "docx"
    
    doc_data = DocumentCreate(
        title=file.filename,
        content=content,
        doc_type=doc_type,
        metadata={"original_filename": file.filename}
    )
    
    service = DocumentService(db)
    return await service.create_document(doc_data)


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出所有文档"""
    service = DocumentService(db)
    return service.list_documents(skip=skip, limit=limit)


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: UUID,
    db: Session = Depends(get_db)
):
    """获取单个文档"""
    service = DocumentService(db)
    doc = service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


@router.delete("/{doc_id}", response_model=BaseResponse)
def delete_document(
    doc_id: UUID,
    db: Session = Depends(get_db)
):
    """删除文档"""
    service = DocumentService(db)
    success = service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="文档不存在")
    return BaseResponse(message="文档删除成功")


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    db: Session = Depends(get_db)
):
    """语义搜索文档"""
    service = DocumentService(db)
    results = await service.search_similar(
        query=request.query,
        top_k=request.top_k
    )
    
    return SearchResponse(
        text_results=results,
        total_results=len(results)
    )

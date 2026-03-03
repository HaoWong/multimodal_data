from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
import shutil

from app.core.database import get_db
from app.core.config import get_settings
from app.models.schemas import ImageUploadResponse, BaseResponse
from app.services.ollama_client import ollama_client

settings = get_settings()
router = APIRouter(prefix="/images", tags=["图片管理"])

# 确保上传目录存在
UPLOAD_DIR = "uploads/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传图片并生成描述"""
    # 检查文件类型
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="只支持图片文件")
    
    # 生成UUID（保持为UUID对象，不要转字符串）
    file_id = uuid.uuid4()
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 生成图片描述（使用视觉模型）
    try:
        description = await ollama_client.describe_image(file_path)
    except Exception:
        description = "无法生成图片描述"
    
    # 生成描述向量
    try:
        embeddings = await ollama_client.embed([description])
        embedding = embeddings[0] if embeddings else None
    except:
        embedding = None
    
    # 保存到数据库
    from app.models.database_models import Image
    image = Image(
        id=file_id,
        image_path=file_path,
        description=description,
        description_embedding=embedding
    )
    db.add(image)
    db.commit()
    
    return ImageUploadResponse(
        id=str(file_id),
        image_url=f"/uploads/images/{file_id}{file_ext}",
        description=description,
        message="图片上传成功"
    )


@router.get("/", response_model=List[dict])
def list_images(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出所有图片"""
    from app.models.database_models import Image
    images = db.query(Image).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(img.id),
            "url": f"/uploads/images/{os.path.basename(img.image_path)}",
            "type": "image",
            "description": img.description,
            "created_at": img.created_at.isoformat() if img.created_at else None
        }
        for img in images
    ]


@router.get("/{image_id}")
def get_image_detail(
    image_id: str,
    db: Session = Depends(get_db)
):
    """获取图片详情"""
    from app.models.database_models import Image
    img = db.query(Image).filter(Image.id == image_id).first()
    
    if not img:
        raise HTTPException(status_code=404, detail="图片不存在")
    
    return {
        "id": str(img.id),
        "url": f"/uploads/images/{os.path.basename(img.image_path)}",
        "type": "image",
        "description": img.description,
        "metadata": img.image_metadata,
        "created_at": img.created_at.isoformat() if img.created_at else None
    }


@router.post("/search")
async def search_images(
    query: str,
    top_k: int = 5,
    db: Session = Depends(get_db)
):
    """语义搜索图片"""
    # 生成查询向量
    embeddings = await ollama_client.embed([query])
    query_embedding = embeddings[0]
    
    # 执行向量搜索
    from sqlalchemy import text
    sql = """
    SELECT 
        id,
        image_path,
        description,
        1 - (description_embedding <=> :query_embedding) as similarity
    FROM images
    WHERE 1 - (description_embedding <=> :query_embedding) > 0.5
    ORDER BY description_embedding <=> :query_embedding
    LIMIT :top_k
    """
    
    result = db.execute(
        text(sql),
        {
            "query_embedding": str(query_embedding),
            "top_k": top_k
        }
    )
    
    images = []
    for row in result:
        images.append({
            "id": str(row.id),
            "image_url": f"/uploads/images/{os.path.basename(row.image_path)}",
            "description": row.description,
            "similarity": row.similarity
        })
    
    return {"results": images}


@router.delete("/{image_id}", response_model=BaseResponse)
def delete_image(
    image_id: str,
    db: Session = Depends(get_db)
):
    """删除图片"""
    from app.models.database_models import Image
    image = db.query(Image).filter(Image.id == image_id).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="图片不存在")
    
    # 删除文件
    if os.path.exists(image.image_path):
        try:
            os.remove(image.image_path)
        except Exception as e:
            print(f"删除图片文件失败: {e}")
    
    db.delete(image)
    db.commit()
    
    return BaseResponse(success=True, message="图片删除成功")

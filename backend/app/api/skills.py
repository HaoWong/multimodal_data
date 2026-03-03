"""
Skills API
"""
from fastapi import APIRouter, HTTPException
from typing import Any, Dict

from app.skills import skill_registry

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/")
def list_skills():
    """列出所有可用Skills"""
    return skill_registry.list_skills()


@router.post("/invoke")
async def invoke_skill(request: Dict[str, Any]):
    """调用Skill"""
    skill_name = request.get("skill_name")
    params = request.get("params", {})
    
    if not skill_name:
        raise HTTPException(status_code=400, detail="skill_name is required")
    
    result = await skill_registry.invoke(skill_name, **params)
    return result.to_dict()

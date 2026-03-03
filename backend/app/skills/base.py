"""
Skill基类和注册器
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class SkillResult:
    """Skill执行结果"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "execution_time": self.execution_time,
            "metadata": self.metadata,
        }


@dataclass
class SkillParameter:
    """Skill参数定义"""
    name: str
    type: str
    description: str
    required: bool = True
    default: Any = None


@dataclass
class SkillMetadata:
    """Skill元数据"""
    name: str
    description: str
    parameters: List[SkillParameter]
    return_type: str
    examples: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


class Skill(ABC):
    """Skill基类"""
    
    def __init__(self):
        self.metadata = self._define_metadata()
    
    @abstractmethod
    def _define_metadata(self) -> SkillMetadata:
        """定义Skill元数据"""
        pass
    
    @abstractmethod
    async def execute(self, **params) -> SkillResult:
        """执行Skill"""
        pass
    
    def validate_params(self, params: Dict) -> tuple[bool, Optional[str]]:
        """验证参数"""
        for param in self.metadata.parameters:
            if param.required and param.name not in params:
                return False, f"缺少必需参数: {param.name}"
        return True, None
    
    async def run(self, **params) -> SkillResult:
        """运行Skill（带验证和计时）"""
        start_time = datetime.now()
        
        # 验证参数
        valid, error = self.validate_params(params)
        if not valid:
            return SkillResult(
                success=False,
                error=error,
                execution_time=0.0
            )
        
        try:
            # 执行Skill
            result = await self.execute(**params)
            result.execution_time = (datetime.now() - start_time).total_seconds()
            return result
        except Exception as e:
            return SkillResult(
                success=False,
                error=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            "name": self.metadata.name,
            "description": self.metadata.description,
            "parameters": [
                {
                    "name": p.name,
                    "type": p.type,
                    "description": p.description,
                    "required": p.required,
                    "default": p.default,
                }
                for p in self.metadata.parameters
            ],
            "return_type": self.metadata.return_type,
            "examples": self.metadata.examples,
            "tags": self.metadata.tags,
        }


class SkillRegistry:
    """Skill注册器"""
    
    _instance = None
    _skills: Dict[str, Skill] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def register(self, skill: Skill):
        """注册Skill"""
        self._skills[skill.metadata.name] = skill
        print(f"✅ Skill registered: {skill.metadata.name}")
    
    def get(self, name: str) -> Optional[Skill]:
        """获取Skill"""
        return self._skills.get(name)
    
    def list_skills(self, tag: Optional[str] = None) -> List[Dict]:
        """列出所有Skills"""
        skills = []
        for name, skill in self._skills.items():
            if tag is None or tag in skill.metadata.tags:
                skills.append(skill.to_dict())
        return skills
    
    def list_skill_names(self) -> List[str]:
        """列出所有Skill名称"""
        return list(self._skills.keys())
    
    async def invoke(self, name: str, **params) -> SkillResult:
        """调用Skill"""
        skill = self.get(name)
        if not skill:
            return SkillResult(
                success=False,
                error=f"Skill not found: {name}"
            )
        return await skill.run(**params)


# 全局注册器实例
skill_registry = SkillRegistry()

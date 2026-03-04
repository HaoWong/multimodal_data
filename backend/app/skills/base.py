"""
Skill基类和注册器
使用统一任务执行引擎
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

from app.core.task_engine import (
    TaskResult,
    TaskContext,
    ExecutionConfig,
    task_engine,
    create_task_context,
    create_execution_config,
)


# 保持向后兼容：SkillResult 是 TaskResult 的别名
SkillResult = TaskResult


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
    
    # 执行配置
    timeout: Optional[float] = None
    max_retries: int = 0
    retry_delay: float = 1.0


class Skill(ABC):
    """
    Skill基类
    
    使用统一任务执行引擎，提供：
    - 统一的参数验证
    - 统一的执行流程
    - 统一的错误处理
    - 自动重试机制
    - 超时控制
    """
    
    def __init__(self):
        self.metadata = self._define_metadata()
        self._register_validator()
    
    @abstractmethod
    def _define_metadata(self) -> SkillMetadata:
        """定义Skill元数据"""
        pass
    
    @abstractmethod
    async def execute(self, **params) -> Any:
        """
        执行Skill的核心逻辑
        
        子类需要实现此方法，返回数据或TaskResult
        """
        pass
    
    def _register_validator(self):
        """注册参数验证器到执行引擎"""
        task_engine.register_validator(
            f"skill:{self.metadata.name}",
            self._validate_params_internal
        )
    
    def _validate_params_internal(self, params: Dict) -> tuple[bool, Optional[str]]:
        """内部参数验证"""
        return self.validate_params(params)
    
    def validate_params(self, params: Dict) -> tuple[bool, Optional[str]]:
        """
        验证参数
        
        子类可以重写此方法来自定义验证逻辑
        """
        for param in self.metadata.parameters:
            if param.required and param.name not in params:
                return False, f"缺少必需参数: {param.name}"
            
            # 类型检查（可选）
            if param.name in params and params[param.name] is not None:
                value = params[param.name]
                type_valid, type_error = self._check_type(param.name, param.type, value)
                if not type_valid:
                    return False, type_error
        
        return True, None
    
    def _check_type(self, name: str, expected_type: str, value: Any) -> tuple[bool, Optional[str]]:
        """检查参数类型"""
        type_map = {
            "string": str,
            "str": str,
            "integer": int,
            "int": int,
            "float": float,
            "boolean": bool,
            "bool": bool,
            "list": list,
            "array": list,
            "dict": dict,
            "object": dict,
            "any": object,
        }
        
        expected = type_map.get(expected_type.lower())
        if expected and expected != object:
            if not isinstance(value, expected):
                return False, f"参数 {name} 类型错误: 期望 {expected_type}, 实际 {type(value).__name__}"
        
        return True, None
    
    def _get_execution_config(self) -> ExecutionConfig:
        """获取执行配置"""
        return create_execution_config(
            timeout=self.metadata.timeout,
            max_retries=self.metadata.max_retries,
            retry_delay=self.metadata.retry_delay,
        )
    
    async def run(self, **params) -> TaskResult:
        """
        运行Skill（使用统一执行引擎）
        
        保持向后兼容的接口
        """
        # 创建任务上下文
        context = create_task_context(
            task_name=self.metadata.name,
            task_type="skill",
            params=params,
        )
        
        # 获取执行配置
        config = self._get_execution_config()
        
        # 使用统一执行引擎执行
        result = await task_engine.execute(
            func=self.execute,
            context=context,
            config=config,
            **params
        )
        
        return result
    
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
            "config": {
                "timeout": self.metadata.timeout,
                "max_retries": self.metadata.max_retries,
                "retry_delay": self.metadata.retry_delay,
            }
        }
    
    def get_param_info(self, param_name: str) -> Optional[SkillParameter]:
        """获取参数信息"""
        for param in self.metadata.parameters:
            if param.name == param_name:
                return param
        return None
    
    def get_required_params(self) -> List[str]:
        """获取必需参数列表"""
        return [p.name for p in self.metadata.parameters if p.required]


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
    
    async def invoke(self, name: str, **params) -> TaskResult:
        """
        调用Skill
        
        使用统一执行引擎执行
        """
        skill = self.get(name)
        if not skill:
            return TaskResult.error_result(
                error=f"Skill not found: {name}",
                error_type="SkillNotFoundError"
            )
        
        return await skill.run(**params)
    
    def unregister(self, name: str) -> bool:
        """注销Skill"""
        if name in self._skills:
            del self._skills[name]
            print(f"✅ Skill unregistered: {name}")
            return True
        return False
    
    def clear(self):
        """清空所有Skill"""
        self._skills.clear()
    
    def get_by_tag(self, tag: str) -> List[Skill]:
        """根据标签获取Skills"""
        return [
            skill for skill in self._skills.values()
            if tag in skill.metadata.tags
        ]
    
    def get_stats(self) -> Dict:
        """获取注册统计信息"""
        tags = {}
        for skill in self._skills.values():
            for tag in skill.metadata.tags:
                tags[tag] = tags.get(tag, 0) + 1
        
        return {
            "total_skills": len(self._skills),
            "skill_names": list(self._skills.keys()),
            "tags": tags,
        }


# 全局注册器实例
skill_registry = SkillRegistry()


# 装饰器方式注册Skill
def register_skill(
    name: str,
    description: str,
    parameters: Optional[List[SkillParameter]] = None,
    return_type: str = "any",
    tags: Optional[List[str]] = None,
    timeout: Optional[float] = None,
    max_retries: int = 0,
):
    """
    Skill注册装饰器
    
    示例:
        @register_skill(
            name="echo",
            description="回显消息",
            parameters=[
                SkillParameter("message", "string", "要回显的消息")
            ]
        )
        class EchoSkill(Skill):
            async def execute(self, **params):
                return params.get("message")
    """
    def decorator(cls):
        # 确保类继承自Skill
        if not issubclass(cls, Skill):
            raise TypeError(f"被装饰的类必须继承自Skill: {cls.__name__}")
        
        # 保存原始方法
        original_define_metadata = cls._define_metadata
        
        def new_define_metadata(self):
            # 如果子类已经定义了metadata，使用子类的
            if hasattr(cls, '_metadata_config'):
                return cls._metadata_config
            
            return SkillMetadata(
                name=name,
                description=description,
                parameters=parameters or [],
                return_type=return_type,
                tags=tags or [],
                timeout=timeout,
                max_retries=max_retries,
            )
        
        cls._define_metadata = new_define_metadata
        cls._metadata_config = SkillMetadata(
            name=name,
            description=description,
            parameters=parameters or [],
            return_type=return_type,
            tags=tags or [],
            timeout=timeout,
            max_retries=max_retries,
        )
        
        return cls
    
    return decorator

"""
Skill 注册表
管理所有已加载的 Skill
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

from .loader import SkillLoader, SkillDefinition, skill_loader


@dataclass
class SkillResult:
    """Skill 执行结果"""
    success: bool
    data: Any = None
    error: str = ""


class SkillRegistry:
    """Skill 注册表"""
    
    def __init__(self, loader: SkillLoader = None):
        self.loader = loader or skill_loader
        self._initialized = False
    
    def initialize(self):
        """初始化，加载所有 Skill"""
        if not self._initialized:
            self.loader.load_all()
            self._initialized = True
            print(f"[SkillRegistry] 已加载 {len(self.loader.skills)} 个 Skills")
    
    def get(self, name: str) -> Optional[SkillDefinition]:
        """获取 Skill 定义"""
        self.initialize()
        return self.loader.get_skill(name)
    
    async def invoke(self, name: str, **params) -> SkillResult:
        """
        调用 Skill 执行
        
        Args:
            name: Skill 名称
            **params: 执行参数
        
        Returns:
            SkillResult: 执行结果
        """
        self.initialize()
        
        skill = self.get(name)
        if not skill:
            return SkillResult(
                success=False,
                error=f"Skill 不存在: {name}"
            )
        
        if not skill.execute_func:
            return SkillResult(
                success=False,
                error=f"Skill {name} 未编译执行函数"
            )
        
        try:
            # 执行 Skill
            print(f"[SkillRegistry] 执行 Skill: {name}, 参数: {params}")
            result = await skill.execute_func(**params)
            print(f"[SkillRegistry] Skill {name} 执行成功")
            return SkillResult(
                success=True,
                data=result
            )
        except Exception as e:
            import traceback
            error_msg = f"执行失败: {str(e)}"
            print(f"[SkillRegistry] Skill {name} 执行失败: {error_msg}")
            print(traceback.format_exc())
            return SkillResult(
                success=False,
                error=error_msg
            )
    
    def list_skills(self) -> List[Dict]:
        """列出所有 Skill"""
        self.initialize()
        return self.loader.list_skills()
    
    def reload(self, name: str = None) -> bool:
        """
        重新加载 Skill
        
        Args:
            name: Skill 名称，如果为 None 则重载所有
        """
        if name:
            return self.loader.reload_skill(name)
        else:
            self.loader.skills.clear()
            self.loader.load_all()
            return True


# 全局注册表实例
skill_registry = SkillRegistry()

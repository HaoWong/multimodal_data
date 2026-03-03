"""
Skill Markdown 加载器
支持从 Markdown 文件动态加载 Skill
"""
import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import importlib.util
import sys


@dataclass
class SkillParameter:
    """Skill 参数定义"""
    name: str
    type: str
    required: bool = False
    description: str = ""
    default: Any = None


@dataclass
class SkillDefinition:
    """Skill 定义"""
    name: str
    description: str
    version: str = "1.0.0"
    author: str = "system"
    tags: List[str] = field(default_factory=list)
    parameters: List[SkillParameter] = field(default_factory=list)
    prompt_template: str = ""  # 执行提示词模板
    code: str = ""  # Python代码实现
    execute_func: Optional[callable] = None  # 编译后的执行函数


class SkillLoader:
    """Skill Markdown 加载器"""
    
    def __init__(self, definitions_dir: str = None):
        if definitions_dir is None:
            # 默认路径：当前文件所在目录的 definitions 子目录
            current_file = Path(__file__)
            definitions_dir = current_file.parent / "definitions"
        
        self.definitions_dir = Path(definitions_dir)
        self.skills: Dict[str, SkillDefinition] = {}
    
    def load_all(self) -> Dict[str, SkillDefinition]:
        """加载所有 Skill 定义"""
        print(f"[SkillLoader] 开始加载 Skills，目录: {self.definitions_dir}")
        
        if not self.definitions_dir.exists():
            print(f"[SkillLoader] 定义目录不存在: {self.definitions_dir}")
            return {}
        
        md_files = list(self.definitions_dir.glob("*.md"))
        print(f"[SkillLoader] 找到 {len(md_files)} 个 Markdown 文件")
        
        for md_file in md_files:
            print(f"[SkillLoader] 正在加载: {md_file.name}")
            try:
                skill = self._load_single(md_file)
                if skill:
                    self.skills[skill.name] = skill
                    print(f"[SkillLoader] 成功加载 Skill: {skill.name}")
                else:
                    print(f"[SkillLoader] 加载失败: {md_file.name} - 返回 None")
            except Exception as e:
                print(f"[SkillLoader] 加载失败 {md_file}: {e}")
                import traceback
                print(traceback.format_exc())
        
        print(f"[SkillLoader] 总共加载 {len(self.skills)} 个 Skills")
        return self.skills
    
    def _load_single(self, md_path: Path) -> Optional[SkillDefinition]:
        """加载单个 Skill Markdown 文件"""
        content = md_path.read_text(encoding='utf-8')
        
        # 解析 frontmatter
        frontmatter, body = self._parse_frontmatter(content)
        
        # 解析参数定义
        parameters = self._parse_parameters(body)
        
        # 解析提示词模板
        prompt_template = self._parse_prompt_template(body)
        
        # 解析代码实现
        code = self._parse_code(body)
        
        # 创建 Skill 定义
        skill = SkillDefinition(
            name=frontmatter.get('name', md_path.stem),
            description=frontmatter.get('description', ''),
            version=frontmatter.get('version', '1.0.0'),
            author=frontmatter.get('author', 'system'),
            tags=frontmatter.get('tags', []),
            parameters=parameters,
            prompt_template=prompt_template,
            code=code
        )
        
        # 编译执行函数
        self._compile_execute_func(skill)
        
        return skill
    
    def _parse_frontmatter(self, content: str) -> tuple:
        """解析 YAML frontmatter"""
        pattern = r'^---\s*\n(.*?)\n---\s*\n'
        match = re.match(pattern, content, re.DOTALL)
        
        if match:
            frontmatter_text = match.group(1)
            body = content[match.end():]
            try:
                frontmatter = yaml.safe_load(frontmatter_text) or {}
            except yaml.YAMLError:
                frontmatter = {}
            return frontmatter, body
        
        return {}, content
    
    def _parse_parameters(self, body: str) -> List[SkillParameter]:
        """解析参数定义表格"""
        parameters = []
        
        # 查找参数定义部分
        param_section = re.search(
            r'## 参数定义\s*\n(.*?)(?=##|$)',
            body,
            re.DOTALL
        )
        
        if param_section:
            section_text = param_section.group(1)
            # 解析 markdown 表格
            lines = section_text.strip().split('\n')
            for line in lines[2:]:  # 跳过表头和分隔线
                if line.startswith('|') and line.endswith('|'):
                    cells = [c.strip() for c in line[1:-1].split('|')]
                    if len(cells) >= 4:
                        param = SkillParameter(
                            name=cells[0],
                            type=cells[1],
                            required=cells[2] == '是',
                            description=cells[3] if len(cells) > 3 else ""
                        )
                        parameters.append(param)
        
        return parameters
    
    def _parse_prompt_template(self, body: str) -> str:
        """解析执行提示词模板"""
        prompt_match = re.search(
            r'## 执行提示词\s*\n```\s*\n(.*?)\n```',
            body,
            re.DOTALL
        )
        
        if prompt_match:
            return prompt_match.group(1).strip()
        
        return ""
    
    def _parse_code(self, body: str) -> str:
        """解析代码实现"""
        code_match = re.search(
            r'## 代码实现\s*\n```python\s*\n(.*?)\n```',
            body,
            re.DOTALL
        )
        
        if code_match:
            return code_match.group(1).strip()
        
        return ""
    
    def _compile_execute_func(self, skill: SkillDefinition):
        """编译执行函数"""
        if not skill.code:
            return
        
        try:
            # 创建模块命名空间
            module_name = f"skill_{skill.name}"
            
            # 编译代码
            compiled_code = compile(skill.code, f"<skill:{skill.name}>", "exec")
            
            # 创建模块
            module = type(sys)(module_name)
            module.__dict__['__name__'] = module_name
            
            # 执行代码定义函数
            exec(compiled_code, module.__dict__)
            
            # 获取 execute 函数
            if 'execute' in module.__dict__:
                skill.execute_func = module.__dict__['execute']
                print(f"[SkillLoader] 编译成功: {skill.name}")
            else:
                print(f"[SkillLoader] 警告: {skill.name} 未定义 execute 函数")
        
        except Exception as e:
            print(f"[SkillLoader] 编译失败 {skill.name}: {e}")
    
    def get_skill(self, name: str) -> Optional[SkillDefinition]:
        """获取 Skill 定义"""
        return self.skills.get(name)
    
    def list_skills(self) -> List[Dict]:
        """列出所有 Skill"""
        return [
            {
                "name": s.name,
                "description": s.description,
                "version": s.version,
                "tags": s.tags,
                "parameters": [
                    {
                        "name": p.name,
                        "type": p.type,
                        "required": p.required,
                        "description": p.description
                    }
                    for p in s.parameters
                ]
            }
            for s in self.skills.values()
        ]
    
    def reload_skill(self, name: str) -> bool:
        """重新加载单个 Skill（热更新）"""
        md_path = self.definitions_dir / f"{name}.md"
        if not md_path.exists():
            return False
        
        try:
            skill = self._load_single(md_path)
            if skill:
                self.skills[skill.name] = skill
                return True
        except Exception as e:
            print(f"[SkillLoader] 重载失败 {name}: {e}")
        
        return False


# 全局加载器实例
skill_loader = SkillLoader()

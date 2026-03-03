# Checklist

## 数据模型重构

- [x] UnifiedContent模型实现并替换Document/Image
- [x] 数据库迁移脚本可正常运行
- [x] 内容提取管道支持文本/图片/视频
- [x] 旧assignment_models代码已删除
- [x] 旧assignment_service代码已删除
- [x] 旧assignments API已删除

## Agent Skill系统

- [x] Skill基类定义完成
- [x] Skill注册器实现完成
- [x] Skill元数据管理实现
- [x] /skills/list API返回所有可用skills
- [x] /skills/invoke API可执行skill
- [x] content_extract skill可提取文件内容
- [x] image_analyze skill可分析图片
- [x] video_analyze skill可分析视频
- [x] text_embed skill可生成向量
- [x] vector_search skill可检索RAG数据
- [x] llm_chat skill可进行对话

## 智能体执行引擎

- [x] Agent执行器类实现
- [x] 任务规划逻辑实现
- [x] 技能选择逻辑实现
- [x] 技能编排执行实现
- [x] 执行日志记录实现
- [x] vector_search集成到Agent上下文
- [x] 检索结果注入Prompt实现
- [x] 多轮对话上下文管理实现

## API和前端

- [x] /contents API实现统一内容管理
- [x] /skills API实现技能管理
- [x] /agent API实现智能体执行
- [x] 前端API客户端更新
- [x] AssignmentsPage已移除
- [x] ChatPage支持Agent交互
- [x] 技能执行状态可显示

## 测试验证

- [ ] 内容上传和向量化测试通过
- [ ] Skill调用测试通过
- [ ] Agent任务执行测试通过
- [ ] RAG增强对话测试通过
- [ ] "审查作业"示例场景可运行
- [ ] "搜索相关内容"示例场景可运行

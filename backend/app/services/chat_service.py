"""对话服务 - 重构后，完整RAG集成（支持多模态）"""
from sqlalchemy.orm import Session
from typing import List, Dict, AsyncGenerator, Any
import uuid
import json

from app.models.database_models import Conversation
from app.models.schemas import ChatRequest, ChatMessage
from app.services.ollama_client import ollama_client
from app.core.config import get_settings
from sqlalchemy import text

settings = get_settings()


class ChatService:
    """对话服务 - 支持RAG检索和引用来源（知识库+图片库+视频库）"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def chat(self, request: ChatRequest) -> Dict:
        """非流式对话 - 返回完整响应和引用来源"""
        # 1. RAG检索（所有内容类型）
        context, sources = await self._retrieve_context(request.message, request.use_rag)
        
        # 2. 构建消息
        session_id = request.session_id or str(uuid.uuid4())
        messages = self._build_messages(request.message, context, session_id, request.history)
        
        # 3. 生成回复
        response_text = await self._generate_response_non_stream(messages)
        
        # 4. 保存对话
        self._save_conversation(session_id, request.message, response_text, sources)
        
        return {
            "response": response_text, 
            "sources": sources, 
            "session_id": session_id
        }
    
    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """流式对话 - 先返回sources，再返回内容"""
        # 1. RAG检索（所有内容类型）
        context, sources = await self._retrieve_context(request.message, request.use_rag)
        
        # 2. 先发送引用来源（JSON格式）
        if sources:
            yield json.dumps({"type": "sources", "data": sources}, ensure_ascii=False)
        
        # 3. 构建消息
        session_id = request.session_id or str(uuid.uuid4())
        messages = self._build_messages(request.message, context, session_id, request.history)
        
        # 4. 流式生成回复
        full_response = ""
        async for chunk in self._generate_response_stream(messages):
            full_response += chunk
            yield json.dumps({"type": "content", "data": chunk}, ensure_ascii=False)
        
        # 5. 发送完成标记
        yield json.dumps({"type": "done"}, ensure_ascii=False)
        
        # 6. 保存对话
        self._save_conversation(session_id, request.message, full_response, sources)
    
    async def _retrieve_context(self, message: str, use_rag: bool) -> tuple[str, List[Dict]]:
        """RAG检索 - 检索知识库+图片库+视频库"""
        if not use_rag:
            print("[RAG] RAG模式已关闭，跳过检索")
            return "", []

        print(f"\n{'='*60}")
        print(f"[RAG] 开始检索用户问题: {message[:50]}...")
        print(f"{'='*60}")

        # 检查是否是分析上传文件的请求
        file_source = await self._find_recently_uploaded_file(message)
        if file_source:
            print(f"[RAG] 检测到文件分析请求，直接返回最新上传的文件: {file_source['title']}")
            context = self._build_context_from_source(file_source)
            return context, [file_source]
        
        try:
            # 1. 检索 documents 表（知识库）
            print("[RAG] 1. 检索知识库(documents)...")
            doc_sources = await self._search_documents(message)
            print(f"[RAG]    找到 {len(doc_sources)} 个知识库文档")
            
            # 2. 检索 contents 表（图片+视频+文档）
            print("[RAG] 2. 检索内容库(contents)...")
            content_sources = await self._search_contents(message)
            print(f"[RAG]    找到 {len(content_sources)} 个内容")
            
            # 3. 合并所有来源，按相似度排序
            all_sources = doc_sources + content_sources
            all_sources.sort(key=lambda x: x.get("similarity", 0), reverse=True)
            
            # 4. 取Top-K
            top_k = settings.top_k_retrieval or 5
            all_sources = all_sources[:top_k]
            
            print(f"[RAG] 3. 合并后取Top-{top_k}，共 {len(all_sources)} 个来源")
            
            if not all_sources:
                print("[RAG] 未找到相关内容")
                return "", []
            
            # 打印检索结果
            print("\n[RAG] 检索结果:")
            for i, source in enumerate(all_sources):
                content_type = source.get("content_type", "TEXT")
                title = source.get("title", "未命名")
                similarity = source.get("similarity", 0)
                source_from = source.get("source", "未知")
                print(f"  [{i+1}] [{content_type}] {title}")
                print(f"      相似度: {similarity:.3f} | 来源: {source_from}")
            
            # 5. 构建上下文
            context_parts = []
            for i, source in enumerate(all_sources):
                content_type = source.get("content_type", "TEXT")
                title = source.get("title", "未命名")
                text_content = source.get("text", "")
                
                if content_type == "IMAGE":
                    context_parts.append(f"[图片 {i+1}] {title}:\n图片描述: {text_content}")
                elif content_type == "VIDEO":
                    context_parts.append(f"[视频 {i+1}] {title}:\n视频描述: {text_content}")
                else:
                    context_parts.append(f"[文档 {i+1}] {title}:\n{text_content}")
            
            context = "\n\n".join(context_parts)
            
            print(f"\n[RAG] 构建的上下文长度: {len(context)} 字符")
            print(f"{'='*60}\n")
            
            return context, all_sources
            
        except Exception as e:
            print(f"[RAG] 检索失败: {e}")
            import traceback
            traceback.print_exc()
            return "", []
    
    async def _search_documents(self, query: str) -> List[Dict]:
        """检索知识库（documents表）"""
        try:
            # 生成查询向量
            embeddings = await ollama_client.embed([query])
            query_embedding = embeddings[0]
            
            threshold = settings.similarity_threshold or 0.5
            
            sql = """
            SELECT 
                id,
                title,
                content,
                1 - (embedding <=> :query_embedding) as similarity
            FROM documents
            WHERE 1 - (embedding <=> :query_embedding) > :threshold
            ORDER BY embedding <=> :query_embedding
            LIMIT 3
            """
            
            result = self.db.execute(
                text(sql),
                {
                    "query_embedding": str(query_embedding),
                    "threshold": threshold
                }
            )
            
            sources = []
            for row in result:
                sources.append({
                    "id": str(row.id),
                    "title": row.title,
                    "text": row.content[:500] + "..." if len(row.content) > 500 else row.content,
                    "similarity": round(float(row.similarity), 3),
                    "content_type": "TEXT",
                    "source": "知识库"
                })
            
            return sources
        except Exception as e:
            print(f"知识库检索失败: {e}")
            return []
    
    async def _search_contents(self, query: str) -> List[Dict]:
        """检索内容库（contents表 - 图片+视频+文档）"""
        try:
            # 生成查询向量
            embeddings = await ollama_client.embed([query])
            query_embedding = embeddings[0]
            
            sql = """
            SELECT 
                id,
                content_type,
                original_name,
                extracted_text,
                description,
                1 - (embedding <=> :query_embedding) as similarity
            FROM contents
            WHERE 1 - (embedding <=> :query_embedding) > 0.5
            ORDER BY embedding <=> :query_embedding
            LIMIT 3
            """
            
            result = self.db.execute(
                text(sql),
                {"query_embedding": str(query_embedding)}
            )
            
            sources = []
            for row in result:
                # 处理 content_type，确保是字符串
                content_type = row.content_type
                if content_type is None:
                    content_type = "TEXT"
                elif isinstance(content_type, str):
                    # 已经是字符串，直接使用
                    pass
                elif hasattr(content_type, 'value'):
                    content_type = content_type.value
                elif hasattr(content_type, 'name'):
                    content_type = content_type.name
                else:
                    content_type = str(content_type)

                text_content = row.extracted_text or row.description or ""

                sources.append({
                    "id": str(row.id),
                    "title": row.original_name,
                    "text": text_content[:500] + "..." if len(text_content) > 500 else text_content,
                    "similarity": round(float(row.similarity), 3),
                    "content_type": content_type,
                    "source": "内容库"
                })
            
            return sources
        except Exception as e:
            print(f"内容库检索失败: {e}")
            return []
    
    def _build_messages(
        self, message: str, context: str, session_id: str, history: List[ChatMessage] = None
    ) -> List[Dict]:
        """构建消息列表"""
        system_prompt = self._build_system_prompt(context)
        messages = [{"role": "system", "content": system_prompt}]
        
        # 加载历史
        hist = history or (session_id and self._load_history(session_id)) or []
        for msg in hist[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        
        messages.append({"role": "user", "content": message})
        return messages
    
    def _build_system_prompt(self, context: str) -> str:
        """构建系统提示 - RAG增强"""
        if context:
            return f"""你是一个智能助手。请基于以下参考内容回答用户问题。

参考内容（可能包含文档、图片描述、视频描述）：
{context}

回答要求：
1. 优先使用参考内容中的信息回答问题
2. 如果参考内容中有图片或视频，请根据描述回答相关问题
3. 引用内容时请使用格式 [内容N]
4. 如果参考内容中没有相关信息，请明确说明
5. 保持回答简洁准确"""
        
        return "你是智能助手，请帮助用户回答问题。"
    
    async def _generate_response_non_stream(self, messages: List[Dict]) -> str:
        """非流式生成回复"""
        response = ""
        async for chunk in ollama_client.chat(messages, stream=False):
            response += chunk
        return response
    
    async def _generate_response_stream(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """流式生成回复"""
        async for chunk in ollama_client.chat(messages, stream=True):
            yield chunk
    
    def _save_conversation(self, session_id: str, user_msg: str, assistant_msg: str, sources: List[Dict]):
        """保存对话"""
        self.db.add(Conversation(session_id=session_id, role="user", content=user_msg))
        self.db.add(Conversation(
            session_id=session_id, 
            role="assistant", 
            content=assistant_msg, 
            sources=sources
        ))
        self.db.commit()
    
    def _load_history(self, session_id: str, limit: int = 10) -> List[ChatMessage]:
        """加载历史"""
        convs = self.db.query(Conversation).filter(
            Conversation.session_id == session_id
        ).order_by(Conversation.created_at.desc()).limit(limit).all()
        return [ChatMessage(role=c.role, content=c.content, sources=c.sources, timestamp=c.created_at) 
                for c in reversed(convs)]
    
    def get_history(self, session_id: str, limit: int = 50) -> List[Conversation]:
        """获取对话历史"""
        return self.db.query(Conversation).filter(
            Conversation.session_id == session_id
        ).order_by(Conversation.created_at.desc()).limit(limit).all()

    async def _find_recently_uploaded_file(self, message: str) -> Dict:
        """
        检测用户消息是否是分析上传文件的请求
        如果是，返回最近上传的文件信息
        """
        import re

        # 检测分析文件的关键词（更广泛）
        analysis_keywords = ['分析', '查看', '检查', '处理', '描述', '介绍', '总结', '提取', 
                           '打分', '评分', '评价', '评估', '审查', '检查', '看看', '怎么样',
                           '内容', '资料', '材料', '作业', '项目']
        file_indicators = ['文件', '图片', '视频', '文档', '上传', '这个', '该', '这些', 
                          '现有', '已有', '刚才', '之前']

        # 检查是否包含分析请求
        is_analysis_request = any(kw in message for kw in analysis_keywords)
        refers_to_file = any(ind in message for ind in file_indicators)
        
        # 如果消息很短（少于10个字），且用户之前有上传文件，也认为是分析请求
        is_short_message = len(message) < 10

        if not (is_analysis_request or refers_to_file or is_short_message):
            return None

        # 尝试从消息中提取文件名
        # 匹配引号中的文件名，或常见的文件扩展名
        file_patterns = [
            r'["\']([^"\']+\.(?:jpg|jpeg|png|gif|mp4|avi|mov|pdf|doc|docx|txt))["\']',
            r'([\w\-]+\.(?:jpg|jpeg|png|gif|mp4|avi|mov|pdf|doc|docx|txt))',
        ]

        extracted_filename = None
        for pattern in file_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                extracted_filename = match.group(1)
                break

        print(f"[RAG] 文件分析检测: 提取到文件名={extracted_filename}")

        # 从数据库查找文件
        from app.models.content_models import Content

        query = self.db.query(Content)
        content = None

        if extracted_filename:
            # 如果提取到文件名，优先匹配
            content = query.filter(
                Content.original_name.ilike(f'%{extracted_filename}%')
            ).order_by(Content.created_at.desc()).first()

            if not content:
                # 尝试匹配文件名的一部分
                base_name = extracted_filename.rsplit('.', 1)[0]
                content = query.filter(
                    Content.original_name.ilike(f'%{base_name}%')
                ).order_by(Content.created_at.desc()).first()
        
        # 如果没有匹配到具体文件，但用户明确提到"这个文件"、"上传的文件"等
        if not content and refers_to_file:
            # 返回最近上传的文件
            content = query.order_by(Content.created_at.desc()).first()
            print(f"[RAG] 未提取到具体文件名，使用最近上传的文件")

        if content:
            # 处理 content_type
            content_type_value = content.content_type
            if hasattr(content_type_value, 'value'):
                content_type_value = content_type_value.value
            elif hasattr(content_type_value, 'name'):
                content_type_value = content_type_value.name
            else:
                content_type_value = str(content_type_value)

            print(f"[RAG] 找到文件: {content.original_name}, 类型: {content_type_value}")

            # 根据内容类型构建返回数据
            text_content = content.extracted_text or content.description or ""

            return {
                "id": str(content.id),
                "title": content.original_name,
                "text": text_content[:1000] + "..." if len(text_content) > 1000 else text_content,
                "similarity": 1.0,  # 直接匹配的文件给最高相似度
                "content_type": content_type_value,
                "source": "内容库"
            }

        return None

    def _build_context_from_source(self, source: Dict) -> str:
        """从来源构建上下文"""
        content_type = source.get("content_type", "TEXT")
        title = source.get("title", "未命名")
        text_content = source.get("text", "")

        if content_type == "IMAGE":
            return f"[图片] {title}:\n图片描述: {text_content}"
        elif content_type == "VIDEO":
            return f"[视频] {title}:\n视频描述: {text_content}"
        else:
            return f"[文档] {title}:\n{text_content}"

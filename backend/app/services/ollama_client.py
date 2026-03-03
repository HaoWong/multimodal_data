import aiohttp
import base64
from typing import List, Dict, AsyncGenerator
from app.core.config import get_settings

settings = get_settings()


class OllamaClient:
    """Ollama API 客户端"""
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.embedding_model = settings.ollama_embedding_model
        self.chat_model = settings.ollama_chat_model
        self.vision_model = settings.ollama_vision_model
    
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """获取文本嵌入向量"""
        from app.utils.text_chunker import BatchEmbedder
        
        # 使用批量嵌入器处理长文本
        return await BatchEmbedder.embed_multiple_texts(texts, self._embed_single_batch)
    
    async def _embed_single_batch(self, texts: List[str]) -> List[List[float]]:
        """批量生成嵌入（内部方法，处理已经分块后的文本）"""
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.embedding_model,
                "input": texts
            }
            async with session.post(
                f"{self.base_url}/api/embed",
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Embedding failed: {error_text}")
                result = await response.json()
                return result["embeddings"]
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """对话生成"""
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.chat_model,
                "messages": messages,
                "stream": stream,
                "options": {
                    "temperature": temperature
                }
            }
            
            if stream:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                ) as response:
                    async for line in response.content:
                        if line:
                            try:
                                import json
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    yield data["message"]["content"]
                            except:
                                continue
            else:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                ) as response:
                    result = await response.json()
                    yield result["message"]["content"]
    
    async def vision_chat(
        self,
        image_path: str,
        prompt: str = "描述这张图片"
    ) -> str:
        """视觉理解"""
        # 读取图片并编码
        with open(image_path, "rb") as f:
            image_base64 = base64.b64encode(f.read()).decode()
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [image_base64]
                    }
                ],
                "stream": False
            }
            
            async with session.post(
                f"{self.base_url}/api/chat",
                json=payload
            ) as response:
                result = await response.json()
                return result["message"]["content"]
    
    async def generate(self, prompt: str, system: str = None) -> str:
        """直接生成文本"""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response_text = ""
        async for chunk in self.chat(messages, stream=False):
            response_text += chunk
        return response_text
    
    async def describe_image(self, image_path: str) -> str:
        """生成图片描述"""
        try:
            description = await self.vision_chat(
                image_path,
                "请详细描述这张图片的内容，包括主要物体、场景、颜色、氛围等。"
            )
            return description
        except Exception as e:
            return f"图片描述生成失败: {str(e)}"


# 全局客户端实例
ollama_client = OllamaClient()

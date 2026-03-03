"""流式响应工具函数"""
import json
from typing import AsyncGenerator


async def stream_json_response(
    generator: AsyncGenerator[str, None],
    key: str = "chunk"
) -> AsyncGenerator[str, None]:
    """将字符串流包装为JSON格式"""
    async for chunk in generator:
        data = json.dumps({key: chunk}, ensure_ascii=False)
        yield f"data: {data}\n\n"
    yield "data: [DONE]\n\n"


async def stream_text_response(
    generator: AsyncGenerator[str, None]
) -> AsyncGenerator[str, None]:
    """纯文本流式响应"""
    async for chunk in generator:
        yield chunk

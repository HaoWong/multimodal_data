---
name: llm_chat
description: 与大语言模型进行对话，生成内容或回答问题
tags: [llm, chat, generation]
---

## 参数定义

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| message | string | 是 | 用户消息 |
| system_prompt | string | 否 | 系统提示词（可选） |

## 执行提示词

```
你是通用AI助手。请回答用户的问题：

用户消息：{{message}}

{{#if system_prompt}}
系统提示：{{system_prompt}}
{{/if}}

请提供有帮助、准确的回答。
```

## 代码实现

```python
async def execute(message: str, system_prompt: str = None) -> dict:
    from app.services.ollama_client import ollama_client
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": message})
    
    response = ""
    async for chunk in ollama_client.chat(messages, stream=False):
        response += chunk
    
    return {
        "response": response,
        "model": ollama_client.chat_model
    }
```

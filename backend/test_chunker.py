#!/usr/bin/env python3
"""测试文本分块功能"""
import sys
sys.path.insert(0, '.')

from app.utils.text_chunker import TextChunker, chunk_text

# 测试文本分块
text = '''这是第一段文本。
这是第二段文本。
这是第三段文本。
这是第四段文本。
这是第五段文本。'''

print('='*50)
print('🧪 测试文本分块功能')
print('='*50)

# 测试默认分块
chunks = chunk_text(text, chunk_size=20, chunk_overlap=5)
print(f'\n默认分块（大小20，重叠5）:')
for i, chunk in enumerate(chunks):
    print(f'  [{i}] {chunk}')

# 测试自定义分块器
chunker = TextChunker(chunk_size=30, chunk_overlap=10, separator='。')
chunks = chunker.split_text(text)
print(f'\n自定义分块器（大小30，重叠10，分隔符。）:')
for i, chunk in enumerate(chunks):
    print(f'  [{i}] {chunk}')

print('\n✅ 文本分块功能正常！')

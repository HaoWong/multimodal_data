"""
文本分块处理器
支持智能分块和批量嵌入生成
"""
from typing import List, Dict, Tuple
import re


class TextChunker:
    """文本分块器"""
    
    # 默认块大小（字符数）
    DEFAULT_CHUNK_SIZE = 4000
    # 块之间重叠大小
    DEFAULT_OVERLAP = 200
    
    @classmethod
    def split_by_paragraphs(cls, text: str, max_chunk_size: int = None) -> List[str]:
        """
        按段落分割文本
        
        策略：
        1. 优先按段落分割（换行符）
        2. 如果段落过长，再按句子分割
        3. 如果句子还长，强制截断
        """
        max_chunk_size = max_chunk_size or cls.DEFAULT_CHUNK_SIZE
        
        # 先按段落分割
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            # 如果段落本身超过限制，需要进一步分割
            if len(para) > max_chunk_size:
                # 先保存当前积累的块
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # 分割长段落
                para_chunks = cls._split_long_text(para, max_chunk_size)
                chunks.extend(para_chunks)
            else:
                # 检查加上当前段落后是否超过限制
                if len(current_chunk) + len(para) + 2 > max_chunk_size:
                    # 保存当前块，开始新块
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = para
                else:
                    # 追加到当前块
                    if current_chunk:
                        current_chunk += "\n\n" + para
                    else:
                        current_chunk = para
        
        # 保存最后一个块
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    @classmethod
    def _split_long_text(cls, text: str, max_chunk_size: int) -> List[str]:
        """分割长文本（按句子）"""
        # 按句子分割（中英文句号、问号、感叹号）
        sentences = re.split(r'([。！？.!?]\s*)', text)
        
        chunks = []
        current_chunk = ""
        
        for i in range(0, len(sentences), 2):
            sentence = sentences[i]
            # 加上标点符号
            if i + 1 < len(sentences):
                sentence += sentences[i + 1]
            
            if len(sentence) > max_chunk_size:
                # 句子太长，强制截断
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                
                # 强制截断成多个块
                for j in range(0, len(sentence), max_chunk_size):
                    chunk = sentence[j:j + max_chunk_size]
                    chunks.append(chunk.strip())
            else:
                if len(current_chunk) + len(sentence) > max_chunk_size:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                else:
                    current_chunk += sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    @classmethod
    def create_chunks_with_overlap(
        cls, 
        text: str, 
        chunk_size: int = None,
        overlap: int = None
    ) -> List[Dict]:
        """
        创建带重叠的文本块
        
        返回每个块的信息，包括：
        - text: 块文本
        - index: 块索引
        - start_pos: 起始位置
        - end_pos: 结束位置
        """
        chunk_size = chunk_size or cls.DEFAULT_CHUNK_SIZE
        overlap = overlap or cls.DEFAULT_OVERLAP
        
        chunks = []
        start = 0
        index = 0
        
        while start < len(text):
            end = min(start + chunk_size, len(text))
            
            # 如果不是最后一块，尝试在句子边界截断
            if end < len(text):
                # 向后查找句子结束位置
                sentence_end = cls._find_sentence_end(text, end)
                if sentence_end > start:
                    end = sentence_end
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "index": index,
                    "start_pos": start,
                    "end_pos": end
                })
                index += 1
            
            # 下一块的起始位置（考虑重叠）
            start = end - overlap if end < len(text) else end
        
        return chunks
    
    @classmethod
    def _find_sentence_end(cls, text: str, pos: int) -> int:
        """查找句子结束位置"""
        # 从 pos 向后查找句子结束符
        search_text = text[pos:pos + 100]  # 向后搜索100字符
        
        # 查找标点符号
        for i, char in enumerate(search_text):
            if char in '。！？.!?\n':
                return pos + i + 1
        
        # 没找到，返回原位置
        return pos
    
    @classmethod
    def merge_chunk_results(
        cls, 
        chunks: List[Dict], 
        chunk_embeddings: List[List[float]]
    ) -> Dict:
        """
        合并分块结果
        
        策略：
        1. 计算所有块的平均向量
        2. 保留每个块的原始信息
        """
        if not chunks or not chunk_embeddings:
            return {
                "text": "",
                "embedding": [],
                "chunks": []
            }
        
        # 计算平均向量
        embedding_dim = len(chunk_embeddings[0])
        avg_embedding = [0.0] * embedding_dim
        
        for emb in chunk_embeddings:
            for i, val in enumerate(emb):
                avg_embedding[i] += val
        
        avg_embedding = [val / len(chunk_embeddings) for val in avg_embedding]
        
        # 合并文本（去重，考虑重叠）
        full_text = cls._merge_texts([c["text"] for c in chunks])
        
        return {
            "text": full_text,
            "embedding": avg_embedding,
            "chunks": [
                {
                    "text": c["text"],
                    "index": c["index"],
                    "embedding": chunk_embeddings[i]
                }
                for i, c in enumerate(chunks)
            ]
        }
    
    @classmethod
    def _merge_texts(cls, texts: List[str]) -> str:
        """合并文本，去除重叠部分"""
        if not texts:
            return ""
        
        result = texts[0]
        for i in range(1, len(texts)):
            current = texts[i]
            # 查找重叠
            overlap = cls._find_overlap(result, current)
            if overlap > 0:
                result += current[overlap:]
            else:
                result += "\n\n" + current
        
        return result
    
    @classmethod
    def _find_overlap(cls, text1: str, text2: str, min_overlap: int = 20) -> int:
        """查找两个文本之间的重叠长度"""
        max_check = min(len(text1), len(text2), 500)  # 最多检查500字符
        
        for i in range(max_check, min_overlap - 1, -1):
            if text1[-i:] == text2[:i]:
                return i
        
        return 0


class BatchEmbedder:
    """批量嵌入生成器"""
    
    # 每批最大文本数
    BATCH_SIZE = 8
    
    @classmethod
    async def embed_large_text(
        cls,
        text: str,
        embed_func,
        chunk_size: int = 4000
    ) -> Dict:
        """
        为长文本生成嵌入向量
        
        流程：
        1. 分块
        2. 批量生成嵌入
        3. 合并结果
        """
        # 1. 分块
        chunks = TextChunker.split_by_paragraphs(text, chunk_size)
        
        if len(chunks) == 1:
            # 只有一块，直接生成
            embeddings = await embed_func(chunks)
            return {
                "text": text,
                "embedding": embeddings[0] if embeddings else [],
                "chunks": [{"text": chunks[0], "index": 0, "embedding": embeddings[0] if embeddings else []}]
            }
        
        # 2. 批量生成嵌入
        chunk_embeddings = []
        for i in range(0, len(chunks), cls.BATCH_SIZE):
            batch = chunks[i:i + cls.BATCH_SIZE]
            batch_embeddings = await embed_func(batch)
            chunk_embeddings.extend(batch_embeddings)
        
        # 3. 合并结果
        chunk_infos = [{"text": c, "index": i} for i, c in enumerate(chunks)]
        result = TextChunker.merge_chunk_results(chunk_infos, chunk_embeddings)
        
        return result
    
    @classmethod
    async def embed_multiple_texts(
        cls,
        texts: List[str],
        embed_func
    ) -> List[List[float]]:
        """
        批量生成多个文本的嵌入
        
        自动处理长文本的分块
        """
        all_embeddings = []
        
        for text in texts:
            if len(text) > TextChunker.DEFAULT_CHUNK_SIZE:
                # 长文本，分块处理
                result = await cls.embed_large_text(text, embed_func)
                all_embeddings.append(result["embedding"])
            else:
                # 短文本，直接生成
                embeddings = await embed_func([text])
                all_embeddings.append(embeddings[0] if embeddings else [])
        
        return all_embeddings

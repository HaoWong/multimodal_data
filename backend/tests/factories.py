"""
测试数据工厂
使用factory_boy创建测试数据
"""
import factory
from factory import Faker, SubFactory
from factory.alchemy import SQLAlchemyModelFactory
from uuid import uuid4
from datetime import datetime, timezone

from app.models.content_models import Content, ContentChunk, VideoFrame, ContentType
from app.models.database_models import Conversation, Document


class ContentFactory(SQLAlchemyModelFactory):
    """Content模型工厂"""
    
    class Meta:
        model = Content
        sqlalchemy_session = None  # 需要在测试中设置
        sqlalchemy_session_persistence = 'commit'
    
    id = factory.LazyFunction(uuid4)
    content_type = ContentType.TEXT
    source_path = Faker('file_path', depth=2, category='text')
    original_name = Faker('file_name', category='text')
    file_size = Faker('random_int', min=100, max=1000000)
    mime_type = 'text/plain'
    extracted_text = Faker('text', max_nb_chars=1000)
    description = Faker('sentence')
    embedding = None  # 向量嵌入需要单独生成
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ContentChunkFactory(SQLAlchemyModelFactory):
    """ContentChunk模型工厂"""
    
    class Meta:
        model = ContentChunk
        sqlalchemy_session = None
        sqlalchemy_session_persistence = 'commit'
    
    id = factory.LazyFunction(uuid4)
    content_id = factory.SubFactory(ContentFactory)
    chunk_index = factory.Sequence(lambda n: n)
    chunk_text = Faker('text', max_nb_chars=500)
    embedding = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class VideoFrameFactory(SQLAlchemyModelFactory):
    """VideoFrame模型工厂"""
    
    class Meta:
        model = VideoFrame
        sqlalchemy_session = None
        sqlalchemy_session_persistence = 'commit'
    
    id = factory.LazyFunction(uuid4)
    content_id = factory.SubFactory(ContentFactory)
    frame_number = factory.Sequence(lambda n: n)
    timestamp = factory.Sequence(lambda n: float(n * 5))  # 每5秒一帧
    frame_path = Faker('file_path', depth=3, extension='jpg')
    description = Faker('sentence')
    embedding = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ConversationFactory(SQLAlchemyModelFactory):
    """Conversation模型工厂"""
    
    class Meta:
        model = Conversation
        sqlalchemy_session = None
        sqlalchemy_session_persistence = 'commit'
    
    id = factory.LazyFunction(uuid4)
    session_id = Faker('uuid4')
    role = Faker('random_element', elements=['user', 'assistant'])
    content = Faker('text', max_nb_chars=500)
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class DocumentFactory(SQLAlchemyModelFactory):
    """Document模型工厂"""
    
    class Meta:
        model = Document
        sqlalchemy_session = None
        sqlalchemy_session_persistence = 'commit'
    
    id = factory.LazyFunction(uuid4)
    title = Faker('sentence', nb_words=4)
    content = Faker('text', max_nb_chars=2000)
    doc_type = Faker('random_element', elements=['text', 'pdf', 'docx'])
    file_path = Faker('file_path', depth=2)
    metadata = factory.LazyFunction(lambda: {
        'author': Faker('name').generate(),
        'category': Faker('word').generate(),
        'tags': [Faker('word').generate() for _ in range(3)]
    })
    embedding = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


# 批量创建辅助函数
def create_test_contents(db_session, count=10, **kwargs):
    """批量创建测试内容"""
    ContentFactory._meta.sqlalchemy_session = db_session
    return ContentFactory.create_batch(count, **kwargs)


def create_test_conversations(db_session, session_id=None, count=5):
    """批量创建测试对话"""
    ConversationFactory._meta.sqlalchemy_session = db_session
    if session_id:
        return ConversationFactory.create_batch(
            count, 
            session_id=session_id,
            role=factory.Iterator(['user', 'assistant'] * (count // 2 + 1))
        )
    return ConversationFactory.create_batch(count)


def create_test_documents(db_session, count=10):
    """批量创建测试文档"""
    DocumentFactory._meta.sqlalchemy_session = db_session
    return DocumentFactory.create_batch(count)


def create_test_chunks(db_session, content_id, count=5):
    """为指定内容创建测试分块"""
    ContentChunkFactory._meta.sqlalchemy_session = db_session
    return ContentChunkFactory.create_batch(count, content_id=content_id)


# 测试数据生成器
class TestDataGenerator:
    """测试数据生成器"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        # 设置所有工厂的session
        ContentFactory._meta.sqlalchemy_session = db_session
        ContentChunkFactory._meta.sqlalchemy_session = db_session
        VideoFrameFactory._meta.sqlalchemy_session = db_session
        ConversationFactory._meta.sqlalchemy_session = db_session
        DocumentFactory._meta.sqlalchemy_session = db_session
    
    def create_text_content(self, **kwargs):
        """创建文本内容"""
        defaults = {
            'content_type': ContentType.TEXT,
            'mime_type': 'text/plain',
            'original_name': 'test.txt'
        }
        defaults.update(kwargs)
        return ContentFactory(**defaults)
    
    def create_pdf_content(self, **kwargs):
        """创建PDF内容"""
        defaults = {
            'content_type': ContentType.TEXT,
            'mime_type': 'application/pdf',
            'original_name': 'test.pdf'
        }
        defaults.update(kwargs)
        return ContentFactory(**defaults)
    
    def create_image_content(self, **kwargs):
        """创建图片内容"""
        defaults = {
            'content_type': ContentType.IMAGE,
            'mime_type': 'image/jpeg',
            'original_name': 'test.jpg'
        }
        defaults.update(kwargs)
        return ContentFactory(**defaults)
    
    def create_video_content(self, **kwargs):
        """创建视频内容"""
        defaults = {
            'content_type': ContentType.VIDEO,
            'mime_type': 'video/mp4',
            'original_name': 'test.mp4'
        }
        defaults.update(kwargs)
        return ContentFactory(**defaults)
    
    def create_chat_session(self, message_count=5):
        """创建聊天会话"""
        session_id = str(uuid4())
        messages = []
        for i in range(message_count):
            role = 'user' if i % 2 == 0 else 'assistant'
            msg = ConversationFactory(session_id=session_id, role=role)
            messages.append(msg)
        return session_id, messages
    
    def cleanup(self):
        """清理测试数据"""
        # 删除所有创建的测试数据
        self.db_session.query(ContentChunk).delete()
        self.db_session.query(VideoFrame).delete()
        self.db_session.query(Content).delete()
        self.db_session.query(Conversation).delete()
        self.db_session.query(Document).delete()
        self.db_session.commit()


# 使用示例（在测试中使用）
"""
def test_example(db_session):
    # 方法1: 使用工厂直接创建
    content = ContentFactory()
    
    # 方法2: 使用批量创建函数
    contents = create_test_contents(db_session, count=10)
    
    # 方法3: 使用数据生成器
    generator = TestDataGenerator(db_session)
    pdf = generator.create_pdf_content(title="Test PDF")
    session_id, messages = generator.create_chat_session(message_count=10)
    
    # 测试完成后清理
    generator.cleanup()
"""

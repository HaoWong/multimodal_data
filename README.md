# 多模态 RAG 系统

一个支持文本、图像、视频、文档的多模态检索增强生成（RAG）系统。

## 功能特性

- 🤖 **智能对话**：基于大语言模型的智能问答系统
- 📄 **文档管理**：支持 PDF、Word、TXT 等多种文档格式
- 🖼️ **图像处理**：支持图像上传、分析和理解
- 🎥 **视频分析**：支持视频内容提取和分析
- 🔍 **语义搜索**：基于向量数据库的智能检索
- 💬 **多轮对话**：支持上下文感知的连续对话

## 技术栈

### 后端
- **框架**：FastAPI + Python 3.13
- **数据库**：PostgreSQL + SQLAlchemy
- **向量数据库**：ChromaDB
- **AI 模型**：OpenAI GPT / 其他大语言模型
- **文档处理**：PyPDF2、python-docx、python-pptx

### 前端
- **框架**：React 19 + TypeScript
- **UI 组件**：Ant Design 5.x
- **状态管理**：Zustand
- **构建工具**：react-app-rewired

## 快速开始

### 环境要求

- Python 3.13+
- Node.js 18+
- PostgreSQL 14+

### 1. 克隆项目

```bash
git clone <repository-url>
cd multimodal_data
```

### 2. 后端启动

#### 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

#### 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/multimodal_db

# OpenAI API 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 向量数据库配置
CHROMA_DB_PATH=./chroma_db

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# 应用配置
DEBUG=true
LOG_LEVEL=INFO
```

#### 初始化数据库

```bash
# 创建数据库表
python init_db.py

# 或使用 Alembic 迁移
alembic upgrade head
```

#### 启动后端服务

```bash
# 开发模式（带热重载）
python run.py

# 或直接使用 uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

后端服务默认运行在：http://localhost:8000

API 文档：http://localhost:8000/docs

### 3. 前端启动

#### 安装依赖

```bash
cd frontend
npm install
```

#### 配置环境变量

创建 `.env` 文件：

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_WS_URL=ws://localhost:8000/ws
```

#### 启动前端服务

```bash
# 开发模式
npm start

# 生产构建
npm run build

# 运行生产构建
serve -s build
```

前端服务默认运行在：http://localhost:3000

## 测试

### 运行所有测试

```bash
# 在项目根目录运行
python run_tests.py
```

### 后端测试

```bash
cd backend

# 运行所有测试
python -m pytest tests/ -v

# 运行单元测试
python -m pytest tests/unit/ -v

# 运行 E2E 测试
python -m pytest tests/e2e/ -v

# 运行性能测试
python -m pytest tests/performance/ -v

# 运行安全测试
python -m pytest tests/security/ -v

# 生成覆盖率报告
python -m pytest tests/ --cov=app --cov-report=html
```

### 前端测试

```bash
cd frontend

# 运行所有测试
npm test -- --watchAll=false

# 运行特定测试文件
npm test -- --testPathPattern=ContentListPage

# 生成覆盖率报告
npm test -- --coverage --watchAll=false
```

### 测试脚本选项

```bash
python run_tests.py [选项]

选项:
  --backend-only      只运行后端测试
  --frontend-only     只运行前端测试
  --unit-only         只运行单元测试
  --e2e-only          只运行 E2E 测试
  --security-only     只运行安全测试
  --performance-only  只运行性能测试
  --coverage          生成覆盖率报告
  --verbose           详细输出
  --fail-fast         遇到失败立即停止

示例:
  python run_tests.py --backend-only
  python run_tests.py --unit-only --coverage
  python run_tests.py --security-only
```

## 项目结构

```
multimodal_data/
├── backend/                    # 后端代码
│   ├── app/                    # 应用主代码
│   │   ├── api/                # API 路由
│   │   ├── core/               # 核心配置
│   │   ├── models/             # 数据库模型
│   │   ├── schemas/            # Pydantic 模型
│   │   ├── services/           # 业务逻辑
│   │   └── utils/              # 工具函数
│   ├── tests/                  # 测试代码
│   │   ├── e2e/                # 端到端测试
│   │   ├── unit/               # 单元测试
│   │   ├── performance/        # 性能测试
│   │   └── security/           # 安全测试
│   ├── alembic/                # 数据库迁移
│   ├── uploads/                # 上传文件目录
│   ├── requirements.txt        # Python 依赖
│   └── pytest.ini             # Pytest 配置
├── frontend/                   # 前端代码
│   ├── src/                    # 源代码
│   │   ├── components/         # React 组件
│   │   ├── pages/              # 页面组件
│   │   ├── services/           # API 服务
│   │   ├── stores/             # 状态管理
│   │   └── types/              # TypeScript 类型
│   ├── public/                 # 静态资源
│   ├── package.json            # Node.js 依赖
│   └── config-overrides.js     # Webpack 配置
├── run_tests.py               # 测试运行脚本
├── run_tests.bat              # Windows 测试脚本
├── run_tests.sh               # Linux/Mac 测试脚本
└── README.md                  # 项目说明
```

## API 接口

### 核心接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/chat/` | POST | 发送聊天消息 |
| `/api/contents/upload` | POST | 上传文件 |
| `/api/contents/search` | POST | 语义搜索 |
| `/api/contents/documents/list` | GET | 获取文档列表 |
| `/api/chat/sessions` | GET | 获取会话列表 |

### 完整 API 文档

启动后端服务后访问：http://localhost:8000/docs

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t multimodal-rag .

# 运行容器
docker run -d -p 8000:8000 --env-file .env multimodal-rag
```

### 生产环境部署

1. **环境准备**
   - 配置生产数据库
   - 设置环境变量
   - 配置反向代理（Nginx）

2. **后端部署**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

3. **前端部署**
   ```bash
   cd frontend
   npm install
   npm run build
   # 将 build 目录部署到 Web 服务器
   ```

## 开发指南

### 代码规范

- **Python**：遵循 PEP 8 规范
- **TypeScript**：遵循 ESLint 配置
- **提交信息**：使用 Conventional Commits

### 分支管理

- `main`：生产分支
- `develop`：开发分支
- `feature/*`：功能分支
- `hotfix/*`：紧急修复分支

### 提交代码

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交更改
git add .
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/new-feature
```

## 常见问题

### 1. 数据库连接失败

检查 PostgreSQL 服务是否启动，以及 `.env` 中的数据库配置是否正确。

### 2. 前端无法连接后端

检查前端 `.env` 中的 `REACT_APP_API_BASE_URL` 是否指向正确的后端地址。

### 3. 文件上传失败

检查 `UPLOAD_DIR` 目录是否存在且有写入权限。

### 4. 测试失败

确保所有依赖已安装，并且数据库服务已启动。

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。

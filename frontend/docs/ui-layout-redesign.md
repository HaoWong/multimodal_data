# 多模态RAG系统 - 界面重新布局方案

## 当前界面结构

### 整体布局

```mermaid
graph TB
    subgraph Browser["浏览器视口 (100vw x 100vh)"]
        subgraph App["App 容器"]
            direction LR
            
            subgraph Sidebar["Sidebar 侧边栏<br/>width: 200px<br/>height: 100vh<br/>background: #001529<br/>position: fixed<br/>left: 0"]
                Logo["Logo 区域<br/>height: 64px<br/>padding: 16px<br/>border-bottom: 1px solid rgba(255,255,255,0.1)"]
                Menu["Menu 菜单<br/>flex: 1<br/>overflow-y: auto"]
                History["历史会话<br/>max-height: 300px<br/>border-top: 1px solid rgba(255,255,255,0.1)"]
                Footer["Footer<br/>height: 40px<br/>padding: 12px 16px"]
            end
            
            subgraph Main["Main 主内容区<br/>margin-left: 200px<br/>width: calc(100% - 200px)<br/>height: 100vh<br/>display: flex<br/>flex-direction: column"]
                Header["Header 顶部栏<br/>height: 64px<br/>padding: 0 24px<br/>background: #fff<br/>border-bottom: 1px solid #f0f0f0<br/>display: flex<br/>align-items: center<br/>justify-content: space-between"]
                
                subgraph Content["Content 内容区<br/>flex: 1<br/>overflow-y: auto<br/>padding: 24px<br/>background: #f5f5f5"]
                    ChatArea["ChatArea 对话区域<br/>max-width: 1200px<br/>margin: 0 auto<br/>height: 100%<br/>display: flex<br/>flex-direction: column"]
                end
            end
        end
    end
```

---

## 当前各区域详细结构

### 1. Sidebar 侧边栏 (200px)

```mermaid
graph TB
    subgraph SidebarDetail["Sidebar 详细结构"]
        direction TB
        
        LogoArea["Logo 区域 (64px)
        ├── Logo 图标 (32px)
        ├── 标题: 多模态RAG
        └── 副标题: 智能文档检索与对话"]
        
        NavMenu["导航菜单
        ├── 💬 对话 (当前选中)
        │   └── background: #1890ff
        │   └── color: #fff
        ├── 📚 知识库
        ├── 🖼️ 图片库
        ├── 🎬 视频库
        └── ⚙️ 设置
            └── 每个菜单项:
                height: 40px
                padding: 0 16px
                display: flex
                align-items: center
                gap: 12px"]
        
        HistoryArea["历史会话区域
        ├── 标题栏: 历史会话 + 新建按钮
        │   └── height: 40px
        │   └── padding: 8px 16px
        └── 会话列表
            ├── 会话项 (当前选中)
            │   └── background: #1890ff
            │   └── border-radius: 4px
            │   └── margin: 4px 8px
            │   └── padding: 8px 12px
            └── 会话项 (普通)
                └── hover: background: rgba(255,255,255,0.05)"]
        
        FooterArea["Footer (40px)
        └── Powered by Ollama + PostgreSQL
            └── font-size: 11px
            └── color: rgba(255,255,255,0.4)
            └── text-align: center"]
    end
```

### 2. Header 顶部栏 (64px)

```mermaid
graph LR
    subgraph HeaderDetail["Header 详细结构 (高度: 64px)"]
        direction LR
        
        Left["左侧区域
        ├── 💬 智能对话 (标签样式)
        │   └── font-size: 16px
        │   └── font-weight: 500
        ├── ⚡ Agent模式 [Switch开关]
        │   └── margin-left: 24px
        └── 📊 RAG增强 [Switch开关]
            └── margin-left: 16px"]
        
        Spacer["flex: 1 (空白填充)"]
        
        Right["右侧区域
        ├── ☰ 任务按钮
        │   └── margin-right: 16px
        ├── + 新对话按钮
        │   └── margin-right: 16px
        ├── 🗑️ 清空按钮
        │   └── margin-right: 16px
        └── ⬆️ 上传任务按钮
            └── type: primary"]
    end
```

### 3. ChatPage 对话页面

```mermaid
graph TB
    subgraph ChatPage["ChatPage 页面结构"]
        direction TB
        
        subgraph Welcome["欢迎状态 (空对话时显示)"]
            WelcomeTitle["👋 你好，我是AI助手
            font-size: 24px
            font-weight: 600
            text-align: center
            margin-bottom: 48px"]
            
            InputCard["输入卡片
            max-width: 800px
            margin: 0 auto
            padding: 24px
            background: #fff
            border-radius: 12px
            box-shadow: 0 4px 12px rgba(0,0,0,0.1)"]
            
            QuickActions["快捷操作
            display: flex
            justify-content: center
            gap: 48px
            margin-top: 32px
            ├── 🖼️ 图片
            ├── 🎬 视频
            └── 📄 文档"]
        end
        
        subgraph Chatting["对话状态"]
            MessageList["消息列表
            flex: 1
            overflow-y: auto
            padding: 24px 0"]
            
            UserMessage["用户消息
            ├── 头像 (右侧)
            ├── 消息内容
            │   └── background: #e6f7ff
            │   └── border-radius: 8px 0 8px 8px
            └── 时间戳"]
            
            AIMessage["AI消息
            ├── 头像 (左侧)
            ├── 消息内容
            │   └── background: #f6ffed
            │   └── border-radius: 0 8px 8px 8px
            └── 引用来源 (如果有)"]
        end
        
        InputArea["输入区域
        position: sticky
        bottom: 0
        padding: 16px 0
        background: #f5f5f5"]
    end
```

---

## 重新布局方案

### 方案一：简化布局（推荐）

```mermaid
graph TB
    subgraph NewLayout["方案一：简化布局"]
        direction LR
        
        subgraph NewSidebar["新侧边栏 (180px)"]
            NS_Logo["Logo (48px)
            └── 只保留图标 + 标题"]
            
            NS_Menu["导航菜单
            ├── 💬 对话
            ├── 📚 知识库
            ├── 🖼️ 媒体库* (合并图片+视频)
            ├── 📊 任务中心* (新增)
            └── ⚙️ 设置"]
        end
        
        subgraph NewMain["主内容区"]
            direction TB
            
            NS_Header1["标题栏 (48px)
            ├── 当前对话标题 (可编辑)
            └── 右侧: ⭐ 收藏 ⋮ 更多"]
            
            NS_Header2["功能栏 (40px)
            display: flex
            gap: 16px
            ├── [Agent模式] 按钮
            ├── [RAG增强] 按钮
            ├── [深度思考] 按钮
            └── [联网搜索] 按钮"]
            
            NS_Content["内容区"]
            
            NS_Input["输入区 (72px)
            display: flex
            align-items: center
            gap: 12px
            padding: 16px 24px
            background: #fff
            border-top: 1px solid #f0f0f0
            ├── 🖼️ 图片按钮
            ├── 🎬 视频按钮
            ├── 📄 文档按钮
            ├── 📎 附件按钮
            ├── 输入框 (flex: 1)
            └── ➤ 发送按钮"]
        end
    end
```

**CSS 关键样式：**

```css
/* 新侧边栏 */
.new-sidebar {
  width: 180px;
  background: #001529;
  color: rgba(255,255,255,0.65);
}

.new-sidebar .menu-item {
  height: 40px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.new-sidebar .menu-item:hover {
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.new-sidebar .menu-item.active {
  color: #fff;
  background: #1890ff;
}

/* 功能按钮组 */
.function-bar {
  display: flex;
  gap: 12px;
  padding: 8px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.function-bar .func-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.function-bar .func-btn.active {
  border-color: #1890ff;
  color: #1890ff;
  background: #e6f7ff;
}

/* 输入区域 */
.input-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.input-area .file-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.input-area .file-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}
```

---

### 方案二：三栏布局（适合宽屏 > 1400px）

```mermaid
graph TB
    subgraph ThreeColumn["方案二：三栏布局"]
        direction LR
        
        subgraph TC_Left["左侧导航 (60px)"]
            TCL["图标导航
            width: 60px
            display: flex
            flex-direction: column
            align-items: center
            padding: 16px 0
            gap: 8px
            ├── 💬 (对话)
            ├── 📚 (知识库)
            ├── 🖼️ (媒体库)
            ├── 📊 (任务)
            └── ⚙️ (设置)
            
            每个图标:
            width: 44px
            height: 44px
            border-radius: 8px
            display: flex
            align-items: center
            justify-content: center
            cursor: pointer"]
        end
        
        subgraph TC_Center["中间主区域 (flex: 1)"]
            TCC["对话内容区
            max-width: 900px
            margin: 0 auto
            padding: 24px"]
        end
        
        subgraph TC_Right["右侧信息栏 (280px, 可折叠)"]
            TCR["信息面板
            ├── 📎 附件列表
            │   └── max-height: 200px
            ├── 📋 历史消息
            │   └── flex: 1
            ├── ⏱️ 任务状态
            │   └── height: 150px
            └── ⚙️ 快捷设置
                └── height: auto"]
        end
    end
```

**CSS 关键样式：**

```css
/* 三栏布局容器 */
.three-column-layout {
  display: flex;
  height: 100vh;
}

/* 左侧图标导航 */
.icon-nav {
  width: 60px;
  background: #001529;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 8px;
}

.icon-nav .nav-item {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.65);
  cursor: pointer;
  transition: all 0.3s;
}

.icon-nav .nav-item:hover,
.icon-nav .nav-item.active {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

/* 右侧信息栏 */
.info-panel {
  width: 280px;
  background: #fff;
  border-left: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.info-panel.collapsed {
  width: 0;
  overflow: hidden;
}

.info-panel .panel-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.info-panel .panel-section:last-child {
  border-bottom: none;
}
```

---

### 方案三：底部 Dock 导航（现代化）

```mermaid
graph TB
    subgraph DockLayout["方案三：底部 Dock 导航"]
        direction TB
        
        subgraph Dock_Top["顶部极简栏 (40px)"]
            DT["多模态RAG
            font-size: 16px
            font-weight: 500
            text-align: center
            line-height: 40px"]
        end
        
        subgraph Dock_Content["主内容区"]
            DC["页面内容
            padding: 24px
            padding-bottom: 100px (为Dock留空间)"]
        end
        
        subgraph Dock_Bar["底部 Dock 栏 (60px)"]
            DB["Dock 容器
            position: fixed
            bottom: 0
            left: 0
            right: 0
            height: 60px
            background: #fff
            border-top: 1px solid #f0f0f0
            display: flex
            justify-content: center
            align-items: center
            gap: 48px
            padding: 0 24px
            box-shadow: 0 -2px 8px rgba(0,0,0,0.05)
            
            ├── 🏠 首页
            ├── 💬 对话
            ├── 📚 知识
            ├── 🖼️ 媒体
            ├── 📊 任务
            └── ⚙️ 设置
            
            每个 Dock 项:
            display: flex
            flex-direction: column
            align-items: center
            gap: 4px
            font-size: 12px"]
        end
    end
```

**CSS 关键样式：**

```css
/* Dock 布局 */
.dock-layout {
  min-height: 100vh;
  padding-bottom: 60px; /* 为 Dock 留空间 */
}

/* 底部 Dock */
.dock-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  padding: 0 24px;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
}

.dock-bar .dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  color: rgba(0,0,0,0.45);
  cursor: pointer;
  transition: all 0.3s;
}

.dock-bar .dock-item:hover,
.dock-bar .dock-item.active {
  color: #1890ff;
}

.dock-bar .dock-item .icon {
  font-size: 20px;
}

.dock-bar .dock-item .label {
  font-size: 12px;
}
```

---

## 响应式断点设计

```mermaid
graph LR
    subgraph Responsive["响应式布局断点"]
        direction LR
        
        Mobile["📱 移动端
        < 768px
        ├── 底部 Dock 导航
        ├── 全屏内容区
        └── 侧边栏变为抽屉"]
        
        Tablet["📱 平板
        768px - 1024px
        ├── 可折叠侧边栏 (60px图标)
        ├── 主内容区自适应
        └── 可选右侧信息栏"]
        
        Desktop["💻 桌面端
        1024px - 1400px
        ├── 固定侧边栏 (180px)
        ├── 主内容区最大 1200px
        └── 居中显示"]
        
        Large["🖥️ 大屏
        > 1400px
        ├── 固定侧边栏 (180px)
        ├── 主内容区 900px
        └── 右侧信息栏 (280px)"]
    end
```

**响应式 CSS：**

```css
/* 移动端 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .dock-bar {
    display: flex; /* 显示底部导航 */
  }
}

/* 平板 */
@media (min-width: 768px) and (max-width: 1024px) {
  .sidebar {
    width: 60px; /* 只显示图标 */
  }
  
  .sidebar .menu-text {
    display: none;
  }
  
  .main-content {
    margin-left: 60px;
  }
}

/* 桌面端 */
@media (min-width: 1024px) {
  .sidebar {
    width: 180px;
  }
  
  .main-content {
    margin-left: 180px;
  }
  
  .content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* 大屏 */
@media (min-width: 1400px) {
  .three-column .info-panel {
    display: flex; /* 显示右侧栏 */
  }
}
```

---

## 文件修改清单

| 优先级 | 文件 | 修改内容 | 预估工作量 |
|--------|------|----------|-----------|
| 🔴 高 | `Sidebar.tsx` | 简化导航结构，合并图片+视频 | 2h |
| 🔴 高 | `ChatPage.tsx` | 重新设计输入框区域 | 3h |
| 🔴 高 | `App.tsx` | 调整整体布局结构 | 2h |
| 🟡 中 | `UnifiedTaskMonitor.tsx` | 改为浮动组件或集成到侧边栏 | 2h |
| 🟡 中 | `DocumentsPage.tsx` | 优化文档展示 | 1h |
| 🟡 中 | `MediaLibraryPage.tsx` | 新建：合并图片+视频库 | 3h |
| 🟢 低 | `TaskCenterPage.tsx` | 新建：任务中心页面 | 2h |
| 🟢 低 | `responsive.css` | 新建：响应式样式文件 | 2h |

---

## 实施建议

### 第一阶段：基础布局调整
1. 修改 `Sidebar.tsx` - 简化导航
2. 修改 `ChatPage.tsx` - 优化输入区域
3. 调整 `App.tsx` - 整体布局

### 第二阶段：功能整合
1. 合并图片库和视频库为媒体库
2. 添加任务中心页面
3. 优化任务监控组件位置

### 第三阶段：响应式适配
1. 添加移动端适配
2. 添加平板适配
3. 测试各断点显示效果

---

*此文档包含详细的 CSS 样式和布局参数，可直接参考实现*

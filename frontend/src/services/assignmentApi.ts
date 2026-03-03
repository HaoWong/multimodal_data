/**
 * 作业管理 API 服务
 */

export interface Assignment {
  id: string;
  title: string;
  description: string;
  assignment_type: string;
  status: string;
  ai_analysis?: string;
  ai_suggestions?: string[];
  ai_steps?: string[];
  tags: string[];
  content_count: number;
  contents?: ContentItem[];
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  original_name: string;
  content_type: string;
  description?: string;
  created_at: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  assignment_type?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context_type?: string;
  created_at: string;
}

class AssignmentApi {
  private baseUrl = '/api/assignments';

  // 获取作业列表
  async listAssignments(params?: { status?: string; type?: string }): Promise<Assignment[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('assignment_type', params.type);
    
    const response = await fetch(`${this.baseUrl}/?${queryParams}`);
    const data = await response.json();
    return data.assignments || [];
  }

  // 获取作业详情
  async getAssignment(id: string): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // 创建作业
  async createAssignment(request: CreateAssignmentRequest): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // 更新作业
  async updateAssignment(id: string, updates: Partial<CreateAssignmentRequest & { status?: string }>): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // 删除作业
  async deleteAssignment(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
  }

  // 添加内容到作业
  async addContent(assignmentId: string, contentId: string, contentRole: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${assignmentId}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: contentId, content_role: contentRole }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
  }

  // 从作业中移除内容
  async removeContent(assignmentId: string, contentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${assignmentId}/contents/${contentId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
  }

  // AI 分析作业
  async analyzeAssignment(id: string): Promise<{
    analysis: string;
    suggestions: string[];
    steps: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/${id}/analyze`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // 与作业对话
  async chat(assignmentId: string, message: string, contextType: string = 'general'): Promise<{
    response: string;
    referenced_contents: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/${assignmentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context_type: contextType }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  // 获取对话历史
  async getChatHistory(assignmentId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${this.baseUrl}/${assignmentId}/chat`);
    const data = await response.json();
    return data.chats || [];
  }
}

export const assignmentApi = new AssignmentApi();

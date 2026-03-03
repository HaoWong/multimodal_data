"""
视频处理器
提取视频帧并生成描述
"""
import os
import cv2
from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class VideoFrame:
    """视频帧信息"""
    frame_path: str
    timestamp: float
    frame_number: int
    description: str = ""


class VideoProcessor:
    """视频处理器"""

    def __init__(self, frames_dir: str = "uploads/frames"):
        self.frames_dir = frames_dir
        os.makedirs(frames_dir, exist_ok=True)

    async def process_video_with_task(
        self,
        video_path: str,
        content_id: str,
        ollama_client,
        task_manager,
        max_frames: int = 10
    ) -> Dict:
        """
        处理视频（带任务跟踪）

        Args:
            video_path: 视频文件路径
            content_id: 内容ID
            ollama_client: Ollama客户端
            task_manager: 任务管理器
            max_frames: 最大提取帧数
        """
        from app.core.task_manager import TaskStatus

        # 获取文件名
        filename = os.path.basename(video_path)

        # 创建任务
        await task_manager.create_task(
            content_id,
            "video_process",
            {"filename": filename, "video_path": video_path}
        )

        try:
            await task_manager.start_task(content_id)

            # 提取帧
            await task_manager.update_progress(content_id, 10, "正在提取视频帧...")
            frames, duration = self.extract_frames(video_path, content_id, max_frames)

            if not frames:
                await task_manager.fail_task(content_id, "无法提取视频帧")
                return {
                    "frames": [],
                    "duration": duration,
                    "overall_description": "无法提取视频帧"
                }

            # 为每个帧生成描述
            frame_descriptions = []
            total_frames = len(frames)

            for i, frame in enumerate(frames):
                progress = 10 + (i / total_frames) * 80  # 10-90% 进度
                await task_manager.update_progress(
                    content_id,
                    progress,
                    f"正在分析第 {i+1}/{total_frames} 帧..."
                )

                try:
                    description = await ollama_client.describe_image(frame.frame_path)
                    frame.description = description
                    frame_descriptions.append(f"[{frame.timestamp:.1f}s] {description}")
                except Exception as e:
                    frame.description = f"描述生成失败: {str(e)}"
                    frame_descriptions.append(f"[{frame.timestamp:.1f}s] 无法描述")

            # 生成整体描述
            await task_manager.update_progress(content_id, 95, "正在生成最终描述...")
            overall_description = "\n".join(frame_descriptions)

            result = {
                "frames": frames,
                "duration": duration,
                "overall_description": overall_description
            }

            await task_manager.complete_task(content_id, {
                "duration": duration,
                "frame_count": len(frames)
            })

            return result

        except Exception as e:
            await task_manager.fail_task(content_id, str(e))
            raise
    
    def extract_frames(
        self,
        video_path: str,
        content_id: str,
        max_frames: int = 10,
        min_interval: float = 2.0
    ) -> Tuple[List[VideoFrame], float]:
        """
        从视频中提取关键帧
        
        Args:
            video_path: 视频文件路径
            content_id: 内容ID（用于命名）
            max_frames: 最大提取帧数
            min_interval: 最小间隔（秒）
            
        Returns:
            (帧列表, 视频时长)
        """
        # 打开视频
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"无法打开视频: {video_path}")
        
        # 获取视频信息
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # 创建帧存储目录
        frames_subdir = os.path.join(self.frames_dir, content_id)
        os.makedirs(frames_subdir, exist_ok=True)
        
        frames = []
        frame_interval = max(min_interval, duration / max_frames)
        
        current_time = 0
        frame_count = 0
        
        while current_time < duration and len(frames) < max_frames:
            # 设置视频位置
            cap.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)
            ret, frame = cap.read()
            
            if not ret:
                break
            
            # 保存帧
            frame_filename = f"frame_{len(frames):04d}.jpg"
            frame_path = os.path.join(frames_subdir, frame_filename)
            cv2.imwrite(frame_path, frame)
            
            frames.append(VideoFrame(
                frame_path=frame_path,
                timestamp=current_time,
                frame_number=len(frames)
            ))
            
            current_time += frame_interval
            frame_count += 1
        
        cap.release()
        return frames, duration
    
    async def process_video(
        self,
        video_path: str,
        content_id: str,
        ollama_client,
        max_frames: int = 10
    ) -> Dict:
        """
        处理视频：提取帧 + 生成描述
        
        Returns:
            {
                "frames": [VideoFrame],
                "duration": float,
                "overall_description": str
            }
        """
        # 提取帧
        frames, duration = self.extract_frames(
            video_path, content_id, max_frames
        )
        
        if not frames:
            return {
                "frames": [],
                "duration": duration,
                "overall_description": "无法提取视频帧"
            }
        
        # 为每个帧生成描述
        frame_descriptions = []
        for frame in frames:
            try:
                description = await ollama_client.describe_image(frame.frame_path)
                frame.description = description
                frame_descriptions.append(f"[{frame.timestamp:.1f}s] {description}")
            except Exception as e:
                frame.description = f"描述生成失败: {str(e)}"
                frame_descriptions.append(f"[{frame.timestamp:.1f}s] 无法描述")
        
        # 生成整体描述
        overall_description = "\n".join(frame_descriptions)
        
        return {
            "frames": frames,
            "duration": duration,
            "overall_description": overall_description
        }
    
    def cleanup(self, content_id: str):
        """清理帧文件"""
        frames_subdir = os.path.join(self.frames_dir, content_id)
        if os.path.exists(frames_subdir):
            import shutil
            shutil.rmtree(frames_subdir)


# 全局处理器实例
video_processor = VideoProcessor()

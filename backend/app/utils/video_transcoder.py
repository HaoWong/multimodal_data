"""
视频转码工具 - 将视频转换为浏览器兼容的H.264格式
"""
import subprocess
from pathlib import Path


def transcode_to_h264(input_path: str, output_path: str = None) -> str:
    """
    将视频转码为H.264格式（浏览器兼容）
    
    Args:
        input_path: 输入视频路径
        output_path: 输出视频路径，默认为 input_path + ".h264.mp4"
    
    Returns:
        输出视频路径
    """
    if output_path is None:
        output_path = str(Path(input_path).with_suffix('.h264.mp4'))
    
    # FFmpeg 命令：转换为 H.264 (libx264) + AAC 音频
    cmd = [
        'ffmpeg',
        '-i', input_path,           # 输入文件
        '-c:v', 'libx264',          # 视频编码器：H.264
        '-preset', 'fast',          # 编码速度预设
        '-crf', '23',               # 质量（0-51，越小越好，默认23）
        '-c:a', 'aac',              # 音频编码器：AAC
        '-b:a', '128k',             # 音频码率
        '-movflags', '+faststart',  # 支持流式播放
        '-y',                       # 覆盖输出文件
        output_path
    ]
    
    try:
        subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"转码失败: {e.stderr}")
        raise Exception(f"视频转码失败: {e.stderr}")
    except FileNotFoundError:
        raise Exception("FFmpeg 未安装，请安装 FFmpeg 后重试")


def get_video_info(video_path: str) -> dict:
    """获取视频信息"""
    import cv2
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        return None
    
    info = {
        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'fps': cap.get(cv2.CAP_PROP_FPS),
        'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        'duration': cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS) if cap.get(cv2.CAP_PROP_FPS) > 0 else 0,
    }
    
    # 获取编码格式
    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
    info['codec'] = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])
    
    cap.release()
    return info


def needs_transcoding(video_path: str) -> bool:
    """检查视频是否需要转码"""
    info = get_video_info(video_path)
    if not info:
        return False
    
    # 检查是否为浏览器不支持的格式
    unsupported_codecs = ['hevc', 'hvc1', 'av01', 'vp9', 'vp8']
    return info['codec'].lower() in unsupported_codecs

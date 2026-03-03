#!/usr/bin/env python3
"""
核心功能测试脚本 - 确保基础能力不会出问题

测试覆盖:
1. 知识库文档上传 + RAG对话
2. 图片库列表
3. 视频库列表
4. 内容库上传 + RAG对话
5. 基础对话
6. 带历史记录的对话

使用方法:
    python scripts/run_core_tests.py

退出码:
    0 - 所有测试通过
    1 - 有测试失败
"""
import sys
import subprocess
import argparse
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))


CORE_TESTS = [
    "tests/e2e/test_end_to_end.py::TestKnowledgeBaseE2E::test_upload_document_and_chat",
    "tests/e2e/test_end_to_end.py::TestImageLibraryE2E::test_list_images",
    "tests/e2e/test_end_to_end.py::TestVideoLibraryE2E::test_list_videos",
    "tests/e2e/test_end_to_end.py::TestUnifiedContentE2E::test_upload_text_and_chat",
    "tests/e2e/test_end_to_end.py::TestChatE2E::test_basic_chat",
    "tests/e2e/test_end_to_end.py::TestChatE2E::test_chat_with_history",
]


def run_tests(verbose: bool = True, fail_fast: bool = False) -> bool:
    """
    运行核心测试
    
    Args:
        verbose: 是否显示详细输出
        fail_fast: 遇到第一个失败时是否停止
    
    Returns:
        True - 所有测试通过
        False - 有测试失败
    """
    print("=" * 70)
    print("🧪 运行核心功能测试")
    print("=" * 70)
    print()
    
    test_descriptions = [
        "📚 知识库文档上传 + RAG对话",
        "🖼️  图片库列表",
        "🎬 视频库列表",
        "📄 内容库上传 + RAG对话",
        "💬 基础对话",
        "📝 带历史记录的对话",
    ]
    
    print("测试列表:")
    for i, desc in enumerate(test_descriptions, 1):
        print(f"  {i}. {desc}")
    print()
    print("-" * 70)
    print()
    
    # 构建 pytest 命令
    cmd = ["python", "-m", "pytest"]
    
    if verbose:
        cmd.append("-v")
    
    if fail_fast:
        cmd.append("-x")
    
    cmd.extend([
        "--tb=short",
        "--strict-markers",
        "-W", "ignore::DeprecationWarning",
    ])
    
    cmd.extend(CORE_TESTS)
    
    # 运行测试
    print(f"运行命令: {' '.join(cmd)}")
    print()
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
    
    print()
    print("=" * 70)
    
    if result.returncode == 0:
        print("✅ 所有核心测试通过！")
        print("=" * 70)
        return True
    else:
        print("❌ 有测试失败！")
        print("=" * 70)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="运行核心功能测试",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python scripts/run_core_tests.py
    python scripts/run_core_tests.py --quiet
    python scripts/run_core_tests.py --fail-fast
        """
    )
    
    parser.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="减少输出信息"
    )
    
    parser.add_argument(
        "-x", "--fail-fast",
        action="store_true",
        help="遇到第一个失败时停止"
    )
    
    args = parser.parse_args()
    
    success = run_tests(
        verbose=not args.quiet,
        fail_fast=args.fail_fast
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

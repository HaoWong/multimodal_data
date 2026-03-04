#!/usr/bin/env python3
"""
测试运行脚本 - 统一运行前后端测试

使用方法:
    python run_tests.py [options]

选项:
    --backend-only    只运行后端测试
    --frontend-only   只运行前端测试
    --unit-only       只运行单元测试
    --e2e-only        只运行E2E测试
    --security-only   只运行安全测试
    --performance-only 只运行性能测试
    --coverage        生成覆盖率报告
    --verbose         详细输出
    --fail-fast       遇到第一个失败就停止

示例:
    python run_tests.py                          # 运行所有测试
    python run_tests.py --backend-only           # 只运行后端测试
    python run_tests.py --unit-only --coverage   # 运行单元测试并生成覆盖率报告
    python run_tests.py --security-only          # 只运行安全测试
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path
from datetime import datetime

# 颜色定义
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    """打印标题"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN} {text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")

def print_section(text):
    """打印章节"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'-'*50}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE} {text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'-'*50}{Colors.END}\n")

def print_success(text):
    """打印成功信息"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    """打印错误信息"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_warning(text):
    """打印警告信息"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def run_command(cmd, cwd=None, verbose=False):
    """运行命令并返回结果"""
    if verbose:
        print(f"{Colors.MAGENTA}执行命令: {' '.join(cmd)}{Colors.END}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        return result
    except Exception as e:
        print_error(f"命令执行失败: {e}")
        return None

def run_backend_tests(args):
    """运行后端测试"""
    print_header("后端测试")
    
    backend_dir = Path(__file__).parent / "backend"
    if not backend_dir.exists():
        print_error("后端目录不存在")
        return False
    
    # 构建pytest命令
    pytest_cmd = ["python", "-m", "pytest"]
    
    # 选择测试目录
    if args.unit_only:
        pytest_cmd.append("tests/unit/")
        print_section("运行单元测试")
    elif args.e2e_only:
        pytest_cmd.append("tests/e2e/")
        print_section("运行E2E测试")
    elif args.security_only:
        pytest_cmd.append("tests/security/")
        print_section("运行安全测试")
    elif args.performance_only:
        pytest_cmd.append("tests/performance/")
        print_section("运行性能测试")
    else:
        pytest_cmd.append("tests/")
        print_section("运行所有后端测试")
    
    # 添加选项
    if args.verbose:
        pytest_cmd.append("-v")
    else:
        pytest_cmd.append("-q")
    
    if args.fail_fast:
        pytest_cmd.append("-x")
    
    if args.coverage:
        pytest_cmd.extend(["--cov=app", "--cov-report=term-missing"])
    
    # 运行测试
    result = run_command(pytest_cmd, cwd=str(backend_dir), verbose=args.verbose)
    
    if result is None:
        return False
    
    # 输出结果
    if result.stdout:
        print(result.stdout)
    if result.stderr and args.verbose:
        print(result.stderr)
    
    # 检查结果
    if result.returncode == 0:
        print_success("后端测试通过!")
        return True
    else:
        print_error(f"后端测试失败 (返回码: {result.returncode})")
        return False

def run_frontend_tests(args):
    """运行前端测试"""
    print_header("前端测试")
    
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.exists():
        print_error("前端目录不存在")
        return False
    
    print_section("运行前端测试")
    
    # 检查npm是否可用
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    
    # 运行测试
    test_cmd = [npm_cmd, "test"]
    if not args.verbose:
        test_cmd.append("--")
        test_cmd.append("--watchAll=false")
    
    result = run_command(test_cmd, cwd=str(frontend_dir), verbose=args.verbose)
    
    if result is None:
        return False
    
    # 输出结果
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    # 检查结果
    if result.returncode == 0:
        print_success("前端测试通过!")
        return True
    else:
        print_error(f"前端测试失败 (返回码: {result.returncode})")
        return False

def run_lint_checks(args):
    """运行代码检查"""
    print_header("代码检查")
    
    backend_dir = Path(__file__).parent / "backend"
    frontend_dir = Path(__file__).parent / "frontend"
    
    success = True
    
    # 后端代码检查
    if backend_dir.exists() and not args.frontend_only:
        print_section("后端代码检查")
        
        # 使用flake8进行代码检查
        flake8_cmd = ["python", "-m", "flake8", "app/", "--max-line-length=120", "--ignore=E501,W503"]
        result = run_command(flake8_cmd, cwd=str(backend_dir), verbose=args.verbose)
        
        if result and result.returncode == 0:
            print_success("后端代码检查通过!")
        elif result:
            print_warning("后端代码有风格问题（非致命）")
            if args.verbose and result.stdout:
                print(result.stdout)
    
    # 前端代码检查
    if frontend_dir.exists() and not args.backend_only:
        print_section("前端代码检查")
        
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        eslint_cmd = [npm_cmd, "run", "lint"]
        result = run_command(eslint_cmd, cwd=str(frontend_dir), verbose=args.verbose)
        
        if result and result.returncode == 0:
            print_success("前端代码检查通过!")
        else:
            print_warning("前端代码检查未完成（可能需要配置）")
    
    return success

def generate_report(args, backend_success, frontend_success):
    """生成测试报告"""
    print_header("测试报告")
    
    report = []
    report.append(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"操作系统: {sys.platform}")
    report.append("")
    
    if not args.frontend_only:
        status = "✓ 通过" if backend_success else "✗ 失败"
        report.append(f"后端测试: {status}")
    
    if not args.backend_only:
        status = "✓ 通过" if frontend_success else "✗ 失败"
        report.append(f"前端测试: {status}")
    
    report.append("")
    
    overall_success = backend_success and frontend_success
    if overall_success:
        report.append("总体结果: ✓ 所有测试通过!")
    else:
        report.append("总体结果: ✗ 部分测试失败")
    
    # 打印报告
    for line in report:
        if "✓" in line:
            print_success(line.replace("✓ ", ""))
        elif "✗" in line:
            print_error(line.replace("✗ ", ""))
        else:
            print(line)
    
    # 保存报告到文件
    if args.coverage:
        report_path = Path(__file__).parent / "test_report.txt"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(report))
        print(f"\n报告已保存到: {report_path}")
    
    return overall_success

def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="运行前后端测试",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run_tests.py                          # 运行所有测试
  python run_tests.py --backend-only           # 只运行后端测试
  python run_tests.py --frontend-only          # 只运行前端测试
  python run_tests.py --unit-only              # 只运行单元测试
  python run_tests.py --e2e-only               # 只运行E2E测试
  python run_tests.py --security-only          # 只运行安全测试
  python run_tests.py --performance-only       # 只运行性能测试
  python run_tests.py --coverage               # 生成覆盖率报告
  python run_tests.py --verbose                # 详细输出
  python run_tests.py --fail-fast              # 遇到失败立即停止
        """
    )
    
    parser.add_argument("--backend-only", action="store_true", help="只运行后端测试")
    parser.add_argument("--frontend-only", action="store_true", help="只运行前端测试")
    parser.add_argument("--unit-only", action="store_true", help="只运行单元测试")
    parser.add_argument("--e2e-only", action="store_true", help="只运行E2E测试")
    parser.add_argument("--security-only", action="store_true", help="只运行安全测试")
    parser.add_argument("--performance-only", action="store_true", help="只运行性能测试")
    parser.add_argument("--coverage", action="store_true", help="生成覆盖率报告")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    parser.add_argument("--fail-fast", "-x", action="store_true", help="遇到失败立即停止")
    parser.add_argument("--no-lint", action="store_true", help="跳过代码检查")
    
    args = parser.parse_args()
    
    # 检查互斥选项
    test_type_count = sum([
        args.unit_only, args.e2e_only, 
        args.security_only, args.performance_only
    ])
    
    if test_type_count > 1:
        print_error("错误: --unit-only, --e2e-only, --security-only, --performance-only 不能同时使用")
        sys.exit(1)
    
    # 开始测试
    print_header("测试运行器")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"工作目录: {Path(__file__).parent}")
    print("")
    
    backend_success = True
    frontend_success = True
    
    # 运行后端测试
    if not args.frontend_only:
        backend_success = run_backend_tests(args)
        if args.fail_fast and not backend_success:
            print_error("后端测试失败，停止运行")
            sys.exit(1)
    
    # 运行前端测试
    if not args.backend_only:
        frontend_success = run_frontend_tests(args)
        if args.fail_fast and not frontend_success:
            print_error("前端测试失败，停止运行")
            sys.exit(1)
    
    # 运行代码检查
    if not args.no_lint and not args.coverage:
        run_lint_checks(args)
    
    # 生成报告
    overall_success = generate_report(args, backend_success, frontend_success)
    
    # 退出
    sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    main()

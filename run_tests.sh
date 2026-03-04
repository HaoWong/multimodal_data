#!/bin/bash

# 测试运行脚本 - Linux/Mac版本

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印帮助信息
show_help() {
    echo ""
    echo "=========================================="
    echo "           测试运行脚本"
    echo "=========================================="
    echo ""
    echo "用法: ./run_tests.sh [选项]"
    echo ""
    echo "选项:"
    echo "  all                运行所有测试"
    echo "  backend            只运行后端测试"
    echo "  frontend           只运行前端测试"
    echo "  unit               只运行单元测试"
    echo "  e2e                只运行E2E测试"
    echo "  security           只运行安全测试"
    echo "  performance        只运行性能测试"
    echo "  coverage           生成覆盖率报告"
    echo "  verbose            详细输出"
    echo "  help               显示帮助"
    echo ""
    echo "示例:"
    echo "  ./run_tests.sh all"
    echo "  ./run_tests.sh backend"
    echo "  ./run_tests.sh unit"
    echo "  ./run_tests.sh coverage"
    echo ""
}

# 检查参数
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

OPTION=$1

case $OPTION in
    all)
        echo -e "${BLUE}运行所有测试...${NC}"
        python3 run_tests.py
        ;;
    backend)
        echo -e "${BLUE}运行后端测试...${NC}"
        python3 run_tests.py --backend-only
        ;;
    frontend)
        echo -e "${BLUE}运行前端测试...${NC}"
        python3 run_tests.py --frontend-only
        ;;
    unit)
        echo -e "${BLUE}运行单元测试...${NC}"
        python3 run_tests.py --unit-only
        ;;
    e2e)
        echo -e "${BLUE}运行E2E测试...${NC}"
        python3 run_tests.py --e2e-only
        ;;
    security)
        echo -e "${BLUE}运行安全测试...${NC}"
        python3 run_tests.py --security-only
        ;;
    performance)
        echo -e "${BLUE}运行性能测试...${NC}"
        python3 run_tests.py --performance-only
        ;;
    coverage)
        echo -e "${BLUE}生成覆盖率报告...${NC}"
        python3 run_tests.py --coverage
        ;;
    verbose)
        echo -e "${BLUE}详细模式运行测试...${NC}"
        python3 run_tests.py --verbose
        ;;
    help|--help|-h)
        show_help
        exit 0
        ;;
    *)
        echo -e "${RED}错误: 未知选项 '$OPTION'${NC}"
        show_help
        exit 1
        ;;
esac

# 检查结果
echo ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 测试通过!${NC}"
else
    echo -e "${RED}✗ 测试失败!${NC}"
fi
echo ""

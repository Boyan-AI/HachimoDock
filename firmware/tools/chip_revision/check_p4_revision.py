"""只读查询 ESP32-P4 芯片修订版，并提示匹配的完整烧录包。"""

import argparse
import sys


def read_chip_revision(port: str) -> tuple[str, int]:
    """通过指定串口读取芯片型号与修订版，不执行擦除或写入。"""
    try:
        import esptool
    except ImportError as error:
        raise RuntimeError("缺少 esptool；请先安装 esptool==5.4.0") from error

    if esptool.__version__ != "5.4.0":
        raise RuntimeError(
            f"当前 esptool 版本为 {esptool.__version__}；请安装 esptool==5.4.0"
        )

    with esptool.detect_chip(port, baud=115200) as chip:
        if chip.CHIP_NAME != "ESP32-P4":
            raise RuntimeError(f"检测到 {chip.CHIP_NAME}，不是 ESP32-P4")
        return chip.CHIP_NAME, chip.get_chip_revision()


def factory_package_for_revision(revision: int) -> str:
    """按仓库发布包支持范围将芯片修订版归入 v1 或 v3。"""
    if 1 <= revision <= 199:
        return "v1"
    if 300 <= revision <= 399:
        return "v3"
    raise RuntimeError(
        f"芯片修订版 v{revision // 100}.{revision % 100} 不在当前 v1/v3 发布包支持范围内"
    )


def main(argv: list[str] | None = None) -> int:
    """解析串口参数，打印芯片修订版和应选择的发布包。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--port",
        required=True,
        help="设备串口，例如 macOS 的 /dev/cu.usbserial-0001 或 Windows 的 COM3",
    )
    args = parser.parse_args(argv)

    try:
        chip_name, revision = read_chip_revision(args.port)
        package = factory_package_for_revision(revision)
    except Exception as error:
        print(f"查询失败：{error}", file=sys.stderr)
        return 1

    print(f"芯片：{chip_name}")
    print(f"修订版：v{revision // 100}.{revision % 100}")
    print(f"对应完整烧录包：{package}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

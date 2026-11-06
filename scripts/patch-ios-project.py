#!/usr/bin/env python3
"""修补 Tauri 生成的 Xcode 工程：把 Swift 兼容库所在目录加入 LIBRARY_SEARCH_PATHS。

Xcode 26 / iOS 26 SDK 下，libapp.a 内的 Swift 对象会强引用
libswiftCompatibility56 / libswiftCompatibilityConcurrency，这些静态库只在
toolchain 的 usr/lib/swift/iphoneos 下；生成工程默认不搜索该目录，于是链接期出现
__swift_FORCE_LOAD_$_swiftCompatibility* 未定义符号。

工程是 CI 上由 `tauri ios init` 现场生成的，不能入库修改，只能在构建前注入。
"""
import re
import sys

PBXPROJ = 'src-tauri/gen/apple/bilscore.xcodeproj/project.pbxproj'
PATHS = (
    '$(TOOLCHAIN_DIR)/usr/lib/swift/iphoneos',
    '$(TOOLCHAIN_DIR)/usr/lib/swift-5.0/iphoneos',
    '$(SDKROOT)/usr/lib/swift',
)


def add_missing(match):
    body = match.group(0)
    missing = [p for p in PATHS if p not in body]
    if not missing:
        return body
    lines = ''.join('\t\t\t\t\t"%s",\n' % p for p in missing)

    found = re.search(r'(LIBRARY_SEARCH_PATHS\s*=\s*\()(.*?)(\);)', body, re.S)
    if found:
        inner = found.group(2).rstrip()
        if inner and not inner.endswith(','):
            inner += ','
        merged = found.group(1) + inner + '\n' + lines + '\t\t\t\t' + found.group(3)
        return body[:found.start()] + merged + body[found.end():]

    new_key = (
        '\t\t\t\tLIBRARY_SEARCH_PATHS = (\n'
        '\t\t\t\t\t"$(inherited)",\n' + lines + '\t\t\t\t);\n'
    )
    if 'buildSettings = {\n' not in body:
        return body
    return body.replace('buildSettings = {\n', 'buildSettings = {\n' + new_key, 1)


def main():
    with open(PBXPROJ, encoding='utf-8') as f:
        text = f.read()
    updated, count = re.subn(r'buildSettings = \{[^}]*\};', add_missing, text)
    if count == 0:
        sys.exit('未找到 buildSettings 块，Tauri 工程格式可能已变化')
    if PATHS[0] not in updated:
        sys.exit('未能注入 Swift 库搜索路径')
    with open(PBXPROJ, 'w', encoding='utf-8') as f:
        f.write(updated)
    print('buildSettings 块: %d，已注入 toolchain Swift 路径: %d'
          % (count, updated.count(PATHS[0])))


if __name__ == '__main__':
    main()

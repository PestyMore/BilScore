#!/usr/bin/env python3
"""构建前修补 Tauri 生成的 Xcode 工程。

把 Swift 兼容库目录加入 LIBRARY_SEARCH_PATHS。目录由 CI 探测后通过
SWIFT_COMPAT_DIR 传入（绝对路径）；不能再写 $(TOOLCHAIN_DIR)/...，因为
Xcode 26 会把它展开成 runner 上未挂载的 cryptex 路径，等于没加。
原有 $(inherited) 与 $(SDKROOT)/usr/lib/swift 都会保留。
"""
import os
import re
import sys

PBXPROJ = 'src-tauri/gen/apple/bilscore.xcodeproj/project.pbxproj'


def build_paths():
    paths = []
    extra = os.environ.get('SWIFT_COMPAT_DIR', '').strip()
    if extra:
        paths.append(extra)
    paths.append('$(SDKROOT)/usr/lib/swift')
    return tuple(paths)


def main():
    paths = build_paths()
    marker = paths[0]

    def add_missing(match):
        body = match.group(0)
        missing = [p for p in paths if p not in body]
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

    with open(PBXPROJ, encoding='utf-8') as f:
        text = f.read()
    updated, count = re.subn(r'buildSettings = \{[^}]*\};', add_missing, text)
    if count == 0:
        sys.exit('未找到 buildSettings 块，Tauri 工程格式可能已变化')
    if marker not in updated:
        sys.exit('未能注入 %s' % marker)
    with open(PBXPROJ, 'w', encoding='utf-8') as f:
        f.write(updated)
    print('buildSettings 块: %d，已注入: %s' % (count, marker))

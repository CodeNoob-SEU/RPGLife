#!/usr/bin/env bash
#
# build-android.sh — 可复用的 Android 打包脚本（EAS 云端构建）
#
# 把当前 Expo 项目通过 EAS Build 在云端打成 Android 安装包：
#   - preview      → 通用 APK（arm64 + armeabi，主流手机可直接安装）  [默认]
#   - development  → 带开发客户端的 APK（调试用）
#   - production   → AAB（上架 Google Play 用）
# 档案定义见仓库根目录的 eas.json。
#
# 用法:
#   ./scripts/build-android.sh [profile] [-- 额外的 eas build 参数...]
#   npm run build:android            # = preview
#   npm run build:android:prod       # = production
#
# 鉴权:
#   - 设置环境变量 EXPO_TOKEN 即免交互（CI / 自动化），例如：
#       EXPO_TOKEN=xxxx ./scripts/build-android.sh
#     Token 在 https://expo.dev → Account settings → Access tokens 生成。
#   - 未设置 EXPO_TOKEN 时，脚本会引导你执行交互式 `eas login`。
#
# 例:
#   ./scripts/build-android.sh                          # 云端打 preview APK
#   ./scripts/build-android.sh production               # 云端打 AAB
#   ./scripts/build-android.sh preview -- --no-wait     # 提交后不等待
#
set -euo pipefail

# ---------- 日志 ----------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; BLUE=$'\033[34m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BOLD=''; BLUE=''; GREEN=''; YELLOW=''; RED=''; RESET=''
fi
step() { printf '%b\n' "${BLUE}${BOLD}▶ $*${RESET}"; }
info() { printf '%b\n' "  $*"; }
ok()   { printf '%b\n' "${GREEN}✓ $*${RESET}"; }
warn() { printf '%b\n' "${YELLOW}! $*${RESET}"; }
die()  { printf '%b\n' "${RED}✗ $*${RESET}" >&2; exit 1; }

usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

# ---------- 切到仓库根目录（脚本可从任意 CWD 调用）----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ---------- 解析参数 ----------
case "${1:-}" in
  -h|--help) usage ;;
esac
PROFILE="preview"
if [ "${1:-}" ] && [ "${1#-}" = "${1}" ]; then
  PROFILE="$1"; shift
fi
# 兼容显式的 `--` 分隔符
if [ "${1:-}" = "--" ]; then shift; fi
PASSTHROUGH=("$@")

# ---------- 选定 eas 命令（优先全局 eas，否则用 npx）----------
if command -v eas >/dev/null 2>&1; then
  EAS=(eas)
else
  EAS=(npx --yes eas-cli@latest)
fi

command -v node >/dev/null 2>&1 || die "未找到 Node.js，请先安装 Node。"

# ---------- 预检：依赖 ----------
if [ ! -d node_modules ]; then
  step "安装依赖（npm install）…"
  npm install
fi

# ---------- 校验档案存在于 eas.json ----------
[ -f eas.json ] || die "缺少 eas.json，无法确定构建档案。"
node -e 'const p=process.argv[1];const j=require("./eas.json");if(!(j.build&&j.build[p])){console.error("eas.json 中没有名为 \""+p+"\" 的 build 档案");process.exit(1)}' "$PROFILE" \
  || die "请检查 eas.json 的 build 档案名（可用：$(node -e 'console.log(Object.keys(require("./eas.json").build||{}).join(", "))'))"

# ---------- 鉴权 ----------
step "检查 Expo 鉴权…"
[ -n "${EXPO_TOKEN:-}" ] && info "检测到 EXPO_TOKEN，使用免交互鉴权。"
if ! "${EAS[@]}" whoami >/dev/null 2>&1; then
  if [ -n "${EXPO_TOKEN:-}" ]; then
    die "EXPO_TOKEN 无效或已过期，鉴权失败。"
  fi
  warn "尚未登录 Expo，启动交互式登录（eas login）…"
  "${EAS[@]}" login
fi
ok "已登录：$("${EAS[@]}" whoami 2>/dev/null || echo '未知账号')"

# ---------- 链接 EAS 项目（首次需要）----------
step "检查 EAS 项目链接…"
PROJECT_ID="$(node -e 'try{const c=require("./app.json");process.stdout.write(((c.expo||{}).extra||{}).eas?.projectId||"")}catch(e){}' 2>/dev/null || true)"
if [ -z "$PROJECT_ID" ]; then
  warn "app.json 尚未链接 EAS 项目，执行 eas init…"
  if [ -n "${EXPO_TOKEN:-}" ]; then
    "${EAS[@]}" init --non-interactive --force
  else
    "${EAS[@]}" init
  fi
else
  ok "已链接项目：$PROJECT_ID"
fi

# ---------- 构建 ----------
step "开始 EAS 云端构建：platform=android, profile=${PROFILE}"
BUILD=(build --platform android --profile "$PROFILE")
# 免交互模式下让 EAS 自动生成 / 复用签名 keystore，不弹交互
[ -n "${EXPO_TOKEN:-}" ] && BUILD+=(--non-interactive)
# 注意：在 macOS 自带的 bash 3.2 下，空数组配合 `set -u` 展开会报 unbound variable，
# 故用 ${arr[@]+"${arr[@]}"} 这种「数组为空则整体消失」的安全写法。
"${EAS[@]}" "${BUILD[@]}" ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}

ok "构建任务已完成（或已提交）。"
info "在 https://expo.dev/accounts 的项目 Builds 页可下载产物，或运行：${BOLD}${EAS[*]} build:list${RESET}"

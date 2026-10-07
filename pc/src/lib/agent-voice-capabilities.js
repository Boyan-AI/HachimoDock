export function deviceVoicePlatformWarning(agentId, platform) {
  return agentId === "mimocode" && platform !== "macos"
    ? "MiMoCode 的按键语音输入目前仅支持 macOS 终端；当前系统可使用状态跟随与设备实时对话。"
    : "";
}

/** 识别桌面平台，用于选择系统焦点输入或现有 Agent 输入路径。 */
export function detectDesktopPlatform(navigatorLike) {
  const target = navigatorLike
    || (typeof navigator === "undefined" ? null : navigator);
  const descriptor = [
    target?.userAgentData?.platform,
    target?.platform,
    target?.userAgent,
  ].filter(Boolean).join(" ").toLowerCase();
  if (descriptor.includes("win")) return "windows";
  if (descriptor.includes("mac")) return "macos";
  return "other";
}


/** macOS 语音输入仅需要识别服务，Agent 是否安装、启动或有会话均不影响监听。 */
export function deviceVoiceBlockingReason(state, platform) {
  const focusedInput = platform === "macos";
  if (!focusedInput && !state.selectedAgentId) return "请先在「当前展示」里选择一个渠道";
  const warning = deviceVoicePlatformWarning(state.selectedAgentId, platform);
  if (warning) return warning;
  if (state.voiceRuntime == null) return "正在检查语音通道...";
  if (state.voiceRuntime?.running !== true) return state.voiceRuntime?.message || "语音识别服务暂未就绪";
  if (focusedInput) return null;
  if (state.busStatus == null) return "正在检查语音通道...";
  const agents = Array.isArray(state.busStatus?.agents) ? state.busStatus.agents : [];
  const agent = agents.find(item => item.agentId === state.selectedAgentId);
  return agent?.ready === true ? null : agent?.reason || "语音 agent 未就绪";
}

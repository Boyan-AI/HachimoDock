import { detectDesktopPlatform } from "./agent-voice-capabilities.js";

/** User-facing instructions derived from the same normalized bindings as the device editor. */
export function friendlyControlLabel(label = "") {
  return label.replace(/SW([123])\s*(短按|长按)/g, "$2 $1 键").replace(/SW([123])/g, "$1 键")
    .replace("摇杆中按短按", "按下摇杆").replace("摇杆中按长按", "长按摇杆中键");
}

/** 根据平台和按键映射生成说明，macOS 只粘贴到系统焦点并由用户手动发送。 */
export function buildUsageHelp(rows = [], actions = {}, enabled = true, pending = false, platform = detectDesktopPlatform()) {
  const focusedInput = platform === "macos";
  const actionFor = row => actions[row.id] ?? row.defaultAction;
  const labels = (action) => rows.filter(row => actionFor(row) === action)
    .map(row => friendlyControlLabel(row.label));
  const binding = action => labels(action).join("或");
  const selectionAction = action => action === "session_previous" || action === "session_next";
  const gridDirections = [
    ["joystick.up", "上"], ["joystick.down", "下"],
    ["knob.rotate_ccw", "左"], ["knob.rotate_cw", "右"],
  ].filter(([event]) => rows.some(row => row.event === event && selectionAction(actionFor(row))))
    .map(([, direction]) => direction);
  const sequentialSelection = ["session_previous", "session_next"].map((action, index) =>
    rows.filter(row => !["joystick.up", "joystick.down", "knob.rotate_ccw", "knob.rotate_cw"].includes(row.event)
      && actionFor(row) === action)
      .map(row => `${friendlyControlLabel(row.label)}选择${index === 0 ? "上一个" : "下一个"}`)
      .join("或")
  ).filter(Boolean).join("；");
  const gridSelection = gridDirections.length
    ? `在组件中心，摇杆向${gridDirections.join("／")}按屏幕网格移动选中项（上下同列、左右同行）`
    : "";
  const componentSelection = [gridSelection, sequentialSelection].filter(Boolean).join("；");
  const confirm = binding("page_enter");
  const voice = labels("voice_ptt").map(label => label.replace(/^长按\s*/, "按住 ")).join("或");
  const chat = binding("realtime_chat");
  const unbound = rows.length ? "尚未设置快捷键，请到「按钮配置」中选择并同步到设备。"
    : "连接设备后，可在「按钮配置」查看和设置快捷键。";
  return {
    pending,
    focusedInput,
    voice: !enabled ? "语音输入尚未启用，请在首页「语音输入」中开启。" : voice
      ? `${voice}说话，松开后将文字${focusedInput ? "粘贴到当前光标位置" : "追加到 Agent 输入框"}；可以分多次说。` : unbound,
    confirm: focusedInput ? "文字不会自动发送，请在目标应用中手动发送。" : confirm ? `${confirm}确认发送。` : rows.length
      ? "尚未绑定确认键；可在 Agent 输入框中手动发送，或到「按钮配置」绑定确认键。"
      : "可在 Agent 输入框中手动发送，或连接设备后查看确认键设置。",
    chat: chat ? `在宠物界面，${chat}开始聊天；再次执行相同操作结束。` : unbound,
    chatBound: Boolean(chat),
    sessions: labels("session_previous").length || labels("session_next").length
      ? `在宠物界面，使用「上一个／下一个」切换会话气泡。${[binding("session_previous"), binding("session_next")].filter(Boolean).join("；")}。`
      : unbound,
    component: binding("component_center") ? `${binding("component_center")}，在宠物界面与组件列表之间切换。组件运行时请先返回。` : unbound,
    select: componentSelection ? `${componentSelection}。` : unbound,
    enter: confirm ? `${confirm}打开选中的组件。` : unbound,
    back: binding("page_back") ? `${binding("page_back")}退出组件，返回组件列表。` : unbound,
  };
}

export function realtimeReadiness({ deviceOnline, appearance, personaReady, settings, loading, failed }) {
  if (!deviceOnline) return { message: "连接设备后即可开始聊天。" };
  if (!appearance) return { message: "请先在形象画廊为设备选择一个形象。", action: "appearance" };
  if (!personaReady) return { message: "请先为当前形象设置人设与声音。", action: "persona" };
  if (loading) return { message: "正在检查语音服务和对话大模型配置…" };
  if (failed) return { message: "暂时无法读取配置，请重试检查。", action: "retry" };
  if (!settings?.ttsConfigured || !settings?.asrConfigured || !settings?.llmConfigured) {
    const missing = [];
    if (!settings?.ttsConfigured || !settings?.asrConfigured) missing.push("语音服务");
    if (!settings?.llmConfigured) missing.push("对话大模型");
    return { message: `请先配置${missing.join("和")}。`, action: "api" };
  }
  return null;
}

import test from "node:test";
import assert from "node:assert/strict";
import { buildUsageHelp, friendlyControlLabel, realtimeReadiness } from "./usage-help.js";

const rows = [
  { id: "one", label: "SW1 长按", defaultAction: "voice_ptt" },
  { id: "two", label: "SW2 长按", defaultAction: "realtime_chat" },
  { id: "confirm", label: "SW1 短按", defaultAction: "page_enter" },
  { id: "back", label: "SW3 短按", defaultAction: "page_back" },
  { id: "pages", label: "SW2 短按", defaultAction: "component_center" },
];
test("instructions follow current keys, including unbound actions and multiple bindings", () => {
  const defaults = buildUsageHelp(rows, {}, true, false, "windows");
  assert.match(defaults.voice, /按住 1 键说话/);
  assert.match(defaults.confirm, /短按 1 键确认发送/);
  assert.match(defaults.chat, /长按 2 键开始聊天/);
  assert.match(defaults.back, /短按 3 键/);
  const swapped = buildUsageHelp(rows, { one: "realtime_chat", two: "voice_ptt", confirm: "page_back", back: "page_enter" }, true, true, "windows");
  assert.match(swapped.voice, /按住 2 键/);
  assert.match(swapped.confirm, /短按 3 键/);
  assert.match(swapped.chat, /长按 1 键/);
  assert.equal(swapped.pending, true);
  assert.match(buildUsageHelp(rows, { two: "disabled" }).chat, /尚未设置快捷键/);
  assert.match(buildUsageHelp(rows, {}, false).voice, /尚未启用/);
  assert.match(buildUsageHelp(rows, { confirm: "disabled" }).confirm, /手动发送/);
  assert.match(buildUsageHelp(rows, { one: "realtime_chat" }).chat, /长按 1 键或长按 2 键/);
  assert.match(buildUsageHelp().voice, /连接设备后/);
  assert.equal(friendlyControlLabel("摇杆中按短按"), "按下摇杆");
});

test("chat prerequisites give an actionable next step without claiming a cloud test passed", () => {
  const ready = { deviceOnline: true, appearance: {}, personaReady: true, settings: { ttsConfigured: true, asrConfigured: true, llmConfigured: true } };
  assert.equal(realtimeReadiness(ready), null);
  assert.match(realtimeReadiness({ ...ready, deviceOnline: false }).message, /连接设备/);
  assert.equal(realtimeReadiness({ ...ready, appearance: null }).action, "appearance");
  assert.equal(realtimeReadiness({ ...ready, personaReady: false }).action, "persona");
  assert.equal(realtimeReadiness({ ...ready, settings: {} }).action, "api");
  assert.match(realtimeReadiness({ ...ready, settings: { ttsConfigured: true, asrConfigured: true } }).message, /对话大模型/);
  assert.match(realtimeReadiness({ ...ready, loading: true }).message, /正在检查/);
  assert.equal(realtimeReadiness({ ...ready, failed: true }).action, "retry");
});

test("macOS dictation describes current focus and never suggests device confirmation", () => {
  const help = buildUsageHelp(rows, {}, true, false, "macos");
  assert.equal(help.focusedInput, true);
  assert.match(help.voice, /按住 1 键说话.*粘贴到当前光标位置/);
  assert.match(help.confirm, /目标应用中手动发送/);
  assert.doesNotMatch(help.confirm, /短按.*确认发送/);
  assert.equal(buildUsageHelp(rows, {}, true, false, "windows").focusedInput, false);
});

// 检查组件说明仅把已映射的实体摇杆方向标为网格导航，其他按键仍按顺序选择。
test("component help describes configured joystick grid directions and keeps other buttons sequential", () => {
  const gridRows = [
    ...rows,
    { id: "up", label: "摇杆向上", event: "joystick.up", defaultAction: "session_previous" },
    { id: "down", label: "摇杆向下", event: "joystick.down", defaultAction: "session_next" },
    { id: "left", label: "摇杆向左", event: "knob.rotate_ccw", defaultAction: "session_previous" },
    { id: "right", label: "摇杆向右", event: "knob.rotate_cw", defaultAction: "session_next" },
    { id: "extra", label: "SW3 长按", event: "button.sw3.long_press", defaultAction: "session_next" },
  ];
  const help = buildUsageHelp(gridRows, {}, true, false, "macos");
  assert.match(help.select, /摇杆向上／下／左／右按屏幕网格移动选中项（上下同列、左右同行）/);
  assert.match(help.select, /长按 3 键选择下一个/);
  assert.doesNotMatch(help.select, /摇杆向上选择上一个/);
  const remapped = buildUsageHelp(gridRows, { up: "disabled" }, true, false, "macos");
  assert.doesNotMatch(remapped.select, /向上／下/);
  assert.match(remapped.select, /摇杆向下／左／右/);
});

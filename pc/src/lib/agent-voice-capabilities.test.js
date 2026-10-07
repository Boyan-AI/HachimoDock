import test from "node:test";
import assert from "node:assert/strict";
import { deviceVoicePlatformWarning, deviceVoiceBlockingReason, detectDesktopPlatform } from "./agent-voice-capabilities.js";

test("MiMoCode platform limitations are surfaced before starting voice recognition", () => {
  assert.match(deviceVoicePlatformWarning("mimocode", "windows"), /目前仅支持 macOS/);
  assert.match(deviceVoicePlatformWarning("mimocode", "other"), /目前仅支持 macOS/);
  assert.equal(deviceVoicePlatformWarning("mimocode", "macos"), "");
  for (const id of ["codex", "claude-code", "openclaw", "workbuddy"]) {
    assert.equal(deviceVoicePlatformWarning(id, "windows"), "");
    assert.equal(deviceVoicePlatformWarning(id, "macos"), "");
  }
});

test("macOS listening is independent of Agent availability but requires ASR", () => {
  const state = { selectedAgentId: "codex", voiceRuntime: { running: true }, busStatus: { agents: [{ agentId: "codex", ready: false, reason: "Agent 未启动" }] } };
  assert.equal(deviceVoiceBlockingReason(state, "macos"), null);
  assert.equal(deviceVoiceBlockingReason({ voiceRuntime: { running: true } }, "macos"), null);
  assert.equal(deviceVoiceBlockingReason(state, "windows"), "Agent 未启动");
  assert.match(deviceVoiceBlockingReason({ ...state, voiceRuntime: null }, "macos"), /正在检查/);
  assert.equal(deviceVoiceBlockingReason({ ...state, voiceRuntime: { running: false, message: "请配置识别" } }, "macos"), "请配置识别");
});

test("platform detection handles user agent data and legacy navigator", () => {
  assert.equal(detectDesktopPlatform({ userAgentData: { platform: "macOS" } }), "macos");
  assert.equal(detectDesktopPlatform({ platform: "MacIntel" }), "macos");
  assert.equal(detectDesktopPlatform({ userAgentData: { platform: "Windows" } }), "windows");
  assert.equal(detectDesktopPlatform({ platform: "Linux x86_64" }), "other");
});

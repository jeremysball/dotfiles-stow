/**
 * Alibaba Cloud Model Studio "Token Plan" subscription provider (SG
 * endpoint, verified live with $ALIBABA_TKN_PLAN_API_KEY → 200 OK on
 * https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1/messages).
 *
 * Pi's Anthropic SDK appends `/v1/messages` to whatever baseUrl is
 * configured (the built-in `anthropic` provider uses bare
 * `https://api.anthropic.com` with no `/v1`); baseUrl here stops at
 * `/apps/anthropic`. Appending `/v1` would 404 every request — same gotcha
 * already documented for the Xiaomi token-plan extension at
 * ~/.pi/agent/extensions/xiaomi-tknplan.js.
 *
 * Only the preview model carries an explicit thinkingLevelMap; the rest
 * rely on the provider default per user instruction (no per-model
 * budgetTokens override).
 *
 * Parity with opencode: this list mirrors
 * ~/.dotfiles/.config/opencode/opencode.jsonc provider.alibaba-tknplan
 * (minus deepseek-v4-pro-0813 which is banned account-wide per
 * choosing-a-model standing order 2026-08-21). Keep the two in sync;
 * verify-provider-parity.sh enforces it via harness porcelain.
 */
export default function (pi) {
  pi.registerProvider("alibaba-tknplan", {
    name: "Alibaba Cloud Model Studio (Token Plan, SG)",
    baseUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic",
    apiKey: process.env.ALIBABA_TOKEN_PLAN_API_KEY || process.env.ALIBABA_TKN_PLAN_API_KEY || "$ALIBABA_TOKEN_PLAN_API_KEY",
    api: "anthropic-messages",
    models: [
      {
        id: "qwen3.8-max-preview",
        name: "Qwen3.8 Max Preview",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 983616,
        maxTokens: 131072,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          low: null,
          medium: null,
          high: "high",
        },
      },
      {
        id: "qwen3.7-max",
        name: "Qwen3.7 Max",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "qwen3.7-plus",
        name: "Qwen3.7 Plus",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "qwen3.6-plus",
        name: "Qwen3.6 Plus",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "qwen3.6-flash",
        name: "Qwen3.6 Flash",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "deepseek-v4-flash-0731",
        name: "DeepSeek V4 Flash 0731",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "deepseek-v3.2",
        name: "DeepSeek V3.2",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "kimi-k2.7-code",
        name: "Kimi K2.7 Code",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "kimi-k2.6",
        name: "Kimi K2.6",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "kimi-k2.5",
        name: "Kimi K2.5",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "glm-5.2",
        name: "GLM 5.2",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "glm-5.1",
        name: "GLM 5.1",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "glm-5",
        name: "GLM 5",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
      {
        id: "MiniMax-M2.5",
        name: "MiniMax M2.5",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 131072,
      },
    ],
  });
}

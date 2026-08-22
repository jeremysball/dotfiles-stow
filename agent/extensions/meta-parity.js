/**
 * Meta parity — ensures muse-spark-1.2-contributor is listed.
 * Pi's built-in meta catalog hides contributor model despite
 * settings.json modelOverrides; this extension registers it
 * explicitly so pi --list-models matches opencode's 3-model fleet.
 * Keep in sync with opencode.jsonc provider.meta and verify-provider-parity.sh
 */
export default function (pi) {
  // Register meta with full fleet — pi's built-in catalog plus
  // contributor. Using registerProvider here REPLACES the built-in
  // provider definition, so include all 3 models explicitly.
  try {
    pi.registerProvider("meta", {
      name: "Meta",
      baseUrl: "https://api.meta.ai/v1",
      apiKey: "$META_MODEL_API_KEY",
      api: "openai",
      models: [
        {
          id: "muse-spark-1.1",
          name: "Muse Spark 1.1",
          reasoning: true,
          input: ["text", "image", "pdf", "video"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 131072,
        },
        {
          id: "muse-spark-1.2",
          name: "Muse Spark 1.2",
          reasoning: true,
          input: ["text", "image", "pdf", "video"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 131072,
        },
        {
          id: "muse-spark-1.2-contributor",
          name: "Muse Spark 1.2 Contributor",
          reasoning: true,
          input: ["text", "image", "pdf", "video"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 200000,
          maxTokens: 131072,
        },
      ],
    });
  } catch (e) {
    // fallback
  }
}

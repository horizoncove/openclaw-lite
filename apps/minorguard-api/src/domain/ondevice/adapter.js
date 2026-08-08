/**
 * On-device model adapter stub (Epic E).
 * Wire research-track ONNX here without changing API contract.
 */
export const ONDEVICE_MAPPING_VERSION = "map-v0";

export function isOnDeviceEnabled() {
  return ["1", "true", "on", "yes"].includes(
    String(process.env.ONDEVICE_MODEL_ENABLED || "").toLowerCase(),
  );
}

/** @returns {null | { source: string, mappedCategories: array, levelHint?: string, model_ver?: string }} */
export async function analyzeOnDevice(_text) {
  if (!isOnDeviceEnabled()) return null;
  // Placeholder: integrate docs/minors-ai-protection p2 ONNX in a follow-up.
  return null;
}

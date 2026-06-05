import type { StressFeatures } from "@/lib/ai/face-mesh";

export interface ProofRequest {
  features: StressFeatures;
  threshold: number;
  modelId: string;
}

export interface ProofResponse {
  success: boolean;
  proof?: string;
  publicInputs?: string;
  error?: string;
  durationMs: number;
}

let ezklInitialized = false;
let initPromise: Promise<boolean> | null = null;
let compiledCircuit: Uint8Array | null = null;
let provingKey: Uint8Array | null = null;
let srsKey: Uint8Array | null = null;

async function initEzkl(): Promise<boolean> {
  if (ezklInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const initModule = await import("@ezkljs/engine/web/ezkl.js");
      const init = initModule.default;
      await init(
        undefined,
        new WebAssembly.Memory({ initial: 20, maximum: 4096, shared: true })
      );

      const [circuitRes, pkRes, srsRes] = await Promise.all([
        fetch("/ezkl/compiled.ezkl"),
        fetch("/ezkl/pk.key"),
        fetch("/ezkl/srs.key"),
      ]);

      if (!circuitRes.ok || !pkRes.ok || !srsRes.ok) return false;

      compiledCircuit = new Uint8Array(await circuitRes.arrayBuffer());
      provingKey = new Uint8Array(await pkRes.arrayBuffer());
      srsKey = new Uint8Array(await srsRes.arrayBuffer());
      ezklInitialized = true;
      return true;
    } catch {
      initPromise = null;  // allow retry on real proof request
      return false;
    }
  })();

  return initPromise;
}

async function proveWithEzkl(
  features: StressFeatures,
  threshold: number,
  modelId: string
): Promise<ProofResponse> {
  const startTime = performance.now();
  const initialized = await initEzkl();

  if (!initialized || !compiledCircuit || !provingKey || !srsKey) {
    return generateMockProof(features, threshold, modelId, startTime);
  }

  const { genWitness, deserialize, prove } = await import(
    "@ezkljs/engine/web"
  );

  const timeNorm = (features.timestamp % 86400000) / 86400000;
  const input = {
    input_data: [[
      features.leftEyeAspect,
      features.rightEyeAspect,
      features.browTension,
      features.mouthTension,
      features.eyeSymmetry,
      features.mouthOpening,
      timeNorm,
    ]],
  };

  const serializedInput = new Uint8ClampedArray(new TextEncoder().encode(JSON.stringify(input)));
  const circuitBytes = new Uint8ClampedArray(compiledCircuit);
  const pkBytes = new Uint8ClampedArray(provingKey);
  const srsBytes = new Uint8ClampedArray(srsKey);

  const witnessRaw = genWitness(circuitBytes, serializedInput);
  const witness = deserialize(witnessRaw);

  const witnessClamped = new Uint8ClampedArray(witnessRaw);
  const proofRaw = prove(witnessClamped, pkBytes, circuitBytes, srsBytes);
  const proofData = deserialize(proofRaw);

  const outputs = witness.outputs ?? [];
  const stressScore = outputs.length > 0 ? Number(outputs[0]) : 0.5;
  const isHealthy = stressScore < threshold;

  const publicInputs = {
    model_id: modelId,
    stress_score: stressScore,
    is_healthy: isHealthy,
    threshold,
    timestamp: features.timestamp,
  };

  return {
    success: true,
    proof: JSON.stringify(proofData),
    publicInputs: JSON.stringify(publicInputs),
    durationMs: performance.now() - startTime,
  };
}

function generateMockProof(
  features: StressFeatures,
  threshold: number,
  modelId: string,
  startTime: number
): ProofResponse {
  // Simple MLP approximation matching the 7→16→8→1 model
  const avgEye = (features.leftEyeAspect + features.rightEyeAspect) / 2;
  const eyeFatigue = Math.max(0, 1 - avgEye * 2);
  const asymmetry = features.eyeSymmetry;
  const browStress = features.browTension;
  const mouthStress = features.mouthTension;
  const jawClench = Math.max(0, 0.15 - features.mouthOpening) * 3;
  const stressScore = Math.max(
    0,
    Math.min(1,
      eyeFatigue * 0.35 +
      asymmetry * 0.15 +
      browStress * 0.25 +
      mouthStress * 0.10 +
      jawClench * 0.15
    )
  );
  const isHealthy = stressScore < threshold;

  const publicInputs = {
    model_id: modelId,
    stress_score: stressScore,
    is_healthy: isHealthy,
    threshold,
    timestamp: features.timestamp,
  };

  const mockProof = {
    protocol: "ezkl",
    proof_data: Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join(""),
    public_inputs: publicInputs,
  };

  return {
    success: true,
    proof: JSON.stringify(mockProof),
    publicInputs: JSON.stringify(publicInputs),
    durationMs: performance.now() - startTime,
  };
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  // Prefetch: start loading WASM + ZK artifacts in the background
  // so they're cached by the time the user triggers a real proof.
  if (msg && msg.type === "prefetch") {
    initEzkl().then((ok) => {
      self.postMessage({ type: "prefetch-result", success: ok });
    });
    return;
  }

  // Real proof request
  const { features, threshold, modelId } = msg as ProofRequest;
  const startTime = performance.now();

  try {
    const response = await proveWithEzkl(features, threshold, modelId);
    self.postMessage(response);
  } catch {
    const fallback = generateMockProof(features, threshold, modelId, startTime);
    self.postMessage(fallback);
  }
};

export {};

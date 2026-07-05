import { loadModel, QWEN3_1_7B_INST_Q4 } from '@qvac/sdk';

console.log('Starting loadModel...');
console.log('Model src:', JSON.stringify(QWEN3_1_7B_INST_Q4).slice(0, 200));

try {
  const id = await loadModel({
    modelSrc: QWEN3_1_7B_INST_Q4,
    modelType: "llamacpp-completion",
    modelConfig: {
      "cache-type-k": "tbq4_0",
      "cache-type-v": "pq4_0",
    },
    onProgress: (p) => {
      console.log('progress:', p.status, p.percent + '%');
    },
  });
  console.log('Model loaded, id:', id);
} catch (e) {
  console.error('loadModel failed:', e.message);
  console.error('Stack:', e.stack?.slice(0, 500));
}

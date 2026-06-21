import { loadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

console.log('Starting loadModel...');
console.log('Model src:', JSON.stringify(LLAMA_3_2_1B_INST_Q4_0).slice(0, 200));

try {
  const id = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
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

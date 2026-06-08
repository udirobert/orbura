import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { skaleEuropaTestnet } from 'viem/chains';

export const SKALE_CHAIN_ID = skaleEuropaTestnet.id;

export const publicClient = createPublicClient({
  chain: skaleEuropaTestnet,
  transport: http(),
});

export function createWalletClientWithSigner(signer: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }) {
  return createWalletClient({
    chain: skaleEuropaTestnet,
    transport: custom(signer),
  });
}

// ── Halo2VerifierReusable (on-chain ZK proof verification) ─────────────
// Deployed to SKALE Europa testnet at the address below.
// VK registered via registerVka() in tx 0x8bc60e0e20e776a0baff530a4ff84f6bc861eeb0362adba126a0dfceda889d8e

export const HALO2_VERIFIER_ADDRESS = '0x01c8C37961eA7548600323A3c4F636c75b7B31d0' as const;

export const halo2VerifierAbi = [
  {
    inputs: [{ internalType: 'bytes32[]', name: 'vka', type: 'bytes32[]' }],
    name: 'registerVka',
    outputs: [{ internalType: 'bytes32', name: 'vka_digest', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes', name: 'proof', type: 'bytes' },
      { internalType: 'uint256[]', name: 'instances', type: 'uint256[]' },
      { internalType: 'bytes32[]', name: 'vka', type: 'bytes32[]' },
    ],
    name: 'verifyProof',
    outputs: [
      { internalType: 'bool', name: 'success', type: 'bool' },
      { internalType: 'bytes32', name: 'vka_digest', type: 'bytes32' },
      { internalType: 'int256[]', name: 'rescaled_instances', type: 'int256[]' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Fetch VKA chunks from the public directory for on-chain verification.
 * The chunks are served as a static JSON file from /ezkl/vk-chunks.json.
 */
export async function fetchVkChunks(): Promise<string[]> {
  const res = await fetch('/ezkl/vk-chunks.json');
  return res.json() as Promise<string[]>;
}

// ── HealthCredentialVerifier (atomic verify + log) ─────────────────────
// Calls Halo2VerifierReusable.verifyProof internally. Only emits
// HealthCredentialVerified after proof verification passes.

export const healthCredentialVerifierABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'modelId', type: 'string' },
      { indexed: false, internalType: 'bool', name: 'isHealthy', type: 'bool' },
      { indexed: false, internalType: 'bytes32', name: 'proofHash', type: 'bytes32' },
    ],
    name: 'HealthCredentialVerified',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'bytes', name: 'proof', type: 'bytes' },
      { internalType: 'uint256[]', name: 'instances', type: 'uint256[]' },
      { internalType: 'bytes32[]', name: 'vka', type: 'bytes32[]' },
    ],
    name: 'verifyAndLogCredential',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'verifiedProofs',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'halo2Verifier',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approvedVkDigest',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const VERIFIER_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_VERIFIER_ADDRESS ??
  '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

// ── Chain guard ────────────────────────────────────────────────────────

export function isCorrectChain(chainId?: number): boolean {
  return chainId === SKALE_CHAIN_ID;
}

export function isZeroAddress(addr: string): boolean {
  return addr === '0x0000000000000000000000000000000000000000';
}

use methods::{STRESS_GUEST_ELF, STRESS_GUEST_ID};
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Journal {
    model_id: u32,
    score_bits: u32,
    healthy: bool,
    feature_digest: [u8; 32],
}

fn main() {
    // Same input shape as public/ezkl/input.json
    let features: [f32; 7] = [0.25, 0.26, 0.08, 0.18, 0.02, 0.35, 0.42];

    let env = ExecutorEnv::builder()
        .write(&features)
        .unwrap()
        .build()
        .unwrap();

    let prover = default_prover();
    let prove_info = prover.prove(env, STRESS_GUEST_ELF).unwrap();
    let receipt = prove_info.receipt;

    let journal: Journal = receipt.journal.decode().unwrap();
    let score = f32::from_bits(journal.score_bits);
    println!("journal: {journal:?}");
    println!("stress score: {score:.4} (healthy = {})", journal.healthy);

    receipt.verify(STRESS_GUEST_ID).unwrap();
    println!("receipt verified");
}

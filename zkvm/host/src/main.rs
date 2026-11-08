use methods::{STRESS_GUEST_ELF, STRESS_GUEST_ID};
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{compute_image_id, default_prover, ExecutorEnv, ProverOpts, VerifierContext};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Journal {
    model_id: u32,
    score_bits: u32,
    healthy: bool,
    feature_digest: [u8; 32],
}

fn to_bytes<T: AsRef<[u8]>>(obj: T) -> Vec<u8> {
    obj.as_ref().to_vec()
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
    let prove_info = prover
        .prove_with_ctx(
            env,
            &VerifierContext::default(),
            STRESS_GUEST_ELF,
            &ProverOpts::groth16(),
        )
        .unwrap();
    let receipt = prove_info.receipt;

    let journal: Journal = receipt.journal.decode().unwrap();
    let score = f32::from_bits(journal.score_bits);
    println!("journal: {journal:?}");
    println!("stress score: {score:.4} (healthy = {})", journal.healthy);

    receipt.verify(STRESS_GUEST_ID).unwrap();
    println!("receipt verified locally");

    // Garaga / Starknet artifact: seal + image_id + journal as hex JSON.
    let seal = to_bytes(encode_seal(&receipt).unwrap());
    let image_id = to_bytes(compute_image_id(&STRESS_GUEST_ELF).unwrap());
    let journal_bytes = to_bytes(receipt.journal);
    println!(
        "{{\"seal\": \"0x{}\", \"image_id\": \"0x{}\", \"journal\": \"0x{}\"}}",
        hex::encode(&seal),
        hex::encode(&image_id),
        hex::encode(&journal_bytes)
    );
}

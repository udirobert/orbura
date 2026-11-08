use garaga_rs::calldata::full_proof_with_hints::groth16::risc0_utils::get_risc0_vk;
use garaga_rs::calldata::full_proof_with_hints::groth16::{get_groth16_calldata, Groth16Proof};
use garaga_rs::definitions::CurveID;
use methods::{STRESS_GUEST_ELF, STRESS_GUEST_ID};
use risc0_zkvm::{compute_image_id, default_prover, ExecutorEnv, ProverOpts, Receipt, VerifierContext};
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
    let receipt: Receipt = prove_info.receipt;

    let journal: Journal = receipt.journal.decode().unwrap();
    let score = f32::from_bits(journal.score_bits);
    println!("journal: {journal:?}");
    println!("stress score: {score:.4} (healthy = {})", journal.healthy);

    receipt.verify(STRESS_GUEST_ID).unwrap();
    println!("receipt verified locally");

    // Garaga / Starknet artifact: seal + image_id + journal as hex JSON.
    // Seal layout expected by garaga_rs: verifier_parameters digest prefix (4
    // bytes) + raw Groth16 seal — same construction as Garaga's sample host.
    let groth16 = receipt.inner.groth16().unwrap();
    let seal = [
        &groth16.verifier_parameters.as_bytes()[..4],
        groth16.seal.as_slice(),
    ]
    .concat();
    let image_id = to_bytes(compute_image_id(&STRESS_GUEST_ELF).unwrap());
    let journal_bytes = to_bytes(receipt.journal);

    // Machine-readable artifacts for the Starknet verification step.
    let proof_json = serde_json::json!({
        "seal": format!("0x{}", hex::encode(&seal)),
        "image_id": format!("0x{}", hex::encode(&image_id)),
        "journal": format!("0x{}", hex::encode(&journal_bytes)),
    });
    println!("{proof_json}");

    let proof = Groth16Proof::from_risc0(seal, image_id, journal_bytes);
    let calldata =
        get_groth16_calldata(&proof, &get_risc0_vk(), CurveID::BN254).unwrap();
    let calldata_json = serde_json::to_string(
        &calldata
            .iter()
            .map(|v| format!("0x{v:x}"))
            .collect::<Vec<_>>(),
    )
    .unwrap();
    println!("CALLDATA:{calldata_json}");
    println!("calldata felts: {}", calldata.len());
}

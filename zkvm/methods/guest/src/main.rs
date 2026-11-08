#![no_std]
#![no_main]

use risc0_zkvm::guest::env;
use sha2::Digest as _;

mod weights;

use weights::*;

risc0_zkvm::guest::entry!(main);

const THRESHOLD: f32 = 0.5;
const MODEL_ID: u32 = 0x4f52_4255; // "ORBU"

fn forward(x: &[f32; 7]) -> f32 {
    let mut h1 = [0f32; 16];
    for i in 0..16 {
        let mut s = FC1_B[i];
        for j in 0..7 {
            s += x[j] * FC1_W[i][j];
        }
        h1[i] = if s > 0.0 { s } else { 0.0 };
    }
    let mut h2 = [0f32; 8];
    for i in 0..8 {
        let mut s = FC2_B[i];
        for j in 0..16 {
            s += h1[j] * FC2_W[i][j];
        }
        h2[i] = if s > 0.0 { s } else { 0.0 };
    }
    let mut out = FC3_B[0];
    for j in 0..8 {
        out += h2[j] * FC3_W[0][j];
    }
    out
}

fn main() {
    // Private input: the 7 facial stress features. Never committed to the
    // journal — only bound privately into the execution trace.
    let features: [f32; 7] = env::read();

    let mut score = forward(&features);
    if score < 0.0 {
        score = 0.0;
    } else if score > 1.0 {
        score = 1.0;
    }
    let healthy = score < THRESHOLD;

    // Public journal output: model id, score bits, healthy flag, and a
    // SHA-256 commitment to the private features (audit without disclosure).
    let digest: [u8; 32] = sha2::Sha256::digest(bytemuck_cast(&features)).into();
    env::commit(&(MODEL_ID, score.to_bits(), healthy, digest));
}

fn bytemuck_cast(features: &[f32; 7]) -> &[u8] {
    // f32 is IEEE-754; cast via raw pointer without pulling in bytemuck.
    unsafe { core::slice::from_raw_parts(features.as_ptr() as *const u8, 7 * 4) }
}

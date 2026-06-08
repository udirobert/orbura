"""
Compile the stress classifier ONNX model into EZKL ZK circuit artifacts.

Uses the ezkl CLI binary (not the Python API) for circuit compilation.
The CLI binary avoids the tract ONNX serialization bug in the Python
bindings.

Requirements:
  - ezkl CLI binary installed. Install with:
    curl -sL https://github.com/zkonduit/ezkl/releases/download/v23.0.3/\
      build-artifacts.ezkl-macos-aarch64.tar.gz | tar xz
    cp ezkl ~/.local/bin/
  - python scripts/generate-stress-model.py (first - generates model.onnx)

Run: python scripts/compile-circuit.py
"""

import os
import subprocess
import sys

OUT = "public/ezkl"
MODEL = f"{OUT}/model.onnx"
DATA = f"{OUT}/input.json"
SETTINGS = f"{OUT}/settings.json"
COMPILED = f"{OUT}/compiled.ezkl"
WITNESS = f"{OUT}/witness.json"
SRS_PATH = f"{OUT}/srs.key"
PK_PATH = f"{OUT}/pk.key"
VK_PATH = f"{OUT}/vk.key"

os.makedirs(OUT, exist_ok=True)

def run(cmd: list[str], timeout: int = 300) -> None:
    """Run an ezkl CLI command and print output."""
    print(f"  $ {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode == 0:
            print(f"  \u2713")
        else:
            print(f"  \u2717 FAILED (exit {result.returncode})")
            if result.stderr:
                print(f"    stderr: {result.stderr.strip()}")
            if result.stdout:
                print(f"    stdout: {result.stdout.strip()}")
            result.check_returncode()
    except subprocess.TimeoutExpired:
        print(f"  \u2717 TIMEOUT after {timeout}s")
        raise


def find_ezkl() -> str:
    """Find the ezkl binary on PATH."""
    # Check common locations
    candidates = [
        "ezkl",  # on PATH
        os.path.expanduser("~/.local/bin/ezkl"),
        os.path.expanduser("~/.ezkl/ezkl"),
        "/usr/local/bin/ezkl",
    ]
    for c in candidates:
        try:
            result = subprocess.run([c, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f"  Found ezkl: {c} ({result.stdout.strip()})")
                return c
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    print("ERROR: ezkl CLI not found. Install it with:")
    print("  curl -sL https://github.com/zkonduit/ezkl/releases/download/v23.0.3/")
    print("    build-artifacts.ezkl-macos-aarch64.tar.gz | tar xz")
    print("  cp ezkl ~/.local/bin/")
    sys.exit(1)


def main():
    ezkl = find_ezkl()

    steps = [
        ("1/6", "Generating/updating settings", [
            ezkl, "gen-settings",
            "-M", MODEL,
            "--settings-path", SETTINGS,
        ]),
        ("2/6", "Calibrating settings", [
            ezkl, "calibrate-settings",
            "-D", DATA,
            "-M", MODEL,
            "--settings-path", SETTINGS,
            "--target", "resources",
        ]),
        ("3/6", "Compiling circuit", [
            ezkl, "compile-circuit",
            "-M", MODEL,
            "--compiled-circuit", COMPILED,
            "--settings-path", SETTINGS,
        ]),
        ("4/6", "Generating witness", [
            ezkl, "gen-witness",
            "-D", DATA,
            "-M", COMPILED,
            "-O", WITNESS,
        ]),
        ("5/6", "Generating SRS", [
            ezkl, "gen-srs",
            "--srs-path", SRS_PATH,
            "--logrows", "15",
        ]),
        ("6/6", "Setting up proving/verifying keys", [
            ezkl, "setup",
            "-M", COMPILED,
            "--vk-path", VK_PATH,
            "--pk-path", PK_PATH,
            "--srs-path", SRS_PATH,
            "-W", WITNESS,
        ]),
    ]

    print(f"Starting EZKL circuit compilation (ezkl v23.0.3 CLI)")
    print(f"Model: {MODEL}")
    print()

    for num, label, cmd in steps:
        print(f"{num} {label}...")
        run(cmd)
        print()

    print("Generating VKA chunks for on-chain verification...")
    run(["node", "scripts/generate-vk-chunks.mjs"])
    print()

    print("All steps completed successfully!")
    print()
    print("Artifacts:")
    for f in [MODEL, DATA, SETTINGS, WITNESS, COMPILED, SRS_PATH, PK_PATH, VK_PATH]:
        size = os.path.getsize(f) if os.path.exists(f) else 0
        print(f"  {f}  ({size:,} bytes)")


if __name__ == "__main__":
    main()

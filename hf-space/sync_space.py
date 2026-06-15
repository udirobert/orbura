"""
Sync the local hf-space/ directory to the HF Space repo.

The Space and the monorepo are separate git repos; this uploads the
Space's files via the HF API rather than via git, so the two histories
stay independent.

Usage:
    export HF_TOKEN=hf_xxx...
    python sync_space.py
    # or
    hf auth login && python sync_space.py
"""

from __future__ import annotations

import os
from pathlib import Path

SPACE_ID = os.environ.get("BODY_DEBT_SPACE_REPO", "Papajams/body-debt")
# Also push to the hackathon org space if the user is a member.
ORG_SPACE_ID = "build-small-hackathon/body-debt"
HERE = Path(__file__).parent
SPACE_DIR = HERE

# Files and patterns to push. The Space is just the Gradio app — no
# Next.js / docs / scripts that are not Space-relevant.
PUSH_PATTERNS = [
    "app.py",
    "scoring.py",
    "face_scan.py",
    "stress_model.py",
    "health_coach.py",
    "train_stress_model.py",
    "publish_mlp.py",
    "publish_traces.py",
    "generate_trace_dataset.py",
    "generate_model.py",
    "requirements.txt",
    "README.md",
    "models/stress_model.onnx",
    "models/README.md",
    "models/stress_model_weights.npz",
    "models/stress_training_data.npz",
    "models/stress_metrics.json",
]


def main() -> None:
    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `hf auth login` or set HF_TOKEN."
        ) from e

    # Verify each pattern exists
    missing = [p for p in PUSH_PATTERNS if not (SPACE_DIR / p).exists()]
    if missing:
        raise SystemExit(f"Missing files: {missing}")

    targets = [SPACE_ID]
    try:
        org_info = api.repo_info(repo_id=ORG_SPACE_ID, repo_type="space")
        if org_info:
            targets.append(ORG_SPACE_ID)
    except Exception as e:
        print(f"  (skipping {ORG_SPACE_ID}: {e})")

    for target in targets:
        print(f"\nPushing to {target}...")
        api.upload_folder(
            folder_path=str(SPACE_DIR),
            repo_id=target,
            repo_type="space",
            allow_patterns=PUSH_PATTERNS,
            commit_message=(
                "Sync trained MLP, agent trace dataset, updated README, "
                "and submission prep scripts"
            ),
        )
        print(f"  Done: https://huggingface.co/spaces/{target}")


if __name__ == "__main__":
    main()

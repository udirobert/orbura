// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHalo2Verifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata instances,
        bytes32[] memory vka
    ) external returns (bool success, bytes32 vka_digest);
}

contract HealthCredentialVerifier {
    IHalo2Verifier public immutable halo2Verifier;
    bytes32 public immutable approvedVkDigest;

    mapping(bytes32 => bool) public verifiedProofs;

    event HealthCredentialVerified(
        address indexed user,
        uint256 timestamp,
        string modelId,
        bool isHealthy,
        bytes32 proofHash
    );

    constructor(address _halo2Verifier, bytes32 _approvedVkDigest) {
        require(_halo2Verifier != address(0), "Invalid verifier");
        halo2Verifier = IHalo2Verifier(_halo2Verifier);
        approvedVkDigest = _approvedVkDigest;
    }

    function verifyAndLogCredential(
        bytes calldata proof,
        uint256[] calldata instances,
        bytes32[] calldata vka
    ) external {
        bytes32 proofHash = keccak256(proof);
        require(!verifiedProofs[proofHash], "Proof already verified");

        bytes32 vkaDigest = keccak256(abi.encodePacked(vka));
        require(vkaDigest == approvedVkDigest, "Unapproved verification key");

        (bool success, bytes32 returnedDigest) = halo2Verifier.verifyProof(proof, instances, vka);
        require(returnedDigest == approvedVkDigest, "Verifier digest mismatch");
        require(success, "Invalid proof");

        verifiedProofs[proofHash] = true;

        bool isHealthy = instances.length > 0 && instances[0] < 500;

        emit HealthCredentialVerified(
            msg.sender,
            block.timestamp,
            "bodydebt-stress-v1",
            isHealthy,
            proofHash
        );
    }

    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
}

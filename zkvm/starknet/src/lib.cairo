#[starknet::interface]
pub trait IOrburaCredential<TContractState> {
    fn verify_stress_proof(
        ref self: TContractState, full_proof_with_hints: Span<felt252>,
    );
    fn credentials_verified(self: @TContractState) -> u32;
    fn last_journal_len(self: @TContractState) -> u32;
}

#[starknet::contract]
pub mod OrburaCredential {
    use starknet::ClassHash;
    use starknet::get_caller_address;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::ContractAddress;

    // Garaga RiscZero Groth16/BN254 verifier built from garaga main @ d97b4d3
    // (risc0-zkvm 3.0.6 / control root 0xA54D…), declared on Starknet Sepolia.
    // The released v1.1.0 class hash targets risc0 v2.2.2 and rejects v3 proofs.
    pub const RISC_ZERO_VERIFIER_CLASS_HASH: felt252 =
        0x1c4078b1a732111b25cbe827b4829d24cfc7664539fc8d511171e9b78910ac3;

    #[storage]
    struct Storage {
        credentials_verified: u32,
        last_journal_len: u32,
        last_caller: ContractAddress,
    }

    #[abi(embed_v0)]
    impl OrburaCredentialImpl of super::IOrburaCredential<ContractState> {
        fn verify_stress_proof(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) {
            let class_hash: ClassHash = RISC_ZERO_VERIFIER_CLASS_HASH.try_into().unwrap();
            let dispatcher = IRisc0Groth16VerifierBN254LibraryDispatcher { class_hash };
            let optional_journal = dispatcher.verify_r0_groth16_proof_bn254(full_proof_with_hints);
            assert(optional_journal != Option::None, 'Invalid proof');

            let journal = optional_journal.unwrap();
            let journal_len: u32 = journal.len().try_into().unwrap();

            self.last_journal_len.write(journal_len);
            self.last_caller.write(get_caller_address());
            let total = self.credentials_verified.read() + 1;
            self.credentials_verified.write(total);

            self.emit(Event::StressCredentialVerified(StressCredentialVerified {
                caller: get_caller_address(), journal_len, total_verified: total,
            }));
        }

        fn credentials_verified(self: @ContractState) -> u32 {
            self.credentials_verified.read()
        }

        fn last_journal_len(self: @ContractState) -> u32 {
            self.last_journal_len.read()
        }
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        StressCredentialVerified: StressCredentialVerified,
    }

    #[derive(Drop, starknet::Event)]
    struct StressCredentialVerified {
        #[key]
        caller: ContractAddress,
        journal_len: u32,
        total_verified: u32,
    }

    #[starknet::interface]
    trait IRisc0Groth16VerifierBN254<TContractState> {
        fn verify_r0_groth16_proof_bn254(
            self: @TContractState, full_proof_with_hints: Span<felt252>,
        ) -> Option<Span<u8>>;
    }
}

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

    // Garaga v1.1.0 RiscZero Groth16/BN254 verifier, declared on Starknet Sepolia.
    pub const RISC_ZERO_VERIFIER_CLASS_HASH: felt252 =
        0x41d5e111b93acbf1afb531253e0bc64d43f90a8a99290361e851ec0c4968ab1;

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

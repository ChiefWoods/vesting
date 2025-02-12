use anchor_lang::prelude::*;

#[error_code]
pub enum VestingError {
    #[msg("Claiming is not available yet")]
    ClaimNotAvailableYet,
    #[msg("Claimable amount is 0")]
    NothingToClaim,
}

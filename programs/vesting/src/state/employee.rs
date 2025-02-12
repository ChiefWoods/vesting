use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Employee {
    pub bump: u8,
    pub start_time: i64,
    pub end_time: i64,
    pub cliff_time: i64,
    pub total_amount: i64,
    pub total_withdrawn: i64,
    pub beneficiary: Pubkey,
    pub vest: Pubkey,
}

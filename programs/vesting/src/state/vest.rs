use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vest {
    pub bump: u8,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub treasury: Pubkey,
    #[max_len(50)]
    pub company_name: String,
}

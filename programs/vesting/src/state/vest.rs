use anchor_lang::{prelude::*, Discriminator};

#[account]
pub struct Vest {
    pub bump: u8,             // 1
    pub owner: Pubkey,        // 32
    pub mint: Pubkey,         // 32
    pub treasury: Pubkey,     // 32
    pub company_name: String, // 4
}

impl Vest {
    pub const MIN_SPACE: usize = Vest::DISCRIMINATOR.len() + 1 + 32 + 32 + 32 + 4;
}

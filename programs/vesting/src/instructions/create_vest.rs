use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{Vest, VEST_SEED};

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreateVest<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = Vest::MIN_SPACE + company_name.len(),
        seeds = [VEST_SEED, company_name.as_ref()],
        bump,
    )]
    pub vest: Account<'info, Vest>,
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vest,
        associated_token::token_program = token_program,
    )]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl CreateVest<'_> {
    pub fn create_vest(ctx: Context<CreateVest>, company_name: String) -> Result<()> {
        ctx.accounts.vest.set_inner(Vest {
            bump: ctx.bumps.vest,
            owner: ctx.accounts.owner.key(),
            mint: ctx.accounts.mint.key(),
            treasury: ctx.accounts.treasury.key(),
            company_name,
        });

        Ok(())
    }
}

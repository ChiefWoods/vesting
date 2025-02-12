use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::{error::VestingError, Employee, Vest, EMPLOYEE_SEED, VEST_SEED};

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        seeds = [VEST_SEED, vest.company_name.as_ref()],
        bump = vest.bump,
        has_one = mint,
        has_one = treasury,
    )]
    pub vest: Account<'info, Vest>,
    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, beneficiary.key().as_ref(), vest.key().as_ref()],
        bump = employee.bump,
        has_one = beneficiary,
        has_one = vest,
    )]
    pub employee: Account<'info, Employee>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub treasury: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program
    )]
    pub beneficiary_ata: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl ClaimTokens<'_> {
    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let employee = &mut ctx.accounts.employee;
        let now = Clock::get()?.unix_timestamp;

        require_gte!(now, employee.cliff_time, VestingError::ClaimNotAvailableYet);

        let time_since_start = now.saturating_sub(employee.start_time);
        msg!("time_since_start: {}", time_since_start);
        let total_vesting_time = employee.end_time.saturating_sub(employee.start_time);
        msg!("total_vesting_time: {}", total_vesting_time);
        let vested_amount = if now >= employee.end_time {
            employee.total_amount
        } else {
            (employee.total_amount * time_since_start) / total_vesting_time
        };
        msg!("vested_amount: {}", vested_amount);

        let claimable_amount = vested_amount.saturating_sub(employee.total_withdrawn);

        require_neq!(claimable_amount, 0, VestingError::NothingToClaim);

        let signer_seeds: &[&[&[u8]]] = &[&[
            VEST_SEED,
            ctx.accounts.vest.company_name.as_ref(),
            &[ctx.accounts.vest.bump],
        ]];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.vest.to_account_info(),
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.beneficiary_ata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            claimable_amount as u64,
            ctx.accounts.mint.decimals,
        )?;

        employee.total_withdrawn += claimable_amount;

        Ok(())
    }
}

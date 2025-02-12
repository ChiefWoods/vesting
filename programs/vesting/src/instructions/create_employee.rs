use anchor_lang::{prelude::*, Discriminator};

use crate::{Employee, Vest, EMPLOYEE_SEED, VEST_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateEmployeeArgs {
    start_time: i64,
    end_time: i64,
    cliff_time: i64,
    total_amount: i64,
}

#[derive(Accounts)]
pub struct CreateEmployee<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub beneficiary: SystemAccount<'info>,
    #[account(
        seeds = [VEST_SEED, vest.company_name.as_ref()],
        bump = vest.bump,
        has_one = owner,
    )]
    pub vest: Account<'info, Vest>,
    #[account(
        init,
        payer = owner,
        space = Employee::DISCRIMINATOR.len() + Employee::INIT_SPACE,
        seeds = [EMPLOYEE_SEED, beneficiary.key().as_ref(), vest.key().as_ref()],
        bump
    )]
    pub employee: Account<'info, Employee>,
    pub system_program: Program<'info, System>,
}

impl CreateEmployee<'_> {
    pub fn create_employee(ctx: Context<CreateEmployee>, args: CreateEmployeeArgs) -> Result<()> {
        ctx.accounts.employee.set_inner(Employee {
            bump: ctx.bumps.employee,
            start_time: args.start_time,
            end_time: args.end_time,
            cliff_time: args.cliff_time,
            total_amount: args.total_amount,
            total_withdrawn: 0,
            beneficiary: ctx.accounts.beneficiary.key(),
            vest: ctx.accounts.vest.key(),
        });

        Ok(())
    }
}

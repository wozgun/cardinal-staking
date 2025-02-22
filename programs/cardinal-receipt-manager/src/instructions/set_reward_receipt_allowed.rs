use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(allowed: bool)]
pub struct SetRewardReceiptAllowed<'info> {
    #[account(constraint = receipt_manager.authority == authority.key() @ ErrorCode::InvalidAuthority)]
    receipt_manager: Box<Account<'info, ReceiptManager>>,
    #[account(mut, constraint = reward_receipt.receipt_manager == receipt_manager.key() @ ErrorCode::InvalidReceiptManager)]
    reward_receipt: Box<Account<'info, RewardReceipt>>,

    #[account(mut)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetRewardReceiptAllowed>, allowed: bool) -> Result<()> {
    ctx.accounts.reward_receipt.allowed = allowed;
    Ok(())
}

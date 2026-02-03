use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111"); // TODO: Replace after deploy

#[program]
pub mod beast_arena_escrow {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: String,
        wager_amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.match_id = match_id;
        escrow.player1 = ctx.accounts.player1.key();
        escrow.wager_amount = wager_amount;
        escrow.player2 = Pubkey::default();
        escrow.state = MatchState::WaitingForPlayer2;
        escrow.bump = ctx.bumps.escrow;

        // Transfer SOL from player1 to escrow PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player1.key(),
            &escrow.key(),
            wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player1.to_account_info(),
                escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.state == MatchState::WaitingForPlayer2,
            ErrorCode::InvalidMatchState
        );

        escrow.player2 = ctx.accounts.player2.key();
        escrow.state = MatchState::InProgress;

        // Transfer wager from player2
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player2.key(),
            &escrow.key(),
            escrow.wager_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player2.to_account_info(),
                escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn settle_match(
        ctx: Context<SettleMatch>,
        winner: u8, // 0 = player1, 1 = player2
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.state == MatchState::InProgress,
            ErrorCode::InvalidMatchState
        );

        let total_pot = escrow.wager_amount * 2;
        let platform_fee = total_pot * 5 / 100; // 5% fee
        let winner_payout = total_pot - platform_fee;

        let winner_account = if winner == 0 {
            ctx.accounts.player1.to_account_info()
        } else {
            ctx.accounts.player2.to_account_info()
        };

        // Transfer winnings from escrow PDA
        **escrow.to_account_info().try_borrow_mut_lamports()? -= winner_payout;
        **winner_account.try_borrow_mut_lamports()? += winner_payout;

        // Transfer fee to platform
        **escrow.to_account_info().try_borrow_mut_lamports()? -= platform_fee;
        **ctx.accounts.platform.try_borrow_mut_lamports()? += platform_fee;

        escrow.state = MatchState::Settled;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MatchState {
    WaitingForPlayer2,
    InProgress,
    Settled,
    Cancelled,
}

#[account]
pub struct EscrowAccount {
    pub match_id: String,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub state: MatchState,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + 64 + 32 + 32 + 8 + 1 + 1,
        seeds = [b"escrow", match_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub player1: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub player2: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    /// CHECK: Server authority
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Player 1
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    /// CHECK: Player 2
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    /// CHECK: Platform fee receiver
    #[account(mut)]
    pub platform: AccountInfo<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid match state for this operation")]
    InvalidMatchState,
}

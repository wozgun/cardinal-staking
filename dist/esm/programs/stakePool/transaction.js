import { findMintMetadataId, METADATA_PROGRAM_ID, tryGetAccount, withFindOrInitAssociatedTokenAccount, } from "@cardinal/common";
import { BN } from "@coral-xyz/anchor";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_SLOT_HASHES_PUBKEY, } from "@solana/web3.js";
import { TOKEN_MANAGER_ADDRESS } from "cardinal-token-manager/dist/cjs/programs/tokenManager";
import { findMintManagerId } from "cardinal-token-manager/dist/cjs/programs/tokenManager/pda";
import { getPoolIdentifier, getStakeBooster, getStakeEntry } from "./accounts";
import { STAKE_BOOSTER_PAYMENT_MANAGER, stakePoolProgram } from "./constants";
import { findGroupEntryId, findIdentifierId, findStakeAuthorizationId, findStakeBoosterId, findStakePoolId, } from "./pda";
import { remainingAccountsForInitStakeEntry } from "./utils";
import { getPaymentManager } from "cardinal-token-manager/dist/cjs/programs/paymentManager/accounts";
import { PAYMENT_MANAGER_ADDRESS } from "cardinal-token-manager/dist/cjs/programs/paymentManager";
export const withInitStakePool = async (transaction, connection, wallet, params) => {
    const identifierId = findIdentifierId();
    const identifierData = await tryGetAccount(() => getPoolIdentifier(connection));
    const identifier = (identifierData === null || identifierData === void 0 ? void 0 : identifierData.parsed.count) || new BN(1);
    const program = stakePoolProgram(connection, wallet);
    if (!identifierData) {
        const ix = await program.methods
            .initIdentifier()
            .accounts({
            identifier: identifierId,
            payer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
            .instruction();
        transaction.add(ix);
    }
    const stakePoolId = findStakePoolId(identifier);
    const ix = await program.methods
        .initPool({
        overlayText: params.overlayText || "STAKED",
        imageUri: params.imageUri || "",
        requiresCollections: params.requiresCollections || [],
        requiresCreators: params.requiresCreators || [],
        requiresAuthorization: params.requiresAuthorization || false,
        authority: wallet.publicKey,
        resetOnStake: params.resetOnStake || false,
        cooldownSeconds: params.cooldownSeconds || null,
        minStakeSeconds: params.minStakeSeconds || null,
        endDate: params.endDate || null,
        doubleOrResetEnabled: params.doubleOrResetEnabled || null,
    })
        .accounts({
        stakePool: stakePoolId,
        identifier: identifierId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return [transaction, stakePoolId];
};
/**
 * Add init stake entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created stake entry
 */
export const withInitStakeEntry = async (transaction, connection, wallet, params) => {
    const ix = await stakePoolProgram(connection, wallet)
        .methods.initEntry(wallet.publicKey)
        .accounts({
        stakeEntry: params.stakeEntryId,
        stakePool: params.stakePoolId,
        originalMint: params.originalMintId,
        originalMintMetadata: findMintMetadataId(params.originalMintId),
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .remainingAccounts(remainingAccountsForInitStakeEntry(params.stakePoolId, params.originalMintId))
        .instruction();
    transaction.add(ix);
    return transaction;
};
/**
 * Add authorize stake entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction
 */
export const withAuthorizeStakeEntry = async (transaction, connection, wallet, params) => {
    const ix = await stakePoolProgram(connection, wallet)
        .methods.authorizeMint(params.originalMintId)
        .accounts({
        stakePool: params.stakePoolId,
        stakeAuthorizationRecord: findStakeAuthorizationId(params.stakePoolId, params.originalMintId),
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
/**
 * Add authorize stake entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction
 */
export const withDeauthorizeStakeEntry = async (transaction, connection, wallet, params) => {
    const stakeAuthorizationId = findStakeAuthorizationId(params.stakePoolId, params.originalMintId);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .deauthorizeMint()
        .accounts({
        stakePool: params.stakePoolId,
        stakeAuthorizationRecord: stakeAuthorizationId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
/**
 * Add init stake mint instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, keypair of the created stake mint
 */
export const withInitStakeMint = async (transaction, connection, wallet, params) => {
    const originalMintMetadataId = findMintMetadataId(params.originalMintId);
    const stakeMintMetadataId = findMintMetadataId(params.stakeMintKeypair.publicKey);
    const stakeEntryStakeMintTokenAccountId = getAssociatedTokenAddressSync(params.stakeMintKeypair.publicKey, params.stakeEntryId, true);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .initStakeMint({
        name: params.name,
        symbol: params.symbol,
    })
        .accounts({
        stakeEntry: params.stakeEntryId,
        stakePool: params.stakePoolId,
        originalMint: params.originalMintId,
        originalMintMetadata: originalMintMetadataId,
        stakeMint: params.stakeMintKeypair.publicKey,
        stakeMintMetadata: stakeMintMetadataId,
        stakeEntryStakeMintTokenAccount: stakeEntryStakeMintTokenAccountId,
        mintManager: findMintManagerId(params.stakeMintKeypair.publicKey),
        payer: wallet.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
        associatedToken: ASSOCIATED_PROGRAM_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return [transaction, params.stakeMintKeypair];
};
export const withUpdateStakePool = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .updatePool({
        imageUri: params.imageUri || "",
        overlayText: params.overlayText || "STAKED",
        requiresCollections: params.requiresCollections || [],
        requiresCreators: params.requiresCreators || [],
        requiresAuthorization: params.requiresAuthorization || false,
        authority: wallet.publicKey,
        resetOnStake: params.resetOnStake || false,
        cooldownSeconds: params.cooldownSeconds || null,
        minStakeSeconds: params.minStakeSeconds || null,
        endDate: params.endDate || null,
        doubleOrResetEnabled: params.doubleOrResetEnabled || null,
    })
        .accounts({
        stakePool: params.stakePoolId,
        payer: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return [transaction, params.stakePoolId];
};
export const withUpdateTotalStakeSeconds = async (transaction, connection, wallet, params) => {
    const ix = await stakePoolProgram(connection, wallet)
        .methods.updateTotalStakeSeconds()
        .accounts({
        stakeEntry: params.stakeEntryId,
        lastStaker: params.lastStaker,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withCloseStakePool = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .closeStakePool()
        .accounts({
        stakePool: params.stakePoolId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withCloseStakeEntry = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .closeStakeEntry()
        .accounts({
        stakePool: params.stakePoolId,
        stakeEntry: params.stakeEntryId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withReassignStakeEntry = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .reassignStakeEntry({ target: params.target })
        .accounts({
        stakePool: params.stakePoolId,
        stakeEntry: params.stakeEntryId,
        lastStaker: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withDoubleOrResetTotalStakeSeconds = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .doubleOrResetTotalStakeSeconds()
        .accounts({
        stakeEntry: params.stakeEntryId,
        stakePool: params.stakePoolId,
        lastStaker: wallet.publicKey,
        recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withInitStakeBooster = async (transaction, connection, wallet, params) => {
    const stakeBoosterId = findStakeBoosterId(params.stakePoolId, params.stakeBoosterIdentifier);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .initStakeBooster({
        stakePool: params.stakePoolId,
        identifier: params.stakeBoosterIdentifier || new BN(0),
        paymentAmount: params.paymentAmount,
        paymentMint: params.paymentMint,
        paymentManager: STAKE_BOOSTER_PAYMENT_MANAGER,
        boostSeconds: params.boostSeconds,
        startTimeSeconds: new BN(params.startTimeSeconds),
    })
        .accounts({
        stakeBooster: stakeBoosterId,
        stakePool: params.stakePoolId,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withUpdateStakeBooster = async (transaction, connection, wallet, params) => {
    const stakeBoosterId = findStakeBoosterId(params.stakePoolId, params.stakeBoosterIdentifier);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .updateStakeBooster({
        paymentAmount: params.paymentAmount,
        paymentMint: params.paymentMint,
        paymentManager: STAKE_BOOSTER_PAYMENT_MANAGER,
        boostSeconds: params.boostSeconds,
        startTimeSeconds: new BN(params.startTimeSeconds),
    })
        .accounts({
        stakeBooster: stakeBoosterId,
        stakePool: params.stakePoolId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withCloseStakeBooster = async (transaction, connection, wallet, params) => {
    const stakeBoosterId = findStakeBoosterId(params.stakePoolId, params.stakeBoosterIdentifier);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .closeStakeBooster()
        .accounts({
        stakeBooster: stakeBoosterId,
        stakePool: params.stakePoolId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
export const withBoostStakeEntry = async (transaction, connection, wallet, params) => {
    var _a, _b;
    const stakeBoosterId = findStakeBoosterId(params.stakePoolId, params.stakeBoosterIdentifier);
    const stakeBooster = await getStakeBooster(connection, stakeBoosterId);
    const paymentManager = await getPaymentManager(connection, stakeBooster.parsed.paymentManager);
    const feeCollectorTokenAccount = await withFindOrInitAssociatedTokenAccount(transaction, connection, stakeBooster.parsed.paymentMint, paymentManager.parsed.feeCollector, (_a = params.payer) !== null && _a !== void 0 ? _a : wallet.publicKey);
    const paymentRecipientTokenAccount = await withFindOrInitAssociatedTokenAccount(transaction, connection, stakeBooster.parsed.paymentMint, stakeBooster.parsed.paymentRecipient, (_b = params.payer) !== null && _b !== void 0 ? _b : wallet.publicKey);
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .boostStakeEntry({ secondsToBoost: params.secondsToBoost })
        .accounts({
        stakeBooster: stakeBooster.pubkey,
        stakePool: params.stakePoolId,
        stakeEntry: params.stakeEntryId,
        originalMint: params.originalMintId,
        payerTokenAccount: params.payerTokenAccount,
        paymentRecipientTokenAccount: paymentRecipientTokenAccount,
        payer: wallet.publicKey,
        paymentManager: stakeBooster.parsed.paymentManager,
        feeCollectorTokenAccount: feeCollectorTokenAccount,
        cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return transaction;
};
/**
 * Add init group stake entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created group stake entry
 */
export const withInitGroupStakeEntry = async (transaction, connection, wallet, params) => {
    const id = Keypair.generate();
    const program = stakePoolProgram(connection, wallet);
    const groupEntryId = findGroupEntryId(id.publicKey);
    const ix = await program.methods
        .initGroupEntry({
        groupId: id.publicKey,
        groupCooldownSeconds: params.groupCooldownSeconds || null,
        groupStakeSeconds: params.groupStakeSeconds || null,
    })
        .accounts({
        groupEntry: groupEntryId,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return [transaction, groupEntryId];
};
/**
 * Add a stake entry to the group entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created group stake entry
 */
export const withAddToGroupEntry = async (transaction, connection, wallet, params) => {
    var _a;
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .addToGroupEntry()
        .accounts({
        groupEntry: params.groupEntryId,
        stakeEntry: params.stakeEntryId,
        authority: wallet.publicKey,
        payer: (_a = params.payer) !== null && _a !== void 0 ? _a : wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return [transaction];
};
/**
 * Remove stake entry from the group entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created group stake entry
 */
export const withRemoveFromGroupEntry = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .removeFromGroupEntry()
        .accounts({
        groupEntry: params.groupEntryId,
        stakeEntry: params.stakeEntryId,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
    })
        .instruction();
    transaction.add(ix);
    return [transaction];
};
/**
 * Add init ungrouping instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created group stake entry
 */
export const withInitUngrouping = async (transaction, connection, wallet, params) => {
    const program = stakePoolProgram(connection, wallet);
    const ix = await program.methods
        .initUngrouping()
        .accounts({
        groupEntry: params.groupEntryId,
        authority: wallet.publicKey,
    })
        .instruction();
    transaction.add(ix);
    return [transaction];
};
export const withClaimStakeEntryFunds = async (transaction, connection, wallet, stakeEntryId, fundsMintId) => {
    const program = stakePoolProgram(connection, wallet);
    const stakeEntryData = await tryGetAccount(() => getStakeEntry(connection, stakeEntryId));
    if (!stakeEntryData) {
        throw `No stake entry id with address ${stakeEntryId.toString()}`;
    }
    const stakeEntryFundsMintTokenAccountId = getAssociatedTokenAddressSync(fundsMintId, stakeEntryId, true);
    const userFundsMintTokenAccountId = await withFindOrInitAssociatedTokenAccount(transaction, connection, fundsMintId, stakeEntryData.parsed.lastStaker, wallet.publicKey, true);
    const ix = await program.methods
        .claimStakeEntryFunds()
        .accounts({
        fundsMint: fundsMintId,
        stakeEntryFundsMintTokenAccount: stakeEntryFundsMintTokenAccountId,
        userFundsMintTokenAccount: userFundsMintTokenAccountId,
        stakePool: stakeEntryData.parsed.pool,
        stakeEntry: stakeEntryId,
        originalMint: stakeEntryData.parsed.originalMint,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    })
        .instruction();
    transaction.add(ix);
    return [transaction];
};
//# sourceMappingURL=transaction.js.map
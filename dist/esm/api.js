import { decodeIdlAccount, fetchAccountDataById, findMintEditionId, findMintMetadataId, findTokenRecordId, getBatchedMultipleAccounts, METADATA_PROGRAM_ID, tryDecodeIdlAccount, tryGetAccount, tryNull, } from "@cardinal/common";
import { BN } from "@coral-xyz/anchor";
import { PROGRAM_ID as TOKEN_AUTH_RULES_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import { Metadata, TokenDelegateRole, TokenRecord, TokenStandard, } from "@metaplex-foundation/mpl-token-metadata";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { ComputeBudgetProgram, Keypair, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RENT_PUBKEY, Transaction, } from "@solana/web3.js";
import { tokenManager } from "cardinal-token-manager/dist/cjs/programs";
import { CRANK_KEY, getRemainingAccountsForKind, TOKEN_MANAGER_ADDRESS, TokenManagerKind, withRemainingAccountsForInvalidate, } from "cardinal-token-manager/dist/cjs/programs/tokenManager";
import { findMintCounterId, findTokenManagerAddress, } from "cardinal-token-manager/dist/cjs/programs/tokenManager/pda";
import { REWARD_DISTRIBUTOR_IDL, REWARD_MANAGER, rewardDistributorProgram, } from "./programs/rewardDistributor";
import { getRewardDistributor, getRewardEntry, } from "./programs/rewardDistributor/accounts";
import { findRewardDistributorId, findRewardEntryId, } from "./programs/rewardDistributor/pda";
import { withInitRewardDistributor, withInitRewardEntry, withUpdateRewardEntry, } from "./programs/rewardDistributor/transaction";
import { ReceiptType, 
// STAKE_POOL_ADDRESS,
STAKE_POOL_IDL, stakePoolProgram, } from "./programs/stakePool";
import { getStakeEntry, getStakePool, } from "./programs/stakePool/accounts";
import { findStakeEntryId } from "./programs/stakePool/pda";
import { withAuthorizeStakeEntry, withInitStakeEntry, withInitStakeMint, withInitStakePool, withUpdateTotalStakeSeconds, } from "./programs/stakePool/transaction";
import { findStakeEntryIdFromMint, remainingAccountsForInitStakeEntry, shouldReturnReceipt, } from "./programs/stakePool/utils";
import { getTokenAddress } from "./utils";
/**
 * Convenience call to create a stake pool
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param requiresCollections - (Optional) List of required collections pubkeys
 * @param requiresCreators - (Optional) List of required creators pubkeys
 * @param requiresAuthorization - (Optional) Boolean to require authorization
 * @param overlayText - (Optional) Text to overlay on receipt mint tokens
 * @param imageUri - (Optional) Image URI for stake pool
 * @param resetOnStake - (Optional) Boolean to reset an entry's total stake seconds on unstake
 * @param cooldownSeconds - (Optional) Number of seconds for token to cool down before returned to the staker
 * @param rewardDistributor - (Optional) Parameters to creat reward distributor
 * @returns
 */
export const createStakePool = async (connection, wallet, params) => {
    const transaction = new Transaction();
    const [, stakePoolId] = await withInitStakePool(transaction, connection, wallet, params);
    let rewardDistributorId;
    if (params.rewardDistributor) {
        [, rewardDistributorId] = await withInitRewardDistributor(transaction, connection, wallet, {
            stakePoolId: stakePoolId,
            rewardMintId: params.rewardDistributor.rewardMintId,
            rewardAmount: params.rewardDistributor.rewardAmount,
            rewardDurationSeconds: params.rewardDistributor.rewardDurationSeconds,
            kind: params.rewardDistributor.rewardDistributorKind,
            maxSupply: params.rewardDistributor.maxSupply,
            supply: params.rewardDistributor.supply,
        });
    }
    return [transaction, stakePoolId, rewardDistributorId];
};
/**
 * Convenience call to create a reward distributor
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param rewardMintId - (Optional) Reward mint id
 * @param rewardAmount - (Optional) Reward amount
 * @param rewardDurationSeconds - (Optional) Reward duration in seconds
 * @param rewardDistributorKind - (Optional) Reward distributor kind Mint or Treasury
 * @param maxSupply - (Optional) Max supply
 * @param supply - (Optional) Supply
 * @returns
 */
export const createRewardDistributor = async (connection, wallet, params) => withInitRewardDistributor(new Transaction(), connection, wallet, params);
/**
 * Convenience call to create a stake entry
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @param user - (Optional) User pubkey in case the person paying for the transaction and
 * stake entry owner are different
 * @returns
 */
export const createStakeEntry = async (connection, wallet, params) => {
    const stakeEntryId = await findStakeEntryIdFromMint(connection, wallet.publicKey, params.stakePoolId, params.originalMintId);
    return [
        await withInitStakeEntry(new Transaction(), connection, wallet, {
            stakePoolId: params.stakePoolId,
            stakeEntryId,
            originalMintId: params.originalMintId,
        }),
        stakeEntryId,
    ];
};
/**
 * Convenience call to create a stake entry
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @returns
 */
export const initializeRewardEntry = async (connection, wallet, params) => {
    var _a;
    const stakeEntryId = await findStakeEntryIdFromMint(connection, wallet.publicKey, params.stakePoolId, params.originalMintId);
    const stakeEntryData = await tryGetAccount(() => getStakeEntry(connection, stakeEntryId));
    const transaction = new Transaction();
    if (!stakeEntryData) {
        await withInitStakeEntry(transaction, connection, wallet, {
            stakePoolId: params.stakePoolId,
            stakeEntryId,
            originalMintId: params.originalMintId,
        });
    }
    const rewardDistributorId = findRewardDistributorId(params.stakePoolId);
    await withInitRewardEntry(transaction, connection, wallet, {
        stakeEntryId: stakeEntryId,
        rewardDistributorId: rewardDistributorId,
    });
    await withUpdateRewardEntry(transaction, connection, wallet, {
        stakePoolId: params.stakePoolId,
        rewardDistributorId: rewardDistributorId,
        stakeEntryId: stakeEntryId,
        multiplier: (_a = params.multiplier) !== null && _a !== void 0 ? _a : new BN(1), //TODO default multiplier
    });
    return transaction;
};
/**
 * Convenience call to authorize a stake entry
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @returns
 */
export const authorizeStakeEntry = (connection, wallet, params) => {
    return withAuthorizeStakeEntry(new Transaction(), connection, wallet, {
        stakePoolId: params.stakePoolId,
        originalMintId: params.originalMintId,
    });
};
/**
 * Convenience call to create a stake entry and a stake mint
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @param amount - (Optional) Amount of tokens to be staked, defaults to 1
 * @returns
 */
export const createStakeEntryAndStakeMint = async (connection, wallet, params) => {
    var _a;
    let transaction = new Transaction();
    const stakeEntryId = await findStakeEntryIdFromMint(connection, wallet.publicKey, params.stakePoolId, params.originalMintId);
    const stakeEntryData = await tryGetAccount(() => getStakeEntry(connection, stakeEntryId));
    if (!stakeEntryData) {
        transaction = (await createStakeEntry(connection, wallet, {
            stakePoolId: params.stakePoolId,
            originalMintId: params.originalMintId,
        }))[0];
    }
    let stakeMintKeypair;
    if (!(stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed.stakeMint)) {
        stakeMintKeypair = Keypair.generate();
        const stakePool = await getStakePool(connection, params.stakePoolId);
        await withInitStakeMint(transaction, connection, wallet, {
            stakePoolId: params.stakePoolId,
            stakeEntryId: stakeEntryId,
            originalMintId: params.originalMintId,
            stakeMintKeypair,
            name: (_a = params.receiptName) !== null && _a !== void 0 ? _a : `POOl${stakePool.parsed.identifier.toString()} RECEIPT`,
            symbol: `POOl${stakePool.parsed.identifier.toString()}`,
        });
    }
    return [transaction, stakeEntryId, stakeMintKeypair];
};
/**
 * Convenience method to claim rewards
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool id
 * @param stakeEntryId - Original mint id
 * @returns
 */
export const claimRewards = async (connection, wallet, params) => {
    var _a, _b, _c, _d, _e, _f;
    /////// derive ids ///////
    const rewardDistributorId = findRewardDistributorId(params.stakePoolId);
    const rewardEntryIds = params.stakeEntryIds.map((stakeEntryId) => findRewardEntryId(rewardDistributorId, stakeEntryId));
    /////// get accounts ///////
    const rewardDistributorData = await tryNull(() => getRewardDistributor(connection, rewardDistributorId));
    if (!rewardDistributorData)
        throw "No reward distributor found";
    const rewardEntryInfos = await getBatchedMultipleAccounts(connection, rewardEntryIds);
    const rewardMintTokenAccountId = getAssociatedTokenAddressSync(rewardDistributorData.parsed.rewardMint, (_a = params.lastStaker) !== null && _a !== void 0 ? _a : wallet.publicKey, true);
    const txs = [];
    for (let i = 0; i < params.stakeEntryIds.length; i++) {
        const stakeEntryId = params.stakeEntryIds[i];
        const rewardEntryId = rewardEntryIds[i];
        const tx = new Transaction();
        /////// update seconds ///////
        await withUpdateTotalStakeSeconds(tx, connection, wallet, {
            stakeEntryId,
            lastStaker: wallet.publicKey,
        });
        /////// init ata ///////
        tx.add(createAssociatedTokenAccountIdempotentInstruction((_b = params.payer) !== null && _b !== void 0 ? _b : wallet.publicKey, rewardMintTokenAccountId, (_c = params.lastStaker) !== null && _c !== void 0 ? _c : wallet.publicKey, rewardDistributorData.parsed.rewardMint));
        /////// init entry ///////
        if (!((_d = rewardEntryInfos[i]) === null || _d === void 0 ? void 0 : _d.data)) {
            const ix = await rewardDistributorProgram(connection, wallet)
                .methods.initRewardEntry()
                .accounts({
                rewardEntry: rewardEntryId,
                stakeEntry: stakeEntryId,
                rewardDistributor: rewardDistributorData.pubkey,
                payer: (_e = params.payer) !== null && _e !== void 0 ? _e : wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
                .instruction();
            tx.add(ix);
        }
        /////// claim rewards ///////
        const ix = await rewardDistributorProgram(connection, wallet)
            .methods.claimRewards()
            .accounts({
            rewardEntry: rewardEntryId,
            rewardDistributor: rewardDistributorData.pubkey,
            stakeEntry: stakeEntryId,
            stakePool: params.stakePoolId,
            rewardMint: rewardDistributorData.parsed.rewardMint,
            userRewardMintTokenAccount: rewardMintTokenAccountId,
            rewardManager: REWARD_MANAGER,
            user: (_f = params.payer) !== null && _f !== void 0 ? _f : wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
            .remainingAccounts([
            {
                pubkey: getAssociatedTokenAddressSync(rewardDistributorData.parsed.rewardMint, rewardDistributorData.pubkey, true),
                isSigner: false,
                isWritable: true,
            },
        ])
            .instruction();
        tx.add(ix);
        txs.push(tx);
    }
    return txs;
};
export const claimRewardsAll = async (connection, wallet, params) => {
    /////// get accounts ///////
    const rewardDistributorId = findRewardDistributorId(params.stakePoolId);
    const rewardDistributorData = await getRewardDistributor(connection, rewardDistributorId);
    const rewardMintId = rewardDistributorData.parsed.rewardMint;
    const userRewardTokenAccountId = getAssociatedTokenAddressSync(rewardMintId, wallet.publicKey, true);
    const rewardTokenAccount = await tryNull(getAccount(connection, userRewardTokenAccountId));
    const txs = await claimRewards(connection, wallet, {
        stakePoolId: params.stakePoolId,
        stakeEntryIds: params.stakeEntryIds,
        lastStaker: params.lastStaker,
        payer: params.payer,
    });
    return !rewardTokenAccount
        ? [
            txs.slice(0, 1).map((tx) => {
                tx.instructions = [
                    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userRewardTokenAccountId, wallet.publicKey, rewardMintId),
                    ...tx.instructions,
                ];
                return { tx };
            }),
            txs.slice(1).map((tx) => ({ tx })),
        ]
        : [txs.map((tx) => ({ tx }))];
};
export const stake = async (connection, wallet, params) => {
    var _a;
    const txSeq = await stakeAll(connection, wallet, {
        stakePoolId: params.stakePoolId,
        mintInfos: [
            {
                mintId: params.originalMintId,
                tokenAccountId: params.userOriginalMintTokenAccountId,
                receiptType: params.receiptType,
                fungible: (_a = params.fungible) !== null && _a !== void 0 ? _a : (params.amount && params.amount.gt(new BN(1))),
                amount: params.amount,
            },
        ],
    });
    const txs = txSeq[0];
    if (!txs)
        throw "Failed to unstake";
    const tx = txs[0];
    if (!tx)
        throw "Failed to unstake";
    return tx.tx;
};
/**
 * Convenience method to stake tokens
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool id
 * @param originalMintId - Original mint id
 * @param userOriginalMintTokenAccountId - User's original mint token account id
 * @param receiptType - (Optional) ReceiptType to be received back. If none provided, none will be claimed
 * @param user - (Optional) User pubkey in case the person paying for the transaction and
 * stake entry owner are different
 * @param amount - (Optional) Amount of tokens to be staked, defaults to 1
 * @returns
 */
export const stakeAll = async (connection, wallet, params) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    /////// derive ids ///////
    const mintMetadataIds = params.mintInfos.map(({ mintId }) => findMintMetadataId(mintId));
    const mintInfos = params.mintInfos.map(({ mintId, fungible, ...rest }) => ({
        ...rest,
        mintId,
        fungible,
        stakeEntryId: findStakeEntryId(wallet.publicKey, params.stakePoolId, mintId, fungible !== null && fungible !== void 0 ? fungible : false),
    }));
    /////// get accounts ///////
    const accountData = await fetchAccountDataById(connection, [
        params.stakePoolId,
        ...mintInfos.map(({ stakeEntryId }) => stakeEntryId),
        ...mintMetadataIds,
    ]);
    /////// preTxs ///////
    const preTxs = [];
    const mintInfosWithReceipts = mintInfos.filter((i) => i.receiptType === ReceiptType.Receipt);
    const mintReceiptIds = {};
    if (mintInfosWithReceipts.length > 0) {
        for (let i = 0; i < mintInfosWithReceipts.length; i++) {
            const { mintId, stakeEntryId } = mintInfosWithReceipts[i];
            const transaction = new Transaction();
            const stakeEntryInfo = (_a = accountData[stakeEntryId.toString()]) !== null && _a !== void 0 ? _a : null;
            const stakeEntryData = stakeEntryInfo
                ? tryDecodeIdlAccount(stakeEntryInfo, "stakeEntry", STAKE_POOL_IDL)
                : null;
            const stakePoolInfo = (_b = accountData[params.stakePoolId.toString()]) !== null && _b !== void 0 ? _b : null;
            if (!stakePoolInfo)
                throw "Stake pool not found";
            const stakePoolData = decodeIdlAccount(stakePoolInfo, "stakePool", STAKE_POOL_IDL);
            if (!stakeEntryInfo) {
                const ix = await stakePoolProgram(connection, wallet)
                    .methods.initEntry(wallet.publicKey)
                    .accounts({
                    stakeEntry: stakeEntryId,
                    stakePool: params.stakePoolId,
                    originalMint: mintId,
                    originalMintMetadata: findMintMetadataId(mintId),
                    payer: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                    .remainingAccounts(remainingAccountsForInitStakeEntry(params.stakePoolId, mintId))
                    .instruction();
                transaction.add(ix);
            }
            let stakeMintKeypair;
            if (!((_c = stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed) === null || _c === void 0 ? void 0 : _c.stakeMint)) {
                stakeMintKeypair = Keypair.generate();
                await withInitStakeMint(transaction, connection, wallet, {
                    stakePoolId: params.stakePoolId,
                    stakeEntryId: stakeEntryId,
                    originalMintId: mintId,
                    stakeMintKeypair,
                    name: `POOl${stakePoolData.parsed.identifier.toString()} RECEIPT`,
                    symbol: `POOl${stakePoolData.parsed.identifier.toString()}`,
                });
                if (transaction.instructions.length > 0) {
                    mintReceiptIds[mintId.toString()] = stakeMintKeypair.publicKey;
                    preTxs.push({ tx: transaction, signers: [stakeMintKeypair] });
                }
            }
        }
    }
    const txs = [];
    for (let i = 0; i < mintInfos.length; i++) {
        const { mintId: originalMintId, tokenAccountId: userOriginalMintTokenAccountId, amount, receiptType, stakeEntryId, } = mintInfos[i];
        const mintMetadataId = findMintMetadataId(originalMintId);
        /////// deserialize accounts ///////
        const metadataAccountInfo = (_d = accountData[mintMetadataId.toString()]) !== null && _d !== void 0 ? _d : null;
        const mintMetadata = metadataAccountInfo
            ? Metadata.deserialize(metadataAccountInfo.data)[0]
            : null;
        const stakeEntryInfo = (_e = accountData[stakeEntryId.toString()]) !== null && _e !== void 0 ? _e : null;
        const stakeEntryData = stakeEntryInfo
            ? tryDecodeIdlAccount(stakeEntryInfo, "stakeEntry", STAKE_POOL_IDL)
            : null;
        /////// start transaction ///////
        const transaction = new Transaction();
        /////// init entry ///////
        if (!stakeEntryInfo) {
            const ix = await stakePoolProgram(connection, wallet)
                .methods.initEntry(wallet.publicKey)
                .accounts({
                stakeEntry: stakeEntryId,
                stakePool: params.stakePoolId,
                originalMint: originalMintId,
                originalMintMetadata: mintMetadataId,
                payer: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
                .remainingAccounts(remainingAccountsForInitStakeEntry(params.stakePoolId, originalMintId))
                .instruction();
            transaction.add(ix);
        }
        if ((mintMetadata === null || mintMetadata === void 0 ? void 0 : mintMetadata.tokenStandard) === TokenStandard.ProgrammableNonFungible
        // && mintMetadata.programmableConfig?.ruleSet
        ) {
            transaction.add(ComputeBudgetProgram.setComputeUnitLimit({
                units: 100000000,
            }));
            /////// programmable ///////
            transaction.add(await stakePoolProgram(connection, wallet)
                .methods.stakeProgrammable(amount !== null && amount !== void 0 ? amount : new BN(1))
                .accounts({
                stakeEntry: stakeEntryId,
                stakePool: params.stakePoolId,
                originalMint: originalMintId,
                systemProgram: SystemProgram.programId,
                user: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenMetadataProgram: METADATA_PROGRAM_ID,
                userOriginalMintTokenAccount: userOriginalMintTokenAccountId,
                userOriginalMintTokenRecord: findTokenRecordId(originalMintId, userOriginalMintTokenAccountId),
                mintMetadata: mintMetadataId,
                mintEdition: findMintEditionId(originalMintId),
                sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                authorizationRules: (_g = (_f = mintMetadata.programmableConfig) === null || _f === void 0 ? void 0 : _f.ruleSet) !== null && _g !== void 0 ? _g : METADATA_PROGRAM_ID,
                authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
            })
                .instruction());
        }
        else {
            /////// non-programmable ///////
            const stakeEntryOriginalMintTokenAccountId = getAssociatedTokenAddressSync(originalMintId, stakeEntryId, true);
            transaction.add(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, stakeEntryOriginalMintTokenAccountId, stakeEntryId, originalMintId));
            const ix = await stakePoolProgram(connection, wallet)
                .methods.stake(amount || new BN(1))
                .accounts({
                stakeEntry: stakeEntryId,
                stakePool: params.stakePoolId,
                stakeEntryOriginalMintTokenAccount: stakeEntryOriginalMintTokenAccountId,
                originalMint: originalMintId,
                user: wallet.publicKey,
                userOriginalMintTokenAccount: userOriginalMintTokenAccountId,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
                .instruction();
            transaction.add(ix);
            /////// receipts ///////
            if (receiptType && receiptType !== ReceiptType.None) {
                const receiptMintId = receiptType === ReceiptType.Receipt
                    ? (_h = mintReceiptIds[originalMintId.toString()]) !== null && _h !== void 0 ? _h : (_j = stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed) === null || _j === void 0 ? void 0 : _j.stakeMint
                    : originalMintId;
                if (!receiptMintId) {
                    throw "Stake entry has no receipt mint and you are trying to stake using receipts. Initialize receipt mint first.";
                }
                if (((_k = stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed) === null || _k === void 0 ? void 0 : _k.stakeMintClaimed) ||
                    ((_l = stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed) === null || _l === void 0 ? void 0 : _l.originalMintClaimed)) {
                    throw "Receipt has already been claimed.";
                }
                if (!(stakeEntryData === null || stakeEntryData === void 0 ? void 0 : stakeEntryData.parsed) ||
                    stakeEntryData.parsed.amount.toNumber() === 0) {
                    const tokenManagerId = findTokenManagerAddress(receiptMintId);
                    const tokenManagerReceiptMintTokenAccountId = getAssociatedTokenAddressSync(receiptMintId, tokenManagerId, true);
                    transaction.add(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, tokenManagerReceiptMintTokenAccountId, tokenManagerId, receiptMintId));
                    const ix = await stakePoolProgram(connection, wallet)
                        .methods.claimReceiptMint()
                        .accounts({
                        stakeEntry: stakeEntryId,
                        originalMint: originalMintId,
                        receiptMint: receiptMintId,
                        stakeEntryReceiptMintTokenAccount: getAssociatedTokenAddressSync(receiptMintId, stakeEntryId, true),
                        user: wallet.publicKey,
                        userReceiptMintTokenAccount: getAssociatedTokenAddressSync(receiptMintId, wallet.publicKey, true),
                        tokenManagerReceiptMintTokenAccount: tokenManagerReceiptMintTokenAccountId,
                        tokenManager: tokenManagerId,
                        mintCounter: findMintCounterId(receiptMintId),
                        tokenProgram: TOKEN_PROGRAM_ID,
                        tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                        .remainingAccounts(getRemainingAccountsForKind(receiptMintId, receiptType === ReceiptType.Original
                        ? TokenManagerKind.Edition
                        : TokenManagerKind.Managed))
                        .instruction();
                    transaction.add(ix);
                }
            }
        }
        txs.push({ tx: transaction });
    }
    return preTxs.length > 0 ? [preTxs, txs] : [txs];
};
export const unstake = async (connection, wallet, params) => {
    const txSeq = await unstakeAll(connection, wallet, {
        stakePoolId: params.stakePoolId,
        mintInfos: [
            {
                mintId: params.originalMintId,
                fungible: params.fungible,
                stakeEntryId: params.stakeEntryId,
            },
        ],
    });
    const txs = txSeq[0];
    if (!txs)
        throw "Failed to unstake";
    const tx = txs[0];
    if (!tx)
        throw "Failed to unstake";
    return tx.tx;
};
/**
 * Convenience method to unstake tokens
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @returns
 */
export const unstakeAll = async (connection, wallet, params) => {
    var _a, _b, _c, _d, _e;
    /////// derive ids ///////
    let mintInfos = [];
    for (const { mintId, fungible, stakeEntryId } of params.mintInfos) {
        const userOriginalMintTokenAccountId = await getTokenAddress(connection, mintId, wallet.publicKey);
        if (!userOriginalMintTokenAccountId) {
            continue;
        }
        mintInfos.push({
            mintId,
            fungible,
            mintMetadataId: findMintMetadataId(mintId),
            userOriginalMintTokenAccountId,
            stakeEntryId: stakeEntryId !== null && stakeEntryId !== void 0 ? stakeEntryId : findStakeEntryId(wallet.publicKey, params.stakePoolId, mintId, fungible !== null && fungible !== void 0 ? fungible : false),
        });
    }
    const rewardDistributorId = findRewardDistributorId(params.stakePoolId);
    /////// get accounts ///////
    const accountData = await fetchAccountDataById(connection, [
        rewardDistributorId,
        params.stakePoolId,
        ...mintInfos.map(({ mintMetadataId }) => mintMetadataId),
        ...mintInfos.map(({ stakeEntryId }) => stakeEntryId),
        ...mintInfos.map(({ mintId, userOriginalMintTokenAccountId }) => findTokenRecordId(mintId, userOriginalMintTokenAccountId)),
    ]);
    const stakePoolInfo = accountData[params.stakePoolId.toString()];
    if (!(stakePoolInfo === null || stakePoolInfo === void 0 ? void 0 : stakePoolInfo.data))
        throw "Stake pool not found";
    const stakePoolData = decodeIdlAccount(stakePoolInfo, "stakePool", STAKE_POOL_IDL);
    const rewardDistributorInfo = accountData[rewardDistributorId.toString()];
    const rewardDistributorData = rewardDistributorInfo
        ? tryDecodeIdlAccount(rewardDistributorInfo, "rewardDistributor", REWARD_DISTRIBUTOR_IDL)
        : null;
    const rewardMintId = (_a = rewardDistributorData === null || rewardDistributorData === void 0 ? void 0 : rewardDistributorData.parsed) === null || _a === void 0 ? void 0 : _a.rewardMint;
    const userRewardTokenAccountId = rewardMintId
        ? getAssociatedTokenAddressSync(rewardMintId, wallet.publicKey, true)
        : null;
    const txs = [];
    for (const { mintId: originalMintId, stakeEntryId, mintMetadataId, userOriginalMintTokenAccountId, } of mintInfos) {
        /////// deserialize accounts ///////
        const metadataAccountInfo = accountData[mintMetadataId.toString()];
        const mintMetadata = metadataAccountInfo
            ? Metadata.deserialize(metadataAccountInfo.data)[0]
            : null;
        const tokenRecordInfo = accountData[findTokenRecordId(originalMintId, userOriginalMintTokenAccountId).toString()];
        const tokenRecordData = tokenRecordInfo
            ? TokenRecord.fromAccountInfo(tokenRecordInfo)[0]
            : null;
        /////// start transaction ///////
        const tx = new Transaction();
        /////// init user token account ///////
        /*
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            userOriginalMintTokenAccountId,
            wallet.publicKey,
            originalMintId
          )
        );
        */
        if ((rewardDistributorData === null || rewardDistributorData === void 0 ? void 0 : rewardDistributorData.parsed) && userRewardTokenAccountId) {
            /////// update total stake seconds ///////
            const updateIx = await stakePoolProgram(connection, wallet)
                .methods.updateTotalStakeSeconds()
                .accounts({
                stakeEntry: stakeEntryId,
                lastStaker: wallet.publicKey,
            })
                .instruction();
            tx.add(updateIx);
            /////// claim rewards ///////
            const rewardEntryId = findRewardEntryId(rewardDistributorId, stakeEntryId);
            const rewardEntry = await tryGetAccount(() => getRewardEntry(connection, rewardEntryId));
            if (!rewardEntry) {
                const ix = await rewardDistributorProgram(connection, wallet)
                    .methods.initRewardEntry()
                    .accounts({
                    rewardEntry: findRewardEntryId(rewardDistributorId, stakeEntryId),
                    rewardDistributor: rewardDistributorId,
                    stakeEntry: stakeEntryId,
                    payer: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                    .instruction();
                tx.add(ix);
            }
            const stakeEntryInfo = accountData[stakeEntryId.toString()];
            const stakeEntryData = decodeIdlAccount(stakeEntryInfo, "stakeEntry", STAKE_POOL_IDL);
            const ix = await rewardDistributorProgram(connection, wallet)
                .methods.claimRewards()
                .accounts({
                rewardEntry: rewardEntryId,
                rewardDistributor: rewardDistributorId,
                stakeEntry: stakeEntryId,
                stakePool: params.stakePoolId,
                rewardMint: rewardDistributorData.parsed.rewardMint,
                userRewardMintTokenAccount: userRewardTokenAccountId,
                rewardManager: REWARD_MANAGER,
                user: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
                .remainingAccounts([
                {
                    pubkey: getAssociatedTokenAddressSync(rewardDistributorData.parsed.rewardMint, rewardDistributorId, true),
                    isSigner: false,
                    isWritable: true,
                },
            ])
                .instruction();
            if (!(rewardDistributorData.parsed.maxRewardSecondsReceived &&
                stakeEntryData.parsed.totalStakeSeconds >
                    rewardDistributorData.parsed.maxRewardSecondsReceived)) {
                tx.add(ix);
            }
        }
        if ((mintMetadata === null || mintMetadata === void 0 ? void 0 : mintMetadata.tokenStandard) === TokenStandard.ProgrammableNonFungible
            // && mintMetadata.programmableConfig?.ruleSet
            && (tokenRecordData === null || tokenRecordData === void 0 ? void 0 : tokenRecordData.delegateRole) === TokenDelegateRole.Staking) {
            /////// programmable ///////
            tx.add(ComputeBudgetProgram.setComputeUnitLimit({
                units: 100000000,
            }));
            const ix = await stakePoolProgram(connection, wallet)
                .methods.unstakeProgrammable()
                .accounts({
                stakeEntry: stakeEntryId,
                stakePool: params.stakePoolId,
                originalMint: originalMintId,
                systemProgram: SystemProgram.programId,
                user: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenMetadataProgram: METADATA_PROGRAM_ID,
                userOriginalMintTokenAccount: userOriginalMintTokenAccountId,
                userOriginalMintTokenRecord: findTokenRecordId(originalMintId, userOriginalMintTokenAccountId),
                mintMetadata: mintMetadataId,
                mintEdition: findMintEditionId(originalMintId),
                authorizationRules: (_c = (_b = mintMetadata.programmableConfig) === null || _b === void 0 ? void 0 : _b.ruleSet) !== null && _c !== void 0 ? _c : METADATA_PROGRAM_ID,
                sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
            })
                .instruction();
            tx.add(ix);
        }
        else {
            /////// non-programmable ///////
            const stakeEntryInfo = accountData[stakeEntryId.toString()];
            if (!stakeEntryInfo)
                throw "Stake entry not found";
            const stakeEntry = decodeIdlAccount(stakeEntryInfo, "stakeEntry", STAKE_POOL_IDL);
            if (stakeEntry.parsed.stakeMintClaimed ||
                stakeEntry.parsed.originalMintClaimed) {
                /////// receipts ///////
                const receiptMint = stakeEntry.parsed.stakeMint && stakeEntry.parsed.stakeMintClaimed
                    ? stakeEntry.parsed.stakeMint
                    : stakeEntry.parsed.originalMint;
                const tokenManagerId = findTokenManagerAddress(receiptMint);
                // todo network call in loop for token manager data
                const tokenManagerData = await tryNull(() => tokenManager.accounts.getTokenManager(connection, tokenManagerId));
                if (tokenManagerData &&
                    shouldReturnReceipt(stakePoolData.parsed, stakeEntry.parsed)) {
                    const remainingAccounts = await withRemainingAccountsForInvalidate(tx, connection, wallet, receiptMint, tokenManagerData, stakeEntryId, mintMetadata);
                    const ix = await stakePoolProgram(connection, wallet)
                        .methods.returnReceiptMint()
                        .accounts({
                        stakeEntry: stakeEntryId,
                        receiptMint: receiptMint,
                        tokenManager: tokenManagerId,
                        tokenManagerTokenAccount: getAssociatedTokenAddressSync(receiptMint, tokenManagerId, true),
                        userReceiptMintTokenAccount: getAssociatedTokenAddressSync(receiptMint, wallet.publicKey, true),
                        user: wallet.publicKey,
                        collector: CRANK_KEY,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                        .remainingAccounts(remainingAccounts)
                        .instruction();
                    tx.add(ix);
                }
            }
            const stakeEntryOriginalMintTokenAccountId = getAssociatedTokenAddressSync(originalMintId, stakeEntryId, true);
            const program = stakePoolProgram(connection, wallet);
            if ((tokenRecordData === null || tokenRecordData === void 0 ? void 0 : tokenRecordData.delegateRole) === TokenDelegateRole.Migration) {
                const ix = await program.methods
                    .unstakeCustodialProgrammable()
                    .accounts({
                    stakePool: params.stakePoolId,
                    stakeEntry: stakeEntryId,
                    originalMint: originalMintId,
                    stakeEntryOriginalMintTokenAccount: stakeEntryOriginalMintTokenAccountId,
                    user: wallet.publicKey,
                    userOriginalMintTokenAccount: userOriginalMintTokenAccountId,
                    stakeEntryOriginalMintTokenRecord: findTokenRecordId(originalMintId, stakeEntryOriginalMintTokenAccountId),
                    userOriginalMintTokenRecord: findTokenRecordId(originalMintId, userOriginalMintTokenAccountId),
                    mintMetadata: mintMetadataId,
                    mintEdition: findMintEditionId(originalMintId),
                    authorizationRules: (_e = (_d = mintMetadata === null || mintMetadata === void 0 ? void 0 : mintMetadata.programmableConfig) === null || _d === void 0 ? void 0 : _d.ruleSet) !== null && _e !== void 0 ? _e : METADATA_PROGRAM_ID,
                    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    tokenMetadataProgram: METADATA_PROGRAM_ID,
                    authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
                    systemProgram: SystemProgram.programId,
                })
                    .instruction();
                tx.add(ix);
            }
            else {
                const ix = await program.methods
                    .unstake()
                    .accounts({
                    stakePool: params.stakePoolId,
                    stakeEntry: stakeEntryId,
                    originalMint: originalMintId,
                    stakeEntryOriginalMintTokenAccount: stakeEntryOriginalMintTokenAccountId,
                    user: wallet.publicKey,
                    userOriginalMintTokenAccount: userOriginalMintTokenAccountId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                    .remainingAccounts(stakeEntry.parsed.stakeMint
                    ? [
                        {
                            pubkey: getAssociatedTokenAddressSync(stakeEntry.parsed.stakeMint, stakeEntryId, true),
                            isSigner: false,
                            isWritable: false,
                        },
                    ]
                    : [])
                    .instruction();
                tx.add(ix);
            }
        }
        txs.push({ tx });
    }
    /////// preTxs ///////
    let rewardTokenAccount = null;
    if (userRewardTokenAccountId && rewardMintId) {
        rewardTokenAccount = await tryNull(getAccount(connection, userRewardTokenAccountId));
    }
    return !rewardTokenAccount && userRewardTokenAccountId && rewardMintId
        ? [
            txs.slice(0, 1).map(({ tx }) => {
                tx.instructions = [
                    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userRewardTokenAccountId, wallet.publicKey, rewardMintId),
                    ...tx.instructions,
                ];
                return { tx };
            }),
            txs.slice(1),
        ]
        : [txs];
};
//# sourceMappingURL=api.js.map
import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  utils,
} from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair, PublicKey } from "@solana/web3.js";
import { STAKE_POOL_ADDRESS, STAKE_POOL_IDL } from ".";
import { AUTHORITY_OFFSET, POOL_OFFSET, STAKER_OFFSET } from "./constants";
import { findIdentifierId } from "./pda";
const getProgram = (connection) => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  return new Program(STAKE_POOL_IDL, STAKE_POOL_ADDRESS, provider);
};
export const getStakePool = async (connection, stakePoolId) => {
  const stakePoolProgram = getProgram(connection);
  const parsed = await stakePoolProgram.account.stakePool.fetch(stakePoolId);
  return {
    parsed,
    pubkey: stakePoolId,
  };
};
export const getStakePools = async (connection, stakePoolIds) => {
  const stakePoolProgram = getProgram(connection);
  const stakePools = await stakePoolProgram.account.stakePool.fetchMultiple(
    stakePoolIds
  );
  return stakePools.map((tm, i) => ({
    parsed: tm,
    pubkey: stakePoolIds[i],
  }));
};
export const getAllStakePools = async (connection) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("stakePool")
            ),
          },
        },
      ],
    }
  );
  const stakePoolDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakePoolData = coder.decode("stakePool", account.account.data);
      if (stakePoolData) {
        stakePoolDatas.push({
          ...account,
          parsed: stakePoolData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return stakePoolDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getStakeEntriesForUser = async (connection, user) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [{ memcmp: { offset: STAKER_OFFSET, bytes: user.toBase58() } }],
    }
  );
  const stakeEntryDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakeEntryData = coder.decode("stakeEntry", account.account.data);
      if (stakeEntryData) {
        stakeEntryDatas.push({
          ...account,
          parsed: stakeEntryData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });
  return stakeEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getAllActiveStakeEntries = async (connection) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("stakeEntry")
            ),
          },
        },
      ],
    }
  );
  const stakeEntryDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakeEntryData = coder.decode("stakeEntry", account.account.data);
      if (
        stakeEntryData &&
        stakeEntryData.lastStaker.toString() !== PublicKey.default.toString()
      ) {
        stakeEntryDatas.push({
          ...account,
          parsed: stakeEntryData,
        });
      }
    } catch (e) {
      // console.log(`Failed to decode stake entry data`);
    }
  });
  return stakeEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getAllStakeEntriesForPool = async (connection, stakePoolId) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("stakeEntry")
            ),
          },
        },
        {
          memcmp: { offset: POOL_OFFSET, bytes: stakePoolId.toBase58() },
        },
      ],
    }
  );
  const stakeEntryDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakeEntryData = coder.decode("stakeEntry", account.account.data);
      stakeEntryDatas.push({
        ...account,
        parsed: stakeEntryData,
      });
    } catch (e) {
      // console.log(`Failed to decode stake entry data`);
    }
  });
  return stakeEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getActiveStakeEntriesForPool = async (connection, stakePoolId) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: { offset: POOL_OFFSET, bytes: stakePoolId.toBase58() },
        },
      ],
    }
  );
  const stakeEntryDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakeEntryData = coder.decode("stakeEntry", account.account.data);
      if (
        stakeEntryData &&
        stakeEntryData.lastStaker.toString() !== PublicKey.default.toString()
      ) {
        stakeEntryDatas.push({
          ...account,
          parsed: stakeEntryData,
        });
      }
    } catch (e) {
      // console.log(`Failed to decode token manager data`);
    }
  });
  return stakeEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getStakeEntry = async (connection, stakeEntryId) => {
  const stakePoolProgram = getProgram(connection);
  const parsed = await stakePoolProgram.account.stakeEntry.fetch(stakeEntryId);
  return {
    parsed,
    pubkey: stakeEntryId,
  };
};
export const getStakeEntries = async (connection, stakeEntryIds) => {
  const stakePoolProgram = getProgram(connection);
  const stakeEntries = await stakePoolProgram.account.stakeEntry.fetchMultiple(
    stakeEntryIds
  );
  return stakeEntries.map((tm, i) => ({
    parsed: tm,
    pubkey: stakeEntryIds[i],
  }));
};
export const getPoolIdentifier = async (connection) => {
  const stakePoolProgram = getProgram(connection);
  const [identifierId] = await findIdentifierId();
  const parsed = await stakePoolProgram.account.identifier.fetch(identifierId);
  return {
    parsed,
    pubkey: identifierId,
  };
};
export const getStakeAuthorization = async (
  connection,
  stakeAuthorizationId
) => {
  const stakePoolProgram = getProgram(connection);
  const parsed = await stakePoolProgram.account.stakeAuthorizationRecord.fetch(
    stakeAuthorizationId
  );
  return {
    parsed,
    pubkey: stakeAuthorizationId,
  };
};
export const getStakeAuthorizations = async (
  connection,
  stakeAuthorizationIds
) => {
  const stakePoolProgram = getProgram(connection);
  const stakeAuthorizations =
    await stakePoolProgram.account.stakeAuthorizationRecord.fetchMultiple(
      stakeAuthorizationIds
    );
  return stakeAuthorizations.map((data, i) => ({
    parsed: data,
    pubkey: stakeAuthorizationIds[i],
  }));
};
export const getStakeAuthorizationsForPool = async (connection, poolId) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator(
                "stakeAuthorizationRecord"
              )
            ),
          },
        },
        {
          memcmp: { offset: POOL_OFFSET, bytes: poolId.toBase58() },
        },
      ],
    }
  );
  const stakeAuthorizationDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const data = coder.decode(
        "stakeAuthorizationRecord",
        account.account.data
      );
      stakeAuthorizationDatas.push({
        ...account,
        parsed: data,
      });
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return stakeAuthorizationDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getStakePoolsByAuthority = async (connection, user) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("stakePool")
            ),
          },
        },
        {
          memcmp: {
            offset: AUTHORITY_OFFSET,
            bytes: user.toBase58(),
          },
        },
      ],
    }
  );
  const stakePoolDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakePoolData = coder.decode("stakePool", account.account.data);
      if (stakePoolData) {
        stakePoolDatas.push({
          ...account,
          parsed: stakePoolData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return stakePoolDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getAllStakeEntries = async (connection) => {
  const programAccounts = await connection.getProgramAccounts(
    STAKE_POOL_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("stakeEntry")
            ),
          },
        },
      ],
    }
  );
  const stakeEntryDatas = [];
  const coder = new BorshAccountsCoder(STAKE_POOL_IDL);
  programAccounts.forEach((account) => {
    try {
      const stakeEntryData = coder.decode("stakeEntry", account.account.data);
      if (stakeEntryData) {
        stakeEntryDatas.push({
          ...account,
          parsed: stakeEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return stakeEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
export const getStakeBooster = async (connection, stakeBoosterId) => {
  const stakePoolProgram = getProgram(connection);
  const parsed = await stakePoolProgram.account.stakeBooster.fetch(
    stakeBoosterId
  );
  return {
    parsed,
    pubkey: stakeBoosterId,
  };
};
//# sourceMappingURL=accounts.js.map

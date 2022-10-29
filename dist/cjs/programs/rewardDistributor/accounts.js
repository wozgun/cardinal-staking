"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRewardEntries =
  exports.getRewardEntriesForRewardDistributor =
  exports.getRewardDistributors =
  exports.getRewardDistributor =
  exports.getRewardEntries =
  exports.getRewardEntry =
    void 0;
const anchor_1 = require("@project-serum/anchor");
const solana_contrib_1 = require("@saberhq/solana-contrib");
const web3_js_1 = require("@solana/web3.js");
const _1 = require(".");
const getProgram = (connection) => {
  const provider = new anchor_1.AnchorProvider(
    connection,
    new solana_contrib_1.SignerWallet(web3_js_1.Keypair.generate()),
    {}
  );
  return new anchor_1.Program(
    _1.REWARD_DISTRIBUTOR_IDL,
    _1.REWARD_DISTRIBUTOR_ADDRESS,
    provider
  );
};
const getRewardEntry = async (connection, rewardEntryId) => {
  const rewardDistributorProgram = getProgram(connection);
  const parsed = await rewardDistributorProgram.account.rewardEntry.fetch(
    rewardEntryId
  );
  return {
    parsed,
    pubkey: rewardEntryId,
  };
};
exports.getRewardEntry = getRewardEntry;
const getRewardEntries = async (connection, rewardEntryIds) => {
  const rewardDistributorProgram = getProgram(connection);
  const rewardEntries =
    await rewardDistributorProgram.account.rewardEntry.fetchMultiple(
      rewardEntryIds
    );
  return rewardEntries.map((entry, i) => ({
    parsed: entry,
    pubkey: rewardEntryIds[i],
  }));
};
exports.getRewardEntries = getRewardEntries;
const getRewardDistributor = async (connection, rewardDistributorId) => {
  const rewardDistributorProgram = getProgram(connection);
  const parsed = await rewardDistributorProgram.account.rewardDistributor.fetch(
    rewardDistributorId
  );
  return {
    parsed,
    pubkey: rewardDistributorId,
  };
};
exports.getRewardDistributor = getRewardDistributor;
const getRewardDistributors = async (connection, rewardDistributorIds) => {
  const rewardDistributorProgram = getProgram(connection);
  const rewardDistributors =
    await rewardDistributorProgram.account.rewardDistributor.fetchMultiple(
      rewardDistributorIds
    );
  return rewardDistributors.map((distributor, i) => ({
    parsed: distributor,
    pubkey: rewardDistributorIds[i],
  }));
};
exports.getRewardDistributors = getRewardDistributors;
const getRewardEntriesForRewardDistributor = async (
  connection,
  rewardDistributorId
) => {
  const programAccounts = await connection.getProgramAccounts(
    _1.REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor_1.utils.bytes.bs58.encode(
              anchor_1.BorshAccountsCoder.accountDiscriminator("rewardEntry")
            ),
          },
        },
        {
          memcmp: {
            offset: 41,
            bytes: rewardDistributorId.toBase58(),
          },
        },
      ],
    }
  );
  const rewardEntryDatas = [];
  const coder = new anchor_1.BorshAccountsCoder(_1.REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const rewardEntryData = coder.decode("rewardEntry", account.account.data);
      if (rewardEntryData) {
        rewardEntryDatas.push({
          ...account,
          parsed: rewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return rewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
exports.getRewardEntriesForRewardDistributor =
  getRewardEntriesForRewardDistributor;
const getAllRewardEntries = async (connection) => {
  const programAccounts = await connection.getProgramAccounts(
    _1.REWARD_DISTRIBUTOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: anchor_1.utils.bytes.bs58.encode(
              anchor_1.BorshAccountsCoder.accountDiscriminator("rewardEntry")
            ),
          },
        },
      ],
    }
  );
  const rewardEntryDatas = [];
  const coder = new anchor_1.BorshAccountsCoder(_1.REWARD_DISTRIBUTOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const rewardEntryData = coder.decode("rewardEntry", account.account.data);
      if (rewardEntryData) {
        rewardEntryDatas.push({
          ...account,
          parsed: rewardEntryData,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });
  return rewardEntryDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
exports.getAllRewardEntries = getAllRewardEntries;
//# sourceMappingURL=accounts.js.map
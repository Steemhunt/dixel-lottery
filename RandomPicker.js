import CONFIG from "./config";
import calculateBestRpc from "./utils/bestRPC";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import EthDater from "ethereum-block-by-date";
import moment from "moment-timezone";
import Discord from "./Discord";

export default class RandomPicker {
  provider;
  tipContract;
  discord;

  constructor() {
    this.discord = new Discord();
  }

  async init() {
    const bestRPC = await calculateBestRpc();
    console.log("provider", bestRPC);
    this.provider = new ethers.providers.JsonRpcProvider(bestRPC.url);
    this.tipContract = new ethers.Contract(CONFIG.tip.contract, CONFIG.tip.abi, this.provider);
    this.nftContract = new ethers.Contract(CONFIG.nft.contract, CONFIG.nft.abi, this.provider);
  }

  async calculateDayAgoBlock() {
    // 86400 seconds in a day
    // average of ~28600 blocks per day
    const dater = new EthDater(
      this.provider // Ethers provider, required.
    );

    const block = await dater.getDate(
      moment().subtract(1, "days") // Unix timestamp, required.
    );

    return block;
  }

  pick(options) {
    var i;

    var weights = [];

    for (i = 0; i < options.length; i++) weights[i] = options[i].chance + (weights[i - 1] || 0);

    var random = Math.random() * weights[weights.length - 1];

    for (i = 0; i < weights.length; i++) if (weights[i] > random) break;

    return options[i];
  }

  async calculate() {
    try {
      await this.init();
      const dater = new EthDater(
        this.provider // Ethers provider, required.
      );
      const todayAt9Date = new Date().setUTCHours(0, 0, 0, 0);
      const recentBlock = await dater.getDate(moment(todayAt9Date));
      const currentBlockNumber = recentBlock.block;
      const blockDayAgo = await dater.getDate(moment(todayAt9Date).subtract(1, "days"));

      let events = [];
      console.log(recentBlock.timestamp);
      await this.discord.info(
        `Calculating tip events from Block ${
          blockDayAgo.block
        } to Block ${currentBlockNumber} 🧮\nFrom timestamp: ${moment(blockDayAgo.timestamp * 1000)
          .tz("UTC")
          .format("YYYY-MM-DD HH:mm:ss Z")}\nTo timestamp: ${moment(recentBlock.timestamp * 1000)
          .tz("UTC")
          .format("YYYY-MM-DD HH:mm:ss Z")}`
      );

      const getEventsUntil = async (startBlock, currentBlock, onComplete) => {
        if (startBlock >= currentBlock) {
          onComplete();
          return;
        }

        try {
          const blocksToSubtract = Math.min(currentBlock - startBlock, 5000);
          console.log("blocks to subtract", blocksToSubtract);
          console.log("calculating block from", currentBlock - blocksToSubtract, "to", currentBlock);
          const e = await this.nftContract.queryFilter("Mint", currentBlock - blocksToSubtract, currentBlock);
          console.log(e.length, "mint events found");
          events = events.concat(e);
          getEventsUntil(startBlock, currentBlock - blocksToSubtract - 1, onComplete);
        } catch (e) {
          console.error(e);
          console.log("something went wrong. trying again with the same params");
          getEventsUntil(startBlock, currentBlock, onComplete);
        }
      };

      console.log("calculating events from", blockDayAgo.block, "to", currentBlockNumber);

      await getEventsUntil(blockDayAgo.block, currentBlockNumber, async () => {
        if (events.length === 0) {
          await this.discord.info(`No events found in the last 24 hours. Terminating BOT.`);
          return;
        }

        await this.discord.info(`Total of ${events.length} Mint events found! 🎉`);
        console.log("total of", events.length, "mint events found!");

        let resultMap = {};
        let chances = [];
        let totalTipAmount = 0;

        await this.discord.info("Calculating chances for each NFT 🤓");
        for (const event of events) {
          const { tokenId } = event.args;
          const tipAmount = await this.tipContract.totalBurnValue(tokenId);
          const id = tokenId.toString();
          const amount = new BigNumber(tipAmount.toString()).dividedBy(1e18).toNumber();
          resultMap[id] = amount;
          totalTipAmount += amount;
        }

        console.log(resultMap);

        let msg = "";

        for (const id in resultMap) {
          const amount = resultMap[id];
          const chance = (amount / totalTipAmount) * 100;
          chances.push({ id, chance });
          msg += `Edition #${id} - ${amount.toFixed(2)} DIXEL burn value (${chance.toFixed(5)}% chance)\n`;
        }

        await this.discord.sendEmbed("Lottery chances 🎲", msg);
        await this.discord.sendEmbed("Choosing a lucky winner 🤔", "Please wait until the calculations are complete.");
        const chosen = this.pick(chances);
        await this.discord.success(`Chose Edition #${chosen.id}! Congratulations🎉`);
      });
    } catch (e) {
      console.error(e);
      this.discord.error("Something went wrong with the RPC server. Trying calculations again 😿");
      this.calculate();
    }
  }
}

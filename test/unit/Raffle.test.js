const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", () => {
      let raffle, vrfCoordinatorV2_5Mock, deployer, entranceFee
      const chainId = network.config.chainId
      const currNetworkConfig = networkConfig[chainId]

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")

        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock", deployer)
        entranceFee = await raffle.getEntranceFee()
      })

      describe("constructor", () => {
        it("Initializes the raffle correctly", async () => {
          // Ideally we make our tests have just 1 assert per "it"
          const raffleState = await raffle.getRaffleState()
          // console.log("🚀 ~ it ~ raffleState:", raffleState)
          assert.equal(raffleState, 0)
          const interval = await raffle.getInterval()
          assert.equal(interval, currNetworkConfig.interval)
        })
      })

      describe("enterRaffle", () => {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughETHEntered",
          )
        })
        it("records players when they enter", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          const player = await raffle.getPlayer(0)
          assert.equal(player, deployer)
        })
        it("emits event on enter", async () => {
          await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(raffle, "RaffleEnter")
        })
      })
    })

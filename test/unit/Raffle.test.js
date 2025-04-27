const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

// unit test only run on a local network
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", () => {
      let raffle, vrfCoordinatorV2_5Mock, deployer, entranceFee, interval
      const chainId = network.config.chainId
      const currNetworkConfig = networkConfig[chainId]

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")

        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock", deployer)
        entranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })

      describe("constructor", () => {
        it("Initializes the raffle correctly", async () => {
          // Ideally we make our tests have just 1 assert per "it"
          const raffleState = await raffle.getRaffleState()
          // console.log("🚀 ~ it ~ raffleState:", raffleState)
          assert.equal(raffleState, 0)
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
        it("doesn't allow entrance when raffle is caculating", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          // see: https://hardhat.org/hardhat-network/docs/reference#evm_increasetime
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine")
          // we pretend to be a Chainlink Keeper
          await raffle.performUpkeep("0x")
          await expect(raffle.enterRaffle({ value: entranceFee })).to.revertedWithCustomError(
            raffle,
            "Raffle__NotOpen",
          )
        })
      })

      describe("checkUpkeep", () => {
        it("returns false if people haven't send any ETH", async () => {
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
          // console.log("🚀 ~ it ~ upkeepNeeded:", upkeepNeeded)
          assert(!upkeepNeeded)
        })

        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine")
          await raffle.performUpkeep("0x")
          const raffleState = await raffle.getRaffleState()
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
          assert.equal(raffleState, 1)
          assert.equal(upkeepNeeded, false)
        })

        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) - 2]) // use a higher number here if this test fails
          await network.provider.send("evm_mine")
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
          // console.log("🚀 ~ it ~ upkeepNeeded:", upkeepNeeded)
          assert(!upkeepNeeded)
        })

        it("return true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.request({ method: "evm_mine", params: [] })
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
          assert(upkeepNeeded)
        })
      })

      describe("performUpkeep", () => {
        it("it can only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine")
          const tx = await raffle.performUpkeep("0x")
          assert(tx)
        })

        it("reverts when checkUpkeep is false", async () => {
          await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
            raffle,
            "Raffle__UpkeepNotNeeded",
          )
        })

        it("updates the raffle state, emits an event, and calls the vrf coordinator", async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine")
          const txResponse = await raffle.performUpkeep("0x")
          const txReceipt = await txResponse.wait(1)
          // console.log("txReceipt.events", txReceipt.events)
          // console.log("txReceipt.logs", txReceipt.logs)
          // https://docs.ethers.org/v6/api/contract/#ContractTransactionReceipt-logs
          const requestId = txReceipt.logs[1].args[0]
          console.log("🚀 ~ it ~ requestId:", requestId)
          const raffleState = await raffle.getRaffleState()
          assert(requestId > 0)
          assert(raffleState === 1n)
        })
      })

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [Number(interval) + 1])
          await network.provider.send("evm_mine")
        })

        it("can only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(0, raffle.target),
          ).to.be.revertedWithCustomError(vrfCoordinatorV2_5Mock, "InvalidRequest")
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(1, raffle.target),
          ).to.be.revertedWithCustomError(vrfCoordinatorV2_5Mock, "InvalidRequest")
        })

        it("picks a winner, resets the lottery, and sends money", async () => {
          const numAdditionalEntrants = 3
          const startingAccountIndex = 1 // 0 is the deployer
          const accounts = await ethers.getSigners()
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + numAdditionalEntrants;
            i++
          ) {
            const accountConnectedRaffle = await raffle.connect(accounts[i])
            await accountConnectedRaffle.enterRaffle({ value: entranceFee })
          }

          const startingTimestamp = await raffle.getTimestamp()

          // performUpkeep (mock being Chainlink Keepers)
          // fulfillRandomWords (mock being Chainlink VRF)
          // we will have to wait for the fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            let winnerStartingBalance = 0n

            // Setting up the listener
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event!")
              try {
                const recentWinner = await raffle.getRecentWinner()
                console.log("🚀 ~ raffle.once ~ recentWinner:", recentWinner)
                console.log(accounts[0].address)
                console.log(accounts[1].address) // recentWinner
                console.log(accounts[2].address)
                console.log(accounts[3].address)
                const raffleState = await raffle.getRaffleState()
                const numberOfPlayers = await raffle.getNumberOfPlayers()
                const endingTimestamp = await raffle.getTimestamp()
                const winnerEndingBalance = await ethers.provider.getBalance(recentWinner)

                assert(recentWinner, accounts[1].address)
                assert.equal(raffleState, 0)
                assert.equal(numberOfPlayers, 0)
                assert(endingTimestamp > startingTimestamp)
                assert.equal(
                  winnerEndingBalance,
                  winnerStartingBalance + entranceFee * BigInt(1 + numAdditionalEntrants),
                )

                resolve()
              } catch (error) {
                reject(error)
              }
            })
            // below, we will fire the event, and the listener will pick it up, and resolve

            try {
              // mocking the Chainlink Keepers
              const txResponse = await raffle.performUpkeep("0x")
              const txReceipt = await txResponse.wait(1)

              winnerStartingBalance = await ethers.provider.getBalance(accounts[1].address)
              console.log("🚀 ~ awaitnewPromise ~ winnerStartingBalance:", winnerStartingBalance)

              // mocking the Chainlink VRF
              await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                txReceipt.logs[1].args[0],
                raffle.target,
              )
            } catch (error) {
              console.log(error)
              reject(error)
            }
          })
        })
      })
    })

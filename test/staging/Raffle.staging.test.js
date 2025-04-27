// when it come to our staging tests, we only want our staging tests run when we're on a test net
// we don't need to run our unit tests because out unit tests aren't checking that compatiility With a test net

// 1. Get our SubId for Chainlink VRF
// 2. Deploy our contract using SubId
// 3. Register the contract with Chainlink VRF & it's SubId
// 4. Register the contract with Chainlink Keepers
// 5. Run staging tests

const { network, getNamedAccounts, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { expect, assert } = require("chai")

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", async () => {
      let raffle, deployer, entranceFee

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer

        raffle = await ethers.getContract("Raffle", deployer)
        entranceFee = await raffle.getEntranceFee()
      })

      describe("fulfillRandomWords", () => {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
          const startingTimestamp = await raffle.getTimestamp()
          const accounts = await ethers.getSigners()

          await new Promise(async (resolve, reject) => {
            let winnerStartingBalance = 0n
            // setup listener before we enter the raffle
            // just in case the blockchain moves REALLY fast
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!")
              try {
                // add our asserts here
                const recentWinner = await raffle.getRecentWinner()
                const raffleState = await raffle.getRaffleState()
                const winnerEndingBalance = await ethers.provider.getBalance(recentWinner)
                console.log("🚀 ~ raffle.once ~ winnerEndingBalance:", winnerEndingBalance)
                const endingTimestamp = await raffle.getTimestamp()

                await expect(raffle.getPlayer(0)).to.be.reverted
                assert.equal(recentWinner, accounts[0].address)
                assert.equal(recentWinner, deployer)
                assert.equal(raffleState, 0)
                assert.equal(winnerEndingBalance, winnerStartingBalance + entranceFee)
                assert(endingTimestamp > startingTimestamp)

                resolve()
              } catch (e) {
                reject(e)
              }
            })

            // then entering the raffle
            console.log("Entering Raffle...")
            const txResponse = await raffle.enterRaffle({ value: entranceFee })
            console.log("Ok, time to wait...")
            await txResponse.wait(1)

            winnerStartingBalance = await ethers.provider.getBalance(accounts[0].address)
            console.log("🚀 ~ awaitnewPromise ~ winnerStartingBalance:", winnerStartingBalance)

            // and this code WON'T complete until our listener has finished listening!
          })
        })
      })
    })

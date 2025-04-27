import { run } from "hardhat"

export const verify = async (contractAddress: string, args: any[]) => {
  console.log(`Verifying contract ${contractAddress}...`)
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (error) {
    console.log("Error verifying contract", error)
  }
}

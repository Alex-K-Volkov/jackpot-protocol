// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import { JackpotTicket } from "../src/JackpotTicket.sol";
import { JackpotLottery } from "../src/JackpotLottery.sol";

contract DeployJackpot is Script {

    // We don't need a real USDC address for local testing. We'll use a placeholder.
    address constant MOCK_USDC_ADDRESS = 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2;

    function run() external {
        vm.startBroadcast();

        // 1. Deploy the Ticket NFT contract
        JackpotTicket ticketContract = new JackpotTicket();
        console.log("JackpotTicket NFT contract deployed at:", address(ticketContract));

        // 2. Deploy the main Lottery contract
        JackpotLottery lotteryContract = new JackpotLottery(address(ticketContract), MOCK_USDC_ADDRESS);
        console.log("JackpotLottery main contract deployed at:", address(lotteryContract));

        // 3. Transfer ownership of the Ticket contract to the Lottery contract
        ticketContract.transferOwnership(address(lotteryContract));
        console.log("JackpotTicket ownership transferred to JackpotLottery.");

        vm.stopBroadcast();
    }
}

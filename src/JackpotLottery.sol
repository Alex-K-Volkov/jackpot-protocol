// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./JackpotTicket.sol";

interface IUSDC {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract JackpotLottery {
    address public owner;
    JackpotTicket public immutable ticketContract;
    IUSDC public immutable usdcContract;

    uint256 public constant TICKET_PRICE = 1 * 10**6; // $1 in USDC (6 decimals)
    uint256 public constant JACKPOT_SHARE_BPS = 8000; // 80%
    uint256 public constant PROTOCOL_SHARE_BPS = 2000; // 20%
    uint256 public constant BPS_DIVIDER = 10000;

    enum Status { Open, Closed, Finalized }
    Status public lotteryStatus;

    uint256 public lastLotteryId;
    mapping(uint256 => Lottery) public lotteries;

    struct Lottery {
        uint256 startTime;
        uint256 endTime;
        bytes32 commitment;
        uint256 winningTicketId;
        address winner;
        uint256 totalPrize;
    }

    event LotteryStarted(uint256 indexed lotteryId, uint256 endTime);
    event TicketPurchased(uint256 indexed lotteryId, address indexed player, uint256 indexed ticketId);
    event LotteryFinalized(uint256 indexed lotteryId, uint256 winningTicketId, address indexed winner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _ticketAddress, address _usdcAddress) {
        owner = msg.sender;
        ticketContract = JackpotTicket(_ticketAddress);
        usdcContract = IUSDC(_usdcAddress);
        lotteryStatus = Status.Closed;
    }

    function buyTicket() external {
        require(lotteryStatus == Status.Open, "Lottery is not open");
        require(block.timestamp < lotteries[lastLotteryId].endTime, "Lottery has ended");

        usdcContract.transferFrom(msg.sender, address(this), TICKET_PRICE);
        uint256 newTicketId = ticketContract.mintTicket(msg.sender);

        emit TicketPurchased(lastLotteryId, msg.sender, newTicketId);
    }

    function startNewLottery(uint256 durationInSeconds, bytes32 _commitment) external onlyOwner {
        require(lotteryStatus != Status.Open, "A lottery is already open");

        lastLotteryId++;
        lotteryStatus = Status.Open;

        Lottery storage newLottery = lotteries[lastLotteryId];
        newLottery.startTime = block.timestamp;
        newLottery.endTime = block.timestamp + durationInSeconds;
        newLottery.commitment = _commitment;

        emit LotteryStarted(lastLotteryId, newLottery.endTime);
    }

    function finalizeLottery(bytes32 _revealValue) external onlyOwner {
        require(lotteryStatus == Status.Open, "Lottery is not open");
        Lottery storage currentLottery = lotteries[lastLotteryId];
        require(block.timestamp >= currentLottery.endTime, "Lottery has not ended yet");
        
        require(keccak256(abi.encodePacked(_revealValue)) == currentLottery.commitment, "Invalid reveal");

        lotteryStatus = Status.Closed;

        uint256 totalTickets = ticketContract.getTotalTickets();
        require(totalTickets > 0, "No tickets sold");

        uint256 random = uint256(keccak256(abi.encodePacked(
            _revealValue,
            blockhash(block.number - 1),
            block.timestamp
        )));
        
        uint256 winningTicketId = random % totalTickets;
        address winner = ticketContract.ownerOf(winningTicketId);

        currentLottery.winningTicketId = winningTicketId;
        currentLottery.winner = winner;

        uint256 totalBalance = usdcContract.balanceOf(address(this));
        uint256 jackpotAmount = (totalBalance * JACKPOT_SHARE_BPS) / BPS_DIVIDER;
        uint256 protocolFee = totalBalance - jackpotAmount;

        currentLottery.totalPrize = jackpotAmount;
        
        usdcContract.transfer(winner, jackpotAmount);
        usdcContract.transfer(owner, protocolFee);
        
        lotteryStatus = Status.Finalized;
        emit LotteryFinalized(lastLotteryId, winningTicketId, winner);
    }
}

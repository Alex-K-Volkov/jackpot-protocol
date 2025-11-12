// --- Mock Contract Addresses (to be replaced with actual deployed addresses) ---
// These are placeholders from our local Anvil deployment.
const JACKPOT_TICKET_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const JACKPOT_LOTTERY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Official USDC on Base Sepolia

// --- ABIs (Application Binary Interface) ---
// A simplified ABI for our contracts. We only include the functions we need.
const TICKET_ABI = [
    "function mintTicket(address player) returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)"
];
const LOTTERY_ABI = [
    "function buyTicket()",
    "function startNewLottery(uint256 durationInSeconds, bytes32 _commitment)",
    "function lotteryStatus() view returns (uint8)" // 0: Open, 1: Closed, 2: Finalized
];
const USDC_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)"
];

// --- Ethers.js Setup ---
let provider;
let signer;
let lotteryContract;
let usdcContract;

// --- DOM Elements ---
const buyTicketBtn = document.getElementById('buy-ticket-btn');
const jackpotAmountEl = document.getElementById('jackpot-amount');
const ticketsSoldEl = document.getElementById('tickets-sold');
const countdownTimerEl = document.getElementById('countdown-timer');

// --- Main Logic ---
async function init() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Connect button logic
        buyTicketBtn.addEventListener('click', handleBuyTicket);
        
        // Initial setup
        startDynamicUpdates();
        setupCountdown(new Date().getTime() + (24 * 60 * 60 * 1000)); // Mock countdown for 24 hours

    } else {
        buyTicketBtn.innerText = "Please Install MetaMask";
        buyTicketBtn.disabled = true;
        console.log('MetaMask is not installed.');
    }
}

async function handleBuyTicket() {
    try {
        // Request account access
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        console.log("User connected:", userAddress);

        // Instantiate contracts with the signer
        lotteryContract = new ethers.Contract(JACKPOT_LOTTERY_ADDRESS, LOTTERY_ABI, signer);
        usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

        // Step 1: Approve the Lottery contract to spend USDC
        console.log("Approving USDC spend...");
        const approveTx = await usdcContract.approve(JACKPOT_LOTTERY_ADDRESS, ethers.utils.parseUnits("1", 6)); // 1 USDC with 6 decimals
        await approveTx.wait();
        console.log("Approval successful!");

        // Step 2: Call the buyTicket function
        console.log("Buying ticket...");
        const buyTx = await lotteryContract.buyTicket();
        await buyTx.wait();
        
        alert("Congratulations! Your ticket has been purchased successfully.");
        console.log("Ticket purchase successful!");

    } catch (error) {
        console.error("Transaction failed:", error);
        alert("Transaction failed. Check the console for details.");
    }
}

// --- UI Dynamic Updates (for visual effect) ---
function startDynamicUpdates() {
    // Animate jackpot amount
    let jackpot = 1000000;
    setInterval(() => {
        jackpot += Math.random() * 100;
        jackpotAmountEl.innerText = `$${jackpot.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }, 2000);

    // Animate tickets sold
    let tickets = 1234567;
    setInterval(() => {
        tickets += Math.floor(Math.random() * 5);
        ticketsSoldEl.innerText = tickets.toLocaleString('en-US');
    }, 1500);
}

// --- Countdown Logic ---
function setupCountdown(targetDate) {
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = String(days).padStart(2, '0');
        document.getElementById('hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');

        if (distance < 0) {
            clearInterval(interval);
            countdownTimerEl.innerHTML = "DRAW IN PROGRESS";
        }
    }, 1000);
}

// --- Initialize the app ---
init();

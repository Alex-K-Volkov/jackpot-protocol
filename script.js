// Smart Contract Addresses Deployed on Base Sepolia
const JACKPOT_TICKET_ADDRESS = "0xe8Ed3abcd30CAC5755c18a76706dC6b75555D9e6";
const JACKPOT_LOTTERY_ADDRESS = "0x7eC05443F0782C13642750E028Cb0B207B9F9Ae7";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ABIs (Application Binary Interface) - Defines how to interact with the contracts
const LOTTERY_ABI = [
    "function buyTicket()",
    "function lotteryStatus() view returns (uint8)", // Enum Status: 0=Open, 1=Closed, 2=Finalized
    "function TICKET_PRICE() view returns (uint256)"
];
const USDC_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// --- Ethers.js Setup ---
let provider;
let signer;
let lotteryContract;
let usdcContract;

// --- DOM Elements ---
const actionBtn = document.getElementById('action-btn');
const statusDisplay = document.getElementById('status-display');
const jackpotAmountEl = document.getElementById('jackpot-amount');
const ticketsSoldEl = document.getElementById('tickets-sold');

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.ethereum === 'undefined') {
        updateStatus("Please install MetaMask to use this DApp.", true);
        actionBtn.innerText = "INSTALL METAMASK";
        action-btn.onclick = () => window.open("https://metamask.io/download/", "_blank");
        actionBtn.disabled = false;
        return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    actionBtn.onclick = connectAndBuy;

    // Check initial connection status
    try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            await setupDApp();
        } else {
            updateStatus("Connect your wallet to participate.", false);
            actionBtn.disabled = false;
        }
    } catch (e) {
        console.error("DApp setup failed on load:", e);
        updateStatus("Could not connect to wallet.", true);
    }
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            setupDApp();
        } else {
            resetDApp();
        }
    });

    startVisualUpdates();
});

async function connectAndBuy() {
    try {
        await provider.send("eth_requestAccounts", []);
        await setupDApp();
        
        // After connecting, if the button's purpose is to buy, proceed to buy
        // This check prevents auto-buying on first connect
        if (actionBtn.innerText.includes("BUY")) {
            handleBuyTicket();
        }

    } catch (error) {
        console.error("Connection failed:", error);
        updateStatus("Wallet connection failed.", true);
    }
}

async function setupDApp() {
    try {
        signer = provider.getSigner();
        lotteryContract = new ethers.Contract(JACKPOT_LOTTERY_ADDRESS, LOTTERY_ABI, signer);
        usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

        const lotteryStatus = await lotteryContract.lotteryStatus();
        if (lotteryStatus === 0) { // Status.Open
            updateStatus("Lottery is OPEN! Get your ticket now.", false);
            actionBtn.innerText = "BUY $1 TICKET";
            actionBtn.disabled = false;
            actionBtn.onclick = handleBuyTicket;
        } else {
            updateStatus("Lottery is currently closed. Awaiting next draw.", true);
            actionBtn.innerText = "LOTTERY CLOSED";
            actionBtn.disabled = true;
        }
    } catch (error) {
        console.error("Error setting up DApp:", error);
        updateStatus("Error connecting to contract. Check console.", true);
        actionBtn.disabled = true;
    }
}

function resetDApp() {
    updateStatus("Connect your wallet to participate.", false);
    actionBtn.innerText = "CONNECT WALLET";
    actionBtn.onclick = connectAndBuy;
    actionBtn.disabled = false;
}

async function handleBuyTicket() {
    if (!signer) {
        alert("Please connect your wallet first.");
        return;
    }
    
    actionBtn.disabled = true;
    actionBtn.innerText = "PROCESSING...";
    
    try {
        const userAddress = await signer.getAddress();
        const ticketPrice = await lotteryContract.TICKET_PRICE();

        // Check and request approval if necessary
        updateStatus("Checking USDC approval...", false);
        const allowance = await usdcContract.allowance(userAddress, JACKPOT_LOTTERY_ADDRESS);

        if (allowance.lt(ticketPrice)) {
            updateStatus("Requesting USDC approval...", false);
            const approveTx = await usdcContract.approve(JACKPOT_LOTTERY_ADDRESS, ticketPrice);
            await approveTx.wait();
            updateStatus("Approval successful! Now buying ticket...", false);
        } else {
            updateStatus("Approval found. Buying ticket...", false);
        }

        // Buy the ticket
        const buyTx = await lotteryContract.buyTicket();
        await buyTx.wait();
        
        updateStatus("Ticket purchased successfully!", false, 5000); // Show success for 5s
        alert("Congratulations! Your ticket has been purchased successfully.");

    } catch (error) {
        console.error("Transaction failed:", error);
        let errorMessage = "Transaction failed. Check console for details.";
        if (error.reason) {
            errorMessage = `Transaction failed: ${error.reason}`;
        }
        updateStatus(errorMessage, true);
        alert(errorMessage);
    } finally {
        // Reset button state after operation, which will re-check the lottery status
        await setupDApp(); 
    }
}

function updateStatus(message, isError, timeout = 0) {
    statusDisplay.innerText = message;
    statusDisplay.style.color = isError ? '#ff4d4d' : 'var(--primary-color)';
    if (timeout > 0) {
        setTimeout(() => {
            // After timeout, don't just clear, re-evaluate the state
            if (signer) {
                setupDApp();
            } else {
                resetDApp();
            }
        }, timeout);
    }
}

function startVisualUpdates() {
    let jackpot = 1000000;
    setInterval(() => {
        jackpot += Math.random() * 123.45;
        jackpotAmountEl.innerText = `$${jackpot.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }, 2500);

    let tickets = 0; // In a real app, you'd fetch this from the contract
    ticketsSoldEl.innerText = tickets;
}


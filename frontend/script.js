// --- Constants ---
const JACKPOT_LOTTERY_ADDRESS = "0x7eC05443F0782C13642750E028Cb0B207B9F9Ae7";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const LOTTERY_ABI = ["function buyTicket()", "function lotteryStatus() view returns (uint8)", "function TICKET_PRICE() view returns (uint256)"];
const USDC_ABI = ["function approve(address spender, uint256 amount) returns (bool)", "function allowance(address owner, address spender) view returns (uint256)"];

// 1. Get projectID from https://cloud.walletconnect.com
// Using a public example Project ID for now.
const projectId = '2d71170b7513eff1a5a8144b20cf2e4a'; 

// 2. Configure metadata
const metadata = {
    name: 'Jackpot Protocol',
    description: 'The Global, Provably-Fair On-Chain Lottery',
    url: 'https://jackpot-protocol.netlify.app',
    icons: ['https://jackpot-protocol.netlify.app/favicon.ico'] // Assuming you will add a favicon later
};

// 3. Create modal
const ethersConfig = {
    ethers: window.ethers,
    metadata
}

const modal = new window.EthersWeb3Modal(ethersConfig, projectId);

// --- Global Variables ---
let signer;
let lotteryContract;
let usdcContract;

// --- UI Elements ---
const actionBtn = document.getElementById('action-btn');
const statusDisplay = document.getElementById('status-display');

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state
    actionBtn.disabled = false;
    actionBtn.innerText = "CONNECT WALLET";
    statusDisplay.innerText = "Connect your wallet to participate.";
    actionBtn.onclick = () => modal.open();

    // Subscribe to connection changes
    modal.subscribeProvider(handleConnectionChange);
    
    startVisualUpdates();
});

async function handleConnectionChange({ provider, providerType, address, chainId, isConnected }) {
    if (isConnected) {
        actionBtn.disabled = true;
        actionBtn.innerText = "CHECKING STATUS...";
        statusDisplay.innerText = `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`;

        // We need to wrap the WalletConnect provider with ethers
        const ethersProvider = new ethers.providers.Web3Provider(provider);
        signer = ethersProvider.getSigner();
        
        await setupConnectedState();
    } else {
        resetToDisconnectedState();
    }
}

async function setupConnectedState() {
    try {
        lotteryContract = new ethers.Contract(JACKPOT_LOTTERY_ADDRESS, LOTTERY_ABI, signer);

        const network = await signer.provider.getNetwork();
        if (network.chainId !== 84532) { // Base Sepolia Chain ID
             updateStatus(`Please switch to Base Sepolia. You are on chain ${network.chainId}.`, true);
             actionBtn.innerText = "WRONG NETWORK";
             actionBtn.disabled = true;
             return;
        }

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
        console.error("Error setting up DApp state:", error);
        updateStatus("Error connecting to contracts. Check console.", true);
        actionBtn.disabled = true;
    }
}

function resetToDisconnectedState() {
    updateStatus("Connect your wallet to participate.", false);
    actionBtn.innerText = "CONNECT WALLET";
    actionBtn.onclick = () => modal.open();
    actionBtn.disabled = false;
    signer = null;
}

async function handleBuyTicket() {
    if (!signer) {
        alert("Wallet not connected.");
        return;
    }
    
    actionBtn.disabled = true;
    actionBtn.innerText = "PROCESSING...";
    
    try {
        usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        const userAddress = await signer.getAddress();
        const ticketPrice = await lotteryContract.TICKET_PRICE();

        updateStatus("Checking USDC approval...", false);
        const allowance = await usdcContract.allowance(userAddress, JACKPOT_LOTTERY_ADDRESS);

        if (allowance.lt(ticketPrice)) {
            updateStatus("Requesting USDC approval...", false);
            const approveTx = await usdcContract.approve(JACKPOT_LOTTERY_ADDRESS, ticketPrice);
            await approveTx.wait();
            updateStatus("Approval successful! Buying ticket...", false);
        } else {
            updateStatus("Approval found. Buying ticket...", false);
        }

        const buyTx = await lotteryContract.buyTicket({ gasLimit: 300000 });
        await buyTx.wait();
        
        alert("Congratulations! Your ticket has been purchased successfully.");
        updateStatus("Ticket purchased successfully!", false, 5000);

    } catch (error) {
        console.error("Transaction failed:", error);
        let errorMessage = "Transaction failed. Check console.";
        if (error.reason) errorMessage = `Transaction failed: ${error.reason}`;
        updateStatus(errorMessage, true);
        alert(errorMessage);
    } finally {
        await setupConnectedState(); 
    }
}

// --- Helper & Visual Functions ---
function updateStatus(message, isError, timeout = 0) {
    statusDisplay.innerText = message;
    statusDisplay.style.color = isError ? '#ff4d4d' : 'var(--primary-color)';
    // Simplified timeout logic for this version
}

function startVisualUpdates() {
    const jackpotAmountEl = document.getElementById('jackpot-amount');
    const ticketsSoldEl = document.getElementById('tickets-sold');
    if (!jackpotAmountEl || !ticketsSoldEl) return;
    
    let jackpot = 1000000;
    setInterval(() => {
        jackpot += Math.random() * 123.45;
        jackpotAmountEl.innerText = `$${jackpot.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }, 2500);

    ticketsSoldEl.innerText = 0;
}

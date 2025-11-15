// --- Smart Contract Addresses ---
const JACKPOT_TICKET_ADDRESS = "0xe8Ed3abcd30CAC5755c18a76706dC6b75555D9e6";
const JACKPOT_LOTTERY_ADDRESS = "0x7eC05443F0782C13642750E028Cb0B207B9F9Ae7";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// --- ABIs ---
const LOTTERY_ABI = ["function buyTicket()","function lotteryStatus() view returns (uint8)","function TICKET_PRICE() view returns (uint256)"];
const USDC_ABI = ["function approve(address spender, uint256 amount) returns (bool)","function allowance(address owner, address spender) view returns (uint256)"];

// --- Global Variables ---
let provider;
let signer;
let lotteryContract;
let usdcContract;

// --- Main Execution on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    // This is the entry point. We wait for the page to be fully loaded.
    initializeDApp();
});

async function initializeDApp() {
    // Find UI elements
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');

    // **FORTIFICATION**: Check if essential UI elements exist before doing anything.
    if (!actionBtn || !statusDisplay) {
        console.error("Critical UI elements not found. Aborting DApp initialization.");
        if(statusDisplay) statusDisplay.innerText = "Error: UI failed to load.";
        return;
    }

    // Check for MetaMask (the window.ethereum object)
    if (typeof window.ethereum === 'undefined') {
        updateStatus(statusDisplay, actionBtn, "Please install MetaMask to use this DApp.", true);
        actionBtn.innerText = "INSTALL METAMASK";
        actionBtn.onclick = () => window.open("https://metamask.io/download/", "_blank");
        actionBtn.disabled = false;
        return;
    }

    // If MetaMask is present, set up the provider
    provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Set the initial button action to connect the wallet
    actionBtn.onclick = () => connectWallet(statusDisplay, actionBtn);

    // Listen for account changes (connecting, disconnecting, switching accounts)
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            setupConnectedState(statusDisplay, actionBtn, accounts[0]);
        } else {
            resetToDisconnectedState(statusDisplay, actionBtn);
        }
    });

    // Try to get accounts on initial load without a prompt
    try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            await setupConnectedState(statusDisplay, actionBtn, accounts[0]);
        } else {
            resetToDisconnectedState(statusDisplay, actionBtn);
        }
    } catch (e) {
        console.error("DApp setup failed on load:", e);
        updateStatus(statusDisplay, actionBtn, "Could not connect to wallet. Please refresh.", true);
    }
    
    startVisualUpdates();
}

async function connectWallet(statusDisplay, actionBtn) {
    try {
        const accounts = await provider.send("eth_requestAccounts", []);
        await setupConnectedState(status_display, action-btn, accounts[0]);
    } catch (error) {
        console.error("Connection failed:", error);
        updateStatus(statusDisplay, actionBtn, "Wallet connection was rejected.", true);
    }
}

async function setupConnectedState(statusDisplay, actionBtn, account) {
    try {
        signer = provider.getSigner();
        lotteryContract = new ethers.Contract(JACKPOT_LOTTERY_ADDRESS, LOTTERY_ABI, signer);

        const network = await provider.getNetwork();
        if (network.chainId !== 84532) {
             updateStatus(statusDisplay, actionBtn, `Please switch to Base Sepolia. You are on chain ${network.chainId}.`, true);
             actionBtn.innerText = "WRONG NETWORK";
             actionBtn.disabled = true;
             return;
        }

        const lotteryStatus = await lotteryContract.lotteryStatus();
        if (lotteryStatus === 0) { // Status.Open
            updateStatus(statusDisplay, actionBtn, "Lottery is OPEN! Get your ticket now.", false);
            actionBtn.innerText = "BUY $1 TICKET";
            actionBtn.disabled = false;
            actionBtn.onclick = () => handleBuyTicket(statusDisplay, actionBtn);
        } else {
            updateStatus(statusDisplay, actionBtn, "Lottery is currently closed. Awaiting next draw.", true);
            actionBtn.innerText = "LOTTERY CLOSED";
            actionBtn.disabled = true;
        }
    } catch (error) {
        console.error("Error setting up DApp state:", error);
        updateStatus(statusDisplay, actionBtn, "Error connecting to contracts. Check console.", true);
        actionBtn.disabled = true;
    }
}

function resetToDisconnectedState(statusDisplay, actionBtn) {
    updateStatus(statusDisplay, actionBtn, "Connect your wallet to participate.", false);
    actionBtn.innerText = "CONNECT WALLET";
    actionBtn.onclick = () => connectWallet(statusDisplay, actionBtn);
    actionBtn.disabled = false;
}

async function handleBuyTicket(statusDisplay, actionBtn) {
    if (!signer) {
        alert("Please connect your wallet first.");
        return;
    }
    
    actionBtn.disabled = true;
    actionBtn.innerText = "PROCESSING...";
    
    try {
        const userAddress = await signer.getAddress();
        usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        const ticketPrice = await lotteryContract.TICKET_PRICE();

        updateStatus(statusDisplay, actionBtn, "Checking USDC approval...", false);
        const allowance = await usdcContract.allowance(userAddress, JACKPOT_LOTTERY_ADDRESS);

        if (allowance.lt(ticketPrice)) {
            updateStatus(statusDisplay, actionBtn, "Requesting USDC approval...", false);
            const approveTx = await usdcContract.approve(JACKPOT_LOTTERY_ADDRESS, ticketPrice);
            await approveTx.wait();
            updateStatus(statusDisplay, actionBtn, "Approval successful! Buying ticket...", false);
        } else {
            updateStatus(statusDisplay, actionBtn, "Approval found. Buying ticket...", false);
        }

        const buyTx = await lotteryContract.buyTicket({ gasLimit: 300000 });
        await buyTx.wait();
        
        alert("Congratulations! Your ticket has been purchased successfully.");
        updateStatus(statusDisplay, actionBtn, "Ticket purchased successfully!", false, 5000);

    } catch (error) {
        console.error("Transaction failed:", error);
        let errorMessage = "Transaction failed. Check console for details.";
        if (error.reason) {
            errorMessage = `Transaction failed: ${error.reason}`;
        }
        updateStatus(statusDisplay, actionBtn, errorMessage, true);
        alert(errorMessage);
    } finally {
        // Refresh the DApp state after the transaction attempt
        await setupConnectedState(statusDisplay, actionBtn, await signer.getAddress()); 
    }
}

function updateStatus(statusDisplay, actionBtn, message, isError, timeout = 0) {
    if (!statusDisplay) return;
    statusDisplay.innerText = message;
    statusDisplay.style.color = isError ? '#ff4d4d' : 'var(--primary-color)';
    if (timeout > 0) {
        setTimeout(() => {
            if (signer) {
                setupConnectedState(statusDisplay, actionBtn, signer.getAddress());
            } else {
                resetToDisconnectedState(statusDisplay, actionBtn);
            }
        }, timeout);
    }
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

    let tickets = 0;
    ticketsSoldEl.innerText = tickets;
}

// تنظیمات اصلی
const RECEIVER_ADDRESS = "0xa575349aa7A6C73C8C6C2a671Bd9e4c5EE424126"; 
const TICKET_PRICE_ETH = "0.0004"; 

// نود عمومی (برای خواندن موجودی بدون ولت)
const READ_PROVIDER = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");

document.addEventListener('DOMContentLoaded', async () => {
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');
    const jackpotEl = document.getElementById('jackpot-amount');

    // --- 1. آپدیت موجودی (Real-Time) ---
    async function updateRealJackpot() {
        try {
            const balanceWei = await READ_PROVIDER.getBalance(RECEIVER_ADDRESS);
            const balanceEth = ethers.utils.formatEther(balanceWei);
            const prizePool = parseFloat(balanceEth) / 2;
            if(jackpotEl) {
                jackpotEl.innerText = "Ξ " + prizePool.toFixed(4);
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
        }
    }
    updateRealJackpot();
    setInterval(updateRealJackpot, 15000);

    // --- 2. تشخیص موبایل و محیط متامسک ---
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // آیا الان داخل مرورگرِ خودِ متامسک هستیم؟
    const isInsideMetaMaskBrowser = typeof window.ethereum !== 'undefined' && isMobileDevice();

    if (actionBtn) {
        // حالت A: کاربر در کروم/سافاری موبایل است (باید اپ را باز کنیم)
        if (isMobileDevice() && typeof window.ethereum === 'undefined') {
            actionBtn.innerText = "OPEN IN METAMASK APP";
            statusDisplay.innerText = "Tap to launch App & Play";
            
            actionBtn.onclick = () => {
                // روش جدید و دقیق برای ساخت لینک
                // این دستور فقط آدرس دامنه و مسیر را می‌گیرد (بدون https مزاحم)
                const host = window.location.host;
                const path = window.location.pathname;
                const cleanUrl = host + path;
                
                // لینک مستقیم به مرورگر متامسک
                window.location.href = "https://metamask.app.link/dapp/" + cleanUrl;
            };
        }
        // حالت B: کاربر داخل خودِ متامسک است (یا روی کامپیوتر)
        else {
            // اگر داخل متامسک هستیم، دکمه را آماده کن
            if (isInsideMetaMaskBrowser) {
                actionBtn.innerText = "PAY 0.0004 ETH";
                statusDisplay.innerText = "Wallet Detected. Ready.";
            }

            actionBtn.onclick = connectAndPay;
        }
    }

    async function connectAndPay() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                
                actionBtn.innerText = "CONFIRMING...";
                actionBtn.disabled = true;

                await provider.send("eth_requestAccounts", []);
                const userAddress = await signer.getAddress();
                
                statusDisplay.innerText = `CONNECTED: ${userAddress.substring(0,6)}...`;
                statusDisplay.style.color = "#00ffff";
                
                const tx = {
                    to: RECEIVER_ADDRESS,
                    value: ethers.utils.parseEther(TICKET_PRICE_ETH)
                };

                const transaction = await signer.sendTransaction(tx);
                
                statusDisplay.innerText = "SENT! Waiting...";
                actionBtn.innerText = "PROCESSING...";

                await transaction.wait();

                statusDisplay.innerText = "SUCCESS! YOU ARE IN ✅";
                statusDisplay.style.color = "#39ff14";
                actionBtn.innerText = "BUY MORE";
                actionBtn.disabled = false;
                setTimeout(updateRealJackpot, 5000); 

            } catch (error) {
                console.error(error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    statusDisplay.innerText = "Cancelled.";
                } else if (error.message && error.message.includes("insufficient funds")) {
                    statusDisplay.innerText = "NO ETH FOR GAS!";
                } else {
                    statusDisplay.innerText = "ERROR. Try Again.";
                }
                statusDisplay.style.color = "red";
                
                if(isInsideMetaMaskBrowser) actionBtn.innerText = "PAY 0.0004 ETH";
                else actionBtn.innerText = "TRY AGAIN";
                
                actionBtn.disabled = false;
            }
        } else {
            statusDisplay.innerText = "MetaMask Not Found.";
            window.open("https://metamask.io/download/", "_blank");
        }
    }
});

// تنظیمات اصلی
const RECEIVER_ADDRESS = "0xa575349aa7A6C73C8C6C2a671Bd9e4c5EE424126"; 
const TICKET_PRICE_ETH = "0.0004"; 

// RPC عمومی و قوی
const READ_PROVIDER = new ethers.providers.JsonRpcProvider("https://eth.public-rpc.com");

document.addEventListener('DOMContentLoaded', async () => {
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');
    const jackpotEl = document.getElementById('jackpot-amount');
    const mobileInstruction = document.getElementById('mobile-instruction');

    // --- حافظه برای نگهداری آخرین عدد صحیح ---
    let lastValidPrize = null; 

    // --- 1. سیستم دریافت موجودی (با حافظه) ---
    async function updateRealJackpot() {
        if (!jackpotEl) return;

        // تایم‌اوت 4 ثانیه‌ای
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 4000)
        );

        try {
            const balanceWei = await Promise.race([
                READ_PROVIDER.getBalance(RECEIVER_ADDRESS),
                timeoutPromise
            ]);

            const balanceEth = ethers.utils.formatEther(balanceWei);
            const prizePool = parseFloat(balanceEth) / 2;
            
            // موفقیت! عدد را در حافظه ذخیره کن
            lastValidPrize = prizePool;
            
            // نمایش عدد جدید
            jackpotEl.innerText = "Ξ " + prizePool.toFixed(4);
            
        } catch (error) {
            console.log("Network issues. Keeping last known value.");
            
            // استراتژی هوشمند:
            // اگر قبلاً عددی داشتیم (مثلاً وسط استریم)، دست بهش نزن! (همان قبلی بماند)
            if (lastValidPrize !== null) {
                // هیچ کاری نکن، بذار عدد قبلی روی صفحه بمونه
            } 
            // اما اگر بار اوله و هنوز هیچی نداریم، صفر نشون بده که Loading نمونه
            else if (jackpotEl.innerText === "Loading...") {
                jackpotEl.innerText = "Ξ 0.0000";
            }
        }
    }

    // اجرای اولیه
    updateRealJackpot();
    // تکرار هر 10 ثانیه
    setInterval(updateRealJackpot, 10000);

    // --- 2. لاجیک موبایل و دکمه ---
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    const isInsideMetaMaskBrowser = typeof window.ethereum !== 'undefined' && isMobileDevice();

    if (actionBtn) {
        // موبایل خارج از اپ
        if (isMobileDevice() && typeof window.ethereum === 'undefined') {
            actionBtn.innerText = "OPEN IN METAMASK APP";
            statusDisplay.innerText = "Tap to launch App & Play";
            if(mobileInstruction) mobileInstruction.style.display = "block";

            actionBtn.onclick = () => {
                const host = window.location.host;
                const path = window.location.pathname;
                const cleanUrl = (host + path).replace('//', '/');
                window.location.href = "https://metamask.app.link/dapp/" + cleanUrl;
            };
        }
        // دسکتاپ یا داخل اپ
        else {
            if(mobileInstruction) mobileInstruction.style.display = "none";

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
                
                // تلاش سریع برای آپدیت عدد
                setTimeout(updateRealJackpot, 5000); 

            } catch (error) {
                console.error(error);
                if (error.code === 4001) statusDisplay.innerText = "Cancelled.";
                else if (error.message && error.message.includes("insufficient funds")) statusDisplay.innerText = "NO ETH FOR GAS!";
                else statusDisplay.innerText = "ERROR. Try Again.";
                
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

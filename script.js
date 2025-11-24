// تنظیمات اصلی
const RECEIVER_ADDRESS = "0xa575349aa7A6C73C8C6C2a671Bd9e4c5EE424126"; // ولت مقصد
const TICKET_PRICE_ETH = "0.0004"; // قیمت بلیط

// استفاده از نود عمومی Cloudflare برای خواندن اطلاعات (نیاز به متامسک ندارد)
const READ_PROVIDER = new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");

document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');
    const jackpotEl = document.getElementById('jackpot-amount');

    // --- بخش جدید: دریافت موجودی واقعی از بلاکچین ---
    async function updateRealJackpot() {
        try {
            // گرفتن موجودی کل ولت
            const balanceWei = await READ_PROVIDER.getBalance(RECEIVER_ADDRESS);
            const balanceEth = ethers.utils.formatEther(balanceWei);
            
            // محاسبه 50 درصد (منطق بیزنس ما)
            const prizePool = parseFloat(balanceEth) / 2;
            
            // نمایش عدد
            if(jackpotEl) {
                // اگر صفر بود، همان 0.0000 را نشان بده
                jackpotEl.innerText = "Ξ " + prizePool.toFixed(4);
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            // اگر ارور داد (مثلا اینترنت قطع بود)، فعلا خط تیره نشان بده
            if(jackpotEl && jackpotEl.innerText === "Loading...") {
                jackpotEl.innerText = "Ξ --.--";
            }
        }
    }

    // اجرای تابع بلافاصله بعد از لود شدن سایت
    updateRealJackpot();
    
    // آپدیت کردن موجودی هر 15 ثانیه یکبار (برای وقتی که وسط استریم پول واریز میشه)
    setInterval(updateRealJackpot, 15000);
    // -----------------------------------------------------


    // منطق دکمه خرید (تراکنش)
    if (actionBtn) {
        actionBtn.onclick = connectAndPay;
    }

    async function connectAndPay() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                
                actionBtn.innerText = "CONNECTING...";
                actionBtn.disabled = true;

                await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner();
                const userAddress = await signer.getAddress();
                
                statusDisplay.innerText = `CONNECTED: ${userAddress.substring(0,6)}...`;
                statusDisplay.style.color = "#00ffff";
                
                actionBtn.innerText = "CONFIRM 0.0004 ETH";
                const tx = {
                    to: RECEIVER_ADDRESS,
                    value: ethers.utils.parseEther(TICKET_PRICE_ETH)
                };

                const transaction = await signer.sendTransaction(tx);
                
                statusDisplay.innerText = "TRANSACTION SENT! Updating Pool...";
                actionBtn.innerText = "PROCESSING...";

                await transaction.wait();

                statusDisplay.innerText = "SUCCESS! YOU ARE IN ✅";
                statusDisplay.style.color = "#39ff14";
                actionBtn.innerText = "BUY MORE";
                actionBtn.disabled = false;
                
                // بعد از خرید موفق، بلافاصله موجودی رو آپدیت کن که کاربر ببینه عدد رفت بالا
                setTimeout(updateRealJackpot, 5000); 

            } catch (error) {
                console.error(error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    statusDisplay.innerText = "Transaction Cancelled.";
                } else if (error.message && error.message.includes("insufficient funds")) {
                    statusDisplay.innerText = "INSUFFICIENT ETH FOR GAS";
                } else {
                    statusDisplay.innerText = "ERROR. Check Console.";
                }
                statusDisplay.style.color = "red";
                actionBtn.innerText = "TRY AGAIN";
                actionBtn.disabled = false;
            }
        } else {
            statusDisplay.innerText = "MetaMask Not Found.";
            window.open("https://metamask.io/download/", "_blank");
        }
    }
});

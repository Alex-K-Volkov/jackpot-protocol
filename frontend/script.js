// تنظیمات اصلی
// این آدرس ولت دریافت کننده پول است (فعلاً ولت شما، بعداً ولت استریمر)
const RECEIVER_ADDRESS = "0xa575349aa7A6C73C8C6C2a671Bd9e4c5EE424126"; 

// قیمت بلیط (حدود 1.5 دلار)
const TICKET_PRICE_ETH = "0.0005"; 

document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');
    const jackpotDisplay = document.getElementById('jackpot-amount');

    // نمایش مبلغ نمایشی جک‌پات (ثابت یا در حال تغییر)
    if(jackpotDisplay) jackpotDisplay.innerText = "$1,000+";

    if (actionBtn) {
        actionBtn.onclick = connectAndPay;
    }

    async function connectAndPay() {
        // 1. بررسی نصب بودن متامسک
        if (typeof window.ethereum !== 'undefined') {
            try {
                // اتصال به پرووایدر
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                
                actionBtn.innerText = "CONNECTING...";
                actionBtn.disabled = true;

                // درخواست دسترسی به ولت
                await provider.send("eth_requestAccounts", []);
                
                const signer = provider.getSigner();
                const userAddress = await signer.getAddress();
                
                statusDisplay.innerText = `Wallet: ${userAddress.substring(0,6)}... Connected`;
                statusDisplay.style.color = "#FFD700"; // طلایی

                // 2. آماده‌سازی تراکنش
                actionBtn.innerText = "CONFIRM IN WALLET...";
                
                const tx = {
                    to: RECEIVER_ADDRESS,
                    value: ethers.utils.parseEther(TICKET_PRICE_ETH)
                };

                // 3. ارسال تراکنش
                const transaction = await signer.sendTransaction(tx);
                
                statusDisplay.innerText = "Transaction Sent. Waiting for confirmation...";
                actionBtn.innerText = "PROCESSING...";

                // 4. انتظار برای تایید شدن تراکنش در شبکه
                await transaction.wait();

                // 5. موفقیت
                statusDisplay.innerText = "SUCCESS! Ticket Purchased ✅";
                statusDisplay.style.color = "#00FF00"; // سبز
                actionBtn.innerText = "BUY ANOTHER TICKET";
                actionBtn.disabled = false;
                
                console.log("Transaction Hash:", transaction.hash);
                alert("Purchase Successful! Good luck in the draw.");

            } catch (error) {
                console.error(error);
                // مدیریت خطاها (مثلاً اگر کاربر رد کرد)
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    statusDisplay.innerText = "Transaction Cancelled by User.";
                } else {
                    statusDisplay.innerText = "Error: See console for details.";
                }
                statusDisplay.style.color = "red";
                actionBtn.innerText = "TRY AGAIN";
                actionBtn.disabled = false;
            }
        } else {
            // اگر متامسک نصب نبود
            statusDisplay.innerText = "MetaMask not found. Please install it.";
            window.open("https://metamask.io/download/", "_blank");
        }
    }
});

// Fake Door MVP Script
// This script does not connect to a wallet.
// It simulates user interest for a demo.

document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('action-btn');
    const statusDisplay = document.getElementById('status-display');

    if (actionBtn && statusDisplay) {
        actionBtn.onclick = () => {
            statusDisplay.innerText = "Payment gateway is being finalized and will be live soon! Thank you for your interest.";
            statusDisplay.style.color = "var(--accent-color)";
            actionBtn.innerText = "THANK YOU!";
            actionBtn.disabled = true;
        };
    }

    startVisualUpdates();
});

function startVisualUpdates() {
    const jackpotAmountEl = document.getElementById('jackpot-amount');
    const ticketsSoldEl = document.getElementById('tickets-sold');
    if (!jackpotAmountEl || !ticketsSoldEl) return;
    
    let jackpot = 950000;
    setInterval(() => {
        if (jackpot < 1000000) {
            jackpot += Math.random() * 123.45;
            jackpotAmountEl.innerText = `$${jackpot.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        } else {
            jackpotAmountEl.innerText = "$1,000,000";
            // Optional: Stop the interval once it hits the max
            // clearInterval(jackpotInterval); 
        }
    }, 2500);

    // Show a fake number of tickets sold for demo purposes
    let fakeTickets = 1234567;
     setInterval(() => {
        fakeTickets += Math.floor(Math.random() * 3) + 1;
        ticketsSoldEl.innerText = fakeTickets.toLocaleString('en-US');
    }, 3000);
}

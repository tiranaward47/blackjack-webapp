// Ward's Blackjack — Betting + Chips + Animations + Stats

const dealerHandEl = document.getElementById("dealer-hand");
const playerHandEl = document.getElementById("player-hand");
const dealerScoreEl = document.getElementById("dealer-score");
const playerScoreEl = document.getElementById("player-score");
const messageEl = document.getElementById("message");

const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");

const bankrollEl = document.getElementById("bankroll");
const currentBetEl = document.getElementById("current-bet");
const handsPlayedEl = document.getElementById("hands-played");
const recordEl = document.getElementById("record");

const dealBtn = document.getElementById("place-bet-btn");
const clearBetBtn = document.getElementById("clear-bet-btn");
const resetBtn = document.getElementById("reset-btn");

let bankroll = 1000;
let currentBet = 0;

let handsPlayed = 0;
let wins = 0;
let losses = 0;
let pushes = 0;

let deck = [];
let dealerCards = [];
let playerCards = [];
let gameOver = true;

// ---------- Deck / Card Helpers ----------
function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const d = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      d.push({ suit, rank });
    }
  }
  return d;
}

function shuffleDeck(d) {
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(rank) {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return Number(rank);
}

function handTotal(cards) {
  let total = 0;
  let aces = 0;

  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10; // make an Ace count as 1 instead of 11
    aces--;
  }
  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards) === 21;
}

function drawCard() {
  if (deck.length < 10) deck = shuffleDeck(createDeck());
  return deck.pop();
}

// ---------- UI Helpers ----------
function setMessage(text, kind = "") {
  messageEl.className = "message";
  if (kind) messageEl.classList.add(kind);
  messageEl.textContent = text;
}

function updateBankrollUI() {
  bankrollEl.textContent = bankroll;
  currentBetEl.textContent = currentBet;
  handsPlayedEl.textContent = handsPlayed;
  recordEl.textContent = `${wins}-${losses}-${pushes}`;
}

function renderHand(el, cards) {
  el.innerHTML = "";
  for (const card of cards) {
    const div = document.createElement("div");
    div.className = "card animate-in";
    div.style.backgroundImage = `url(images/${card.rank}_of_${card.suit}.png)`;
    el.appendChild(div);
  }
}

function clearHands() {
  dealerCards = [];
  playerCards = [];
  dealerHandEl.innerHTML = "";
  playerHandEl.innerHTML = "";
  dealerScoreEl.textContent = "";
  playerScoreEl.textContent = "";
}

// ---------- Round Flow ----------
function lockControls(locked) {
  hitBtn.disabled = locked;
  standBtn.disabled = locked;
}

function resetRoundState() {
  gameOver = true;
  lockControls(true);
}

function startRound() {
  if (currentBet <= 0) {
    setMessage("Place a bet first.", "lose");
    return;
  }
  if (currentBet > bankroll) {
    setMessage("Bet exceeds your chips.", "lose");
    return;
  }

  // Deduct bet at start
  bankroll -= currentBet;
  updateBankrollUI();

  clearHands();

  gameOver = false;
  lockControls(false);

  // New deck if needed
  if (deck.length < 15) deck = shuffleDeck(createDeck());

  // Deal 2 each
  playerCards.push(drawCard(), drawCard());
  dealerCards.push(drawCard(), drawCard());

  renderHand(playerHandEl, playerCards);
  renderHand(dealerHandEl, dealerCards);

  playerScoreEl.textContent = `Player Total: ${handTotal(playerCards)}`;
  dealerScoreEl.textContent = `Dealer Total: ${handTotal(dealerCards)}`;

  // Check blackjack
  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  if (pBJ || dBJ) {
    endRound();
    return;
  }

  setMessage("Hit or Stand.", "");
}

function dealerPlay() {
  while (handTotal(dealerCards) < 17) {
    dealerCards.push(drawCard());
  }
}

function payout(result) {
  // bet was already deducted
  if (result === "win") {
    bankroll += currentBet * 2;
    wins++;
  } else if (result === "push") {
    bankroll += currentBet;
    pushes++;
  } else if (result === "blackjack") {
    bankroll += currentBet + Math.floor(currentBet * 1.5);
    wins++;
  } else {
    losses++;
  }
}

function endRound() {
  if (gameOver) return;

  dealerPlay();

  renderHand(dealerHandEl, dealerCards);
  renderHand(playerHandEl, playerCards);

  const pTotal = handTotal(playerCards);
  const dTotal = handTotal(dealerCards);

  playerScoreEl.textContent = `Player Total: ${pTotal}`;
  dealerScoreEl.textContent = `Dealer Total: ${dTotal}`;

  const pBJ = isBlackjack(playerCards);
  const dBJ = isBlackjack(dealerCards);

  let result = "lose";
  let msg = "Dealer wins.";
  let kind = "lose";

  if (pBJ && dBJ) {
    result = "push";
    msg = "Both Blackjack — Push.";
    kind = "push";
  } else if (pBJ) {
    result = "blackjack";
    msg = "Blackjack! You win (3:2).";
    kind = "win";
  } else if (dBJ) {
    result = "lose";
    msg = "Dealer Blackjack. You lose.";
    kind = "lose";
  } else if (pTotal > 21) {
    result = "lose";
    msg = "Bust. You lose.";
    kind = "lose";
  } else if (dTotal > 21) {
    result = "win";
    msg = "Dealer busts. You win!";
    kind = "win";
  } else if (pTotal > dTotal) {
    result = "win";
    msg = "You win!";
    kind = "win";
  } else if (pTotal < dTotal) {
    result = "lose";
    msg = "Dealer wins.";
    kind = "lose";
  } else {
    result = "push";
    msg = "Push (tie).";
    kind = "push";
  }

  payout(result);

  handsPlayed++;
  setMessage(msg, kind);

  // Reset bet after outcome
  currentBet = 0;

  updateBankrollUI();
  resetRoundState();
}

function playerHit() {
  if (gameOver) return;

  playerCards.push(drawCard());
  renderHand(playerHandEl, playerCards);

  const total = handTotal(playerCards);
  playerScoreEl.textContent = `Player Total: ${total}`;

  if (total > 21) endRound();
}

function playerStand() {
  if (gameOver) return;
  endRound();
}

// ---------- Betting Controls ----------
document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!gameOver) return;

    const value = Number(btn.dataset.value);
    if (currentBet + value <= bankroll) {
      currentBet += value;
      updateBankrollUI();

      btn.classList.add("pop");
      setTimeout(() => btn.classList.remove("pop"), 180);
      setMessage("Click Deal when ready.", "");
    } else {
      setMessage("You can’t bet more than your chips.", "lose");
    }
  });
});

clearBetBtn.addEventListener("click", () => {
  if (!gameOver) return;
  currentBet = 0;
  updateBankrollUI();
  setMessage("Bet cleared.", "");
});

dealBtn.addEventListener("click", () => {
  if (!gameOver) return;
  startRound();
});

resetBtn.addEventListener("click", () => {
  bankroll = 1000;
  currentBet = 0;
  handsPlayed = wins = losses = pushes = 0;

  deck = shuffleDeck(createDeck());
  clearHands();
  updateBankrollUI();

  setMessage("Game reset. Place your bet to begin.", "");
  resetRoundState();
});

// ---------- Gameplay Buttons ----------
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);

// ---------- Init ----------
deck = shuffleDeck(createDeck());
updateBankrollUI();
resetRoundState();
setMessage("Place your bet to begin.", "");

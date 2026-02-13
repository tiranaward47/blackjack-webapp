// ===== Ward's Blackjack (Upgraded) =====

// --- DOM ---
const message = document.getElementById("message");

const dealerHandEl = document.getElementById("dealer-hand");
const playerHandEl = document.getElementById("player-hand");

const dealerScoreEl = document.getElementById("dealer-score");
const playerScoreEl = document.getElementById("player-score");

const chipsEl = document.getElementById("chips");
const betInput = document.getElementById("bet");
const currentBetEl = document.getElementById("current-bet");

const placeBetBtn = document.getElementById("placebet-btn");
const newGameBtn = document.getElementById("newgame-btn");
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");

// --- Game State ---
let deckId = "";
let playerHand = [];
let dealerHand = [];

let chips = 1000;
let currentBet = 0;
let betLocked = false;
let roundActive = false;

// ===== UI Helpers =====
function setMessage(text) {
  message.textContent = text;
}

function syncBankUI() {
  chipsEl.textContent = String(chips);
  currentBetEl.textContent = String(currentBet);
}

function setControlsState({ canBet, canStart, canHit, canStand } = {}) {
  if (typeof canBet === "boolean") {
    betInput.disabled = !canBet;
    placeBetBtn.disabled = !canBet;
  }
  if (typeof canStart === "boolean") newGameBtn.disabled = !canStart;
  if (typeof canHit === "boolean") hitBtn.disabled = !canHit;
  if (typeof canStand === "boolean") standBtn.disabled = !canStand;
}

function resetTableUI() {
  dealerHandEl.innerHTML = "";
  playerHandEl.innerHTML = "";
  dealerScoreEl.textContent = "Score: 0";
  playerScoreEl.textContent = "Score: 0";
}

// Render cards into #dealer-hand / #player-hand.
// Adds "deal" class + staggered delay for animation.
// Hides dealer's 2nd card while hideSecondCard is true.
function renderHand(cards, targetId, hideSecondCard = false) {
  const el = document.getElementById(targetId);
  el.innerHTML = "";

  cards.forEach((card, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "card deal";

    // Stagger deal animation slightly per card
    wrap.style.animationDelay = `${idx * 90}ms`;

    if (hideSecondCard && idx === 1) {
      wrap.classList.add("back");
      wrap.textContent = "🂠";
    } else {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = `${card.value} of ${card.suit}`;
      wrap.appendChild(img);
    }

    el.appendChild(wrap);
  });
}

function updateScores({ hideDealer = true } = {}) {
  const playerScore = calculateScore(playerHand);
  playerScoreEl.textContent = `Score: ${playerScore}`;

  const dealerScore =
    hideDealer && dealerHand.length
      ? calculateScore([dealerHand[0]])
      : calculateScore(dealerHand);

  dealerScoreEl.textContent = `Score: ${dealerScore}`;
}

// ===== API =====
async function getShuffledDeck() {
  const res = await fetch(
    "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1"
  );
  const data = await res.json();
  return data.deck_id;
}

async function drawCards(id, count = 1) {
  const res = await fetch(
    `https://deckofcardsapi.com/api/deck/${id}/draw/?count=${count}`
  );
  const data = await res.json();
  return data.cards || [];
}

// ===== Rules =====
function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  hand.forEach((card) => {
    const value = card.value;

    if (["KING", "QUEEN", "JACK"].includes(value)) {
      score += 10;
    } else if (value === "ACE") {
      aces += 1;
      score += 11;
    } else {
      score += parseInt(value, 10);
    }
  });

  // adjust score if aces make the total exceed 21
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function getBetValue() {
  const raw = Number(betInput.value);
  if (!Number.isFinite(raw)) return 0;
  return Math.floor(raw);
}

// ===== Betting Flow =====
function lockBet(amount) {
  currentBet = amount;
  betLocked = true;
  syncBankUI();

  setControlsState({
    canBet: false,
    canStart: true, // allow New Game once bet is locked
    canHit: false,
    canStand: false,
  });

  setMessage(`Bet placed: ${currentBet}. Click "New Game" to deal.`);
}

function unlockBet() {
  currentBet = 0;
  betLocked = false;
  syncBankUI();

  if (chips <= 0) {
    setControlsState({
      canBet: false,
      canStart: false,
      canHit: false,
      canStand: false,
    });
    setMessage("You're out of chips. Refresh or add a reset option.");
    return;
  }

  setControlsState({
    canBet: true,
    canStart: false, // require bet first
    canHit: false,
    canStand: false,
  });

  setMessage("Place a bet to start the next round.");
}

// ===== Round Flow =====
async function startNewRound() {
  if (!betLocked || currentBet <= 0) {
    setMessage("Place a bet first.");
    return;
  }

  roundActive = true;

  setControlsState({ canStart: false, canHit: false, canStand: false });

  setMessage("Shuffling deck...");
  deckId = await getShuffledDeck();

  // Deal 2 each
  playerHand = await drawCards(deckId, 2);
  dealerHand = await drawCards(deckId, 2);

  // Dealer hides second card
  renderHand(playerHand, "player-hand", false);
  renderHand(dealerHand, "dealer-hand", true);
  updateScores({ hideDealer: true });

  setControlsState({ canHit: true, canStand: true });

  // Immediate blackjack check
  const playerScore = calculateScore(playerHand);
  if (playerScore === 21) {
    await resolveAfterStand(true);
    return;
  }

  setMessage("Round started. Hit or Stand.");
}

async function onHit() {
  if (!roundActive) return;

  const newCard = await drawCards(deckId, 1);
  playerHand.push(...newCard);

  renderHand(playerHand, "player-hand", false);
  renderHand(dealerHand, "dealer-hand", true);
  updateScores({ hideDealer: true });

  const playerScore = calculateScore(playerHand);
  if (playerScore > 21) {
    endRound("lose", "Player busts! Dealer wins.");
  }
}

async function onStand() {
  if (!roundActive) return;
  await resolveAfterStand(false);
}

async function resolveAfterStand(fromBlackjack) {
  setMessage("Dealer's turn...");
  setControlsState({ canHit: false, canStand: false });

  // Reveal dealer hole card
  renderHand(dealerHand, "dealer-hand", false);
  updateScores({ hideDealer: false });

  // Dealer draws until 17+
  while (calculateScore(dealerHand) < 17) {
    const newCard = await drawCards(deckId, 1);
    dealerHand.push(...newCard);

    renderHand(dealerHand, "dealer-hand", false);
    updateScores({ hideDealer: false });
  }

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  // Blackjack push case
  if (fromBlackjack && playerScore === 21 && dealerScore === 21) {
    endRound("push", "Both have Blackjack — Push.");
    return;
  }

  if (dealerScore > 21) {
    endRound("win", "Dealer busts! Player wins!");
  } else if (playerScore > dealerScore) {
    endRound("win", "Player wins!");
  } else if (playerScore < dealerScore) {
    endRound("lose", "Dealer wins!");
  } else {
    endRound("push", "Push (tie).");
  }
}

function endRound(result, text) {
  roundActive = false;

  // Capture bet BEFORE we reset/unlock anything
  const betUsed = currentBet;

  // Payout
  if (result === "win") chips += betUsed;
  if (result === "lose") chips -= betUsed;
  // push => no change

  syncBankUI();

  // Freeze play
  setControlsState({ canHit: false, canStand: false, canStart: false });

  // Reset bet controls for next round (this resets currentBet)
  unlockBet();

  setMessage(`${text} (Bet: ${betUsed} | Chips: ${chips})`);
}

// ===== Event Listeners =====
placeBetBtn.addEventListener("click", () => {
  if (betLocked) return;

  const bet = getBetValue();

  if (bet <= 0) {
    setMessage("Enter a valid bet (1 or more).");
    return;
  }
  if (bet > chips) {
    setMessage(`Bet too high. You only have ${chips} chips.`);
    return;
  }

  lockBet(bet);
});

newGameBtn.addEventListener("click", startNewRound);
hitBtn.addEventListener("click", onHit);
standBtn.addEventListener("click", onStand);

// ===== Init =====
function init() {
  syncBankUI();
  resetTableUI();

  // Require bet before starting
  setControlsState({
    canBet: true,
    canStart: false,
    canHit: false,
    canStand: false,
  });

  setMessage("Place a bet to begin.");
}

init();

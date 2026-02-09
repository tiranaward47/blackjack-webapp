const BUTTON_COLOR = "#16a095";
const DEFAULT_BODY_COLOR = "#2c3e50";
const DEFAULT_GAME_COLOR = "#34495e";

const STORAGE_KEY = "wards_blackjack_v2";
const CARD_BACK = "https://deckofcardsapi.com/static/img/back.png";

// --- game state ---
let deckId = "";
let playerHand = [];
let dealerHand = [];
let roundOver = false;
let dealerRevealed = false;

// bankroll + stats
let bankroll = 500;
let currentBet = 0;
let betLocked = false;

let handsPlayed = 0;
let wins = 0;
let losses = 0;
let pushes = 0;

// --- DOM ---
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const newGameBtn = document.getElementById("new-game-btn");
const messageEl = document.getElementById("message");
const playerScoreEl = document.getElementById("player-score");
const dealerScoreEl = document.getElementById("dealer-score");

const dealerHandEl = document.getElementById("dealer-hand");
const playerHandEl = document.getElementById("player-hand");

const bankrollEl = document.getElementById("bankroll");
const betAmountEl = document.getElementById("bet-amount");
const placeBetBtn = document.getElementById("place-bet-btn");
const clearBetBtn = document.getElementById("clear-bet-btn");
const chipBtns = document.querySelectorAll(".chip");

const handsPlayedEl = document.getElementById("hands-played");
const recordEl = document.getElementById("record");
const resetBtn = document.getElementById("reset-btn");

// --- persistence ---
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);

    if (Number.isFinite(s.bankroll)) bankroll = s.bankroll;
    if (Number.isFinite(s.handsPlayed)) handsPlayed = s.handsPlayed;
    if (Number.isFinite(s.wins)) wins = s.wins;
    if (Number.isFinite(s.losses)) losses = s.losses;
    if (Number.isFinite(s.pushes)) pushes = s.pushes;
  } catch (e) {
    // ignore
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ bankroll, handsPlayed, wins, losses, pushes })
  );
}

// --- utility ---
function setMessage(text) {
  messageEl.textContent = text;
}

function updateBankAndStats() {
  bankrollEl.textContent = bankroll;
  betAmountEl.textContent = currentBet;
  if (handsPlayedEl) handsPlayedEl.textContent = handsPlayed;
  if (recordEl) recordEl.textContent = `${wins}-${losses}-${pushes}`;
}

function refreshControls() {
  // betting disabled while a round is in progress
  chipBtns.forEach((btn) => {
    btn.disabled = betLocked;
  });
  placeBetBtn.disabled = betLocked || currentBet <= 0;
  clearBetBtn.disabled = betLocked || currentBet === 0;

  hitBtn.disabled = !(betLocked && !roundOver);
  standBtn.disabled = !(betLocked && !roundOver);
}

function calculateScore(hand) {
  let total = 0;
  let aces = 0;

  hand.forEach((card) => {
    const value = card.value;
    if (value === "ACE") {
      aces += 1;
      total += 11;
    } else if (["KING", "QUEEN", "JACK"].includes(value)) {
      total += 10;
    } else {
      total += parseInt(value, 10);
    }
  });

  // adjust aces
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function displayHand(hand, target, { animate = true, hideFirst = false } = {}) {
  target.innerHTML = "";
  hand.forEach((card, idx) => {
    const div = document.createElement("div");
    div.className = "card";
    if (animate) div.classList.add("animate-in");

    const isHidden = hideFirst && idx === 0;
    div.style.backgroundImage = `url(${isHidden ? CARD_BACK : card.image})`;

    target.appendChild(div);
  });
}

function updateScores() {
  const p = calculateScore(playerHand);
  playerScoreEl.textContent = betLocked ? `Your score: ${p}` : "";

  if (!dealerHand.length) {
    dealerScoreEl.textContent = "";
    return;
  }

  if (dealerRevealed) {
    dealerScoreEl.textContent = `Dealer score: ${calculateScore(dealerHand)}`;
  } else {
    const visibleScore = calculateScore(dealerHand.slice(1));
    dealerScoreEl.textContent = `Dealer score: ? + ${visibleScore}`;
  }
}

function updateView() {
  displayHand(playerHand, playerHandEl, { hideFirst: false });
  displayHand(dealerHand, dealerHandEl, { hideFirst: !dealerRevealed });
  updateScores();
  updateBankAndStats();
  refreshControls();
}

function resetRound() {
  playerHand = [];
  dealerHand = [];
  roundOver = false;
  dealerRevealed = false;
}

async function newDeck() {
  const res = await fetch(
    "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6"
  );
  const data = await res.json();
  deckId = data.deck_id;
}

async function drawCards(count) {
  const res = await fetch(
    `https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`
  );
  return res.json();
}

function settle(result) {
  // bet was deducted at the start of the hand
  if (result === "win") {
    bankroll += currentBet * 2;
    wins += 1;
    setMessage("You win!");
  } else if (result === "push") {
    bankroll += currentBet;
    pushes += 1;
    setMessage("Push.");
  } else {
    losses += 1;
    setMessage("You lose.");
  }

  handsPlayed += 1;
  saveState();

  roundOver = true;
  betLocked = false;
  currentBet = 0;
  dealerRevealed = true;
  updateView();

  setMessage(`${messageEl.textContent} Place your bet for the next hand.`);
}

function checkImmediateOutcomes() {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  const playerBlackjack = playerScore === 21 && playerHand.length === 2;
  const dealerBlackjack = dealerScore === 21 && dealerHand.length === 2;

  if (playerBlackjack && dealerBlackjack) {
    settle("push");
    return true;
  }

  if (playerBlackjack) {
    settle("win");
    return true;
  }

  if (dealerBlackjack) {
    settle("lose");
    return true;
  }

  return false;
}

async function startHand() {
  await newDeck();

  // Deduct bet immediately (bankroll shows real-time)
  bankroll -= currentBet;
  saveState();

  const draw = await drawCards(4);
  playerHand = [draw.cards[0], draw.cards[2]];
  dealerHand = [draw.cards[1], draw.cards[3]];

  roundOver = false;
  dealerRevealed = false;
  betLocked = true;

  updateView();
  setMessage("Hit or stand.");

  // if player blackjacks, immediately resolve
  checkImmediateOutcomes();
}

async function dealDealer() {
  dealerRevealed = true;

  // Dealer hits to 17+ (simple rules)
  while (calculateScore(dealerHand) < 17) {
    const draw = await drawCards(1);
    dealerHand.push(draw.cards[0]);
    updateView();
  }
}

async function hit() {
  if (!betLocked || roundOver) return;

  const draw = await drawCards(1);
  playerHand.push(draw.cards[0]);
  updateView();

  if (calculateScore(playerHand) > 21) {
    await dealDealer();
    settle("lose");
  }
}

async function stand() {
  if (!betLocked || roundOver) return;

  await dealDealer();

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (dealerScore > 21) {
    settle("win");
  } else if (playerScore > dealerScore) {
    settle("win");
  } else if (playerScore < dealerScore) {
    settle("lose");
  } else {
    settle("push");
  }
}

function addChip(amount) {
  if (betLocked) return;
  if (bankroll < currentBet + amount) {
    setMessage("Not enough bankroll.");
    return;
  }
  currentBet += amount;
  updateView();

  // quick feedback pop
  try {
    // may fail on older browsers, ignore
    const btn = Array.from(chipBtns).find(
      (b) => parseInt(b.dataset.chip, 10) === amount
    );
    if (btn) {
      btn.classList.remove("pop");
      btn.offsetHeight; // reflow
      btn.classList.add("pop");
    }
  } catch {}

  setMessage("Click Place Bet to start.");
}

function clearBet() {
  if (betLocked) return;
  currentBet = 0;
  updateView();
  setMessage("Place your bet to begin.");
}

async function placeBet() {
  if (betLocked) return;
  if (currentBet <= 0) {
    setMessage("Add chips to place a bet.");
    return;
  }
  if (currentBet > bankroll) {
    setMessage("Not enough bankroll to place bet.");
    return;
  }

  resetRound();
  await startHand();
}

function newGame() {
  resetRound();
  betLocked = false;
  currentBet = 0;
  updateView();
  setMessage("New game. Place your bet to begin.");
}

function resetStats() {
  bankroll = 500;
  currentBet = 0;
  handsPlayed = 0;
  wins = 0;
  losses = 0;
  pushes = 0;

  saveState();
  newGame();
}

function init() {
  loadState();
  updateView();
  setMessage("Place your bet to begin.");

  chipBtns.forEach((btn) => {
    btn.addEventListener("click", () => addChip(parseInt(btn.dataset.chip, 10)));
  });

  clearBetBtn.addEventListener("click", clearBet);
  placeBetBtn.addEventListener("click", placeBet);
  newGameBtn.addEventListener("click", newGame);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  if (resetBtn) resetBtn.addEventListener("click", resetStats);

  // Ensure colors reset if user reloads mid-hand
  document.body.style.backgroundColor = DEFAULT_BODY_COLOR;
  document.getElementById("game").style.backgroundColor = DEFAULT_GAME_COLOR;
  chipBtns.forEach((btn) => {
    btn.style.backgroundColor = BUTTON_COLOR;
  });
  clearBetBtn.style.backgroundColor = "#7f8c8d";
}

init();

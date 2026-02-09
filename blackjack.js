const BUTTON_COLOR = "#16a095";
const DEFAULT_BODY_COLOR = "#2c3e50";
const DEFAULT_GAME_COLOR = "#34495e";

let deckId = "";
let playerHand = [];
let dealerHand = [];
let roundOver = false;

const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const newGameBtn = document.getElementById("new-game-btn");
const messageEl = document.getElementById("message");
const playerScoreEl = document.getElementById("player-score");
const dealerScoreEl = document.getElementById("dealer-score");

hitBtn.addEventListener("click", async () => {
  if (roundOver) return;
  await dealToPlayer();
});

standBtn.addEventListener("click", async () => {
  if (roundOver) return;
  roundOver = true;
  disableActionButtons();
  messageEl.textContent = "Dealer's turn...";
  await playDealer();
  updateScores({ hideDealerHoleCard: false });
  decideWinner();
});

newGameBtn.addEventListener("click", () => {
  startNewRound();
});

async function startNewRound() {
  roundOver = false;
  resetTheme();
  clearHands();
  disableNewGameButton();
  enableActionButtons();

  deckId = await getShuffledDeck();

  playerHand = await drawCards(deckId, 2);
  dealerHand = await drawCards(deckId, 2);

  displayHand(playerHand, "player");
  displayHand(dealerHand, "dealer");

  updateScores({ hideDealerHoleCard: true });
  messageEl.textContent = "Your turn: Hit or Stand.";

  checkForBlackjack();
}

async function dealToPlayer() {
  const newCard = await drawCards(deckId, 1);
  playerHand.push(...newCard);

  displayHand(playerHand, "player");
  updateScores({ hideDealerHoleCard: true });

  const playerScore = calculateScore(playerHand);

  if (playerScore > 21) {
    roundOver = true;
    disableActionButtons();
    updateScores({ hideDealerHoleCard: false });
    playerLostGame("Player busts!");
  } else if (playerScore === 21) {
    roundOver = true;
    disableActionButtons();
    updateScores({ hideDealerHoleCard: false });
    playerWinGame("Player hits 21!");
  }
}

async function playDealer() {
  // dealer draws cards until their score is 17 or higher
  while (calculateScore(dealerHand) < 17) {
    const newCard = await drawCards(deckId, 1);
    dealerHand.push(...newCard);
    displayHand(dealerHand, "dealer");
  }
}

function decideWinner() {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (dealerScore > 21) {
    playerWinGame("Dealer busts! Player wins!");
  } else if (playerScore > dealerScore) {
    playerWinGame("Player wins!");
  } else if (playerScore < dealerScore) {
    playerLostGame("Dealer wins!");
  } else {
    pushGame("Push (tie).");
  }
}

function checkForBlackjack() {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (playerScore === 21 && dealerScore === 21) {
    roundOver = true;
    disableActionButtons();
    updateScores({ hideDealerHoleCard: false });
    pushGame("Push (tie).");
  } else if (playerScore === 21) {
    roundOver = true;
    disableActionButtons();
    updateScores({ hideDealerHoleCard: false });
    playerWinGame("Blackjack! Player wins!");
  } else if (dealerScore === 21) {
    roundOver = true;
    disableActionButtons();
    updateScores({ hideDealerHoleCard: false });
    playerLostGame("Dealer has blackjack.");
  }
}

// function to get a shuffled deck
async function getShuffledDeck() {
  const response = await fetch(
    "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1"
  );

  const data = await response.json();
  messageEl.textContent = "Deck shuffled! Ready to play!";

  return data.deck_id;
}

function displayHand(hand, name) {
  const handElement = document.getElementById(`${name.toLowerCase()}-hand`);
  handElement.innerHTML = "";

  hand.forEach((card) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.style.backgroundImage = `url(${card.image})`;
    cardDiv.style.backgroundSize = "cover";
    handElement.appendChild(cardDiv);
  });
}

async function drawCards(deckId, count = 1) {
  const response = await fetch(
    `https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`
  );

  const data = await response.json();

  return data.cards;
}

// calculate score
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
      score += parseInt(card.value);
    }
  });

  // adjust score if aces make the total exceed 21
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function updateScores({ hideDealerHoleCard = false } = {}) {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  playerScoreEl.textContent = `Player score: ${playerScore}`;

  if (hideDealerHoleCard && dealerHand.length) {
    dealerScoreEl.textContent = `Dealer score: ${calculateScore([dealerHand[0]])} + ?`;
  } else {
    dealerScoreEl.textContent = `Dealer score: ${dealerScore}`;
  }
}

function clearHands() {
  playerHand = [];
  dealerHand = [];
  document.getElementById("player-hand").innerHTML = "";
  document.getElementById("dealer-hand").innerHTML = "";
  playerScoreEl.textContent = "";
  dealerScoreEl.textContent = "";
  messageEl.textContent = "";
}

function disableActionButtons() {
  if (!hitBtn || !standBtn) return;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  hitBtn.style.backgroundColor = "#BFBFBF";
  standBtn.style.backgroundColor = "#BFBFBF";
}

function enableActionButtons() {
  if (!hitBtn || !standBtn) return;
  hitBtn.disabled = false;
  standBtn.disabled = false;
  hitBtn.style.backgroundColor = BUTTON_COLOR;
  standBtn.style.backgroundColor = BUTTON_COLOR;
}

function disableNewGameButton() {
  if (!newGameBtn) return;
  newGameBtn.disabled = true;
}

function enableNewGameButton() {
  if (!newGameBtn) return;
  newGameBtn.disabled = false;
}

// helper function to style player lost
function playerLostGame(ctx) {
  document.body.style.backgroundColor = "#9c2921";
  document.getElementById("game").style.backgroundColor = "#c73126";
  messageEl.textContent = `${ctx} Click New Game to play again.`;
  enableNewGameButton();
}

// helper function to style player win
function playerWinGame(ctx) {
  document.body.style.backgroundColor = "#038C5A";
  document.getElementById("game").style.backgroundColor = "#04BF68";
  messageEl.textContent = `${ctx} Click New Game to play again.`;
  enableNewGameButton();
}

function pushGame(ctx) {
  resetTheme();
  messageEl.textContent = `${ctx} Click New Game to play again.`;
  enableNewGameButton();
}

function resetTheme() {
  document.body.style.backgroundColor = DEFAULT_BODY_COLOR;
  document.getElementById("game").style.backgroundColor = DEFAULT_GAME_COLOR;
}

startNewRound();

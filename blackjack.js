let deckId = "";
let playerHand = [];
let dealerHand = [];
const message = document.getElementById("message");

document.getElementById("hit-btn").addEventListener("click", async () => {
  const newCard = await drawCards(deckId, 1);
  playerHand.push(...newCard);
  displayHand(playerHand, "player");

  const playerScore = calculateScore(playerHand);

  if (playerScore > 21) {
    disableButtons();
    playerLostGame("Player busts!");
  }
});

document.getElementById("stand-btn").addEventListener("click", async () => {
  message.textContent = "Dealer's turn...";
  disableButtons();
  // dealer draws cards until their score is 17 or higher
  while (calculateScore(dealerHand) < 17) {
    const newCard = await drawCards(deckId, 1);
    dealerHand.push(...newCard);
    displayHand(dealerHand, "dealer");
  }

  // determine the winner
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (dealerScore > 21) {
    playerWinGame("Dealer busts! Player wins! ");
  } else if (playerScore > dealerScore) {
    playerWinGame("Player wins!");
  } else if (playerScore < dealerScore) {
    playerLostGame("Dealer wins!");
  } else {
    playerLostGame("It's a tie, and you still lose your money!");
  }
});

// function to get a shuffled deck
async function getShuffledDeck() {
  const response = await fetch(
    "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1"
  );

  const data = await response.json();
  message.textContent = "Deck shuffled! Ready to play!";

  return data.deck_id;
}

function displayHand(hand, name) {
  // console.log(`${name.toLowerCase()}-hand`)
  const handElement = document.getElementById(`${name.toLowerCase()}-hand`);
  handElement.innerHTML = "";

  hand.forEach((card) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.style.backgroundImage = `url(${card.image})`;
    cardDiv.style.backgroundSize = "cover";
    handElement.appendChild(cardDiv);
  });

  message.textContent = `${name}'s hand is ready!`;
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

// helper function to disable the buttons
function disableButtons() {
  document.getElementById("hit-btn").disabled = true;
  document.getElementById("stand-btn").disabled = true;
  document.getElementById("hit-btn").style.backgroundColor = "#BFBFBF";
  document.getElementById("stand-btn").style.backgroundColor = "#BFBFBF";
}

// helper function to style player lost
function playerLostGame(ctx) {
  document.body.style.backgroundColor = "#9c2921";
  document.getElementById("game").style.backgroundColor = "#c73126";
  message.textContent = ctx;
}

// helper function to style player win
function playerWinGame(ctx) {
  document.body.style.backgroundColor = "#038C5A ";
  document.getElementById("game").style.backgroundColor = "#04BF68";
  message.textContent = ctx;
}

async function playGame() {
  deckId = await getShuffledDeck();

  playerHand = await drawCards(deckId, 2);
  dealerHand = await drawCards(deckId, 2);

  displayHand(playerHand, "player");
  displayHand(dealerHand, "dealer");
}

playGame();
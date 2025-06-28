//
//  * SNAKE PORTFOLIO INTERATTIVO *
//
// Gioco Snake che funge da meccanica per il web portfolio (https://emmatroni.webflow.io/).
// Il funzionamento generale è:
//  - Il testo del about me viene rivelato progressivamente man mano che gli utenti scoprono i progetti nascosti
//  - Se snake mangia (collide) con le parole chiave specifiche sblocca i progetti
//  - Ogni parola chiave corrisponde a un progetto del portfolio (mapping in portfolioData)
//  - Le parole mangiate diventano cliccabili e aprono pannelli con iframe ai progetti
//
//  FUNZIONALITÀ PRINCIPALI:
//  - Responsive: adatta griglia, font e layout alle dimensioni dello schermo
//  - Mobile: supporto gesture swipe tramite Hammer.js per controlli touch
//  - Animazioni: fade-in del testo, effetti gradient sulle parole mangiate, underline animato su hover
//  - Gestione stati: pausa del gioco quando i pannelli sono aperti
//  - Cross-browser: aggiustamenti specifici per Safari/Chrome/Firefox nelle misure del testo
//
//  CONTROLLI:
//  - Desktop: frecce direzionali, click su parole "mangiate", ESC per chiudere pannelli
//  - Mobile: swipe per muovere lo snake, tap su parole mangiate, X per chiudere pannelli
//
// DIPENDENZE: p5.js, Hammer.js (mobile gestures:  https://hammerjs.github.io )
//
//

// <reference path="./p5.global-mode.d.ts" />
// setup
const container = document.getElementById("snake");
let GRID_ROWS;
let GRID_COLS;
const CELL_SIZE = 25;
const marginHorizontal = 12;

const mobileBreakPoint = 576;
const tabletBreakPoint = 798;
const fontSizeArray = [85, 60, 45, 35];

// snake
let gridPosition = { x: 0, y: 0 };
let snake = [];
let animationTimer = 0;
const ANIMATION_DURATION = 100;
// mobile: allo swipe continua nella direzione dello swipe != desktop
let persistentDirection = null;

// gestione stato gioco x gestione pannello progetto
let gameState = "playing";
let currentEscHandler = null;

// testi
let fontSize;
const font = "neue-haas-grotesk-display";
let words = [];
let wordPositions = [];
let foodPosition = [];
let keywords = []; // Store keywords once
// gestione frasi visibili
let currentRevealedLine = 0;
let currentAnimatedLine = 0;
let newSegments = 0;
let textAnimations = new Map();
const TEXT_ANIMATION_DURATION = 500;

// animazione underline quando hover eatenFood per far capire che è riporta a un link
let hoveredFoodIndex = -1;
let underlineAnimations = new Map();
const UNDERLINE_ANIMATION_DURATION = 300;

// gradiente
const startColor = "#fff";
const endColor = "#5500dd";

// info progetti
const portfolioData = [
  {
    sentence: "Hi! I'm a Communication Design student",
    keyword: "Communication",
    slug: "vaglioandpartners",
  },
  {
    sentence: "at Politecnico di Milano.",
    keyword: "Politecnico",
    slug: "policards",
  },
  {
    sentence: "I specialize in creating brand identities,",
    keyword: "identities,",
    slug: "seres-srl",
  },
  {
    sentence: "including editorial design, typography,",
    keyword: "editorial",
    slug: "erberto-carboni",
  },
  {
    sentence: "coding and designing digital interfaces.",
    keyword: "coding",
    slug: "data-visualization",
  },
  {
    sentence: "Meanwhile, I explore other creative interests,",
    keyword: "interests,",
    slug: "website-design",
  },
  {
    sentence: "like photography, game design and music.",
    keyword: "photography,",
    slug: "travel-photography",
  },
  {
    sentence: "You found them All!",
  },
];

// per dispositivi touch
function detectTouchDevices() {
  return (
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || "ontouchstart" in window
  );
}

function windowResized() {
  if (typeof resizeCanvas === "undefined") {
    console.warn("p5.js not fully loaded, skipping resize");
    return;
  }

  if (window.innerWidth > 1100) {
    fontSize = fontSizeArray[0];
  } else if (window.innerWidth > tabletBreakPoint) {
    fontSize = fontSizeArray[1];
  } else if (window.innerWidth >= mobileBreakPoint) {
    fontSize = fontSizeArray[2];
  } else {
    fontSize = fontSizeArray[3];
  }
  // voglio che si ricordi dei food eaten al resize in modo che non ricominci da capo il gioco
  const eatenFoods = new Set();
  for (const food of foodPosition) {
    if (food.eaten) {
      eatenFoods.add(food.word);
    }
  }

  resizeCanvas(container.clientWidth, container.clientHeight);
  textAnimations.clear();
  underlineAnimations.clear();
  hoveredFoodIndex = -1;
  setupGrid();
  setupSnake();
  setUpWordPositions();

  // ricalcolo x y food (fontSize dinamico al window width)
  foodPosition = [];
  for (let i = 0; i <= currentRevealedLine && i < keywords.length; i++) {
    addWordFood(keywords[i]);
    const lastFood = foodPosition[foodPosition.length - 1];
    if (lastFood && eatenFoods.has(lastFood.word)) {
      lastFood.eaten = true;
    }
  }
}

function setup() {
  if (window.innerWidth > 1100) {
    fontSize = fontSizeArray[0];
  } else if (window.innerWidth > tabletBreakPoint) {
    fontSize = fontSizeArray[1];
  } else if (window.innerWidth >= mobileBreakPoint) {
    fontSize = fontSizeArray[2];
  } else {
    fontSize = fontSizeArray[3];
  }
  keywords = portfolioData.map((item) => item.keyword);

  const canvas = createCanvas(container.clientWidth, container.clientHeight);
  canvas.parent("snake");

  setupGrid();
  setupSnake();
  setUpWordPositions();
  setupWordFood();

  // mobile
  if (detectTouchDevices()) {
    setupSwipeControls();
  }

  frameRate(120);
}

function setupSwipeControls() {
  // https://editor.p5js.org/nora_p/sketches/NN_hnjE2U reference
  if (typeof Hammer === "undefined") {
    console.warn("Hammer.js not loaded - swipe controls will not work");
    return;
  }

  var options = {
    preventDefault: true,
  };

  var hammer = new Hammer(document.body, options);
  hammer.get("swipe").set({
    direction: Hammer.DIRECTION_ALL,
  });

  hammer.on("swipe", handleSwipe);
}

function handleSwipe(event) {
  // non gestire swipe quando il gioco è in pausa
  if (gameState === "paused") return;

  console.log("swipe", event.direction);

  if (event.direction == 2) {
    // [<]
    persistentDirection = { row: 0, col: -1 };
  } else if (event.direction == 4) {
    // [>]
    persistentDirection = { row: 0, col: 1 };
  } else if (event.direction == 8) {
    // [^]
    persistentDirection = { row: -1, col: 0 };
  } else if (event.direction == 16) {
    // down
    persistentDirection = { row: 1, col: 0 };
  }
}

function setupGrid() {
  // dimensioni grid basati sul HMTL div
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  GRID_COLS = Math.floor(containerWidth / CELL_SIZE);
  GRID_ROWS = Math.floor(containerHeight / CELL_SIZE);

  // val minimo
  GRID_COLS = Math.max(GRID_COLS, 10);
  GRID_ROWS = Math.max(GRID_ROWS, 10);

  console.log(GRID_ROWS);

  const gridWidth = GRID_COLS * CELL_SIZE;
  const gridHeight = GRID_ROWS * CELL_SIZE;

  gridPosition.x = (containerWidth - gridWidth) / 2;
  gridPosition.y = (containerHeight - gridHeight) / 2;

  console.log(`Grid size: ${GRID_ROWS} rows x ${GRID_COLS} cols`);
}

function setupSnake() {
  const startRow = Math.floor(GRID_ROWS / 2);
  const startCol = Math.floor(GRID_COLS / 2);
  snake = [
    {
      row: startRow,
      col: startCol,
      targetRow: startRow,
      targetCol: startCol,
    },
  ];
}

function setUpWordPositions() {
  wordPositions = [];

  textSize(fontSize);
  textFont(font);
  const maxWidth = container.clientWidth - marginHorizontal * 2;
  const lineHeight = fontSize * 1;
  const startY = detectTouchDevices() ? 30 : 60;

  // words = array di parole di tutte le frasi
  const sentences = portfolioData.map((item) => item.sentence);
  words = sentences.join(" ").split(" ");

  let currentLine = "";
  let lineNumber = 0;

  // ogni frase una linea diversa
  let currentFraseIndex = 0;
  let wordsInCurrentFrase = sentences[currentFraseIndex].split(" ");
  let wordCountInFrase = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + (currentLine ? " " : "") + word;
    let wordX, wordY;

    // wrapping text per renderlo responsive
    if (textWidth(testLine) > maxWidth && currentLine !== "") {
      // riga successiva
      lineNumber++;
      wordX = marginHorizontal;
      wordY = startY + lineNumber * lineHeight;
      currentLine = word;
    } else {
      // la parola rientra nella linea
      wordX =
        marginHorizontal + textWidth(currentLine + (currentLine ? " " : ""));
      wordY = startY + lineNumber * lineHeight;
      currentLine = testLine;
    }

    wordPositions.push({
      word: word,
      index: i,
      x: wordX,
      y: wordY,
      lineNumber: lineNumber,
      width: textWidth(word),
      height: fontSize,
      fraseIndex: currentFraseIndex,
    });

    // tiene il progresso per capire quale frase da far vedere (una alla volta)
    wordCountInFrase++;
    if (wordCountInFrase >= wordsInCurrentFrase.length) {
      currentFraseIndex++;

      if (currentFraseIndex < sentences.length) {
        wordsInCurrentFrase = sentences[currentFraseIndex].split(" ");
        wordCountInFrase = 0;

        // faccio andare a capo le frasi solo se windowWidth >= 1005
        if (window.innerWidth >= 1005 || window.innerWidth < mobileBreakPoint) {
          lineNumber++;
          currentLine = "";

          if (currentFraseIndex === sentences.length - 1) {
            lineNumber++;
          }
        }
      }
    }
  }
}

function setupWordFood() {
  // usa lista keywords di parole
  if (currentRevealedLine < keywords.length) {
    addWordFood(keywords[currentRevealedLine]);
  }
}

function addWordFood(targetWord) {
  // trova la parola nell'oggetto wordPositions:
  // ossia cerca dentro wordPositions un oggetto (wp) che abbia la proprietà word = targetWord
  const wordData = wordPositions.find((wp) => wp.word === targetWord);
  if (!wordData) return;

  // aggiungi l'intera parola come "food"
  foodPosition.push({
    x: wordData.x,
    y: wordData.y,
    shape: "text",
    word: targetWord,
    fontSize: wordData.height,
    eaten: false,
  });
}

function draw() {
  background(0);

  // quando pannello aperto -> gioco in pausa
  //                        -> snake non si deve aggiornare
  if (gameState === "playing") {
    updateSnake();
  }

  // tiene traccia di quale food is hovered
  updateFoodHover();
  // mappa il progresso dell'animazione per fare l'effetto di ease in / ease out
  updateUnderlineAnimations();
  drawGrid();
  drawText();
  drawSnake();

  // per link -> cursor pointer
  updateCursor();
}

function updateFoodHover() {
  if (detectTouchDevices() || gameState === "paused") return;

  const newHoveredIndex = checkClickOnEatenFood(mouseX, mouseY);

  if (newHoveredIndex !== hoveredFoodIndex) {
    // fade out
    if (hoveredFoodIndex !== -1) {
      const prevAnimation = underlineAnimations.get(hoveredFoodIndex);
      if (prevAnimation) {
        underlineAnimations.set(hoveredFoodIndex, {
          startTime: millis(),
          direction: "out",
          startProgress: prevAnimation.progress || 0,
        });
      }
    }

    //fade in
    if (newHoveredIndex !== -1) {
      const currentAnimation = underlineAnimations.get(newHoveredIndex);
      underlineAnimations.set(newHoveredIndex, {
        startTime: millis(),
        direction: "in",
        startProgress: currentAnimation ? currentAnimation.progress || 0 : 0,
      });
    }

    hoveredFoodIndex = newHoveredIndex;
  }
}

function updateUnderlineAnimations() {
  for (const [foodIndex, animation] of underlineAnimations.entries()) {
    const elapsed = millis() - animation.startTime;
    const rawProgress = Math.min(elapsed / UNDERLINE_ANIMATION_DURATION, 1.0);

    let progress;
    // https://easings.net/
    if (animation.direction === "in") {
      // ease-out (inizia veloce - finisce lenta)
      progress = 1 - Math.pow(1 - rawProgress, 2);
      animation.progress =
        animation.startProgress + (1 - animation.startProgress) * progress;
    } else {
      // ease-in: (inizia lenta - finisce veloce)
      progress = Math.pow(rawProgress, 2);
      animation.progress = animation.startProgress * (1 - progress);
    }

    // pulisco
    if (
      rawProgress >= 1.0 &&
      animation.direction === "out" &&
      animation.progress <= 0.01
    ) {
      underlineAnimations.delete(foodIndex);
    }
  }
}

function updateCursor() {
  if (detectTouchDevices() || gameState === "paused") return;
  const clickedFoodIndex = checkClickOnEatenFood(mouseX, mouseY);

  if (clickedFoodIndex !== -1) {
    cursor("pointer");
  } else {
    cursor("default");
  }
}

function drawGrid() {
  strokeWeight(0);
  fill(0);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = gridToPixel(row, col);
      rect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawText() {
  push();
  textAlign(LEFT, TOP);
  textSize(fontSize);
  textFont(font);

  const eatenFoodWords = new Set();
  for (const food of foodPosition) {
    if (food.eaten) {
      eatenFoodWords.add(food.word);
    }
  }

  // gestione frase da animare con il fade in
  for (let i = 0; i <= currentAnimatedLine; i++) {
    if (!textAnimations.has(i)) {
      textAnimations.set(i, millis());
    }
  }

  for (const wordData of wordPositions) {
    // vengono mostrate solo le frasi fino all'ultima che è stata animata
    if (wordData.fraseIndex <= currentAnimatedLine) {
      const isEatenFood = eatenFoodWords.has(wordData.word);
      const sentenceOpacity = getTextOpacity(wordData.fraseIndex);

      // non si disegna se opacità = 0
      if (sentenceOpacity < 1) {
        continue;
      }

      const sentencesFoodWord = keywords[wordData.fraseIndex];
      const sentencesFoodEaten = eatenFoodWords.has(sentencesFoodWord);

      // gradiente: keyword già scoperta + frase finale
      if (isEatenFood) {
        drawGradientText(
          wordData.word,
          wordData.x,
          wordData.y,
          wordData.width,
          sentenceOpacity
        );

        // disegna underline per eaten food considerando aggiustamenti per i diversi browser
        drawUnderlineEatenFood(wordData);
      } else {
        push();
        if (sentencesFoodEaten) {
          const alphaFactor = 0.1 * sentenceOpacity;
          fill(255, 255, 255, alphaFactor);
        } else {
          fill(255, 255, 255, sentenceOpacity);
        }
        text(wordData.word, wordData.x, wordData.y);
        pop();
      }
    }
  }
  pop();
}

function drawUnderlineEatenFood(wordData) {
  const foodIndex = foodPosition.findIndex(
    (food) => food.word === wordData.word && food.eaten
  );

  if (foodIndex === -1) return;

  const animation = underlineAnimations.get(foodIndex);
  if (!animation || animation.progress <= 0) return;

  // per far si che l'underline abbia lo stesso effetto cross browers
  const metrics = getBrowserAdjustedTextMeasures(
    wordData.word,
    wordData.height
  );

  const underlineY = wordData.y + wordData.height - 12 + metrics.yOffset;
  const underlineWidth = metrics.width * animation.progress;

  // gradiente
  push();
  strokeWeight(3);

  // disegno la linea come una serie di segmenti consecutivi per permetttere di disegnare il gradiente
  const segments = Math.max(1, Math.floor(underlineWidth / 2));
  const segmentWidth = underlineWidth / segments;

  for (let i = 0; i < segments; i++) {
    const x = wordData.x + 5 + i * segmentWidth;
    const t = i / Math.max(1, segments - 1);
    const interpolatedColor = lerpColor(startColor, endColor, t);

    stroke(interpolatedColor);
    line(x, underlineY, x + segmentWidth, underlineY);
  }

  pop();
}

function drawGradientText(word, x, y, wordWidth, opacity = 255) {
  push();

  let currentX = x;

  for (let i = 0; i < word.length; i++) {
    const char = word.charAt(i);
    const charWidth = textWidth(char);

    // mappo i singoli caratteri in modo da avere un gradiente fluido sulla parola
    const t = map(currentX + charWidth / 2, x, x + wordWidth, 0, 1);
    const interpolatedColor = lerpColor(startColor, endColor, t);
    const r = red(interpolatedColor);
    const g = green(interpolatedColor);
    const b = blue(interpolatedColor);
    fill(r, g, b, opacity);

    text(char, currentX, y);
    currentX += charWidth;
  }

  pop();
}

// calcolo l'opacità sulla base del progresso dell'animazione ease-in
function getTextOpacity(lineIndex) {
  if (!textAnimations.has(lineIndex)) {
    return 0; // Not started animating yet
  }

  const startTime = textAnimations.get(lineIndex);
  const elapsed = millis() - startTime;
  const progress = Math.min(elapsed / TEXT_ANIMATION_DURATION, 1.0);

  // ritorno "ease in"  Math.pow(progress, power);
  return Math.pow(progress, 2) * 255;
}

function drawSnake() {
  strokeWeight(0);

  for (let i = snake.length - 1; i >= 0; i--) {
    const segment = snake[i];
    const start = gridToPixel(segment.row, segment.col);
    const target = gridToPixel(segment.targetRow, segment.targetCol);

    const x = lerp(start.x, target.x, animationTimer);
    const y = lerp(start.y, target.y, animationTimer);

    if (animationTimer >= 1) {
      segment.row = segment.targetRow;
      segment.col = segment.targetCol;
    }
    // 0xFF
    const baseOpacity = 255;
    // 10% di 255
    const opacityDecrease = Math.floor(255 * 0.1);
    const opacity = Math.max(0, baseOpacity - i * opacityDecrease);
    // viola
    fill(85, 0, 221, opacity);

    rect(x, y, CELL_SIZE, CELL_SIZE, 5);
  }
}

function gridToPixel(row, col) {
  return {
    x: gridPosition.x + col * CELL_SIZE,
    y: gridPosition.y + row * CELL_SIZE,
  };
}

function checkFoodCollision(headX, headY) {
  for (let i = 0; i < foodPosition.length; i++) {
    const food = foodPosition[i];

    let collision = false;

    // a seconda della shape del cibo
    if (food.shape === "text") {
      const metrics = getBrowserAdjustedTextMeasures(food.word, food.fontSize);

      const textLeft = food.x;
      const textRight = food.x + metrics.width;
      const textTop = food.y + metrics.yOffset;
      const textBottom = food.y + metrics.height + metrics.yOffset;

      collision =
        headX < textRight &&
        headX + CELL_SIZE > textLeft &&
        headY < textBottom &&
        headY + CELL_SIZE > textTop;
    }

    if (collision) {
      // ritorna info collisione con lo status eaten
      return { index: i, eaten: food.eaten };
    }
  }
  // se non collido:
  return;
}

function updateSnake() {
  if (snake.length === 0) {
    return;
  }

  const head = snake[0];

  // collisione con food determinato da px position
  const headPixel = gridToPixel(head.row, head.col);
  const collision = checkFoodCollision(headPixel.x, headPixel.y);

  if (collision) {
    const food = foodPosition[collision.index];
    const slug = getSlugForKeyword(food.word);

    if (collision.eaten) {
      // se snake collide con il eatenFood --> apre pannello
      if (slug) {
        pauseGame();
        createPanel(slug);
      }
    } else {
      // se snake collide con food nuovo --> snake aumenta
      food.eaten = true;
      newSegments += 1;

      if (slug) {
        pauseGame();
        createPanel(slug);
      } else {
        console.warn(`No slug mapping found for food: ${food.word}`);
      }

      if (currentRevealedLine < portfolioData.length - 1) {
        currentRevealedLine++;
        setupWordFood();
      } else {
        console.log("You found them all, congrats!");
      }
    }
  }

  animationTimer += deltaTime / ANIMATION_DURATION;

  let completedAnimation = true;
  for (const segment of snake) {
    completedAnimation =
      completedAnimation &&
      segment.row === segment.targetRow &&
      segment.col === segment.targetCol;
  }

  if (!completedAnimation) {
    return;
  }

  // desktop vs mobile direction handling
  let dir = null;
  const isMobile = detectTouchDevices();

  if (!isMobile) {
    // Desktop: movimento solo quando tasto è premuto
    if (keyIsDown(LEFT_ARROW)) {
      dir = { row: 0, col: -1 };
    } else if (keyIsDown(RIGHT_ARROW)) {
      dir = { row: 0, col: 1 };
    } else if (keyIsDown(UP_ARROW)) {
      dir = { row: -1, col: 0 };
    } else if (keyIsDown(DOWN_ARROW)) {
      dir = { row: 1, col: 0 };
    }

    if (!dir) {
      // Desktop: se non viene pressata nessuna key, muovi solo il corpo
      for (let i = 1; i < snake.length; i++) {
        snake[i].targetRow = snake[i - 1].row;
        snake[i].targetCol = snake[i - 1].col;
      }
      animationTimer = 0;
      return;
    }
  } else {
    // Mobile: usa persistentDirection per movimento continuo
    if (persistentDirection) {
      dir = persistentDirection;
    }

    if (!dir) {
      // anche su mobile quando si ferma il corpo si sposta sotto la testa
      for (let i = 1; i < snake.length; i++) {
        snake[i].targetRow = snake[i - 1].row;
        snake[i].targetCol = snake[i - 1].col;
      }
      animationTimer = 0;
      return;
    }
  }

  // Controlla confini
  if (
    head.row + dir.row < 0 ||
    head.row + dir.row >= GRID_ROWS ||
    head.col + dir.col < 0 ||
    head.col + dir.col >= GRID_COLS
  ) {
    // fermo se collide
    if (isMobile) {
      persistentDirection = null;
    }

    // il corpo va sotto la testa quando lo snake si ferma
    for (let i = 1; i < snake.length; i++) {
      snake[i].targetRow = snake[i - 1].row;
      snake[i].targetCol = snake[i - 1].col;
    }
    animationTimer = 0;
    return;
  }

  head.targetRow = head.row + dir.row;
  head.targetCol = head.col + dir.col;

  const last = snake[snake.length - 1];
  if (newSegments > 0) {
    //aggiungi elem allo snake
    snake.push({
      row: last.row,
      col: last.col,
      targetRow: last.row,
      targetCol: last.col,
    });
    newSegments -= 1;
  }

  for (let i = snake.length - 1; i > 0; i--) {
    snake[i].targetRow = snake[i - 1].row;
    snake[i].targetCol = snake[i - 1].col;
  }

  animationTimer = 0;
}

function getSlugForKeyword(keyword) {
  const item = portfolioData.find((item) => item.keyword === keyword);
  return item ? item.slug : null;
}

// GESTIONE PANNELLI PROGETTI
function createPanel(slug) {
  removePanel();

  const overlay = document.createElement("div");
  overlay.id = "game-panel-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.26);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    opacity: 0;
    transition: opacity 0.3s ease-out;
  `;

  // container del pannello
  const panel = document.createElement("div");
  panel.id = "game-panel";
  panel.style.cssText = `
    background: black;
    border-radius: 12px;
    max-width: 90vw;
    max-height: 90vh;
    width: 800px;
    height: 600px;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    transform: scale(0.9);
    transition: transform 0.3s ease-out;
  `;

  // close btn x mobile
  const closeBtn = document.createElement("button");
  const isMobile = detectTouchDevices();

  if (isMobile) {
    closeBtn.innerHTML = "X";
    closeBtn.style.cssText = `
    position: fixed;
    cursor: pointer;
    z-index: 10001;
    color: rgb(255, 255, 255);
    background: transparent;
    width: 44px;
    height: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'neue-haas-grotesk-display';
    font-size: 24px;
    transition: 0.2s;
    right: 10px;
    top: 20px;
    padding: 0px 12px;
    border-radius: 100%;
    border: 1px solid #fff;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  `;
  } else {
    closeBtn.innerHTML = "PRESS ESC TO CLOSE";
    closeBtn.style.cssText = `
    position: fixed;
    cursor: pointer;
    z-index: 10001;
    color: #fff;
    background: black;
    width: auto;
    height: 20px;
    display: flex;
    align-items: center;
    text-align: center;
    justify-content: center;
    font-family: 'Roboto Mono';
    font-size: 12px;
    transition: 0.2s;
    right: 10px;
    top: 12px;
    padding: 0 12px;
    border: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  `;

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#f0f0f0";
      closeBtn.style.color = "#000";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "#000";
      closeBtn.style.color = "#fff";
    });
  }

  const closePanel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removePanel();
    resumeGame();
  };

  closeBtn.addEventListener("click", closePanel);
  closeBtn.addEventListener("touchend", closePanel);

  // previene touch behaviors che possono interferire
  closeBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
  });

  closeBtn.addEventListener("touchmove", (e) => {
    e.preventDefault();
  });

  // creazione di un iframe
  const iframe = document.createElement("iframe");
  iframe.src = `${window.location.origin}/project/${slug}`;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
  `;

  // gestione iframe load errors
  iframe.addEventListener("error", () => {
    console.warn(`Failed to load content for slug: ${slug}`);
    panel.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <h2>Content not available</h2>
        <p>The content for "${slug}" could not be loaded.</p>
      </div>
    `;
    panel.appendChild(closeBtn);
  });

  panel.appendChild(iframe);
  panel.appendChild(closeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Trigger fade-in animation
  setTimeout(() => {
    overlay.style.opacity = "1";
    panel.style.transform = "scale(1)";
  }, 10);

  // GESTIONE INTERAZIONI CLOSE BTN
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      removePanel();
      resumeGame();
    }
  });

  // GESTIONE "ESC" KEY - Fixed memory leak
  currentEscHandler = (e) => {
    if (e.key === "Escape") {
      removePanel();
      resumeGame();
    }
  };
  document.addEventListener("keydown", currentEscHandler);
}

function removePanel() {
  const existingOverlay = document.getElementById("game-panel-overlay");
  const existingPanel = document.getElementById("game-panel");

  if (currentEscHandler) {
    document.removeEventListener("keydown", currentEscHandler);
    currentEscHandler = null;
  }

  if (existingOverlay && existingPanel) {
    // fade out
    existingOverlay.style.opacity = "0";
    existingPanel.style.transform = "scale(0.9)";

    // rimuovi quando completa
    setTimeout(() => {
      if (existingOverlay.parentNode) {
        existingOverlay.remove();
      }
    }, 300);
  }
}

function pauseGame() {
  gameState = "paused";
  // resetta la direzione di mobile per evitare movimenti non controllati
  persistentDirection = null;
}

function resumeGame() {
  gameState = "playing";
  animationTimer = 0;

  // conta eatenFood per capire dimensioni snake (+1 per la testa dello snake)
  const eatenFoodCount = foodPosition.filter((food) => food.eaten).length;
  const snakeSize = eatenFoodCount + 1;
  // Reset la posizione dello snake mantenendo le sue dimensioni
  const startRow = Math.floor(GRID_ROWS / 2);
  const startCol = Math.floor(GRID_COLS / 2);

  snake = [];
  for (let i = 0; i < snakeSize; i++) {
    snake.push({
      row: startRow,
      col: startCol,
      targetRow: startRow,
      targetCol: startCol,
    });
  }

  newSegments = 0;

  persistentDirection = null;

  // animazione fade in dell'opacità solo se il pannello è chiuso = ricomincia gioco
  if (currentAnimatedLine < currentRevealedLine) {
    currentAnimatedLine = currentRevealedLine;
  }
}

// funzione per fare si che l'utente possa riaccedere alla pagina del progetto
// relativa a un food già incontrato
function checkClickOnEatenFood(clickX, clickY) {
  for (let i = 0; i < foodPosition.length; i++) {
    const food = foodPosition[i];

    // valuta solo il cibo già mangiato per farlo clicckabile
    if (!food.eaten) continue;

    if (food.shape === "text") {
      const metrics = getBrowserAdjustedTextMeasures(food.word, food.fontSize);

      const textLeft = food.x;
      const textRight = food.x + metrics.width;
      const textTop = food.y + metrics.yOffset;
      const textBottom = food.y + metrics.height + metrics.yOffset;

      const collision =
        clickX >= textLeft &&
        clickX <= textRight &&
        clickY >= textTop &&
        clickY <= textBottom;

      if (collision) {
        return i;
      }
    }
  }
  return -1;
}

function mousePressed() {
  if (gameState === "paused") return;

  const clickedFoodIndex = checkClickOnEatenFood(mouseX, mouseY);

  if (clickedFoodIndex !== -1) {
    const clickedFood = foodPosition[clickedFoodIndex];
    const slug = getSlugForKeyword(clickedFood.word);

    if (slug) {
      pauseGame();
      createPanel(slug);
    } else {
      console.warn(`No slug mapping found for food: ${clickedFood.word}`);
    }
  }
}

function touchStarted() {
  if (gameState === "paused") return false;

  if (!detectTouchDevices()) {
    const touch = touches[0] || { x: mouseX, y: mouseY };
    const clickedFoodIndex = checkClickOnEatenFood(touch.x, touch.y);

    if (clickedFoodIndex !== -1) {
      const clickedFood = foodPosition[clickedFoodIndex];
      const slug = getSlugForKeyword(clickedFood.word);

      if (slug) {
        pauseGame();
        createPanel(slug);
      } else {
        console.warn(`No slug mapping found for food: ${clickedFood.word}`);
      }
      return false;
    }
  }

  return true;
}

function getBrowserType() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "safari";
  } else if (userAgent.includes("Chrome")) {
    return "chrome";
  } else if (userAgent.includes("Firefox")) {
    return "firefox";
  }
  return "other";
}

function getBrowserAdjustedTextMeasures(word, fontSize) {
  const browser = getBrowserType();

  push();
  textSize(fontSize);
  textFont(font);

  const baseWidth = textWidth(word);
  const baseHeight = fontSize;

  // aggiustamenti specifici per browser
  let widthAdjustment = 0;
  let heightAdjustment = 0;
  let yOffset = 0;

  switch (browser) {
    case "safari":
      yOffset = fontSize * 0.15;
      break;
    case "chrome":
      yOffset = fontSize * -0.03;
      break;
    case "firefox":
      yOffset = fontSize * 0.03;
      break;
    default:
      break;
  }

  pop();

  return {
    width: baseWidth + widthAdjustment,
    height: baseHeight + heightAdjustment,
    yOffset: yOffset,
  };
}

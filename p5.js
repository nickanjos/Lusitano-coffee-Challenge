// --- Game Configuration ---
let groundHeight = 50; // Base ground height in design units
let groundY; // Calculated dynamically
let gravity = 0.6; // Base gravity
let scaledGravity; // Scaled gravity
let initialGameSpeed = 6; // Base speed
let gameSpeed; // Dynamic speed
let speedIncreaseRate = 0.002;

// --- Base Dimensions for Scaling ---
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

// --- Game State ---
let gameState = 'start';
let score = 0;
let gameOverSoundPlayed = false;
let gameOverStartTime = 0;
let voiceDelay = 600;

// --- Game Objects ---
let player;
let obstacles = [];
let collectibles = [];
let clouds = [];

// --- Player Properties ---
let playerJumpForce = -13; // Base jump force
let scaledPlayerJumpForce; // Scaled jump force
let playerImg;
let playerGameplayW, playerGameplayH;

// --- Obstacle Properties ---
let baseObstacleWidth = 55;
let baseObstacleHeight = 50;
let obstacleWidth, obstacleHeight;
let minObstacleSpawnInterval = 70;
let maxObstacleSpawnInterval = 140;
let nextObstacleSpawnFrame;

// --- Collectible Properties ---
let baseCoffeeCupWidth = 25;
let baseCoffeeCupHeight = 30;
let baseCoffeeHandleSize = 10;
let coffeeCupWidth, coffeeCupHeight, coffeeHandleSize;
let collectibleSize;
let minCollectibleSpawnInterval = 90;
let maxCollectibleSpawnInterval = 180;
let nextCollectibleSpawnFrame;
let coffeeScoreValue = 1;

// --- Cloud Properties ---
let cloudSpawnRate = 180;
let cloudSpeedFactor = 0.5;

// --- Sound Variables ---
let bgMusic, loseSound, gameOverVoice, jumpSound;

// --- Scale Factor & Canvas Dimensions ---
let scaleFactor = 1;
let canvasWidth, canvasHeight; // Calculated values

// --- Preload Function ---
function preload() {
  playerImg = loadImage('player.png');
  if (!playerImg) { console.error("Failed to load player.png!"); }
  soundFormats('mp3', 'wav', 'ogg');
  bgMusic = loadSound('fun_music.mp3');
  loseSound = loadSound('sad_sound.wav');
  gameOverVoice = loadSound('grandes_merda.mp3');
  jumpSound = loadSound('jump.wav');
}

// --- Setup Function ---
function setup() {
  calculateCanvasSize(); // Calculate initial size
  let cnv = createCanvas(canvasWidth, canvasHeight); // Create canvas with calculated size
  updateGameDimensions(); // Calculate scaled element sizes & physics
  resetGame();
  textAlign(CENTER, CENTER);
  textFont('Arial');
  console.log(`Setup complete. Canvas: ${width}x${height}, Scale: ${scaleFactor.toFixed(2)}`);
}

// --- Calculate optimal canvas size ---
function calculateCanvasSize() {
    let winW = windowWidth;
    let winH = windowHeight;

    // Calculate height based on fitting width, and width based on fitting height
    let heightIfFitW = winW / ASPECT_RATIO;
    let widthIfFitH = winH * ASPECT_RATIO;

    // Check which dimension limits the scale
    if (widthIfFitH <= winW) {
        // Height is the limiting factor
        canvasWidth = widthIfFitH;
        canvasHeight = winH;
        scaleFactor = winH / BASE_HEIGHT;
        // console.log(`Fit H: win=${winW}x${winH} -> cnv=${canvasWidth.toFixed(0)}x${canvasHeight.toFixed(0)} scale=${scaleFactor.toFixed(2)}`);
    } else {
        // Width is the limiting factor
        canvasWidth = winW;
        canvasHeight = heightIfFitW;
        scaleFactor = winW / BASE_WIDTH;
        // console.log(`Fit W: win=${winW}x${winH} -> cnv=${canvasWidth.toFixed(0)}x${canvasHeight.toFixed(0)} scale=${scaleFactor.toFixed(2)}`);
    }

    // Ensure dimensions are at least 1x1
    canvasWidth = max(1, canvasWidth);
    canvasHeight = max(1, canvasHeight);
}


// --- Update dimensions dependent on canvas size ---
function updateGameDimensions() {
    groundY = height - (groundHeight * scaleFactor); // Scale ground offset

    // Scale element sizes
    obstacleWidth = baseObstacleWidth * scaleFactor;
    obstacleHeight = baseObstacleHeight * scaleFactor;
    coffeeCupWidth = baseCoffeeCupWidth * scaleFactor;
    coffeeCupHeight = baseCoffeeCupHeight * scaleFactor;
    coffeeHandleSize = baseCoffeeHandleSize * scaleFactor;
    collectibleSize = coffeeCupWidth + coffeeHandleSize;

    // Scale physics / player attributes
    scaledGravity = gravity * scaleFactor;
    scaledPlayerJumpForce = playerJumpForce * sqrt(scaleFactor); // Weaker jump on small screens? Needs tuning.

    // Calculate scaled player dimensions
    if (playerImg) {
        let desiredPlayerBaseHeight = 100;
        playerGameplayH = desiredPlayerBaseHeight * scaleFactor;
        let originalAspectRatio = playerImg.width / playerImg.height;
        playerGameplayW = playerGameplayH * originalAspectRatio;
    } else {
        playerGameplayH = 60 * scaleFactor; // Fallback size
        playerGameplayW = 40 * scaleFactor;
    }
    // Minimum size for player?
    playerGameplayW = max(10, playerGameplayW);
    playerGameplayH = max(15, playerGameplayH);
}


// --- Handles window resize ---
function windowResized() {
  console.log("Window Resized!");
  calculateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateGameDimensions();
  console.log(`Resized Canvas: ${width}x${height}, Scale: ${scaleFactor.toFixed(2)}`);

  // Reposition player after resize
  if (player) {
       player.w = playerGameplayW;
       player.h = playerGameplayH;
       // If player is now below ground, snap them up
       if (player.y + player.h > groundY) {
            player.y = groundY - player.h;
            player.velocityY = 0;
            player.isOnGround = true;
       }
  }
  // Optional: Redraw immediately to avoid flicker?
  // redraw();
}


// --- Reset Game Function ---
function resetGame() {
  score = 0;
  gameSpeed = initialGameSpeed * scaleFactor; // Scale initial speed
  obstacles = []; collectibles = []; clouds = [];
  gameOverSoundPlayed = false; gameOverStartTime = 0;

  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
  if (gameOverVoice && gameOverVoice.isPlaying()) { gameOverVoice.stop(); }
  if (loseSound && loseSound.isPlaying()) { loseSound.stop(); }

  if (!playerImg) { gameState = 'error'; return; }

  updateGameDimensions(); // Ensure dimensions are current

  player = {
    x: width / 4, y: groundY - playerGameplayH, w: playerGameplayW, h: playerGameplayH,
    velocityY: 0, isOnGround: true,
    jump: function() { if (this.isOnGround) { this.velocityY = scaledPlayerJumpForce; this.isOnGround = false; if (jumpSound) { jumpSound.play(); } } },
    // <<< Use scaled gravity in update >>>
    update: function() { this.velocityY += scaledGravity; this.y += this.velocityY; if (this.y + this.h >= groundY) { this.y = groundY - this.h; this.velocityY = 0; this.isOnGround = true; } },
    draw: function() { if(playerImg) image(playerImg, this.x, this.y, this.w, this.h); },
    collidesWith: function(item) { return (this.x < item.x + item.w && this.x + this.w > item.x && this.y < item.y + item.h && this.y + this.h > item.y); }
  };

  setNextObstacleSpawn();
  setNextCollectibleSpawn();
  clouds = []; // Clear clouds on reset
  for (let i=0; i< 5; i++) { spawnCloud(random(width)); }
}

// --- Set Spawn Timers ---
function setNextObstacleSpawn() { nextObstacleSpawnFrame = frameCount + floor(random(minObstacleSpawnInterval, maxObstacleSpawnInterval) / (gameSpeed / initialGameSpeed)); }
function setNextCollectibleSpawn() { nextCollectibleSpawnFrame = frameCount + floor(random(minCollectibleSpawnInterval, maxCollectibleSpawnInterval) / (gameSpeed / initialGameSpeed)); }

// --- Cloud Spawning ---
function spawnCloud(xPos = width) { let cloud = { x: xPos, y: random(height * 0.1, height * 0.4), size: random(40, 80) * scaleFactor, speed: gameSpeed * cloudSpeedFactor * random(0.8, 1.2), update: function() { this.x -= this.speed; }, draw: function() { fill(255, 255, 255, 200); noStroke(); ellipse(this.x, this.y, this.size * 0.8, this.size * 0.6); ellipse(this.x + this.size * 0.3, this.y - this.size * 0.1, this.size, this.size * 0.7); ellipse(this.x + this.size * 0.6, this.y, this.size * 0.7, this.size * 0.5); }, isOffscreen: function() { return this.x + this.size * 1.5 < 0; } }; clouds.push(cloud); }

// --- Draw Function (Main Loop) ---
function draw() {
  background(135, 206, 250);

  for (let i = clouds.length - 1; i >= 0; i--) { clouds[i].update(); clouds[i].draw(); if (clouds[i].isOffscreen()) { clouds.splice(i, 1); } }
  if (gameState !== 'gameOver' && frameCount % cloudSpawnRate === 0) { spawnCloud(); }
  fill(100, 150, 80); noStroke(); rect(0, groundY, width, height - groundY); // Ground to bottom
  fill(80, 130, 60); let tuftBaseSize = 8; let tuftSize = tuftBaseSize * scaleFactor;
  for (let i = 0; i < width; i += (20 * scaleFactor)) { ellipse(i + random(-5, 5) * scaleFactor, groundY + random(5 * scaleFactor, (groundHeight * scaleFactor) - (5 * scaleFactor)), random(tuftSize * 0.8, tuftSize * 1.2), random(tuftSize * 0.5, tuftSize)); }

  switch (gameState) {
    case 'start': drawStartScreen(); break;
    case 'playing': if(player) { drawPlayingScreen(); } else { fill(255,0,0); textSize(30 * scaleFactor); text("Error: Player not ready.", width/2, height/2); } break;
    case 'gameOver': drawGameOverScreen(); break;
    case 'error': fill(255,0,0); textSize(30 * scaleFactor); text("Error: Could not load assets.", width/2, height/2); text("Check console (F12) & refresh.", width/2, height/2 + 40 * scaleFactor); break;
  }

  // Draw rotation suggestion if needed
  if (height > width * 1.1 && (gameState === 'start' || gameState === 'playing' || gameState === 'gameOver')) { // Show if height is noticeably > width
      drawRotateSuggestion();
  }
}

// --- Draw rotation suggestion ---
function drawRotateSuggestion() {
    push(); fill(0, 0, 0, 170); rect(0, 0, width, height);
    fill(255); textAlign(CENTER, CENTER); textSize(max(18, 20 * scaleFactor)); // Ensure minimum readable size
    text("Please rotate your device\nfor the best experience!", width / 2, height / 2);
    pop();
}

// --- Draw Screens (Scaled text/elements) ---
function drawStartScreen() {
  fill(0, 0, 0, 180); rect(width*0.1, height*0.1, width*0.8, height*0.8, 20 * scaleFactor);
  fill(255);
  textFont('Impact'); textSize(max(30, 60 * scaleFactor)); text("THE COFFEE WARRIOR", width / 2, height * 0.3);
  textFont('Arial'); textSize(max(14, 24 * scaleFactor)); text("The journey of an angejense\nin search for the best coffee", width / 2, height * 0.5);
  textSize(max(16, 28 * scaleFactor)); text("TAP SCREEN or Press SPACEBAR to Start", width / 2, height * 0.68);
  textSize(max(12, 18 * scaleFactor)); text("NSCA Games", width / 2, height * 0.85);
  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
}

function drawPlayingScreen() {
  if (gameState !== 'playing') return;
  player.update();
  // Scale game speed slightly based on scale factor AND increase over time
  gameSpeed = (initialGameSpeed * scaleFactor) + (frameCount * speedIncreaseRate * scaleFactor); // Scale increase too
  // Optional: Clamp max speed
  // let maxSpeed = initialGameSpeed * 2 * scaleFactor; gameSpeed = min(gameSpeed, maxSpeed);

  if (frameCount >= nextObstacleSpawnFrame) { spawnObstacle(); setNextObstacleSpawn(); }
  if (frameCount >= nextCollectibleSpawnFrame) { spawnCollectible(); setNextCollectibleSpawn(); }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].update(); obstacles[i].draw();
    if (player.collidesWith(obstacles[i])) { if (loseSound && !loseSound.isPlaying()) { loseSound.play(); } if (bgMusic) { bgMusic.stop(); } gameState = 'gameOver'; gameOverStartTime = millis(); gameOverSoundPlayed = false; return; }
    if (obstacles[i].isOffscreen()) { obstacles.splice(i, 1); }
  }
  for (let i = collectibles.length - 1; i >= 0; i--) {
    collectibles[i].update(); collectibles[i].draw();
    if (player.collidesWith(collectibles[i])) { score += coffeeScoreValue; collectibles.splice(i, 1); }
    else if (collectibles[i].isOffscreen()) { collectibles.splice(i, 1); }
  }
  player.draw(); drawHUD();
}

function drawGameOverScreen() {
  let enlargedScale = 3; // Keep enlargement factor constant relative to gameplay size
  let enlargedW = playerGameplayW * enlargedScale;
  let enlargedH = playerGameplayH * enlargedScale;
  enlargedW = min(enlargedW, width * 0.5); // Constrain max size relative to screen
  enlargedH = min(enlargedH, height * 0.5);

  let enlargedX = width / 2 - enlargedW / 2;
  let enlargedY = height * 0.4 - enlargedH / 2; // Position slightly higher than center

  if (playerImg) { image(playerImg, enlargedX, enlargedY, enlargedW, enlargedH); } // Draw player image

  if (gameOverVoice && !gameOverSoundPlayed && millis() > gameOverStartTime + voiceDelay) { gameOverVoice.play(); gameOverSoundPlayed = true; }

  let targetX = enlargedX + enlargedW * 0.9; let targetY = enlargedY + enlargedH * 0.25;
  drawImprovedSpeechBubble("Grandes Merda!", targetX, targetY, 150 * scaleFactor);

  let textYPos = enlargedY + enlargedH + 25 * scaleFactor; // Space below player
  textYPos = max(textYPos, height * 0.65); // Ensure text is below middle
  fill(255); textSize(max(18, 30 * scaleFactor)); text("Final Score: " + score, width / 2, textYPos);
  textSize(max(16, 24 * scaleFactor)); text("TAP SCREEN or Press SPACEBAR to Restart", width / 2, textYPos + 40 * scaleFactor);
  textSize(max(12, 16 * scaleFactor)); text("NSCA Games", width / 2, textYPos + 70 * scaleFactor);
}


// --- IMPROVED SPEECH BUBBLE FUNCTION (Scaled) ---
function drawImprovedSpeechBubble(txt, targetX, targetY, approxWidth) {
    let basePadding = 15; let baseCornerSoftness = 15; let baseTailWidth = 20;
    let baseTailHeight = 25; let baseTxtSize = 18; let baseStrokeWeight = 2.5;

    // Scale all base values
    let bubblePadding = basePadding * scaleFactor; let cornerSoftness = baseCornerSoftness * scaleFactor;
    let tailWidth = baseTailWidth * scaleFactor; let tailHeight = baseTailHeight * scaleFactor;
    let txtSize = max(10, baseTxtSize * scaleFactor); // Minimum size 10
    let bubbleStrokeWeight = max(1, baseStrokeWeight * scaleFactor); // Minimum weight 1

    let bubbleFill = color(255, 255, 255, 245); let bubbleStroke = color(40);

    textFont('Arial'); textSize(txtSize); let tw = textWidth(txt); let th = txtSize;
    let bubbleW = max(tw + bubblePadding * 2, approxWidth * 0.6);
    bubbleW = min(bubbleW, approxWidth * 1.2);
    let neededTextHeight = ceil(tw / (bubbleW - bubblePadding * 2)) * th * 1.3;
    bubbleH = neededTextHeight + bubblePadding * 2;
    bubbleH = max(bubbleH, th + bubblePadding * 2); // Min height for one line

    let bubbleX = targetX + 10 * scaleFactor; let bubbleY = targetY - bubbleH * 0.5;
    bubbleX = constrain(bubbleX, 10, width - bubbleW - 10);
    bubbleY = constrain(bubbleY, 10, height - bubbleH - 10 - (groundHeight * scaleFactor));

    let tailAnchorX = bubbleX; let tailAnchorY1 = bubbleY + bubbleH * 0.4; let tailAnchorY2 = bubbleY + bubbleH * 0.6;
    let tailPointX = constrain(targetX, bubbleX - tailHeight * 2, bubbleX);
    let tailPointY = constrain(targetY, bubbleY - tailHeight, bubbleY + bubbleH + tailHeight);

    fill(bubbleFill); stroke(bubbleStroke); strokeWeight(bubbleStrokeWeight); beginShape(); vertex(bubbleX + cornerSoftness, bubbleY); quadraticVertex(bubbleX + bubbleW / 2, bubbleY - cornerSoftness * 0.2, bubbleX + bubbleW - cornerSoftness, bubbleY); quadraticVertex(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + cornerSoftness); quadraticVertex(bubbleX + bubbleW + cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX + bubbleW, bubbleY + bubbleH - cornerSoftness); quadraticVertex(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - cornerSoftness, bubbleY + bubbleH); quadraticVertex(bubbleX + bubbleW / 2, bubbleY + bubbleH + cornerSoftness * 0.2, bubbleX + cornerSoftness, bubbleY + bubbleH); quadraticVertex(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - cornerSoftness); vertex(bubbleX, tailAnchorY2); quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY2 - tailHeight * 0.1, tailPointX, tailPointY); quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY1 + tailHeight * 0.1, bubbleX, tailAnchorY1); vertex(bubbleX, bubbleY + cornerSoftness); quadraticVertex(bubbleX - cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX, bubbleY + cornerSoftness); quadraticVertex(bubbleX, bubbleY, bubbleX + cornerSoftness, bubbleY); endShape(CLOSE);
    fill(0); noStroke(); textAlign(CENTER, CENTER); text(txt, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
    textAlign(LEFT, TOP);
}


// Draw Heads Up Display (Scaled)
function drawHUD() {
  let hudTextSize = max(12, 20 * scaleFactor); // Min size 12
  let scoreX = 15 * scaleFactor;
  let scoreY = 15 * scaleFactor;

  let instructionBoxW = 140 * scaleFactor;
  let instructionBoxH = 40 * scaleFactor;
  let instructionBoxX = width - instructionBoxW - (10 * scaleFactor);
  let instructionBoxY = 10 * scaleFactor;
  let instructionTextSize = max(10, 14 * scaleFactor); // Min size 10

  fill(0); textSize(hudTextSize); textAlign(LEFT, TOP); text("Coffee: " + score, scoreX, scoreY);
  fill(0, 0, 0, 180); rect(instructionBoxX, instructionBoxY, instructionBoxW, instructionBoxH, 5 * scaleFactor);
  fill(255); textSize(instructionTextSize); textAlign(CENTER, CENTER);
  text("TAP or SPACE\nto JUMP", instructionBoxX + instructionBoxW / 2, instructionBoxY + instructionBoxH / 2);
  textAlign(LEFT, TOP);
 }

// --- Spawning Functions (Scaled Obstacles/Collectibles) ---
function spawnObstacle() { let obstacle = { x: width, y: groundY - obstacleHeight, w: obstacleWidth, h: obstacleHeight, update: function() { this.x -= gameSpeed; }, draw: function() { push(); translate(this.x, this.y); let armDiameter = this.w * 0.35; let armRadius = armDiameter / 2; let bodyWidth = this.w * 0.3; let capHeight = this.h * 0.2; let bodyHeight = this.h - capHeight; let bodyY = capHeight; let leftArmCX = armRadius; let rightArmCX = this.w - armRadius; let bodyX = this.w / 2 - bodyWidth / 2; let armCenterY = this.h * 0.55; fill(34, 170, 34); noStroke(); rect(bodyX, bodyY, bodyWidth, bodyHeight, 0, 0, max(1, 3 * scaleFactor), max(1, 3 * scaleFactor)); arc(bodyX + bodyWidth / 2, bodyY, bodyWidth, capHeight * 2, PI, TWO_PI); ellipse(leftArmCX, armCenterY, armDiameter, armDiameter); ellipse(rightArmCX, armCenterY, armDiameter, armDiameter); stroke(0, 100, 0); strokeWeight(max(1, 2 * scaleFactor)); let spineLen = max(3, 6 * scaleFactor); line(bodyX + bodyWidth / 2, bodyY - capHeight*0.8, bodyX + bodyWidth / 2, bodyY - capHeight*0.8 - spineLen); line(bodyX + bodyWidth * 0.2, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.2 - spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX + bodyWidth * 0.8, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.8 + spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX, armCenterY - armRadius*0.5, bodyX - spineLen, armCenterY - armRadius*0.5); line(bodyX + bodyWidth, armCenterY - armRadius*0.5, bodyX + bodyWidth + spineLen, armCenterY - armRadius*0.5); line(leftArmCX - armRadius, armCenterY, leftArmCX - armRadius - spineLen, armCenterY); line(leftArmCX, armCenterY - armRadius, leftArmCX, armCenterY - armRadius - spineLen); line(leftArmCX, armCenterY + armRadius, leftArmCX, armCenterY + armRadius + spineLen); line(leftArmCX - armRadius*0.7, armCenterY - armRadius*0.7, leftArmCX - armRadius*0.7 - spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(leftArmCX + armRadius*0.7, armCenterY + armRadius*0.7, leftArmCX + armRadius*0.7 + spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); line(rightArmCX + armRadius, armCenterY, rightArmCX + armRadius + spineLen, armCenterY); line(rightArmCX, armCenterY - armRadius, rightArmCX, armCenterY - armRadius - spineLen); line(rightArmCX, armCenterY + armRadius, rightArmCX, armCenterY + armRadius + spineLen); line(rightArmCX + armRadius*0.7, armCenterY - armRadius*0.7, rightArmCX + armRadius*0.7 + spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(rightArmCX - armRadius*0.7, armCenterY + armRadius*0.7, rightArmCX - armRadius*0.7 - spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); pop(); }, isOffscreen: function() { return this.x + this.w < 0; } }; obstacles.push(obstacle); }
function spawnCollectible() { let playerHeightForSpawn = player ? player.h : (60 * scaleFactor); let randomYOffset = random(collectibleSize * 1.2, playerHeightForSpawn * 1.5); let collectible = { x: width, y: groundY - randomYOffset - coffeeCupHeight, w: coffeeCupWidth + coffeeHandleSize / 2, h: coffeeCupHeight, angle: random(TWO_PI), update: function() { this.x -= gameSpeed; this.angle += 0.1; }, draw: function() { push(); translate(this.x, this.y); fill(139, 69, 19); noStroke(); rect(0, 0, coffeeCupWidth, coffeeCupHeight, max(1, 3 * scaleFactor)); fill(92, 64, 51); ellipse(coffeeCupWidth / 2, coffeeCupHeight * 0.3, coffeeCupWidth * 0.8, coffeeCupHeight * 0.4); noFill(); stroke(210, 180, 140); strokeWeight(max(1, 2 * scaleFactor)); arc(coffeeCupWidth / 2, coffeeCupHeight * 0.15, coffeeCupWidth, coffeeCupHeight * 0.3, PI, TWO_PI); noFill(); stroke(139, 69, 19); strokeWeight(max(1.5, 4 * scaleFactor)); arc(coffeeCupWidth, coffeeCupHeight / 2, coffeeHandleSize, coffeeHandleSize, -HALF_PI, HALF_PI); stroke(240, 240, 240, 150); strokeWeight(max(1, 1.5 * scaleFactor)); noFill(); let steamX = coffeeCupWidth / 2; let steamY = -5 * scaleFactor; let steamHeight = 10 * scaleFactor; beginShape(); vertex(steamX - 3 * scaleFactor, steamY); quadraticVertex(steamX + 3 * scaleFactor + sin(this.angle)*2 , steamY - steamHeight/2, steamX - 2 * scaleFactor, steamY-steamHeight); endShape(); beginShape(); vertex(steamX + 2 * scaleFactor, steamY - 2 * scaleFactor); quadraticVertex(steamX - 3 * scaleFactor + cos(this.angle)*2, steamY - steamHeight/2 - 2 * scaleFactor, steamX + 1 * scaleFactor, steamY-steamHeight - 3 * scaleFactor); endShape(); pop(); }, isOffscreen: function() { return this.x + this.w < 0; } }; let tooClose = false; for(let obs of obstacles) { if (abs(collectible.x - obs.x) < obs.w * 2) { tooClose = true; break; } } if (!tooClose) { collectibles.push(collectible); } else { nextCollectibleSpawnFrame = frameCount + 10; } }

// --- Handle Input ---
function keyPressed() { if (gameState === 'error') return; if (keyCode === 32) { handleInteraction(); } }
function touchStarted() { if (gameState === 'error') return; if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) { handleInteraction(); return false; } }

function handleInteraction() {
   switch (gameState) {
      case 'start': userStartAudio(); resetGame(); if (gameState !== 'error') { gameState = 'playing'; if (bgMusic && !bgMusic.isPlaying()) { bgMusic.loop(); } } break;
      case 'playing': if(player) player.jump(); break;
      case 'gameOver': resetGame(); if (gameState !== 'error') { gameState = 'playing'; if (bgMusic && !bgMusic.isPlaying()) { bgMusic.loop(); } } break;
    }
}

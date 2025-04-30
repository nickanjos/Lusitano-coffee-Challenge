// --- Game Configuration ---
let groundHeight = 50;
let groundY; // Calculated dynamically
let gravity = 0.6;
let initialGameSpeed = 6;
let speedIncreaseRate = 0.002;

// --- Base Dimensions for Scaling ---
const BASE_WIDTH = 800; // Original design width
const BASE_HEIGHT = 400; // Original design height

// --- Game State ---
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let gameSpeed;
let gameOverSoundPlayed = false;
let gameOverStartTime = 0;
let voiceDelay = 600;

// --- Game Objects ---
let player;
let obstacles = [];
let collectibles = [];
let clouds = [];

// --- Player Properties ---
let playerJumpForce = -13;
let playerImg;
let playerGameplayW, playerGameplayH;

// --- Obstacle Properties ---
let baseObstacleWidth = 55;
let baseObstacleHeight = 50;
let obstacleWidth, obstacleHeight; // Dynamic size

let minObstacleSpawnInterval = 70;
let maxObstacleSpawnInterval = 140;
let nextObstacleSpawnFrame;

// --- Collectible Properties ---
let baseCoffeeCupWidth = 25;
let baseCoffeeCupHeight = 30;
let baseCoffeeHandleSize = 10;
let coffeeCupWidth, coffeeCupHeight, coffeeHandleSize; // Dynamic size
let collectibleSize;

let minCollectibleSpawnInterval = 90;
let maxCollectibleSpawnInterval = 180;
let nextCollectibleSpawnFrame;
let coffeeScoreValue = 1;

// --- Cloud Properties ---
let cloudSpawnRate = 180;
let cloudSpeedFactor = 0.5;

// --- Sound Variables ---
let bgMusic;
let loseSound;
let gameOverVoice;
let jumpSound;

// --- Scale Factor ---
let scaleFactor = 1; // Global scale factor

// --- Canvas Dimensions (calculated) ---
let canvasWidth, canvasHeight;

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
  calculateCanvasSize(); // Calculate before creating canvas
  let cnv = createCanvas(canvasWidth, canvasHeight);
  // Center canvas if needed (optional styling)
  // cnv.parent('canvas-container'); // If you have a specific div
  // cnv.style('display', 'block'); cnv.style('margin', 'auto');

  updateGameDimensions(); // Calculate groundY and scaled sizes
  resetGame();
  textAlign(CENTER, CENTER);
  textFont('Arial');
}

// --- Calculate optimal canvas size ---
function calculateCanvasSize() {
  let availableWidth = windowWidth;
  let availableHeight = windowHeight;
  let aspectRatio = BASE_WIDTH / BASE_HEIGHT;

  // Calculate potential width/height based on fitting to available space
  let widthBasedOnHeight = availableHeight * aspectRatio;
  let heightBasedOnWidth = availableWidth / aspectRatio;

  // Choose the dimensions that fit within the window bounds
  if (widthBasedOnHeight <= availableWidth) {
    // Fit based on height (likely portrait or square-ish window)
    canvasHeight = availableHeight;
    canvasWidth = widthBasedOnHeight;
    scaleFactor = availableHeight / BASE_HEIGHT;
  } else {
    // Fit based on width (likely landscape window)
    canvasWidth = availableWidth;
    canvasHeight = heightBasedOnWidth;
    scaleFactor = availableWidth / BASE_WIDTH;
  }
   // Apply calculated size (p5 uses global width/height after createCanvas)
   // We store them in canvasWidth/Height for resizeCanvas
}

// --- Update dimensions dependent on canvas size ---
function updateGameDimensions() {
    // Use global width/height which are set by createCanvas/resizeCanvas
    groundY = height - (groundHeight * scaleFactor); // Scale ground height position offset

    obstacleWidth = baseObstacleWidth * scaleFactor;
    obstacleHeight = baseObstacleHeight * scaleFactor;
    coffeeCupWidth = baseCoffeeCupWidth * scaleFactor;
    coffeeCupHeight = baseCoffeeCupHeight * scaleFactor;
    coffeeHandleSize = baseCoffeeHandleSize * scaleFactor;
    collectibleSize = coffeeCupWidth + coffeeHandleSize; // Use scaled sizes

    if (playerImg) {
        let desiredPlayerBaseHeight = 100;
        playerGameplayH = desiredPlayerBaseHeight * scaleFactor;
        let originalAspectRatio = playerImg.width / playerImg.height;
        playerGameplayW = playerGameplayH * originalAspectRatio;
    } else {
        // Fallback if image not loaded?
        playerGameplayH = 60 * scaleFactor;
        playerGameplayW = 40 * scaleFactor;
    }
    // Adjust jump force based on gravity and scale (requires tuning)
    playerJumpForce = -13 * sqrt(scaleFactor); // Example: weaker jump on smaller screens?
    gravity = 0.6 * scaleFactor; // Scale gravity slightly?

}

// --- Handles window resize ---
function windowResized() {
  calculateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  updateGameDimensions();

  // Try to reposition player smoothly after resize
  if (player) {
       player.w = playerGameplayW; // Update player's internal size
       player.h = playerGameplayH;
       if (player.y + player.h > groundY) { // If player is now below ground
            player.y = groundY - player.h; // Snap to ground
            player.velocityY = 0;
            player.isOnGround = true;
       }
  }
  // No need to reset clouds unless they look wrong after resize
}

// --- Reset Game Function ---
function resetGame() {
  score = 0;
  gameSpeed = initialGameSpeed * scaleFactor; // Scale initial speed too
  obstacles = [];
  collectibles = [];
  clouds = [];
  gameOverSoundPlayed = false;
  gameOverStartTime = 0;

  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
  if (gameOverVoice && gameOverVoice.isPlaying()) { gameOverVoice.stop(); }
  if (loseSound && loseSound.isPlaying()) { loseSound.stop(); }

  if (!playerImg) { gameState = 'error'; return; }

  updateGameDimensions(); // Ensure dimensions are correct

  player = {
    x: width / 4, y: groundY - playerGameplayH, w: playerGameplayW, h: playerGameplayH,
    velocityY: 0, isOnGround: true,
    jump: function() { if (this.isOnGround) { this.velocityY = playerJumpForce; this.isOnGround = false; if (jumpSound) { jumpSound.play(); } } },
    update: function() { this.velocityY += gravity; this.y += this.velocityY; if (this.y + this.h >= groundY) { this.y = groundY - this.h; this.velocityY = 0; this.isOnGround = true; } },
    draw: function() { if(playerImg) image(playerImg, this.x, this.y, this.w, this.h); },
    collidesWith: function(item) { return (this.x < item.x + item.w && this.x + this.w > item.x && this.y < item.y + item.h && this.y + this.h > item.y); }
  };

  setNextObstacleSpawn();
  setNextCollectibleSpawn();
  for (let i=0; i< 5; i++) { spawnCloud(random(width)); } // Spawn clouds relative to current width
}

// --- Set Spawn Timers ---
// Adjust intervals based on scaled speed? Simpler to keep base logic for now.
function setNextObstacleSpawn() { nextObstacleSpawnFrame = frameCount + floor(random(minObstacleSpawnInterval, maxObstacleSpawnInterval) / (gameSpeed / initialGameSpeed)); }
function setNextCollectibleSpawn() { nextCollectibleSpawnFrame = frameCount + floor(random(minCollectibleSpawnInterval, maxCollectibleSpawnInterval) / (gameSpeed / initialGameSpeed)); }

// --- Cloud Spawning (scales size) ---
function spawnCloud(xPos = width) { let cloud = { x: xPos, y: random(height * 0.1, height * 0.4), size: random(40, 80) * scaleFactor, speed: (initialGameSpeed * scaleFactor) * cloudSpeedFactor * random(0.8, 1.2), update: function() { this.x -= this.speed; }, draw: function() { fill(255, 255, 255, 200); noStroke(); ellipse(this.x, this.y, this.size * 0.8, this.size * 0.6); ellipse(this.x + this.size * 0.3, this.y - this.size * 0.1, this.size, this.size * 0.7); ellipse(this.x + this.size * 0.6, this.y, this.size * 0.7, this.size * 0.5); }, isOffscreen: function() { return this.x + this.size * 1.5 < 0; } }; clouds.push(cloud); }

// --- Draw Function (Main Loop) ---
function draw() {
  background(135, 206, 250); // Sky blue

  // Draw Clouds & Ground scaled
  for (let i = clouds.length - 1; i >= 0; i--) { clouds[i].update(); clouds[i].draw(); if (clouds[i].isOffscreen()) { clouds.splice(i, 1); } }
  if (gameState !== 'gameOver' && frameCount % cloudSpawnRate === 0) { spawnCloud(); }
  fill(100, 150, 80); noStroke(); rect(0, groundY, width, height - groundY);
  fill(80, 130, 60); let tuftBaseSize = 8; let tuftSize = tuftBaseSize * scaleFactor;
  for (let i = 0; i < width; i += (20 * scaleFactor)) { ellipse(i + random(-5, 5) * scaleFactor, groundY + random(5 * scaleFactor, (groundHeight * scaleFactor) - (5 * scaleFactor)), random(tuftSize * 0.8, tuftSize * 1.2), random(tuftSize * 0.5, tuftSize)); }

  // Draw current game screen
  switch (gameState) {
    case 'start': drawStartScreen(); break;
    case 'playing': if(player) { drawPlayingScreen(); } else { fill(255,0,0); textSize(30 * scaleFactor); text("Error: Player not ready.", width/2, height/2); } break;
    case 'gameOver': drawGameOverScreen(); break;
    case 'error': fill(255,0,0); textSize(30 * scaleFactor); text("Error: Could not load assets.", width/2, height/2); text("Check console (F12) & refresh.", width/2, height/2 + 40 * scaleFactor); break;
  }

  // <<< ADDED: Draw rotation suggestion if in portrait mode >>>
  if (height > width && (gameState === 'start' || gameState === 'playing' || gameState === 'gameOver')) {
      drawRotateSuggestion();
  }
}

// <<< NEW Function: Suggest rotating device >>>
function drawRotateSuggestion() {
    push(); // Isolate suggestion drawing
    fill(0, 0, 0, 170); // Semi-transparent dark overlay
    rect(0, 0, width, height); // Cover the whole canvas

    fill(255); // White text
    textAlign(CENTER, CENTER);
    textSize(20 * scaleFactor); // Scaled text size
    // Simple rotate icon (optional)
    // text("🔄", width / 2, height / 2 - 30 * scaleFactor);
    text("Please rotate your device\nfor the best experience!", width / 2, height / 2);
    pop(); // Restore previous drawing settings
}

// --- Draw Screens (Scaled text sizes) ---
function drawStartScreen() {
  // Background elements drawn in draw()
  fill(0, 0, 0, 180); rect(width*0.1, height*0.1, width*0.8, height*0.8, 20 * scaleFactor);
  fill(255);
  textFont('Impact'); textSize(60 * scaleFactor); text("THE COFFEE WARRIOR", width / 2, height * 0.3);
  textFont('Arial'); textSize(24 * scaleFactor); text("The journey of an angejense\nin search for the best coffee", width / 2, height * 0.5); // Added line break for potentially narrow screens
  textSize(28 * scaleFactor); text("TAP SCREEN or Press SPACEBAR to Start", width / 2, height * 0.68); // Adjusted Y pos
  textSize(18 * scaleFactor); text("NSCA Games", width / 2, height * 0.85); // Adjusted Y pos
  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
}

function drawPlayingScreen() {
  if (gameState !== 'playing') return;
  player.update();
  // Scale game speed slightly with canvas size? Optional.
  gameSpeed = initialGameSpeed * scaleFactor + frameCount * speedIncreaseRate;
  // Clamp game speed? maxSpeed = initialGameSpeed * 1.8; gameSpeed = min(gameSpeed, maxSpeed);

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
  // Background elements drawn in draw()

  // Use original image for better quality enlargement, scale proportionally
  let enlargedScale = 3 * scaleFactor; // Base enlargement scale on overall scale
  let enlargedW = playerImg.width * enlargedScale;
  let enlargedH = playerImg.height * enlargedScale;
  // Constrain size
  enlargedW = min(enlargedW, width * 0.5); // Max 50% of screen width
  enlargedH = min(enlargedH, height * 0.5); // Max 50% of screen height

  let enlargedX = width / 2 - enlargedW / 2;
  let enlargedY = height / 2 - enlargedH / 2 - 20 * scaleFactor;

  if (playerImg) { image(playerImg, enlargedX, enlargedY, enlargedW, enlargedH); }

  if (gameOverVoice && !gameOverSoundPlayed && millis() > gameOverStartTime + voiceDelay) { gameOverVoice.play(); gameOverSoundPlayed = true; }

  let targetX = enlargedX + enlargedW * 0.9;
  let targetY = enlargedY + enlargedH * 0.25;
  drawImprovedSpeechBubble("Grandes Merda!", targetX, targetY, 150 * scaleFactor);

  let textYPos = enlargedY + enlargedH + 20 * scaleFactor;
  textYPos = max(textYPos, height * 0.7);
  fill(255); textSize(30 * scaleFactor); text("Final Score: " + score, width / 2, textYPos);
  textSize(24 * scaleFactor); text("TAP SCREEN or Press SPACEBAR to Restart", width / 2, textYPos + 40 * scaleFactor);
  textSize(16 * scaleFactor); text("NSCA Games", width / 2, textYPos + 70 * scaleFactor);
}

// --- IMPROVED SPEECH BUBBLE FUNCTION (Scaled) ---
function drawImprovedSpeechBubble(txt, targetX, targetY, approxWidth) {
    let bubblePadding = 15 * scaleFactor; let cornerSoftness = 15 * scaleFactor;
    let tailWidth = 20 * scaleFactor; let tailHeight = 25 * scaleFactor;
    let txtSize = 18 * scaleFactor;
    let bubbleFill = color(255, 255, 255, 245);
    let bubbleStroke = color(40); let bubbleStrokeWeight = 2.5 * scaleFactor;

    textFont('Arial'); textSize(txtSize); let tw = textWidth(txt); let th = txtSize;
    let bubbleW = max(tw + bubblePadding * 2, approxWidth * 0.6);
    bubbleW = min(bubbleW, approxWidth * 1.2);
    let neededTextHeight = ceil(tw / (bubbleW - bubblePadding * 2)) * th * 1.3;
    let bubbleH = neededTextHeight + bubblePadding * 2;
    let bubbleX = targetX + 10 * scaleFactor; let bubbleY = targetY - bubbleH * 0.5;
    bubbleX = constrain(bubbleX, 10, width - bubbleW - 10);
    bubbleY = constrain(bubbleY, 10, height - bubbleH - 10 - (groundHeight * scaleFactor)); // Scale ground offset here too

    let tailAnchorX = bubbleX; let tailAnchorY1 = bubbleY + bubbleH * 0.4; let tailAnchorY2 = bubbleY + bubbleH * 0.6;
    let tailPointX = constrain(targetX, bubbleX - tailHeight * 2, bubbleX);
    let tailPointY = constrain(targetY, bubbleY - tailHeight, bubbleY + bubbleH + tailHeight);

    fill(bubbleFill); stroke(bubbleStroke); strokeWeight(bubbleStrokeWeight); beginShape(); vertex(bubbleX + cornerSoftness, bubbleY); quadraticVertex(bubbleX + bubbleW / 2, bubbleY - cornerSoftness * 0.2, bubbleX + bubbleW - cornerSoftness, bubbleY); quadraticVertex(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + cornerSoftness); quadraticVertex(bubbleX + bubbleW + cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX + bubbleW, bubbleY + bubbleH - cornerSoftness); quadraticVertex(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - cornerSoftness, bubbleY + bubbleH); quadraticVertex(bubbleX + bubbleW / 2, bubbleY + bubbleH + cornerSoftness * 0.2, bubbleX + cornerSoftness, bubbleY + bubbleH); quadraticVertex(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - cornerSoftness); vertex(bubbleX, tailAnchorY2); quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY2 - tailHeight * 0.1, tailPointX, tailPointY); quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY1 + tailHeight * 0.1, bubbleX, tailAnchorY1); vertex(bubbleX, bubbleY + cornerSoftness); quadraticVertex(bubbleX - cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX, bubbleY + cornerSoftness); quadraticVertex(bubbleX, bubbleY, bubbleX + cornerSoftness, bubbleY); endShape(CLOSE);
    fill(0); noStroke(); textAlign(CENTER, CENTER); text(txt, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
    textAlign(LEFT, TOP);
}


// Draw Heads Up Display (Scaled)
function drawHUD() {
  let hudTextSize = 20 * scaleFactor; // Slightly smaller base size for HUD
  let scoreX = 15 * scaleFactor;
  let scoreY = 15 * scaleFactor;

  let instructionBoxW = 140 * scaleFactor; // Adjusted base size
  let instructionBoxH = 40 * scaleFactor;
  let instructionBoxX = width - instructionBoxW - (10 * scaleFactor);
  let instructionBoxY = 10 * scaleFactor;
  let instructionTextSize = 14 * scaleFactor; // Adjusted base size

  fill(0); textSize(hudTextSize); textAlign(LEFT, TOP); text("Coffee: " + score, scoreX, scoreY);
  fill(0, 0, 0, 180); rect(instructionBoxX, instructionBoxY, instructionBoxW, instructionBoxH, 5 * scaleFactor);
  fill(255); textSize(instructionTextSize); textAlign(CENTER, CENTER);
  text("TAP or SPACE\nto JUMP", instructionBoxX + instructionBoxW / 2, instructionBoxY + instructionBoxH / 2);
  textAlign(LEFT, TOP);
 }

// --- Spawning Functions (Scaled Obstacles/Collectibles) ---
function spawnObstacle() { let obstacle = { x: width, y: groundY - obstacleHeight, w: obstacleWidth, h: obstacleHeight, update: function() { this.x -= gameSpeed; }, draw: function() { push(); translate(this.x, this.y); let armDiameter = this.w * 0.35; let armRadius = armDiameter / 2; let bodyWidth = this.w * 0.3; let capHeight = this.h * 0.2; let bodyHeight = this.h - capHeight; let bodyY = capHeight; let leftArmCX = armRadius; let rightArmCX = this.w - armRadius; let bodyX = this.w / 2 - bodyWidth / 2; let armCenterY = this.h * 0.55; fill(34, 170, 34); noStroke(); rect(bodyX, bodyY, bodyWidth, bodyHeight, 0, 0, 3 * scaleFactor, 3 * scaleFactor); arc(bodyX + bodyWidth / 2, bodyY, bodyWidth, capHeight * 2, PI, TWO_PI); ellipse(leftArmCX, armCenterY, armDiameter, armDiameter); ellipse(rightArmCX, armCenterY, armDiameter, armDiameter); stroke(0, 100, 0); strokeWeight(2 * scaleFactor); let spineLen = 6 * scaleFactor; line(bodyX + bodyWidth / 2, bodyY - capHeight*0.8, bodyX + bodyWidth / 2, bodyY - capHeight*0.8 - spineLen); line(bodyX + bodyWidth * 0.2, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.2 - spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX + bodyWidth * 0.8, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.8 + spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX, armCenterY - armRadius*0.5, bodyX - spineLen, armCenterY - armRadius*0.5); line(bodyX + bodyWidth, armCenterY - armRadius*0.5, bodyX + bodyWidth + spineLen, armCenterY - armRadius*0.5); line(leftArmCX - armRadius, armCenterY, leftArmCX - armRadius - spineLen, armCenterY); line(leftArmCX, armCenterY - armRadius, leftArmCX, armCenterY - armRadius - spineLen); line(leftArmCX, armCenterY + armRadius, leftArmCX, armCenterY + armRadius + spineLen); line(leftArmCX - armRadius*0.7, armCenterY - armRadius*0.7, leftArmCX - armRadius*0.7 - spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(leftArmCX + armRadius*0.7, armCenterY + armRadius*0.7, leftArmCX + armRadius*0.7 + spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); line(rightArmCX + armRadius, armCenterY, rightArmCX + armRadius + spineLen, armCenterY); line(rightArmCX, armCenterY - armRadius, rightArmCX, armCenterY - armRadius - spineLen); line(rightArmCX, armCenterY + armRadius, rightArmCX, armCenterY + armRadius + spineLen); line(rightArmCX + armRadius*0.7, armCenterY - armRadius*0.7, rightArmCX + armRadius*0.7 + spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(rightArmCX - armRadius*0.7, armCenterY + armRadius*0.7, rightArmCX - armRadius*0.7 - spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); pop(); }, isOffscreen: function() { return this.x + this.w < 0; } }; obstacles.push(obstacle); }
function spawnCollectible() { let playerHeightForSpawn = player ? player.h : (60 * scaleFactor); let randomYOffset = random(collectibleSize * 1.2, playerHeightForSpawn * 1.5); let collectible = { x: width, y: groundY - randomYOffset - coffeeCupHeight, w: coffeeCupWidth + coffeeHandleSize / 2, h: coffeeCupHeight, angle: random(TWO_PI), update: function() { this.x -= gameSpeed; this.angle += 0.1; }, draw: function() { push(); translate(this.x, this.y); // Draw coffee at its calculated size (already scaled) fill(139, 69, 19); noStroke(); rect(0, 0, coffeeCupWidth, coffeeCupHeight, 3 * scaleFactor); fill(92, 64, 51); ellipse(coffeeCupWidth / 2, coffeeCupHeight * 0.3, cof

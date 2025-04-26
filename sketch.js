// --- Game Configuration ---
let canvasWidth = 800;
let canvasHeight = 400;
let groundHeight = 50;
let groundY;
let gravity = 0.6;
let initialGameSpeed = 6;
let speedIncreaseRate = 0.002;

// --- Game State ---
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let gameSpeed;
let gameOverSoundPlayed = false; // Flag for voiceover
let gameOverStartTime = 0;     // Time when game over started
let voiceDelay = 600;          // Delay in milliseconds before playing voice

// --- Game Objects ---
let player;
let obstacles = [];
let collectibles = [];
let clouds = [];

// --- Player Properties ---
let playerJumpForce = -13;
let playerImg; // Variable to hold the player image
let playerGameplayW, playerGameplayH; // Store gameplay dimensions

// --- Obstacle Properties ---
let obstacleWidth = 55; // Width for the cactus shape
let obstacleHeight = 50; // Height for the cactus shape
let minObstacleSpawnInterval = 70;
let maxObstacleSpawnInterval = 140;
let nextObstacleSpawnFrame;

// --- Collectible Properties ---
let coffeeCupWidth = 25;
let coffeeCupHeight = 30;
let coffeeHandleSize = 10;
let collectibleSize = coffeeCupWidth + coffeeHandleSize;
let minCollectibleSpawnInterval = 90;
let maxCollectibleSpawnInterval = 180;
let nextCollectibleSpawnFrame;
let coffeeScoreValue = 1; // Score per coffee

// --- Cloud Properties ---
let cloudSpawnRate = 180;
let cloudSpeedFactor = 0.5;

// --- Sound Variables ---
let bgMusic;
let loseSound;
let gameOverVoice;
let jumpSound;
// let coffeeSound; // Optional

// --- Preload Function (Loads assets before setup) ---
function preload() {
  // Load Image
  playerImg = loadImage('player.png');
  if (!playerImg) { console.error("Failed to load player.png!"); }

  // Load Sounds (Ensure files are uploaded with these EXACT names or change here)
  soundFormats('mp3', 'wav', 'ogg');
  bgMusic = loadSound('fun_music.mp3');
  loseSound = loadSound('sad_sound.wav');
  gameOverVoice = loadSound('grandes_merda.mp3');
  jumpSound = loadSound('jump.wav');
  // coffeeSound = loadSound('coffee_get.wav'); // Optional
}

// --- Setup Function (runs once at the start) ---
function setup() {
  createCanvas(canvasWidth, canvasHeight);
  groundY = height - groundHeight;
  resetGame();
  textAlign(CENTER, CENTER);
  textFont('Arial'); // Default font
}

// --- Reset Game Function ---
function resetGame() {
  score = 0;
  gameSpeed = initialGameSpeed;
  obstacles = [];
  collectibles = [];
  clouds = [];
  gameOverSoundPlayed = false;
  gameOverStartTime = 0; // Reset start time

  // Stop any sounds from previous game state
  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
  if (gameOverVoice && gameOverVoice.isPlaying()) { gameOverVoice.stop(); }
  if (loseSound && loseSound.isPlaying()) { loseSound.stop(); } // Stop lose sound if restarting quickly


  if (!playerImg) {
      console.error("Player image not available in resetGame! Cannot create player.");
      gameState = 'error';
      return;
  }

  // --- Image Resizing (for gameplay size) ---
  // Use .get() to work on a copy if playerImg needs to be original size elsewhere
  let tempImg = playerImg.get();
  let desiredPlayerHeight = 100; // Adjust this for gameplay size
  tempImg.resize(0, desiredPlayerHeight); // Resize proportionally based on height
  playerGameplayW = tempImg.width;  // Store gameplay width
  playerGameplayH = tempImg.height; // Store gameplay height
  // --- End Image Resizing ---

  player = {
    x: width / 4, y: groundY - playerGameplayH, w: playerGameplayW, h: playerGameplayH,
    velocityY: 0, isOnGround: true,
    jump: function() {
        if (this.isOnGround) {
            this.velocityY = playerJumpForce; this.isOnGround = false;
            if (jumpSound) { jumpSound.play(); }
        }
     },
    update: function() { this.velocityY += gravity; this.y += this.velocityY; if (this.y + this.h >= groundY) { this.y = groundY - this.h; this.velocityY = 0; this.isOnGround = true; } },
    // Draw using the gameplay dimensions stored earlier
    draw: function() { image(playerImg, this.x, this.y, this.w, this.h); },
    collidesWith: function(item) { return (this.x < item.x + item.w && this.x + this.w > item.x && this.y < item.y + item.h && this.y + this.h > item.y); }
  };

  setNextObstacleSpawn();
  setNextCollectibleSpawn();
  for (let i=0; i< 5; i++) { spawnCloud(random(width)); }
}

// --- Set Spawn Timers ---
function setNextObstacleSpawn() { nextObstacleSpawnFrame = frameCount + floor(random(minObstacleSpawnInterval, maxObstacleSpawnInterval) / (gameSpeed / initialGameSpeed)); }
function setNextCollectibleSpawn() { nextCollectibleSpawnFrame = frameCount + floor(random(minCollectibleSpawnInterval, maxCollectibleSpawnInterval) / (gameSpeed / initialGameSpeed)); }

// --- Cloud Spawning ---
function spawnCloud(xPos = width) { let cloud = { x: xPos, y: random(height * 0.1, height * 0.4), size: random(40, 80), speed: gameSpeed * cloudSpeedFactor * random(0.8, 1.2), update: function() { this.x -= this.speed; }, draw: function() { fill(255, 255, 255, 200); noStroke(); ellipse(this.x, this.y, this.size * 0.8, this.size * 0.6); ellipse(this.x + this.size * 0.3, this.y - this.size * 0.1, this.size, this.size * 0.7); ellipse(this.x + this.size * 0.6, this.y, this.size * 0.7, this.size * 0.5); }, isOffscreen: function() { return this.x + this.size * 1.5 < 0; } }; clouds.push(cloud); }

// --- Draw Function (runs continuously) ---
function draw() {
  background(135, 206, 250);
  for (let i = clouds.length - 1; i >= 0; i--) { clouds[i].update(); clouds[i].draw(); if (clouds[i].isOffscreen()) { clouds.splice(i, 1); } }
  if (gameState !== 'gameOver' && frameCount % cloudSpawnRate === 0) { spawnCloud(); }
  fill(100, 150, 80); noStroke(); rect(0, groundY, width, groundHeight);
  fill(80, 130, 60); for (let i = 0; i < width; i += 20) { ellipse(i + random(-5, 5), groundY + random(5, groundHeight - 5), random(5, 10), random(3, 8)); }

  switch (gameState) {
    case 'start': drawStartScreen(); break;
    case 'playing': if(player) { drawPlayingScreen(); } else { fill(255,0,0); textSize(30); text("Error: Player not ready.", width/2, height/2); } break;
    case 'gameOver': drawGameOverScreen(); break;
    case 'error': fill(255,0,0); textSize(30); text("Error: Could not load assets.", width/2, height/2); text("Check console (F12) & refresh.", width/2, height/2 + 40); break;
  }
}

// --- Draw Screens ---
function drawStartScreen() {
  for (let c of clouds) c.draw(); fill(100, 150, 80); rect(0, groundY, width, groundHeight); fill(80, 130, 60); for (let i = 0; i < width; i += 20) ellipse(i, groundY + random(5, groundHeight-5) , 8, 5); fill(0, 0, 0, 180); rect(width*0.1, height*0.1, width*0.8, height*0.8, 20);
  fill(255); textSize(60); textFont('Impact'); text("THE COFFEE WARRIOR", width / 2, height * 0.3);
  textFont('Arial'); textSize(24); text("The journey of an angejense in search for the best coffee", width / 2, height * 0.5);
  textSize(28); text("Press SPACEBAR to Start", width / 2, height * 0.65);
  textSize(18); text("NSCA Games", width / 2, height * 0.8);
  if (bgMusic && bgMusic.isPlaying()) { bgMusic.stop(); }
}

function drawPlayingScreen() {
  // Prevent updates if not in playing state (important due to async nature of collision return)
  if (gameState !== 'playing') return;

  player.update(); gameSpeed += speedIncreaseRate;
  for(let c of clouds) { c.speed = gameSpeed * cloudSpeedFactor * (c.speed / ( (gameSpeed-speedIncreaseRate) * cloudSpeedFactor));}
  if (frameCount >= nextObstacleSpawnFrame) { spawnObstacle(); setNextObstacleSpawn(); }
  if (frameCount >= nextCollectibleSpawnFrame) { spawnCollectible(); setNextCollectibleSpawn(); }

  // Update and Draw Obstacles (Cacti)
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].update(); obstacles[i].draw();
    if (player.collidesWith(obstacles[i])) {
      // SOUND: Play lose sound IMMEDIATELY
      if (loseSound && !loseSound.isPlaying()) { // Prevent playing multiple times
          loseSound.play();
      }
      if (bgMusic) { bgMusic.stop(); } // Stop music
      gameState = 'gameOver';
      gameOverStartTime = millis(); // SOUND: Record time for delay
      gameOverSoundPlayed = false; // Ready voiceover flag for next screen
      return; // Exit drawPlayingScreen early
    }
    if (obstacles[i].isOffscreen()) { obstacles.splice(i, 1); }
  }

  // Update and Draw Collectibles (Coffee)
  for (let i = collectibles.length - 1; i >= 0; i--) {
    collectibles[i].update(); collectibles[i].draw();
    if (player.collidesWith(collectibles[i])) { score += coffeeScoreValue; collectibles.splice(i, 1); /* if (coffeeSound) coffeeSound.play(); */ }
    else if (collectibles[i].isOffscreen()) { collectibles.splice(i, 1); }
  }
  player.draw(); drawHUD();
}

function drawGameOverScreen() {
  // Draw static elements
  for (let c of clouds) c.draw(); fill(100, 150, 80); rect(0, groundY, width, groundHeight); fill(80, 130, 60); for (let i = 0; i < width; i += 20) ellipse(i, groundY + random(5, groundHeight-5) , 8, 5); for (let obs of obstacles) obs.draw(); for (let col of collectibles) col.draw();

  // Calculate enlarged player position
  // Note: Using original playerImg dimensions here for better quality enlargement
  let enlargedW = playerImg.width * 3;
  let enlargedH = playerImg.height * 3;
  let enlargedX = width / 2 - enlargedW / 2;
  let enlargedY = height / 2 - enlargedH / 2;

  // Draw enlarged player (using original image data)
  if (playerImg) { image(playerImg, enlargedX, enlargedY, enlargedW, enlargedH); }

  // SOUND: Play voiceover ONCE after delay
  if (gameOverVoice && !gameOverSoundPlayed && millis() > gameOverStartTime + voiceDelay) {
      gameOverVoice.play();
      gameOverSoundPlayed = true;
  }

  // --- Calculate target for speech bubble tail ---
  // Point near the right shoulder/head area of the enlarged image
  let targetX = enlargedX + enlargedW * 0.85;
  let targetY = enlargedY + enlargedH * 0.25;

  // --- Draw Speech Bubble ---
  drawImprovedSpeechBubble("Grandes Merda!", targetX, targetY, 150); // Pass target and width hint

  // --- Draw Text Below ---
  let textYPos = enlargedY + enlargedH + 20; // Start text below player
  textYPos = max(textYPos, height * 0.7); // Ensure text isn't too high
  fill(255); textSize(30); text("Final Score: " + score, width / 2, textYPos);
  textSize(24); text("Press SPACEBAR to Restart", width / 2, textYPos + 40);
  textSize(16); text("NSCA Games", width / 2, textYPos + 70);
}

// --- IMPROVED SPEECH BUBBLE FUNCTION (Placement Adjusted) ---
function drawImprovedSpeechBubble(txt, targetX, targetY, approxWidth) {
    // --- Configuration ---
    let bubblePadding = 15; let cornerSoftness = 15; let tailWidth = 20;
    let tailHeight = 25; let txtSize = 18;
    let bubbleFill = color(255, 255, 255, 245); // Slightly less transparent white
    let bubbleStroke = color(40); let bubbleStrokeWeight = 2.5; // Slightly thicker stroke

    // --- Text Setup ---
    textFont('Arial'); textSize(txtSize); let tw = textWidth(txt); let th = txtSize;

    // --- Dynamic Width/Height Calculation ---
    let bubbleW = max(tw + bubblePadding * 2, approxWidth * 0.6);
    bubbleW = min(bubbleW, approxWidth * 1.2); // Allow slightly wider if text demands
    let neededTextHeight = ceil(tw / (bubbleW - bubblePadding * 2)) * th * 1.3; // Estimate height needed based on potential wrapping
    let bubbleH = neededTextHeight + bubblePadding * 2;

    // --- Positioning (Place bubble starting RIGHT of the targetX) ---
    let bubbleX = targetX + 10; // Start bubble slightly to the RIGHT of the target X
    let bubbleY = targetY - bubbleH * 0.5; // Try to vertically center on target Y

    // --- Prevent going off-screen ---
    bubbleX = constrain(bubbleX, 10, width - bubbleW - 10);
    bubbleY = constrain(bubbleY, 10, height - bubbleH - 10 - groundHeight);

    // --- Tail Anchor Points (Points from LEFT edge of bubble towards target) ---
    // Position tail anchors on the left edge of the calculated bubble position
    let tailAnchorX = bubbleX;
    let tailAnchorY1 = bubbleY + bubbleH * 0.4;
    let tailAnchorY2 = bubbleY + bubbleH * 0.6;
    // Ensure the tail points back towards the intended target area, even if bubble moved
    let tailPointX = constrain(targetX, bubbleX - tailHeight * 2, bubbleX); // Point left-ish, max towards target
    let tailPointY = constrain(targetY, bubbleY - tailHeight, bubbleY + bubbleH + tailHeight);

    // --- Draw the Bubble Shape ---
    fill(bubbleFill); stroke(bubbleStroke); strokeWeight(bubbleStrokeWeight);
    beginShape();
    vertex(bubbleX + cornerSoftness, bubbleY); // Top-left curve start
    quadraticVertex(bubbleX + bubbleW / 2, bubbleY - cornerSoftness * 0.2, bubbleX + bubbleW - cornerSoftness, bubbleY); // Top edge curve
    quadraticVertex(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + cornerSoftness); // Top-right corner
    quadraticVertex(bubbleX + bubbleW + cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX + bubbleW, bubbleY + bubbleH - cornerSoftness); // Right edge curve
    quadraticVertex(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - cornerSoftness, bubbleY + bubbleH); // Bottom-right corner
    quadraticVertex(bubbleX + bubbleW / 2, bubbleY + bubbleH + cornerSoftness * 0.2, bubbleX + cornerSoftness, bubbleY + bubbleH); // Bottom edge curve
    quadraticVertex(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - cornerSoftness); // Bottom-left corner

    // --- Tail Drawing ---
    vertex(bubbleX, tailAnchorY2); // Left edge below tail point
    quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY2 - tailHeight * 0.1, tailPointX, tailPointY); // Curve out to target
    quadraticVertex(bubbleX - tailWidth * 0.6, tailAnchorY1 + tailHeight * 0.1, bubbleX, tailAnchorY1); // Curve back to top anchor
    vertex(bubbleX, bubbleY + cornerSoftness); // Left edge above tail

    quadraticVertex(bubbleX - cornerSoftness * 0.2, bubbleY + bubbleH / 2, bubbleX, bubbleY + cornerSoftness); // Left edge curve
    quadraticVertex(bubbleX, bubbleY, bubbleX + cornerSoftness, bubbleY); // Connect to top-left
    endShape(CLOSE);

    // --- Draw Text Inside ---
    fill(0); noStroke(); textAlign(CENTER, CENTER);
    text(txt, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2); // Center text simply

    textAlign(LEFT, TOP); // Reset alignment
}


// Draw Heads Up Display
function drawHUD() { fill(0); textSize(24); textAlign(LEFT, TOP); text("Coffee: " + score, 20, 20); fill(0, 0, 0, 180); rect(width - 160, 10, 150, 30, 5); fill(255); textSize(16); textAlign(CENTER, CENTER); text("SPACE to JUMP", width - 85, 25); textAlign(LEFT, TOP); }

// --- Spawning Functions ---
function spawnObstacle() { /* ... Unchanged Cactus Spawning ... */ let obstacle = { x: width, y: groundY - obstacleHeight, w: obstacleWidth, h: obstacleHeight, update: function() { this.x -= gameSpeed; }, draw: function() { push(); translate(this.x, this.y); let armDiameter = this.w * 0.35; let armRadius = armDiameter / 2; let bodyWidth = this.w * 0.3; let capHeight = this.h * 0.2; let bodyHeight = this.h - capHeight; let bodyY = capHeight; let leftArmCX = armRadius; let rightArmCX = this.w - armRadius; let bodyX = this.w / 2 - bodyWidth / 2; let armCenterY = this.h * 0.55; fill(34, 170, 34); noStroke(); rect(bodyX, bodyY, bodyWidth, bodyHeight, 0, 0, 3, 3); arc(bodyX + bodyWidth / 2, bodyY, bodyWidth, capHeight * 2, PI, TWO_PI); ellipse(leftArmCX, armCenterY, armDiameter, armDiameter); ellipse(rightArmCX, armCenterY, armDiameter, armDiameter); stroke(0, 100, 0); strokeWeight(2); let spineLen = 6; line(bodyX + bodyWidth / 2, bodyY - capHeight*0.8, bodyX + bodyWidth / 2, bodyY - capHeight*0.8 - spineLen); line(bodyX + bodyWidth * 0.2, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.2 - spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX + bodyWidth * 0.8, bodyY - capHeight*0.2, bodyX + bodyWidth * 0.8 + spineLen*0.7 , bodyY - capHeight*0.2 - spineLen*0.7); line(bodyX, armCenterY - armRadius*0.5, bodyX - spineLen, armCenterY - armRadius*0.5); line(bodyX + bodyWidth, armCenterY - armRadius*0.5, bodyX + bodyWidth + spineLen, armCenterY - armRadius*0.5); line(leftArmCX - armRadius, armCenterY, leftArmCX - armRadius - spineLen, armCenterY); line(leftArmCX, armCenterY - armRadius, leftArmCX, armCenterY - armRadius - spineLen); line(leftArmCX, armCenterY + armRadius, leftArmCX, armCenterY + armRadius + spineLen); line(leftArmCX - armRadius*0.7, armCenterY - armRadius*0.7, leftArmCX - armRadius*0.7 - spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(leftArmCX + armRadius*0.7, armCenterY + armRadius*0.7, leftArmCX + armRadius*0.7 + spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); line(rightArmCX + armRadius, armCenterY, rightArmCX + armRadius + spineLen, armCenterY); line(rightArmCX, armCenterY - armRadius, rightArmCX, armCenterY - armRadius - spineLen); line(rightArmCX, armCenterY + armRadius, rightArmCX, armCenterY + armRadius + spineLen); line(rightArmCX + armRadius*0.7, armCenterY - armRadius*0.7, rightArmCX + armRadius*0.7 + spineLen*0.7, armCenterY - armRadius*0.7 - spineLen*0.7); line(rightArmCX - armRadius*0.7, armCenterY + armRadius*0.7, rightArmCX - armRadius*0.7 - spineLen*0.7, armCenterY + armRadius*0.7 + spineLen*0.7); pop(); }, isOffscreen: function() { return this.x + this.w < 0; } }; obstacles.push(obstacle); }
function spawnCollectible() { /* ... Unchanged Coffee Spawning ... */ let playerHeightForSpawn = player ? player.h : 60; let randomYOffset = random(collectibleSize * 1.2, playerHeightForSpawn * 1.5); let collectible = { x: width, y: groundY - randomYOffset - coffeeCupHeight, w: coffeeCupWidth + coffeeHandleSize / 2, h: coffeeCupHeight, angle: random(TWO_PI), update: function() { this.x -= gameSpeed; this.angle += 0.1; }, draw: function() { push(); translate(this.x, this.y); fill(139, 69, 19); noStroke(); rect(0, 0, coffeeCupWidth, coffeeCupHeight, 3); fill(92, 64, 51); ellipse(coffeeCupWidth / 2, coffeeCupHeight * 0.3, coffeeCupWidth * 0.8, coffeeCupHeight * 0.4); noFill(); stroke(210, 180, 140); strokeWeight(2); arc(coffeeCupWidth / 2, coffeeCupHeight * 0.15, coffeeCupWidth, coffeeCupHeight * 0.3, PI, TWO_PI); noFill(); stroke(139, 69, 19); strokeWeight(4); arc(coffeeCupWidth, coffeeCupHeight / 2, coffeeHandleSize, coffeeHandleSize, -HALF_PI, HALF_PI); stroke(240, 240, 240, 150); strokeWeight(1.5); noFill(); let steamX = coffeeCupWidth / 2; let steamY = -5; let steamHeight = 10; beginShape(); vertex(steamX - 3, steamY); quadraticVertex(steamX + 3 + sin(this.angle)*2 , steamY - steamHeight/2, steamX - 2, steamY-steamHeight); endShape(); beginShape(); vertex(steamX + 2, steamY-2); quadraticVertex(steamX - 3 + cos(this.angle)*2, steamY - steamHeight/2 - 2, steamX + 1, steamY-steamHeight - 3); endShape(); pop(); }, isOffscreen: function() { return this.x + coffeeCupWidth + coffeeHandleSize < 0; } }; let tooClose = false; for(let obs of obstacles) { if (abs(collectible.x - obs.x) < obs.w * 2) { tooClose = true; break; } } if (!tooClose) { collectibles.push(collectible); } else { nextCollectibleSpawnFrame = frameCount + 10; } }

// --- Handle Input ---
function keyPressed() {
  if (gameState === 'error') return;
  if (keyCode === 32) { // SPACEBAR
    switch (gameState) {
      case 'start': resetGame(); if (gameState !== 'error') { gameState = 'playing'; if (bgMusic && !bgMusic.isPlaying()) { bgMusic.loop(); } } break;
      case 'playing': if(player) player.jump(); break; // Sound played in jump()
      case 'gameOver': resetGame(); if (gameState !== 'error') { gameState = 'playing'; if (bgMusic && !bgMusic.isPlaying()) { bgMusic.loop(); } } break;
    }
  }
}
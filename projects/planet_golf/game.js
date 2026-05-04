
// Wait for page load
window.addEventListener('load', () => {

    // ==========================
    // Initialize Create.js Stage
    // ==========================

    const canvas = document.getElementById("gameCanvas");
    const stage = new createjs.Stage(canvas);

    // ==========================
    //      Game Constants
    // ==========================

    // Background Styling
    const backgroundColor = `hsla(215, 30%, 20%)`;

    // Gravity Range Styling
    const rangeColor = `hsla(214, 25%, 42%, 0.2)`;
    const rangeOutlineColor = `hsla(210, 50%, 50%, 0.2)`;
    const rangeOutlineWidth = 4;

    // Gravity Field Line Styling
    const fieldLinesSeparation = 50;
    const fieldLineColor = `hsla(210, 25%, 50%, 0.1)`;
    const fieldLineWidth = 4;
    const fieldLineAnimSpeed = 0.05;

    // Object Colors
    const playerColor = `hsl(0, 0%, 100%)`;
    const bodyColor = `hsl(30, 90%, 50%)`;
    const moonColor = `hsl(10, 5%, 50%)`;
    const rustColor = `hsl(13, 60%, 40%)`;

    const hazardColor = `hsl(10, 100%, 50%)`;
    const hazardStrokeColor = `hsla(10, 100%, 50%, 0.5)`;
    const hazardStrokeWidth = 15;

    const bonusColor = `hsl(42, 86.00%, 60.80%)`;
    const goalColor = `hsla(120, 90%, 50%, 0.5)`;

    // UI Colors
    const uiTextColor = `hsl(0, 0%, 100%)`;
    const uiBackColor = `hsla(0, 0%, 0%, 0)`;
    const uiBorderColor = `hsl(0, 0%, 100%)`;

    // UI Hover Colors
    const uiHoverTextColor = `hsl(0, 0%, 0%)`;
    const uiHoverBackColor = `hsl(33, 100%, 50%)`;

    const uiBorderWidth = 2;

    const gravityConstant = 0.000006;

    const launchSpeedMultiplier = 0.006;
    const maxDistance = 75; // Max distance from the mouse to the player to prevent launching at superspeed

    const framerate = 120;
    const baseCanvasSize = 600;

    // Draw Layers
    const drawLayers = [
        "ranges",
        "obstacles",
        "bodies",
        "bonus",
        "goal",
        "player",
        "ui"
    ];

    const canvasImage = document.getElementById("canvas-image");

    // const gameStates = [
    //     "game",
    //     "menu",
    //     "level_select",
    //     "fail",
    //     "transition",
    //     "spawn",
    //     "win",
    // ];

    // // Launch Trajectory Lines
    // const launchLineColor = "hsla(10, 20%, 75%, 0.5)";
    // const launchLineWidth = 3;
    // const launchLineSeparation = 10;
    // const launchLineMaxLifetime = 1000;

    // ==========================
    //      Game Variables
    // ==========================

    let timePassed = 0;
    let delta = 0;
    let timeScale = 0.75;

    let gameState = "game";
    let hoveringOverButton = false;
    let isTransitioning = false;

    let currentLevelIndex = 0;

    let totalBonus = 0;
    let totalFails = 0;

    let launchesThisLevel = 0;

    let movesPerLevel = [0];

    // let universalScale = 1;

    // Input Variables
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseUiX = 0;
    let mouseUiY = 0;

    let clickEvent = null;
    let keyEvent = null;

    // ==========================
    //  Miscellaneous Functions
    // ==========================

    // Vector Functions
    function getDirVector(x1, y1, x2, y2) {
        return { x: x2 - x1, y: y2 - y1 };
    }

    function normalizeDirVector(x, y) {
        const length = Math.sqrt(x * x + y * y);
        return { x: x / length, y: y / length };
    }

    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }

    // Scaling functions (to make sure canvas fills the)
    function getViewportScale(levelScale = 1) {
        const canvasScale = Math.min(canvas.width / baseCanvasSize, canvas.height / baseCanvasSize);
        return canvasScale * levelScale;
    }

    function worldToScreen(x, y, levelScale = 1) {
        const viewportScale = getViewportScale(levelScale);
        return { x: x * viewportScale, y: y * viewportScale };
    }

    function screenToWorld(x, y, levelScale = 1) {
        const viewportScale = getViewportScale(levelScale);
        return { x: x / viewportScale, y: y / viewportScale };
    }

    // Standard lerp (need I say more?)
    function lerp(a, b, t) {
        let time = t;

        if (time > 1) {
            time = 1;
        }
        else if (time < 0) {
            time = 0;
        }

        return a + (b - a) * time;
    }

    // Use sin function to smooth lerp
    function smoothLerp(a, b, t) {
        let time = t;

        if (time > 1) {
            time = 1;
        }
        else if (time < 0) {
            time = 0;
        }
        return a + (b - a) * Math.sin((Math.PI * time) / 2);
    }

    // Calculate average par score per each level
    function calculateParScore() {
        const totalParScore = { totalMoves: 0, totalPar: 0 };
        for (let i = 1; i < levels.length - 1; i++) {
            totalParScore.totalPar += levels[i].par;
            totalParScore.totalMoves += movesPerLevel[i] ?? 0;
        }
        return totalParScore;
    }

    // Background
    const backgroundShape = new createjs.Shape();
    stage.addChild(backgroundShape);

    // ==========================
    //          Classes
    // ==========================

    // Basic class for "planets"
    class CelestialBody {

        constructor(
            { x, y, radius, color },
            { gForce, range },
            updateCallback,
            isDanger = false,
            { isRotating = false, rotationSpeed = 0 } = {}
        ) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.gForce = gForce;
            this.range = range;
            this.color = color;
            this.isRotating = isRotating;
            this.rotationSpeed = rotationSpeed;
            this.rotation = 0;
            // Gravity Range Shape
            this.rangeShape = new createjs.Shape();
            // Main Body Shape
            this.bodyShape = new createjs.Shape();
            this.updateCallback = updateCallback;
            this.isDanger = isDanger;
            this.isVisible = true;
            // Animated field lines
            this.fieldLines = [];
            for (let i = 0; i < this.range / fieldLinesSeparation; i++) {
                this.fieldLines.push(
                    { r: i * (fieldLinesSeparation), shape: new createjs.Shape() }
                );
            }
        }

        update(delta) {
            this.updateCallback(delta);

            // Apply rotation if enabled
            if (this.isRotating) {
                this.rotation += this.rotationSpeed * delta;
                if (this.rotation >= 360) {
                    this.rotation -= 360;
                }
                else if (this.rotation <= -360) {
                    this.rotation += 360;
                }
            }

            // Animate field lines
            for (let line of this.fieldLines) {
                line.r -= fieldLineAnimSpeed * delta * this.gForce;
                if (line.r <= 0) {
                    line.r = this.range;
                }
                else if (line.r >= this.range) {
                    line.r = 0;
                }
            }
        }

        addToStage(layer) {
            if (layer === "ranges") {
                stage.addChild(this.rangeShape);
                for (let fieldLine of this.fieldLines) {
                    stage.addChild(fieldLine.shape);
                }
            }
            else if (layer === "bodies") {
                stage.addChild(this.bodyShape);
            }
        }

        removeFromStage() {
            stage.removeChild(this.rangeShape);
            for (let fieldLine of this.fieldLines) {
                stage.removeChild(fieldLine.shape);
            }
            stage.removeChild(this.bodyShape);
        }

        // Simple Trigonometric orbitting because I'm too lazy to use Newton's equation here
        orbit(xCenter, yCenter, orbitRadius, angle, time) {
            // Change angle to degrees
            const a = angle * 180 / Math.PI;
            return {
                x: xCenter + Math.sin(a + time) * orbitRadius,
                y: yCenter + Math.cos(a + time) * orbitRadius
            }
        }

        draw(layer, levelScale = 1) {
            if (!this.isVisible) return;
            const viewportScale = getViewportScale(levelScale);
            const screenPos = worldToScreen(this.x, this.y, levelScale);
            if (layer === "ranges") {
                this.rangeShape.graphics.clear();
                this.rangeShape.graphics
                    .beginFill(rangeColor)
                    .beginStroke(rangeOutlineColor)
                    .setStrokeStyle(rangeOutlineWidth * viewportScale)
                    .drawCircle(0, 0, this.range * viewportScale);
                this.rangeShape.x = screenPos.x;
                this.rangeShape.y = screenPos.y;

                // Draw animated field lines
                for (let line of this.fieldLines) {
                    line.shape.graphics.clear();
                    line.shape.graphics.beginStroke(fieldLineColor)
                        .setStrokeStyle(fieldLineWidth * viewportScale)
                        .drawCircle(0, 0, line.r * viewportScale);
                    line.shape.x = screenPos.x;
                    line.shape.y = screenPos.y;
                }
            }
            else if (layer === "bodies") {
                this.bodyShape.graphics.clear();
                if (this.isDanger) {
                    this.bodyShape.graphics.beginFill(this.color).beginStroke(hazardStrokeColor)
                        .setStrokeStyle(hazardStrokeWidth * viewportScale)
                        .drawCircle(0, 0, this.radius * viewportScale);
                }
                else {
                    this.bodyShape.graphics.beginFill(this.color).drawCircle(0, 0, this.radius * viewportScale);
                }
                this.bodyShape.x = screenPos.x;
                this.bodyShape.y = screenPos.y;
            }
        }
    }

    // Attachable Objects
    class Obstacle {
        constructor(
            { x, y, radius, color },
            updateCallback = function () { },
            isDanger = false
        ) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.color = color;
            this.obstacleShape = new createjs.Shape();
            this.updateCallback = updateCallback;
            this.isVisible = true;
            this.isDanger = isDanger;
        }

        update(delta) {
            this.updateCallback(delta);
        }

        addToStage(layer) {
            if (layer === "obstacles") {
                stage.addChild(this.obstacleShape);
            }
        }

        removeFromStage() {
            stage.removeChild(this.obstacleShape);
        }

        draw(layer, levelScale = 1) {
            if (!this.isVisible || layer !== "obstacles") return;

            const viewportScale = getViewportScale(levelScale);
            const screenPos = worldToScreen(this.x, this.y, levelScale);
            this.obstacleShape.graphics.clear();

            if (this.isDanger) {
                this.obstacleShape.graphics
                    .beginFill(this.color)
                    .beginStroke(hazardStrokeColor)
                    .setStrokeStyle(hazardStrokeWidth * viewportScale)
                    .drawCircle(0, 0, this.radius * viewportScale);
            }
            else {
                this.obstacleShape.graphics
                .beginFill(this.color)
                .drawCircle(0, 0, this.radius * viewportScale);
            }
            this.obstacleShape.x = screenPos.x;
            this.obstacleShape.y = screenPos.y;
        }
    }

    // Player
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 10;
            this.velocity = { x: 0, y: 0 };
            this.playerShape = new createjs.Shape();

            // Gravity Fields
            this.gravityFields = [];

            // Attach player to a body when they collide with it.
            this.attachedBody = null;
            this.attachOffset = { x: 0, y: 0 };
            this.canLaunch = false;
            this.isVisible = false;

            this.timeSinceLastLaunch = 0;
        }

        update(delta) {
            // Set player's position when attached to a body.

            if (this.attachedBody !== null) {
                // Move attach position if rotation is enabled
                if (this.attachedBody.isRotating) {
                    const rotation = (this.attachedBody.rotationSpeed * delta * Math.PI) / 180;
                    const cos = Math.cos(rotation);
                    const sin = Math.sin(rotation);
                    const oldX = this.attachOffset.x;
                    const oldY = this.attachOffset.y;
                    this.attachOffset.x = oldX * cos - oldY * sin;
                    this.attachOffset.y = oldX * sin + oldY * cos;
                }

                this.x = this.attachedBody.x + this.attachOffset.x;
                this.y = this.attachedBody.y + this.attachOffset.y;
            }
            // Update velocity
            else {

                // Apply Gravity
                for (let body of this.gravityFields) {

                    const direction = getDirVector(this.x, this.y, body.x, body.y);

                    this.velocity.x += direction.x * body.gForce * gravityConstant * delta;
                    this.velocity.y += direction.y * body.gForce * gravityConstant * delta;
                }


                // Set Velocity
                this.x += this.velocity.x * delta;
                this.y += this.velocity.y * delta;

            }

            if (clickEvent === "mousedown" && this.canLaunch && !hoveringOverButton) {
                this.launch(mouseTargetX, mouseTargetY);
            }
        }

        getLaunchTrajectory(launchX, launchY) {
            const distance = getDistance(this.x, this.y, launchX, launchY) / 2;
            const dirVector = getDirVector(this.x, this.y, launchX, launchY);
            const normalizedDirVector = normalizeDirVector(dirVector.x, dirVector.y);

            let launchDistance = distance < maxDistance ? distance : maxDistance;

            return {
                x: normalizedDirVector.x * launchSpeedMultiplier * launchDistance,
                y: normalizedDirVector.y * launchSpeedMultiplier * launchDistance
            };
        }

        launch(launchX, launchY) {
            this.detachFromBody();
            const velocity = this.getLaunchTrajectory(launchX, launchY);
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
            this.canLaunch = false;

            launchesThisLevel++;
            UIs.gameUI.elements[1].updateText(`Par - ${launchesThisLevel} / ${levels[currentLevelIndex].par}`);
        }

        startSpawn() {
            if (spawnAnimation.isPlaying) return;
            spawnAnimation.originX = this.x;
            spawnAnimation.originY = this.y;
            this.isVisible = false;
            launchesThisLevel = 0;
            spawnAnimation.start();
        }

        attachToBody(body) {
            // When attached to body, set attachOffset to player's position relative to body's center
            this.attachedBody = body;

            const dirFromBody = getDirVector(body.x, body.y, this.x, this.y);
            this.attachOffset = normalizeDirVector(dirFromBody.x, dirFromBody.y);
            this.attachOffset.x *= body.radius + this.radius;
            this.attachOffset.y *= body.radius + this.radius;
            this.velocity = { x: 0, y: 0 };
            this.canLaunch = true;
        }

        detachFromBody() {
            this.attachedBody = null;
            this.attachOffset = { x: 0, y: 0 };
            this.velocity = { x: 0, y: 0 };
        }

        isColliding(x, y, bodyRadius) {
            // Test for body radius
            if (
                (bodyRadius + this.radius / 2) * (bodyRadius + this.radius / 2) >
                (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y)
            ) {
                return true;
            }
        }

        startWin() {
            if (winAnimation.isPlaying) return;

            gameState = "win";
            winAnimation.originX = this.x;
            winAnimation.originY = this.y;
            this.isVisible = false;
            winAnimation.start();
        }

        startFail() {
            if (failAnimation.isPlaying) return;

            totalFails++;
            gameState = "fail";
            failAnimation.originX = this.x;
            failAnimation.originY = this.y;
            this.isVisible = false;
            failAnimation.start();
        }

        testForCollision(allBodies) {
            if (gameState !== "game") {
                return;
            }
            // Test collision with bodies
            for (let body of allBodies) {

                // Test if player is colliding with goal or bonus
                if (body instanceof Goal) {
                    if (this.isColliding(body.x, body.y, body.radius)) {
                        this.startWin();
                    }
                }
                else if (body instanceof Bonus) {
                    if (this.isColliding(body.x, body.y, body.radius) && !body.hasBeenCollected) {
                        body.hasBeenCollected = true;
                        totalBonus++;
                        UIs.gameUI.elements[2].updateText(`Bonus - ${totalBonus}`);
                    }
                }
                // Test if inside gravity range
                if (this.isColliding(body.x, body.y, body.range) && body !== this.attachedBody) {

                    if (!this.gravityFields.includes(body)) {
                        this.gravityFields.push(body);
                    }
                }
                else {
                    if (this.gravityFields.includes(body)) {
                        this.gravityFields.splice(this.gravityFields.indexOf(body), 1);
                    }
                }
                // Test if colliding directly with body
                if (this.isColliding(body.x, body.y, body.radius) && !body.hasBeenCollected) {
                    if (body.isDanger) {
                        this.startFail();

                    }
                    else {
                        this.attachToBody(body);
                    }

                }
            }
            // Test if player is out of bounds
            if (
                this.x < 0 || this.x > baseCanvasSize / levels[currentLevelIndex].scaleFactor ||
                this.y < 0 || this.y > baseCanvasSize / levels[currentLevelIndex].scaleFactor
            ) {
                this.startFail();
            }
        }

        draw(layer, levelScale = 1) {
            if (layer !== "player") return;
            this.playerShape.visible = this.isVisible;

            if (!this.isVisible) return;
            const viewportScale = getViewportScale(levelScale);
            const screenPos = worldToScreen(this.x, this.y, levelScale);
            this.playerShape.graphics.clear();
            this.playerShape.graphics.beginFill(playerColor).drawCircle(0, 0, this.radius * viewportScale);
            this.playerShape.x = screenPos.x;
            this.playerShape.y = screenPos.y;

        }
    }

    class Goal {
        constructor(
            x, y, r,
            updateCallback = function () { }
        ) {
            this.x = x;
            this.y = y;
            this.radius = r;
            this.updateCallback = updateCallback;
            this.color = goalColor;
            this.goalShape = new createjs.Shape();
            this.visible = true;
        }

        update() {
            this.updateCallback();
        }

        addToStage(layer) {
            if (layer === "goal") {
                stage.addChild(this.goalShape);
            }
        }

        removeFromStage() {
            stage.removeChild(this.goalShape);
        }

        draw(layer, levelScale = 1) {
            if (!this.visible || layer !== "goal") return;

            const viewportScale = getViewportScale(levelScale);
            const screenPos = worldToScreen(this.x, this.y, levelScale);
            this.goalShape.graphics.clear();

            this.goalShape.graphics.beginFill(this.color).drawCircle(0, 0, this.radius * viewportScale);
            this.goalShape.x = screenPos.x;
            this.goalShape.y = screenPos.y;
        }
    }

    class Bonus {
        constructor(x, y, r, color, updateCallback = function () { }) {
            this.x = x;
            this.y = y;
            this.radius = r;
            this.updateCallback = updateCallback;
            this.color = color;
            this.bonusShape = new createjs.Shape();
            this.hasBeenCollected = false;
            this.visible = true;
        }
        
        update() {
            if (this.hasBeenCollected) {
                this.visible = false;
            }
            else {
                this.visible = true;
            }

            this.updateCallback();
            
        }

        addToStage(layer) {
            if (layer === "bonus") {
                stage.addChild(this.bonusShape);
            }
        }

        removeFromStage() {
            stage.removeChild(this.bonusShape);
        }

        draw(layer, levelScale = 1) {
            if (layer !== "bonus") return;

            this.bonusShape.visible = this.visible;

            if (!this.visible) return;

            const viewportScale = getViewportScale(levelScale);
            const screenPos = worldToScreen(this.x, this.y, levelScale);
            this.bonusShape.graphics.clear();

            this.bonusShape.graphics.beginFill(this.color).drawCircle(0, 0, this.radius * viewportScale);
            this.bonusShape.x = screenPos.x;
            this.bonusShape.y = screenPos.y;
        }
    }

    // Levels!
    class Level {
        constructor(levelName, objects, playerPos, par, scaleFactor, startingState = "spawn", levelStartCallback = function () { }) {
            this.levelName = levelName;
            this.objects = objects;
            this.playerPos = playerPos;
            this.player = new Player(this.playerPos.x, this.playerPos.y);
            this.isActive = false;
            this.par = par;
            this.scaleFactor = scaleFactor;
            this.startingState = startingState;
            this.levelStartCallback = levelStartCallback;
        }

        start(levelIndex = currentLevelIndex) {
            const previousLevel = levels[currentLevelIndex];
            if (previousLevel && previousLevel.isActive) {
                previousLevel.end();
            }
            currentLevelIndex = levelIndex;
            this.isActive = true;
            timePassed = 0;

            UIs.gameUI.elements[0].updateText(`Level ${levelIndex} - ${this.levelName}`);

            for (let layer of drawLayers) {
                for (let obj of this.objects) {
                    obj.addToStage(layer);
                }
            }

            this.player.x = this.playerPos.x;
            this.player.y = this.playerPos.y;
            this.player.velocity = { x: 0, y: 0 };
            this.player.attachedBody = null;
            this.player.attachOffset = { x: 0, y: 0 };
            this.player.canLaunch = false;
            this.player.gravityFields.length = 0;
            this.player.isVisible = false;

            stage.addChild(this.player.playerShape);

            openTransition.start();
            gameState = this.startingState;
            this.draw();
            this.levelStartCallback();
        }

        end() {
            this.isActive = false;

            for (let obj of this.objects) {
                obj.removeFromStage();
            }
            const playerShape = this.player.playerShape;
            if (playerShape.parent) {
                playerShape.parent.removeChild(playerShape);
            }
        }

        update(delta) {
            if (!this.isActive) return;

            const isPaused = gameState === "pause";
            const updateLevel =
                gameState === "game" ||
                gameState === "spawn" ||
                gameState === "fail" ||
                gameState === "win";

            if (!isPaused) {
                timePassed += delta;

                for (let obj of this.objects) {
                    obj.update(delta);
                }
            }

            if (!updateLevel) return;

            this.player.update(delta);
            this.player.testForCollision(this.objects);
        }

        // Draw entire level
        draw() {
            // Draw all objects in order of layers.
            for (let i = 0; i < drawLayers.length; i++) {
                for (let obj of this.objects) {
                    obj.draw(drawLayers[i], this.scaleFactor);
                }
            }
            // Draw player
            this.player.draw("player", this.scaleFactor);

            CorrectUiRenderOrder();
        }
    }

    // Particle Effects
    class particleAnimation {
        constructor(
            {
                originX, originY, r, color, shapeType, amount
            },
            { duration, useKeyframes, keyframes = [], useLevelScale: useLevelScale = true },
            startCallback = function () { },
            updateCallback = function () { },
            endCallback = function () { }
        ) {
            this.originX = originX;
            this.originY = originY;
            this.shapeType = shapeType;
            this.amount = amount;
            this.duration = duration;
            this.useKeyframes = useKeyframes;
            this.keyframes = keyframes;
            this.useLevelScale = useLevelScale;
            this.particles = [];
            for (let i = 0; i < this.amount; i++) {
                this.particles.push({ r: r, color: color, shape: new createjs.Shape() });
            }
            this.startCallback = startCallback;
            this.updateCallback = updateCallback;
            this.endCallback = endCallback;
            this.isPlaying = false;

            // Keyframe interpolation variables
            this.timeSinceStart = 0;
            this.prevKey = null;
            this.nextKey = null;

        }

        getScaledSize() {
            if (this.useLevelScale) {
                return baseCanvasSize * levels[currentLevelIndex].scaleFactor;
            }
            return baseCanvasSize;
        }

        update(delta) {
            if (!this.isPlaying) return;

            this.timeSinceStart += delta;

            if (this.useKeyframes) {
                // Keyframe interpolation logic
                this.prevKey = this.keyframes[0];
                this.nextKey = this.keyframes[this.keyframes.length - 1];

                for (let i = 0; i < this.keyframes.length - 1; i++) {
                    if (this.timeSinceStart >= this.keyframes[i].time && this.timeSinceStart < this.keyframes[i + 1].time) {
                        this.prevKey = this.keyframes[i];
                        this.nextKey = this.keyframes[i + 1];
                        break;
                    }
                }

                if (this.timeSinceStart >= this.keyframes[this.keyframes.length - 1].time) {
                    this.prevKey = this.keyframes[this.keyframes.length - 1];
                    this.nextKey = this.keyframes[this.keyframes.length - 1];
                    this.time = 1;
                }
                else {
                    const keyInterval = this.nextKey.time - this.prevKey.time;
                    this.time = keyInterval > 0 ?
                        (this.timeSinceStart - this.prevKey.time) / keyInterval : 0;
                }
            }

            if (this.isPlaying && this.duration !== null && this.timeSinceStart > this.duration) {
                this.end();
                return;
            }

            // Keyframe anims: normalized segment progress 0–1. Non-keyframe (e.g. stars): pass delta (ms) per tick.
            this.updateCallback(this.useKeyframes ? this.time : delta);
        }

        start() {
            this.isPlaying = true;
            for (let particle of this.particles) {
                stage.addChild(particle.shape);
            }
            this.timeSinceStart = 0;
            this.startCallback();
        }
        end() {
            this.isPlaying = false;
            for (const particle of this.particles) {
                stage.removeChild(particle.shape);
            }
            this.endCallback();
        }

        draw() {
            const levelScale = this.useLevelScale ? levels[currentLevelIndex].scaleFactor : 1;
            const viewportScale = getViewportScale(levelScale);
            for (let particle of this.particles) {
                particle.shape.graphics.clear();
                if (this.shapeType === "circle") {
                    particle.shape.graphics.beginFill(particle.color).drawCircle(0, 0, particle.r * viewportScale);
                }
                else if (this.shapeType === "square") {
                    particle.shape.graphics.beginFill(particle.color).drawRect(0, 0, particle.r * viewportScale, particle.r * viewportScale);
                }
                particle.shape.x = particle.x * viewportScale;
                particle.shape.y = particle.y * viewportScale;
            }
        }
    }

    // ==========================
    //       UI Elements
    // ==========================

    class UIMenu {
        constructor(name, elements, visibleStates = ["game"]) {
            this.name = name;
            this.elements = elements;
            this.visibleStates = visibleStates;
        }

        start() {
            for (const element of this.elements) {
                element.start();
            }
        }

        end() {
            for (const element of this.elements) {
                element.end();
            }
        }

        getElements() {
            return this.elements;
        }

        isVisibleForState(state) {
            return this.visibleStates.includes(state);
        }

        update(layer = "ui", currentState = gameState) {
            const shouldShow = this.isVisibleForState(currentState);
            for (const element of this.elements) {
                element.visible = shouldShow;
                element.update();
                element.draw(layer);
            }
        }
    }

    class Text {
        constructor(x, y, text, size = 30, visible = true, align = "center") {
            this.x = x;
            this.y = y;
            this.text = text;
            this.size = size;
            this.shape = new createjs.Text(text, `${size}px Arial`, uiTextColor);
            this.visible = visible;
            this.align = align;
        }

        start() {
            stage.addChild(this.shape);
        }

        end() {
            stage.removeChild(this.shape);
        }

        update() {

        }

        end() {
            stage.removeChild(this.shape);
        }

        updateText(newText) {
            this.text = newText;
            this.shape.text = this.text;
        }

        draw(layer) {
            if (layer !== "ui") return;

            this.shape.visible = this.visible;

            const viewportScale = getViewportScale(1);
            const screenPos = worldToScreen(this.x, this.y, 1);

            this.shape.x = screenPos.x;
            this.shape.y = screenPos.y;
            this.shape.font = `${this.size * viewportScale}px Arial`;
            this.shape.textAlign = this.align;

        }

    }

    class Button {
        constructor(
            { x, y, width, height },
            textObject,
            clickCallback = function () { },
            visible = true
        ) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.textObject = textObject;
            this.clickCallback = clickCallback;
            this.visible = visible;
            this.boxShape = new createjs.Shape();
            this.visible = visible;
            this.isHovering = false;
        }

        start() {
            stage.addChild(this.boxShape);
            this.textObject.start();
            this.textObject.x = this.x;
            this.textObject.y = this.y;

            this.textObject.x = this.x + this.width / 2;
            this.textObject.y = this.y + this.height / 2;
            this.textObject.shape.textAlign = "center";
            this.textObject.shape.textBaseline = "middle";
        }

        end() {
            stage.removeChild(this.boxShape);
            this.textObject.end();
        }

        draw(layer) {
            if (layer !== "ui") return;

            this.boxShape.visible = this.visible;
            this.textObject.visible = this.visible;
            this.textObject.shape.visible = this.visible;

            if (!this.visible) return;

            const viewportScale = getViewportScale(1);
            const screenPos = worldToScreen(this.x, this.y, 1);
            const fillColor = this.isHovering ? uiHoverBackColor : uiBackColor;
            const textColor = this.isHovering ? uiHoverTextColor : uiTextColor;

            this.boxShape.graphics.clear();
            this.boxShape.graphics
                .beginFill(fillColor)
                .setStrokeStyle(uiBorderWidth * viewportScale)
                .beginStroke(uiBorderColor)
                .drawRect(0, 0, this.width * viewportScale, this.height * viewportScale);
            this.boxShape.x = screenPos.x;
            this.boxShape.y = screenPos.y;

            this.textObject.shape.fillStyle = textColor;
            this.textObject.draw("ui");

        }

        update() {
            this.textObject.update();

            if (!this.visible) return;

            if (isTransitioning) return;

            if (
                mouseUiX > this.x && mouseUiX < this.x + this.width &&
                mouseUiY > this.y && mouseUiY < this.y + this.height
            ) {
                this.isHovering = true;
            }
            else {
                this.isHovering = false;
            }

            if (this.isHovering) {
                hoveringOverButton = true;
                // levels[currentLevelIndex].player.canLaunch = false;
            }
            else {
                hoveringOverButton = false;
                // levels[currentLevelIndex].player.canLaunch = true;
            }

            if (this.isHovering && clickEvent === "mousedown") {
                this.clickCallback();
            }
        }
    }

    // Function designed to force the UI to be placed in front of celestial bodies. and behind level transitions.
    // Generated by Claude as a work-around to the level-based rendering system I made.
    function CorrectUiRenderOrder() {
        for (const container of Object.values(UIs)) {
            for (const element of container.getElements()) {
                if (element.boxShape && element.boxShape.parent === stage) {
                    stage.setChildIndex(element.boxShape, stage.numChildren - 1);
                }

                if (element.textObject?.shape && element.textObject.shape.parent === stage) {
                    stage.setChildIndex(element.textObject.shape, stage.numChildren - 1);
                }

                if (element.shape && element.shape.parent === stage) {
                    stage.setChildIndex(element.shape, stage.numChildren - 1);
                }
            }
        }

        // Transition overlays should sit above UI.
        const transitionAnims = [closeTransition, openTransition];
        for (const anim of transitionAnims) {
            for (const particle of anim.particles) {
                if (particle.shape && particle.shape.parent === stage) {
                    stage.setChildIndex(particle.shape, stage.numChildren - 1);
                }
            }
        }
    }

    // ==========================
    //     Particle Effects
    // ==========================

    // Level Transitions
    const closeTransition = new particleAnimation(
        { originX: 0, originY: 0, r: 9, color: "black", shapeType: "square", amount: 25 },
        {
            duration: 500, useKeyframes: true, useLevelScale: false, keyframes: [
                { time: 0, scale: 0 },
                { time: 450, scale: 1 },
                { time: 500, scale: 1.1 },
            ]
        },
        function () { // Start Function
            isTransitioning = true;
        },
        function (time) { // Update Function
            const rows = Math.sqrt(this.amount);
            const squareSize = this.getScaledSize() / rows;

            for (let i = 0; i < this.amount; i++) {

                const keyScale = smoothLerp(this.prevKey.scale, this.nextKey.scale, time);
                const scale = keyScale * (squareSize / this.particles[0].r);

                const centerOffset = (squareSize - (this.particles[0].r * scale)) / 2;

                this.particles[i].x = this.originX + (i % rows) * squareSize + centerOffset;
                this.particles[i].y = this.originY + (Math.floor(i / rows)) * squareSize + centerOffset;
                this.particles[i].shape.scaleX = scale;
                this.particles[i].shape.scaleY = scale;
            }

        },
        function () { // End Function
            const targetLevelIndex = this.nextLevelIndex ?? currentLevelIndex;
            this.nextLevelIndex = null;
            levels[targetLevelIndex].start(targetLevelIndex);
        }
    );
    closeTransition.nextLevelIndex = null;

    // Open Transition
    const openTransition = new particleAnimation(
        { originX: 0, originY: 0, r: 9, color: "black", shapeType: "square", amount: 25 },
        {
            duration: 500, useKeyframes: true, useLevelScale: false, keyframes: [
                { time: 0, scale: 1.1 },
                { time: 50, scale: 1 },
                { time: 500, scale: 0 },
            ]
        },
        function () { // Start Function
            const level = levels[currentLevelIndex];
            const shouldHidePlayer = Boolean(level?.playerPos?.hidePlayer);

            if (!shouldHidePlayer) {
                level.player.startSpawn();
            }
            else {
                level.player.isVisible = false;
                level.player.canLaunch = false;
            }

            // Reset level variables
            launchesThisLevel = 0;
            // Reset Counters

            UIs.gameUI.elements[1].updateText(`Par - ${launchesThisLevel} / ${levels[currentLevelIndex].par}`);
            UIs.gameUI.elements[2].updateText(`Bonus - ${totalBonus}`);
            // gemsText.text = `Gems: ${bonusThisLevel}`;
        },
        function (time) { // Update Function
            const rows = Math.sqrt(this.amount);
            const squareSize = this.getScaledSize() / rows;

            for (let i = 0; i < this.amount; i++) {

                const keyScale = smoothLerp(this.prevKey.scale, this.nextKey.scale, time);
                const scale = keyScale * (squareSize / this.particles[0].r);

                const centerOffset = (squareSize - (this.particles[0].r * scale)) / 2;

                this.particles[i].x = this.originX + (i % rows) * squareSize + centerOffset;
                this.particles[i].y = this.originY + (Math.floor(i / rows)) * squareSize + centerOffset;
                this.particles[i].shape.scaleX = scale;
                this.particles[i].shape.scaleY = scale;
            }
        },
        function () { // End Function
            isTransitioning = false;
        }
    );

    const spawnAnimation = new particleAnimation(
        { originX: 200, originY: 200, r: 10, color: playerColor, shapeType: "circle", amount: 12 },
        {
            duration: 1000, useKeyframes: true, useLevelScale: true, keyframes: [
                { time: 0, distance: 100, scale: 0, angle: 0 },
                { time: 500, distance: 100, scale: 0.5, angle: Math.PI },
                { time: 1000, distance: 0, scale: 0.75, angle: Math.PI * 2 },
            ]
        },
        function () { // Start Function

        },
        function (time) { // Update Function
            for (let i = 0; i < this.amount; i++) {
                const scale = smoothLerp(this.prevKey.scale, this.nextKey.scale, time);
                const distance = smoothLerp(this.prevKey.distance, this.nextKey.distance, time);
                const angle = lerp(this.prevKey.angle, this.nextKey.angle, time) + (Math.PI * 2 * i) / this.amount;

                this.particles[i].x = this.originX + Math.cos(angle) * distance;
                this.particles[i].y = this.originY + Math.sin(angle) * distance;
                this.particles[i].shape.scaleX = scale;
                this.particles[i].shape.scaleY = scale;
            }
        },
        function () { // End Function
            levels[currentLevelIndex].player.isVisible = true;
            gameState = "game";
        }
    );

    const failAnimation = new particleAnimation(
        { originX: 300, originY: 300, r: 10, color: playerColor, shapeType: "circle", amount: 12 },
        {
            duration: 1000, useKeyframes: true, useLevelScale: true, keyframes: [
                { time: 0, distance: 0, scale: 1, angle: 0 },
                { time: 100, distance: 0, scale: 1.25, angle: 0 },
                { time: 400, distance: 0, scale: 0.5, angle: Math.PI / 2 },
                { time: 1000, distance: 200, scale: 0, angle: Math.PI },
            ]
        },
        function () { // Start Function
            levels[currentLevelIndex].player.isVisible = false;
            gameState = "fail";
        },
        function (time) { // Update Function

            for (let i = 0; i < this.amount; i++) {

                const scale = smoothLerp(this.prevKey.scale, this.nextKey.scale, time);
                const distance = smoothLerp(this.prevKey.distance, this.nextKey.distance, time);
                const angle = lerp(this.prevKey.angle, this.nextKey.angle, time) + (Math.PI * 2 * i) / this.amount;

                this.particles[i].x = this.originX + Math.cos(angle) * distance;
                this.particles[i].y = this.originY + Math.sin(angle) * distance;
                this.particles[i].shape.scaleX = scale;
                this.particles[i].shape.scaleY = scale;
            }
        },
        function () { // End Function
            closeTransition.start();
        }
    );

    // TODO: Make proper win animation, using fail animation as a placeholder with gold to differentiate it from failing
    const winAnimation = new particleAnimation(
        { originX: 300, originY: 300, r: 10, color: "gold", shapeType: "circle", amount: 12 },
        {
            duration: 2000, useKeyframes: true, useLevelScale: true, keyframes: [
                { time: 0, distance: 0, scale: 1, angle: 0 },
                { time: 300, distance: 0, scale: 0.75, angle: 0 },
                { time: 2000, distance: 1000, scale: 0, angle: Math.PI },
            ]
        },
        function () { // Start Function
            // setTimeout(() => {
            //     LoadLevel(currentLevelIndex + 1);
            // }, this.duration / 2);
            UIs.winUI.elements[1].updateText(`Par: ${launchesThisLevel} / ${levels[currentLevelIndex].par}`);
        },
        function (time) { // Update Function

            for (let i = 0; i < this.amount; i++) {

                const scale = smoothLerp(this.prevKey.scale, this.nextKey.scale, time);
                const distance = smoothLerp(this.prevKey.distance, this.nextKey.distance, time);
                const angle = lerp(this.prevKey.angle, this.nextKey.angle, time) + (Math.PI * 2 * i) / this.amount;

                this.particles[i].x = this.originX + Math.cos(angle) * distance;
                this.particles[i].y = this.originY + Math.sin(angle) * distance;
                this.particles[i].shape.scaleX = scale;
                this.particles[i].shape.scaleY = scale;
            }

        },
        // function () { // End Function

        // }
    );

    const starParticlesAnimation = new particleAnimation(
        { originX: 0, originY: 0, r: 9, color: "hsla(210, 10%, 80%, 0.5)", shapeType: "circle", amount: 100 },
        {
            duration: Math.Infinity, useKeyframes: false, useLevelScale: false
        },
        function () { // Start Function
            for (let i = 0; i < this.amount; i++) {
                this.particles[i].x = Math.random() * baseCanvasSize;
                this.particles[i].y = Math.random() * baseCanvasSize;

                // World units per second (integrated with dt = deltaMs/1000)
                const randVelX = (Math.random() * 2 - 1) * 2;
                const randVelY = (Math.random() * 2 - 1) * 2;
                const randRadius = Math.random() * 2;
                this.particles[i]._pVelocity = { x: randVelX, y: randVelY };
                this.particles[i].r = randRadius;
            }
        },
        function (delta) { // Update Function
            for (let i = 0; i < this.amount; i++) {
                this.particles[i].x += this.particles[i]._pVelocity.x * delta / 750;
                this.particles[i].y += this.particles[i]._pVelocity.y * delta / 750;

                // Wrap particles around canvas
                if (this.particles[i].x < 0 - this.particles[i].r) {
                    this.particles[i].x = baseCanvasSize + this.particles[i].r;
                }
                if (this.particles[i].x > baseCanvasSize + this.particles[i].r) {
                    this.particles[i].x = 0 - this.particles[i].r;
                }
                if (this.particles[i].y < 0 - this.particles[i].r) {
                    this.particles[i].y = baseCanvasSize + this.particles[i].r;
                }
                if (this.particles[i].y > baseCanvasSize + this.particles[i].r) {
                    this.particles[i].y = 0 - this.particles[i].r;
                }
            }
        },
    );

    function drawParticles(delta) {
        const particleAnims = [failAnimation, closeTransition, openTransition, spawnAnimation, winAnimation, starParticlesAnimation];
        for (const anim of particleAnims) {
            if (!anim.isPlaying) continue;
            anim.update(delta);
            anim.draw();
        }
    }

    // ==========================
    //       Game UI Menus
    // ==========================

    const UIs = {
        mainMenuUI: new UIMenu("mainMenuUI", [
            new Text(300, 50, "PLANET GOLF", 50, true),
            new Button(
                { x: 200, y: 500, width: 200, height: 30 },
                new Text(250, 200, "Start Game", 20, true),
                function () {
                    
                    LoadLevel(1);
                },
                true
            )
        ], ["mainMenu"]),
        gameUI: new UIMenu("gameUI", [
            new Text(10, 10, "Level 1 - Welcome", 20, true, "left"), // Level Text
            new Text(10, 40, "Par: 0", 20, true, "left"), // Par Text
            new Text(10, 70, "Bonus: 0", 20, true, "left"), // Bonus Text
            // Pause Button
            new Button(
                { x: 560, y: 10, width: 30, height: 30 },
                new Text(10, 100, "| |", 20, true),
                function () {
                    if (gameState === "game") { 
                        gameState = "pause";
                    }
                },
                true
            )
        ], ["game", "spawn", "fail"]),
        pauseUI: new UIMenu("pauseUI", [
            new Text(300, 50, "Paused", 50, true),
            new Button(
                { x: 225, y: 200, width: 150, height: 30 },
                new Text(250, 100, "Resume", 20, true),
                function () {
                    gameState = "game";
                },
                true
            ),
            new Button(
                { x: 225, y: 250, width: 150, height: 30 },
                new Text(10, 130, "Restart Level", 20, true),
                function () {
                    gameState = "spawn";
                    LoadLevel(currentLevelIndex);
                },
                true
            ),
            new Button(
                { x: 225, y: 300, width: 150, height: 30 },
                new Text(10, 160, "Rage Quit", 20, true),
                function () {
                    LoadLevel(0);
                },
                true
            ),
        ], ["pause"]),
        winUI: new UIMenu("winUI", [
            new Text(300, 50, "Level Cleared!", 50, true), // Clear Text
            new Text(300, 100, "Par: 0 / 0", 30, true), // Par Text
            // Next Level Button
            new Button(
                { x: 250, y: 450, width: 125, height: 30 },
                new Text(450, 450, "Next Level", 20, true),
                function () {
                    movesPerLevel[currentLevelIndex] = launchesThisLevel;
                    LoadLevel(currentLevelIndex + 1);
                },
                true
            ),
            // Replay Level Button
            new Button(
                { x: 250, y: 500, width: 125, height: 30 },
                new Text(250, 450, "Replay Level", 20, true),
                function () {
                    movesPerLevel[currentLevelIndex] = launchesThisLevel;
                    LoadLevel(currentLevelIndex);
                },
                true
            ),
        ], ["win"]),
        // End Menu
        endUI: new UIMenu("endUI", [
            new Text(300, 20, "You Made It!", 50, true), // Game Over Text
            new Text(300, 80, "Final Par Score: 0 / 0", 25, true), // Par Score
            new Text(300, 110, "Bonus: 0 | Fails: 0", 25, true), // Bonus Score

            // Main Menu Button
            new Button(
                { x: 200, y: 500, width: 200, height: 30 },
                new Text(250, 500, "Play Again?", 20, true),
                function () {
                    LoadLevel(0);
                    totalBonus = 0;
                    totalFails = 0;
                    movesPerLevel = [0];
                },
                true
            ),
        ], ["end"]),
    };

    // ==========================
    //         Levels!
    // ==========================

    const levels = [
        // Main Menu
        new Level("Main Menu",
            [
                // Planet
                new CelestialBody(
                    { x: 300, y: 300, radius: 50, color: bodyColor },
                    { gForce: 0.5, range: 200, },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 1000) * 5;
                        this.y = 300 + Math.cos(timePassed / 1000) * 5;
                    },
                    false
                ),
                // Decorative Moons
                new CelestialBody(
                    { x: 300, y: 300, radius: 15, color: moonColor },
                    { gForce: 0.25, range: null, },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 10000 + Math.PI / 3) * 175;
                        this.y = 300 + Math.cos(timePassed / 10000 + Math.PI / 3) * 175;
                    },
                    false
                ),
                new CelestialBody(
                    { x: 300, y: 300, radius: 15, color: rustColor },
                    { gForce: 0.25, range: null, },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 5000 + Math.PI * 1.25) * 125;
                        this.y = 300 + Math.cos(timePassed / 5000 + Math.PI * 1.25) * 125;
                    },
                    false
                ),
                new Obstacle(
                    { x: 300, y: 300, radius: 5, color: "white" },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 500) * 65;
                        this.y = 300 + Math.cos(timePassed / 500) * 100;
                    },
                    false
                ),
                new Obstacle(
                    { x: 600, y: 900, radius: 5, color: "white" },
                    function () {
                        this.x = 600 + Math.sin(-timePassed / 5000) * 450;
                        this.y = 900 + Math.cos(-timePassed / 5000) * 450;
                    },
                    false
                ),
            ],
            { x: 0, y: 0, hidePlayer: true }, // Player
            0, // Par
            1, // Level Scale
            "mainMenu"
        ),

        // Level 1
        new Level("Welcome",
            [ // Objects
                new CelestialBody(
                    { x: 250, y: 250, radius: 75, color: bodyColor },
                    { gForce: 1.75, range: 200, },
                    function () {

                    },
                    false
                ),
                new Bonus(250, 80, 10, bonusColor),
                new Goal(350, 250, 20),
            ],
            { x: 100, y: 250 }, // Player
            1, // Par
            1.25 // Level Scale
        ),
        // Level 2
        new Level("Crossing the Astral Road",
            [ // Objects
                new CelestialBody(
                    { x: 150, y: 250, radius: 50, color: bodyColor },
                    { gForce: 1.75, range: 150, },
                    function () { },
                    false
                ),
                new CelestialBody(
                    { x: 350, y: 250, radius: 50, color: rustColor },
                    { gForce: 1.75, range: 150, },
                    function () { },
                    false
                ),
                new Goal(425, 250, 20),
            ],
            { x: 30, y: 250 }, // Player
            1, // Par
            1.25 // Level Scale
        ),
        // Level 3
        new Level("Fly me to the moon",
            [ // Objects
                new CelestialBody(
                    { x: 300, y: 300, radius: 75, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () {

                    },
                    false
                ),
                new CelestialBody(
                    { x: 300, y: 300, radius: 30, color: moonColor },
                    { gForce: 2, range: 100, },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 3000) * 200;
                        this.y = 300 + Math.cos(timePassed / 3000) * 200;
                    },
                    false,
                    { isRotating: true, rotationSpeed: /* -0.0175 */ -Math.PI / 180 }
                ),
                new Goal(300, 250, 15,
                    function () {
                        this.x = 300 + Math.sin(timePassed / 3000) * 250;
                        this.y = 300 + Math.cos(timePassed / 3000) * 250;
                    }
                ),
                new Bonus(500, 550, 10, bonusColor),
            ],
            { x: 200, y: 300 }, // Player
            2, // Par
            1 // Level Scale
        ),
        // Level 4
        new Level("Mind the Magma",
            [
                new CelestialBody(
                    { x: 300, y: 600, radius: 250, color: rustColor },
                    { gForce: 0.75, range: 500, },
                    function () { },
                    false
                ),
                new CelestialBody(
                    { x: 325, y: 400, radius: 50, color: moonColor },
                    { gForce: 0, range: 100, },
                    function () {
                        this.x = 300 + Math.sin(timePassed / 5000 + Math.PI / 2) * 600;
                        this.y = 600 + Math.cos(timePassed / 5000 + Math.PI / 2) * 600;
                    },
                    false
                ),
                new Bonus(325, 400, 10, bonusColor, function () {
                    this.y = 600 + Math.cos(-timePassed / 10000 + Math.PI * 2) * 330;
                    this.x = 300 + Math.sin(-timePassed / 10000 + Math.PI * 2) * 330;
                }),

                // new Obstacle(
                //     { x: 220, y: 350, radius: 50, color: bodyColor },
                //     function () { },
                //     false
                // ),
                // new Obstacle(
                //     { x: 190, y: 380, radius: 50, color: bodyColor },
                //     function () { },
                //     false
                // ),

                new Obstacle(
                    { x: 175, y: 390, radius: 30, color: hazardColor },
                    function () {
                        this.y = 390 + Math.sin(timePassed / 1000) * 3;
                        this.x = 175 + Math.cos(-timePassed / 1000);
                    },
                    true
                ),
                new Obstacle(
                    { x: 300, y: 360, radius: 30, color: hazardColor },
                    function () {
                        this.y = 360 + Math.sin(timePassed / 1000) * 3;
                    },
                    true
                ),
                new Obstacle(
                    { x: 425, y: 390, radius: 30, color: hazardColor },
                    function () {
                        this.y = 390 + Math.sin(timePassed / 1000) * 3;
                        this.x = 425 + Math.cos(timePassed / 1000);
                    },
                    true
                ),
                // new Obstacle(
                //     { x: 350, y: 360, radius: 30, color: hazardColor },
                //     function () { },
                //     true
                // ),

                new Goal(525, 450, 20),
            ],
            { x: 75, y: 450 }, // Player
            3, // Par
            1 // Level Scale
        ),
        // Level 5
        new Level("Jumping through the Moons",
            [
                new CelestialBody(
                    { x: 100, y: 100, radius: 60, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () { },
                    false
                ),
                // Inner Moons
                new CelestialBody(
                    { x: 400, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 3000) * 200;
                        this.y = 100 + Math.cos(timePassed / 3000) * 200;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 600, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 400, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 3000 + Math.PI) * 200;
                        this.y = 100 + Math.cos(timePassed / 3000 + Math.PI) * 200;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 600, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 3000 - Math.PI / 2) * 200;
                        this.y = 100 + Math.cos(timePassed / 3000 - Math.PI / 2) * 200;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),

                // Outer Moons
                new CelestialBody(
                    { x: 400, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 8000) * 400;
                        this.y = 100 + Math.cos(timePassed / 8000) * 400;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 600, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 8000 + Math.PI / 2) * 400;
                        this.y = 100 + Math.cos(timePassed / 8000 + Math.PI / 2) * 400;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 400, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 8000 + Math.PI) * 400;
                        this.y = 100 + Math.cos(timePassed / 8000 + Math.PI) * 400;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),
                new CelestialBody(
                    { x: 600, y: 100, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        this.x = 100 + Math.sin(timePassed / 8000 - Math.PI / 2) * 400;
                        this.y = 100 + Math.cos(timePassed / 8000 - Math.PI / 2) * 400;
                    },
                    false,
                    { isRotating: true, rotationSpeed: Math.PI / 90 }
                ),

                // Goal Planet
                new CelestialBody(
                    { x: 600, y: 600, radius: 100, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () { },
                    false
                ),

                new Goal(500, 500, 20),
            ],
            { x: 175, y: 175 }, // Player
            3,
            1 // Level Scale
        ),
        // Level 6
        new Level("Celestial Maze",
            [
                new CelestialBody(
                    { x: 100, y: 100, radius: 60, color: bodyColor },
                    { gForce: 0.75, range: 200, },
                    function () { },
                    false
                ),
                // Moons
                new CelestialBody(
                    { x: 400, y: 150, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000) * 200;
                    },
                    false
                ),
                new CelestialBody(
                    { x: 200, y: 600, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    false
                ),
                new CelestialBody(
                    { x: 600, y: 450, radius: 40, color: moonColor },
                    { gForce: 1.5, range: 100, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    false
                ),
                // Hazards
                new CelestialBody(
                    { x: 400, y: 400, radius: 75, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),
                new CelestialBody(
                    { x: 150, y: 300, radius: 50, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),
                new CelestialBody(
                    { x: 500, y: 300, radius: 50, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),
                new CelestialBody(
                    { x: 550, y: 195, radius: 50, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),
                new CelestialBody(
                    { x: 575, y: 82, radius: 50, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),
                new CelestialBody(
                    { x: 400, y: 700, radius: 50, color: hazardColor },
                    { gForce: 1, range: null, },
                    function () {
                        // this.x = 100 + Math.sin(timePassed / 3000 + Math.PI / 2) * 200;
                        // this.y = 100 + Math.cos(timePassed / 3000 + Math.PI / 2) * 200;
                    },
                    true
                ),

                // Goal Planet
                new CelestialBody(
                    { x: 750, y: 750, radius: 100, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () { },
                    false
                ),

                // Bonus
                new CelestialBody(
                    { x: 750, y: 150, radius: 40, color: moonColor },
                    { gForce: 1, range: 100, },
                    function () { },
                    false
                ),
                new Bonus(700, 200, 10, bonusColor),

                new Goal(650, 650, 20),
            ],
            { x: 175, y: 175 }, // Player
            4,
            0.75 // Level Scale
        ),
        // Level 7
        new Level("The Moon Express",
            [
                new CelestialBody(
                    { x: 75, y: 400, radius: 60, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () { },
                    false
                ),
                new CelestialBody(
                    { x: 725, y: 400, radius: 60, color: bodyColor },
                    { gForce: 1, range: 200, },
                    function () { },
                    false
                ),
                // Moon Row 1
                new CelestialBody(
                    { x: 300, y: 0, radius: 30, color: hazardColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y += delta * 0.2;
                        if (this.y > 900) {
                            this.y = -100;
                        }
                    },
                    true
                ),
                new CelestialBody(
                    { x: 300, y: 250, radius: 30, color: moonColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y += delta * 0.2;
                        if (this.y > 900) {
                            this.y = -100;
                        }
                    },
                    false
                ),
                new CelestialBody(
                    { x: 300, y: 500, radius: 30, color: hazardColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y += delta * 0.2;
                        if (this.y > 900) {
                            this.y = -100;
                        }
                    },
                    true
                ),
                new CelestialBody(
                    { x: 300, y: 750, radius: 30, color: moonColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y += delta * 0.2;
                        if (this.y > 900) {
                            this.y = -100;
                        }
                    },
                    false
                ),
                // Moon Rows 2
                new CelestialBody(
                    { x: 500, y: 0, radius: 30, color: hazardColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y -= delta * 0.2;
                        if (this.y < -100) {
                            this.y = 900;
                        }
                    },
                    true
                ),
                new CelestialBody(
                    { x: 500, y: 250, radius: 30, color: moonColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y -= delta * 0.2;
                        if (this.y < -100) {
                            this.y = 900;
                        }
                    },
                    false
                ),
                new CelestialBody(
                    { x: 500, y: 500, radius: 30, color: hazardColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y -= delta * 0.2;
                        if (this.y < -100) {
                            this.y = 900;
                        }
                    },
                    true
                ),
                new CelestialBody(
                    { x: 500, y: 750, radius: 30, color: moonColor },
                    { gForce: 1, range: 125, },
                    function () {
                        this.y -= delta * 0.2;
                        if (this.y < -100) {
                            this.y = 900;
                        }
                    },
                    false
                ),
                new Bonus(400, 400, 10, bonusColor, function () {
                    this.y -= delta * 0.2;
                    if (this.y < -100) {
                        this.y = 900;
                    }
                }),
                new Goal(630, 400, 20),
            ],
            { x: 150, y: 400 }, // Player
            3,
            0.75 // Level Scale
        ),
        // End Game
        new Level("The End",
            [],
            { x: 0, y: 0, hidePlayer: true }, // Player
            0, // Par
            1, // Level Scale
            "end",
            function () {
                const parScore = calculateParScore();
                UIs.endUI.elements[1].updateText(`Final Par Score: ${parScore.totalMoves} / ${parScore.totalPar}`);
                UIs.endUI.elements[2].updateText(`Bonus: ${totalBonus} | Fails: ${totalFails}`);
            }
        ),
        // // End Game
        // new Level("Level Select",
        //     [],
        //     { x: 0, y: 0, hidePlayer: true }, // Player
        //     0, // Par
        //     1, // Level Scale
        //     "levelSelect"
        // ),
        // // Level 8
        // new Level("",
        //     [
        //         new CelestialBody(
        //             { x: 600, y: 600, radius: 100, color: hazardColor },
        //             { gForce: 0.15, range: 600, },
        //             function () { },
        //             true
        //         ),
        //         new CelestialBody(
        //             { x: 300, y: 300, radius: 50, color: moonColor },
        //             { gForce: 1.25, range: 150, },
        //             function () {
        //                 this.x = 600 + Math.sin(timePassed / 10000) * 450;
        //                 this.y = 600 + Math.cos(timePassed / 10000) * 450;
        //             },
        //             false
        //         ),
        //         new CelestialBody(
        //             { x: 300, y: 300, radius: 50, color: moonColor },
        //             { gForce: 1.25, range: 150, },
        //             function () {
        //                 this.x = 600 + Math.sin(timePassed / 10000 + Math.PI) * 450;
        //                 this.y = 600 + Math.cos(timePassed / 10000 + Math.PI) * 450;
        //             },
        //             false
        //         ),
        //         new CelestialBody(
        //             { x: 300, y: 300, radius: null, color: moonColor },
        //             { gForce: 1.25, range: 100, },
        //             function () {
        //                 this.x = 600 + Math.sin(timePassed / 10000 + Math.PI * 1.666) * 400;
        //                 this.y = 600 + Math.cos(timePassed / 10000 + Math.PI * 1.666) * 400;
        //             },
        //             false
        //         ),
        //         new Goal(900, 900, 30,
        //             function () {
        //                 this.x = 600 + Math.sin(timePassed / 10000) * 500;
        //                 this.y = 600 + Math.cos(timePassed / 10000) * 500;
        //             },
        //         ),
        //     ],
        //     { x: 500, y: 200 }, // Player
        //     5,
        //     0.5 // Level Scale
        // )
    ];


    // ==========================
    //      Initialize Game
    // ==========================

    function LoadLevel(levelIndex, playCloseTransition = true) {
        if (playCloseTransition) {
            closeTransition.nextLevelIndex = levelIndex;
            closeTransition.start();
            return;
        }
        else {
            levels[levelIndex].start(levelIndex);
        }
    }

    LoadLevel(currentLevelIndex, false);
    starParticlesAnimation.start();

    // UIs.gameUI.start();
    // UIs.pauseUI.start();
    // UIs.winUI.start();
    for (const ui of Object.values(UIs)) {
        ui.start();
    }

    // ==========================
    //      Main Game Loop
    // ==========================

    // Main Create.js Ticker
    createjs.Ticker.framerate = framerate;
    createjs.Ticker.addEventListener("tick", function (e) {

        delta = e.delta * timeScale;

        const level = levels[currentLevelIndex];

        level.update(delta);
        level.draw();

        drawParticles(delta);

        // ==========================
        //      Handle UI States
        // ==========================
        // UIs.gameUI.update("ui", gameState);
        // UIs.pauseUI.update("ui", gameState);
        // UIs.winUI.update("ui", gameState);

        for (const ui of Object.values(UIs)) {
            ui.update("ui", gameState);
        }

        stage.update();
    });

    // ==========================
    //      Input Events
    // ==========================

    // Key Events
    window.addEventListener("keydown", function (e) {
        keyEvent = e;
    });

    window.addEventListener("keyup", function (e) {
        keyEvent = e;
        if (keyEvent.key === "q") {
            LoadLevel(currentLevelIndex + 1);
        }
        if (gameState === "game" && keyEvent.key === "r") {
            levels[currentLevelIndex].player.startFail();
        }
    });

    // Mouse Events
    window.addEventListener("mousemove", function (e) {
        // Mouse Hover-Over heavily modified by Claude to work with Portfolio Website.
        // Map pointer from CSS layout box to backing-store pixels (max-width / height:auto / DPR-safe).
        const levelScale = levels[currentLevelIndex].scaleFactor;
        const rect = canvas.getBoundingClientRect();
        const rw = rect.width || 1;
        const rh = rect.height || 1;
        const canvasX = ((e.clientX - rect.left) / rw) * canvas.width;
        const canvasY = ((e.clientY - rect.top) / rh) * canvas.height;
        const worldPos = screenToWorld(canvasX, canvasY, levelScale);
        const uiWorldPos = screenToWorld(canvasX, canvasY, 1);
        mouseTargetX = worldPos.x;
        mouseTargetY = worldPos.y;
        mouseUiX = uiWorldPos.x;
        mouseUiY = uiWorldPos.y;
        // End of Mouse Hover-Over modification by Claude.
    });

    window.addEventListener("mousedown", function (e) {
        clickEvent = "mousedown";
    });

    window.addEventListener("mouseup", function (e) {
        clickEvent = "mouseup";
    });

    window.addEventListener("resize", function (e) {
        updateCanvasSize();
    });

    function updateCanvasSize() {
        if (window.innerWidth > window.innerHeight) {
            canvas.height = window.innerHeight - 20;
            canvas.width = canvas.height;
        }
        else {
            canvas.width = window.innerWidth - 20;
            canvas.height = canvas.width;
        }
        backgroundShape.graphics.clear();
        backgroundShape.graphics.beginFill(backgroundColor).drawRect(0, 0, canvas.width, canvas.height);
    }

    updateCanvasSize();
});

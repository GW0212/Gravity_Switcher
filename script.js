(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const playfield = document.getElementById("playfield");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlaySubtitle = document.getElementById("overlaySubtitle");
  const overlayButton = document.getElementById("overlayButton");

  const speedLabel = document.getElementById("speedLabel");
  const scoreLabel = document.getElementById("scoreLabel");
  const bestLabel = document.getElementById("bestLabel");
  const pauseButton = document.getElementById("pauseButton");
  const pauseIcon = document.querySelector(".hud-pause-icon");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 40;
  const CEIL = 40;
  const PS = 42;

  let gameState = "ready"; // "ready" | "running" | "over"
  let isPaused = false;
  let gravity = 1;
  let speed = 5;
  let baseSpeed = 5;
  let speedInc = 0.0008;
  let score = 0;
  let best = Number(localStorage.getItem("gravity_switcher_best") || 0);
  let last = 0;
  let obTimer = 0;
  let obInt = 1000;

  bestLabel.textContent = "Best: " + best.toFixed(0);

  const player = { x: 130, y: getFloorY(), w: PS, h: PS };
  const obs = [];

  function getFloorY() { return H - GROUND - PS; }
  function getCeilY() { return CEIL; }

  function setPauseState(paused) {
    isPaused = paused;
    if (isPaused) {
      pauseButton.classList.add("is-paused");
      pauseIcon.textContent = "▶";
      pauseButton.setAttribute("aria-label", "재생");
    } else {
      pauseButton.classList.remove("is-paused");
      pauseIcon.textContent = "❚❚";
      pauseButton.setAttribute("aria-label", "일시정지");
    }
  }

  function showStartOverlay() {
    overlayTitle.textContent = "중력 반전 레이싱";
    overlaySubtitle.textContent =
      "화면을 클릭 / 터치하거나 Space, ↑ 키를 눌러 중력을 반전시키며 장애물을 피하세요.";
    overlayButton.textContent = "게임 시작";
    overlayButton.onclick = () => {
      startGame();
    };
    overlay.classList.remove("hidden");
  }

  function showGameOverOverlay() {
    overlayTitle.textContent = "게임 오버";
    overlaySubtitle.innerHTML = "";
    const scoreLine = document.createElement("div");
    scoreLine.className = "overlay-score";
    scoreLine.textContent = `Score: ${score.toFixed(0)}   |   Best: ${best.toFixed(0)}`;
    overlaySubtitle.appendChild(scoreLine);
    const hint = document.createElement("div");
    hint.style.fontSize = "0.8rem";
    hint.style.color = "#cbd5e1";
    hint.textContent = "한 번 더 도전해 보세요!";
    overlaySubtitle.appendChild(hint);

    overlayButton.textContent = "한번 더 하기";
    overlayButton.onclick = () => {
      resetGame();
      startGame();
    };
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function resetGame() {
    gameState = "ready";
    setPauseState(false);
    gravity = 1;
    speed = baseSpeed;
    score = 0;
    obTimer = 0;
    obInt = 1000;
    obs.length = 0;
    player.y = getFloorY();
    playfield.classList.remove("flipped");
    last = 0;
    speedLabel.textContent = "Speed: 1.00x";
    scoreLabel.textContent = "Score: 0";
  }

  function startGame() {
    if (gameState === "running") return;
    resetGame();
    hideOverlay();
    gameState = "running";
  }

  function gameOver() {
    gameState = "over";
    setPauseState(false);
    if (score > best) {
      best = score;
      localStorage.setItem("gravity_switcher_best", String(best));
    }
    bestLabel.textContent = "Best: " + best.toFixed(0);
    showGameOverOverlay();
  }

  function toggleGravity() {
    if (gameState === "ready") {
      startGame();
    }
    if (gameState !== "running" || isPaused) return;

    gravity *= -1;
    if (gravity === 1) {
      player.y = getFloorY();
      playfield.classList.remove("flipped");
    } else {
      player.y = getCeilY();
      playfield.classList.add("flipped");
    }
  }

  function spawnObstacle() {
    const fromFloor = Math.random() < 0.5;
    const h = 90;
    const w = 40;
    const y = fromFloor ? H - GROUND - h : CEIL;
    obs.push({ x: W + w, y, w, h });
  }

  function update(dt) {
    if (gameState !== "running" || isPaused) return;
    const ds = dt / 1000;

    speed += speedInc * dt;
    score += ds * 100;

    speedLabel.textContent = "Speed: " + (speed / baseSpeed).toFixed(2) + "x";
    scoreLabel.textContent = "Score: " + score.toFixed(0);

    obTimer += dt;
    if (obTimer >= obInt) {
      obTimer = 0;
      spawnObstacle();
      if (obInt > 550) obInt -= 10;
    }

    for (let i = obs.length - 1; i >= 0; i--) {
      obs[i].x -= speed;
      if (obs[i].x + obs[i].w < -10) obs.splice(i, 1);
    }

    if (checkCollision()) {
      gameOver();
    }
  }

  function checkCollision() {
    return obs.some(ob =>
      player.x < ob.x + ob.w &&
      player.x + player.w > ob.x &&
      player.y < ob.y + ob.h &&
      player.y + player.h > ob.y
    );
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.4, "#1e293b");
    g.addColorStop(1, "#020617");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, CEIL - 8);
    ctx.lineTo(W, CEIL - 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, H - GROUND + 8);
    ctx.lineTo(W, H - GROUND + 8);
    ctx.stroke();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    if (gravity === -1) ctx.rotate(Math.PI);
    ctx.translate(-player.w / 2, -player.h / 2);

    const r = 10;
    const w = player.w;
    const h = player.h;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#38bdf8");
    grad.addColorStop(1, "#a855f7");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.4, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.7);
    ctx.lineTo(w * 0.65, h * 0.7);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  function drawObstacles() {
    for (const ob of obs) {
      const grad = ctx.createLinearGradient(ob.x, ob.y, ob.x + ob.w, ob.y + ob.h);
      grad.addColorStop(0, "#fb923c");
      grad.addColorStop(1, "#facc15");
      ctx.fillStyle = grad;
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

      ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);

      const spikes = 5;
      const spikeSize = 8;
      for (let i = 0; i < spikes; i++) {
        const sx = ob.x + (i / (spikes - 1 || 1)) * ob.w;
        ctx.beginPath();
        if (ob.y < H / 2) {
          ctx.moveTo(sx - spikeSize, ob.y + ob.h);
          ctx.lineTo(sx, ob.y + ob.h + spikeSize);
          ctx.lineTo(sx + spikeSize, ob.y + ob.h);
        } else {
          ctx.moveTo(sx - spikeSize, ob.y);
          ctx.lineTo(sx, ob.y - spikeSize);
          ctx.lineTo(sx + spikeSize, ob.y);
        }
        ctx.closePath();
        ctx.fillStyle = "#f97316";
        ctx.fill();
      }
    }
  }

  function render() {
    drawBackground();
    drawObstacles();
    drawPlayer();
  }

  function loop(timestamp) {
    if (!last) last = timestamp;
    const dt = timestamp - last;
    last = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function handlePointer() {
    if (gameState === "over") return;
    toggleGravity();
  }

  canvas.addEventListener("mousedown", handlePointer);
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handlePointer();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (gameState === "over") return;
      toggleGravity();
    }
  });

  // 일시정지 / 재생 버튼
  pauseButton.addEventListener("click", () => {
    if (gameState !== "running") return;
    setPauseState(!isPaused);
  });

  // --- 탭 설명 팝업 ---
  const infoPopup = document.getElementById("infoPopup");
  const infoTitle = document.getElementById("infoTitle");
  const infoList = document.getElementById("infoList");
  const infoClose = document.querySelector(".info-close");
  const tabButtons = document.querySelectorAll(".tab-button");

  const popupData = {
    controls: {
      title: "게임 조작 방법",
      items: [
        "PC: 마우스 클릭, Space, ↑ 키로 중력 반전",
        "모바일: 화면 아무 곳이나 터치로 중력 반전",
        "게임 화면 내부에서 입력해야 인식됩니다."
      ]
    },
    rules: {
      title: "게임 룰",
      items: [
        "캐릭터는 자동으로 앞으로 달립니다.",
        "장애물에 닿으면 게임 오버입니다.",
        "시간이 지날수록 속도가 점점 빨라집니다."
      ]
    }
  };

  function openInfoPopup(type) {
    const data = popupData[type];
    if (!data) return;
    infoTitle.textContent = data.title;
    infoList.innerHTML = "";
    data.items.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      infoList.appendChild(li);
    });
    infoPopup.classList.remove("hidden");
  }

  function closeInfoPopup() {
    infoPopup.classList.add("hidden");
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => openInfoPopup(btn.dataset.info));
  });
  infoClose.addEventListener("click", closeInfoPopup);

  // 초기화
  resetGame();
  showStartOverlay();
  requestAnimationFrame(loop);
})();
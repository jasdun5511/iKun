// --- 游戏配置 (沿用上一个版本，略作简化) ---
const BIOMES = {
    PLAINS: { name: "广阔草原", color: "biome-plains", resources: [{name: "杂草", type: 'plant'}, {name: "种子", type: 'plant'}], mobs: [{name: "野牛", hp: 20, atk: 5}, {name: "史莱姆", hp: 15, atk: 3}] },
    FOREST: { name: "幽暗森林", color: "biome-forest", resources: [{name: "橡木", type: 'wood'}, {name: "树枝", type: 'wood'}], mobs: [{name: "森林狼", hp: 30, atk: 8}, {name: "僵尸", hp: 25, atk: 6}] },
    MOUNTAIN: { name: "险峻高山", color: "biome-mountain", resources: [{name: "石块", type: 'stone'}, {name: "铁矿石", type: 'ore'}], mobs: [{name: "山地骷髅", hp: 40, atk: 10}] }
    // ... 其他地形数据
};

// --- 游戏状态 ---
let player = { x: 50, y: 50, hp: 100, maxHp: 100, atk: 10, hunger: 100, inventory: {} };
let gameTime = 0; 
let worldMap = {}; 
let isMapEnlarged = false; // 保持地图缩放状态变量

// **关键：战斗状态**
let isFighting = false;
let currentEnemy = null; 

// --- 初始化 ---
function initGame() {
    revealSurroundings(player.x, player.y);
    log(`你醒来了，位于 ${BIOMES[getTile(player.x, player.y).type].name}。`);
    updateUI();
}

// --- 移动与探索 (保持不变) ---
function getTile(x, y) {
    const key = `${x},${y}`;
    if (worldMap[key]) return worldMap[key];
    
    // 伪随机地形生成逻辑
    const types = Object.keys(BIOMES);
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const typeIndex = Math.floor((Math.abs(hash) % 1) * types.length);
    
    worldMap[key] = { type: types[typeIndex], explored: false };
    return worldMap[key];
}

function revealSurroundings(x, y) {
    // 中心点和东南西北揭示逻辑
    const tiles = [getTile(x, y), getTile(x+1, y), getTile(x-1, y), getTile(x, y+1), getTile(x, y-1)];
    tiles.forEach(t => t.explored = true);
}

function move(dx, dy) {
    if (player.hp <= 0 || isFighting) {
        log("请先处理当前状态！");
        return;
    }

    player.x += dx;
    player.y += dy;
    player.hunger = Math.max(0, player.hunger - 1);
    
    if (player.hunger === 0) player.hp -= 2;

    passTime();
    revealSurroundings(player.x, player.y);
    log(`你移动到了 ${BIOMES[getTile(player.x, player.y).type].name}。`);
    
    updateUI();
}

function passTime() {
    gameTime = (gameTime + 1) % 24;
}

// --- 采集/战斗交互逻辑 ---

// **关键：采集资源**
function gatherResource(resourceName) {
    if (isFighting) return;
    
    const tile = getTile(player.x, player.y);
    const biomeData = BIOMES[tile.type];
    
    // 简单检查资源是否匹配当前地形
    if (!biomeData.resources.find(r => r.name === resourceName)) {
        log(`在 ${biomeData.name} 无法采集 ${resourceName}。`);
        return;
    }

    if (Math.random() > 0.4) {
        addItem(resourceName, 1);
        log(`⛏️ 采集成功！获得了 [${resourceName}] x1`);
    } else {
        log("你努力采集，但一无所获。");
    }
    
    player.hunger = Math.max(0, player.hunger - 2);
    passTime();
    updateUI();
}

// **关键：进入战斗**
function initiateCombat(mobName) {
    if (isFighting) return;
    
    const tile = getTile(player.x, player.y);
    const mobData = BIOMES[tile.type].mobs.find(m => m.name === mobName);
    
    if (!mobData) {
        log("没有找到目标生物。");
        return;
    }

    isFighting = true;
    currentEnemy = {...mobData, hp: mobData.hp}; // 创建怪物实例
    log(`⚔️ 你遭遇了 [${mobName}]，进入战斗！`);
    
    document.getElementById('battle-ui').classList.remove('hidden');
    updateBattleUI();
}

// --- 战斗系统逻辑 ---

function updateBattleUI() {
    const pHP = player.hp;
    const pMaxHP = player.maxHp;
    const eHP = currentEnemy.hp;
    const eMaxHP = currentEnemy.maxHp || currentEnemy.hp; // 初始血量即为Max

    // 玩家状态
    document.getElementById('player-hp-text').innerText = `${pHP}/${pMaxHP}`;
    document.getElementById('player-battle-hp').style.width = `${(pHP / pMaxHP) * 100}%`;

    // 敌人状态
    document.getElementById('enemy-name').innerText = currentEnemy.name;
    document.getElementById('enemy-hp-text').innerText = `${eHP}/${eMaxHP}`;
    document.getElementById('enemy-battle-hp').style.width = `${(eHP / eMaxHP) * 100}%`;
}

function battleLog(msg) {
    const logEl = document.getElementById('battle-log');
    const p = document.createElement('p');
    p.innerText = msg;
    logEl.prepend(p);
}

// 玩家回合
function playerAttack() {
    if (!isFighting) return;

    // 玩家攻击
    const dmg = player.atk + Math.floor(Math.random() * 5);
    currentEnemy.hp -= dmg;
    battleLog(`> 你对 ${currentEnemy.name} 造成了 ${dmg} 点伤害！`);

    if (currentEnemy.hp <= 0) {
        endCombat(true); // 胜利
        return;
    }

    // 敌方反击 (延迟模拟回合制)
    setTimeout(enemyAttack, 1000);
    updateBattleUI();
}

// 敌人回合
function enemyAttack() {
    if (!isFighting) return;
    
    const dmg = currentEnemy.atk + Math.floor(Math.random() * 3);
    player.hp -= dmg;
    battleLog(`> ${currentEnemy.name} 反击，你损失了 ${dmg} 点生命！`);

    if (player.hp <= 0) {
        endCombat(false); // 失败
        return;
    }
    updateBattleUI();
}

// 逃跑
function runAway() {
    if (Math.random() > 0.5) {
        battleLog("🏃 逃跑成功！");
        log(`你成功逃离了 ${currentEnemy.name} 的战斗。`);
        endCombat(false, true);
    } else {
        battleLog("❌ 逃跑失败！敌人立刻进行了反击。");
        enemyAttack(); // 逃跑失败，敌人立即攻击
    }
}

// 结束战斗
function endCombat(isWin, isRun = false) {
    document.getElementById('battle-ui').classList.add('hidden');
    isFighting = false;
    
    if (player.hp <= 0) {
        log("☠️ 你的生命值归零了！游戏结束。");
        updateUI();
        return;
    }

    if (isWin) {
        log(`🎉 恭喜！你击败了 ${currentEnemy.name}，获得了经验！`);
        // 战斗胜利奖励
        addItem("肉", 1);
    } else if (!isRun) {
        log(`你从 ${currentEnemy.name} 的战斗中撤退了。`);
    }

    currentEnemy = null;
    updateUI();
}


// --- UI 渲染 ---
function updateUI() {
    // 状态栏更新 (保持不变)
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;
    document.getElementById('time').innerText = gameTime < 12 ? "白天" : "黑夜";
    document.getElementById('coord-x').innerText = player.x;
    document.getElementById('coord-y').innerText = player.y;

    const currentTile = getTile(player.x, player.y);
    const biomeData = BIOMES[currentTile.type];
    
    // **关键：更新主画面地形信息**
    document.getElementById('current-biome').innerText = `🏞️ 正在探索: ${biomeData.name}`;

    // 资源按钮
    const resButtons = biomeData.resources.map(r => 
        `<button onclick="gatherResource('${r.name}')">采集 ${r.name}</button>`
    ).join('');
    document.getElementById('action-resources').innerHTML = resButtons;

    // 怪物按钮 (随机显示 1-2 个怪物)
    const mobButtons = biomeData.mobs
        .slice(0, Math.min(2, biomeData.mobs.length)) // 最多显示2种
        .map(m => 
            `<button onclick="initiateCombat('${m.name}')">攻击 ${m.name}</button>`
        ).join('');
    document.getElementById('action-mobs').innerHTML = mobButtons || "（暂无明显威胁）";
    
    // 地图渲染 (保持迷雾和缩小的7x7视野)
    const mapEl = document.getElementById('grid-map');
    mapEl.innerHTML = '';
    const viewDistance = 3; 

    for (let y = player.y - viewDistance; y <= player.y + viewDistance; y++) {
        for (let x = player.x - viewDistance; x <= player.x + viewDistance; x++) {
            const cell = document.createElement('div');
            const tile = getTile(x, y);
            
            if (!tile.explored) {
                cell.className = 'cell fog';
                cell.innerText = '?';
            } else {
                cell.className = `cell ${BIOMES[tile.type].color}`;
                cell.innerText = BIOMES[tile.type].name[0];
                
                if (x === player.x && y === player.y) {
                    cell.classList.add('player');
                    cell.innerText = '我';
                }
            }
            mapEl.appendChild(cell);
        }
    }
    
    // 背包更新
    const invEl = document.getElementById('inv-list');
    invEl.innerHTML = Object.entries(player.inventory).map(([k,v]) => `<span>${k} x${v}</span>`).join('');
}

// 启动游戏
initGame();

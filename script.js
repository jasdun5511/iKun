// --- 游戏配置 ---
// 地形数据增加了更多描述性信息用于弹窗
const BIOMES = {
    PLAINS: { name: "广阔草原", color: "biome-plains", resources: ["杂草", "种子", "泥土块"], mobs: ["野牛", "史莱姆"] },
    FOREST: { name: "幽暗森林", color: "biome-forest", resources: ["橡木", "树枝", "苹果"], mobs: ["森林狼", "僵尸"] },
    DESERT: { name: "灼热沙漠", color: "biome-desert", resources: ["仙人掌", "沙子", "枯灌木"], mobs: ["沙虫", "尸壳"] },
    MOUNTAIN: { name: "险峻高山", color: "biome-mountain", resources: ["石块", "铁矿石", "煤炭"], mobs: ["山地骷髅", "巨鹰"] }
};

// --- 游戏状态 ---
let player = { x: 50, y: 50, hp: 100, hunger: 100, inventory: {} };
let gameTime = 0; // 0-11 白天, 12-23 黑夜
let worldMap = {}; 
let isMapEnlarged = false; // 地图是否放大状态
let lastBiomeType = null; // 记录上一次所在的地形类型

// --- 初始化 ---
function initGame() {
    // 初始揭示周围地形
    revealSurroundings(player.x, player.y);
    // 检查并显示初始地形弹窗
    checkNewBiome(player.x, player.y);
    updateUI();
}

// --- 核心逻辑 ---

// 获取/生成地形格子数据
function getTile(x, y) {
    const key = `${x},${y}`;
    if (worldMap[key]) return worldMap[key];
    
    const types = Object.keys(BIOMES);
    // 使用多个正弦函数叠加产生更有趣的伪随机地形
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 + Math.cos(x*0.5 + y*0.5)*100;
    const typeIndex = Math.floor((Math.abs(hash) % 1) * types.length);
    
    worldMap[key] = { type: types[typeIndex], explored: false };
    return worldMap[key];
}

// **关键：揭示周围地形 (迷雾系统)**
function revealSurroundings(x, y) {
    // 中心点
    getTile(x, y).explored = true;
    // 东南西北
    getTile(x+1, y).explored = true;
    getTile(x-1, y).explored = true;
    getTile(x, y+1).explored = true;
    getTile(x, y-1).explored = true;
}

// **关键：检查是否进入新地形并弹窗**
function checkNewBiome(x, y) {
    const currentTile = getTile(x, y);
    if (currentTile.type !== lastBiomeType) {
        lastBiomeType = currentTile.type;
        showBiomeModal(currentTile.type, x, y);
        log(`你踏入了新的土地：${BIOMES[currentTile.type].name}。`);
    }
}

// 移动动作
function move(dx, dy) {
    if (player.hp <= 0 || document.getElementById('biome-modal').classList.contains('hidden') === false) return;

    player.x += dx;
    player.y += dy;
    player.hunger = Math.max(0, player.hunger - 1);
    if (player.hunger === 0) player.hp -= 2;

    passTime();
    // 1. 揭开迷雾
    revealSurroundings(player.x, player.y);
    // 2. 检查是否需要弹窗
    checkNewBiome(player.x, player.y);
    
    updateUI();
}

// 探索/采集动作 (简化版)
function action() {
    if (player.hp <= 0) return;
    
    const tile = getTile(player.x, player.y);
    const biomeData = BIOMES[tile.type];
    const roll = Math.random();
    
    if (roll > 0.5) {
        const item = biomeData.resources[Math.floor(Math.random() * biomeData.resources.length)];
        addItem(item, 1);
        log(`采集获得: [${item}] +1`);
    } else {
        log("这里似乎什么都没有。");
    }
    player.hunger = Math.max(0, player.hunger - 2);
    passTime();
    updateUI();
}

function passTime() {
    gameTime = (gameTime + 1) % 24;
}

function addItem(name, count) {
    player.inventory[name] = (player.inventory[name] || 0) + count;
}

function log(msg) {
    const logEl = document.getElementById('game-log');
    const p = document.createElement('p');
    p.innerHTML = `<small>${gameTime < 12 ? '☀️' : '🌙'}</small> ${msg}`;
    logEl.prepend(p);
}

// --- UI 交互与渲染 ---

// **关键：切换地图大小**
function toggleMapSize() {
    const mapContainer = document.querySelector('.map-container');
    isMapEnlarged = !isMapEnlarged;
    
    if (isMapEnlarged) {
        mapContainer.classList.add('enlarged');
        document.querySelector('.map-header').innerText = "🗺️ 大地图 (点击缩小)";
    } else {
        mapContainer.classList.remove('enlarged');
        document.querySelector('.map-header').innerText = "🗺️ 小地图 (点击放大)";
    }
    // 重新渲染以调整视野大小
    updateUI();
}

// 显示地形弹窗
function showBiomeModal(biomeType, x, y) {
    const data = BIOMES[biomeType];
    document.getElementById('modal-title').innerText = data.name;
    document.getElementById('modal-coords').innerText = `[${x}, ${y}]`;
    
    const resContainer = document.getElementById('modal-resources');
    resContainer.innerHTML = data.resources.map(r => `<span>${r}</span>`).join('');
    
    const mobContainer = document.getElementById('modal-mobs');
    mobContainer.innerHTML = data.mobs.map(m => `<span>${m}</span>`).join('');
    
    document.getElementById('biome-modal').classList.remove('hidden');
}

// 关闭弹窗
function closeModal() {
    document.getElementById('biome-modal').classList.add('hidden');
}

// 渲染 UI
function updateUI() {
    // 状态更新
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;
    document.getElementById('time').innerText = gameTime < 12 ? "白天" : "黑夜";
    document.getElementById('coord-x').innerText = player.x;
    document.getElementById('coord-y').innerText = player.y;
    document.getElementById('biome').innerText = BIOMES[getTile(player.x, player.y).type].name;

    // **关键：地图渲染 (含迷雾逻辑)**
    const mapEl = document.getElementById('grid-map');
    mapEl.innerHTML = '';
    
    // 根据地图是否放大决定视野半径
    const viewDistance = isMapEnlarged ? 6 : 3; // 放大是 13x13, 缩小是 7x7
    const gridSize = viewDistance * 2 + 1;
    // 动态调整 CSS 网格列数
    mapEl.style.gridTemplateColumns = `repeat(${gridSize}, 24px)`;
    mapEl.style.gridTemplateRows = `repeat(${gridSize}, 24px)`;

    for (let y = player.y - viewDistance; y <= player.y + viewDistance; y++) {
        for (let x = player.x - viewDistance; x <= player.x + viewDistance; x++) {
            const cell = document.createElement('div');
            const tile = getTile(x, y);
            
            if (!tile.explored) {
                // 未探索：显示迷雾
                cell.className = 'cell fog';
                cell.innerText = '?';
            } else {
                // 已探索
                cell.className = `cell ${BIOMES[tile.type].color} explored`;
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

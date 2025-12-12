// --- 游戏配置 ---
const BIOMES = {
    PLAINS: { name: "广阔草原", color: "biome-plains", 
              resources: [{name: "杂草", type: "res", drop:"纤维"}, {name: "浆果丛", type: "res", drop:"浆果"}], 
              mobs: [{name: "野牛", hp: 30, atk: 5}, {name: "史莱姆", hp: 15, atk: 3}] },
    FOREST: { name: "幽暗森林", color: "biome-forest", 
              resources: [{name: "橡木", type: "res", drop:"木头"}, {name: "蘑菇", type: "res", drop:"蘑菇"}], 
              mobs: [{name: "僵尸", hp: 40, atk: 8}, {name: "森林狼", hp: 25, atk: 10}] },
    DESERT: { name: "灼热沙漠", color: "biome-desert", 
              resources: [{name: "仙人掌", type: "res", drop:"仙人掌肉"}, {name: "枯木", type: "res", drop:"木棍"}], 
              mobs: [{name: "沙虫", hp: 50, atk: 12}, {name: "尸壳", hp: 45, atk: 9}] },
    MOUNTAIN: { name: "险峻高山", color: "biome-mountain", 
                resources: [{name: "铁矿石", type: "res", drop:"铁块"}, {name: "石块", type: "res", drop:"石头"}], 
                mobs: [{name: "山地骷髅", hp: 35, atk: 15}, {name: "巨鹰", hp: 60, atk: 18}] }
};

// --- 游戏状态 ---
let player = { x: 50, y: 50, hp: 100, maxHp: 100, hunger: 100, inventory: {} };
let gameTime = 0; 
let worldMap = {}; 
let isMapEnlarged = false;

// 战斗临时状态
let combatState = { inCombat: false, mob: null, mobMaxHp: 0 };

// --- 初始化 ---
function initGame() {
    revealSurroundings(player.x, player.y);
    enterTile(player.x, player.y); // 初始化当前格子的内容
    updateUI();
}

// --- 地图与移动系统 ---
function getTile(x, y) {
    const key = `${x},${y}`;
    if (worldMap[key]) return worldMap[key];
    
    // 地形生成算法
    const types = Object.keys(BIOMES);
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const typeIndex = Math.floor((Math.abs(hash) % 1) * types.length);
    
    // 初始化格子数据：这里增加了 contents 数组用来存具体的物品/怪物
    worldMap[key] = { 
        type: types[typeIndex], 
        explored: false,
        contents: [] // 初始为空，第一次进入时填充
    };
    return worldMap[key];
}

// 生成当前格子的内容 (资源和怪物)
function generateTileContents(tile) {
    if (tile.contents.length > 0) return; // 已经生成过就不再生了

    const biome = BIOMES[tile.type];
    const count = Math.floor(Math.random() * 4) + 2; // 随机生成 2-5 个物体

    for (let i = 0; i < count; i++) {
        const rnd = Math.random();
        // 30% 几率是怪物，70% 是资源
        if (rnd < 0.3) {
            const mobTemplate = biome.mobs[Math.floor(Math.random() * biome.mobs.length)];
            // 克隆一个怪物对象，因为血量是独立的
            tile.contents.push({
                type: 'mob',
                name: mobTemplate.name,
                hp: mobTemplate.hp,
                maxHp: mobTemplate.hp,
                atk: mobTemplate.atk,
                id: Date.now() + i // 唯一ID
            });
        } else {
            const resTemplate = biome.resources[Math.floor(Math.random() * biome.resources.length)];
            tile.contents.push({
                type: 'res',
                name: resTemplate.name,
                drop: resTemplate.drop,
                count: Math.floor(Math.random() * 3) + 1, // 资源数量
                id: Date.now() + i
            });
        }
    }
}

function revealSurroundings(x, y) {
    getTile(x, y).explored = true;
    getTile(x+1, y).explored = true;
    getTile(x-1, y).explored = true;
    getTile(x, y+1).explored = true;
    getTile(x, y-1).explored = true;
}

function move(dx, dy) {
    if (combatState.inCombat || player.hp <= 0) return;

    player.x += dx;
    player.y += dy;
    player.hunger = Math.max(0, player.hunger - 1);
    
    passTime();
    revealSurroundings(player.x, player.y);
    enterTile(player.x, player.y); // 处理进入新格子的逻辑
    
    updateUI();
}

// 进入格子：生成内容并刷新场景
function enterTile(x, y) {
    const tile = getTile(x, y);
    generateTileContents(tile); // 确保有东西
    log(`来到: ${BIOMES[tile.type].name}`);
}

// 手动搜寻：增加当前格子的物品
function searchScene() {
    if(player.hunger < 5) { log("太饿了，没力气搜寻。"); return; }
    
    player.hunger -= 2;
    const tile = getTile(player.x, player.y);
    // 强制追加 1-2 个物体
    tile.contents = []; // 先清空旧的（可选，也可以是累加，这里为了演示方便重置一部分）
    generateTileContents(tile);
    log("你在周围仔细搜寻了一番...");
    updateUI();
}

// --- 交互系统 ---

// 处理场景点击
function interact(index) {
    const tile = getTile(player.x, player.y);
    const item = tile.contents[index];

    if (!item) return;

    if (item.type === 'res') {
        // 采集逻辑
        addItem(item.drop, item.count);
        log(`采集了 ${item.name}，获得 [${item.drop} x${item.count}]`);
        player.hunger -= 1;
        // 移除该资源
        tile.contents.splice(index, 1);
        updateUI();
    } else if (item.type === 'mob') {
        // 战斗逻辑
        startCombat(item, index);
    }
}

// --- 战斗系统 ---

function startCombat(mobData, index) {
    combatState.inCombat = true;
    combatState.mob = mobData; // 引用同一个对象，战斗扣血会保留
    combatState.mobIndex = index; // 记录在数组里的位置，死后删除

    // UI 切换
    document.getElementById('combat-ui').classList.remove('hidden');
    document.getElementById('combat-mob-name').innerText = mobData.name;
    document.getElementById('combat-mob-max-hp').innerText = mobData.maxHp;
    
    updateCombatUI(`遭遇了 ${mobData.name} (Lv.${Math.floor(mobData.atk/2)})！`);
}

function combatRound(action) {
    if (!combatState.inCombat) return;

    const mob = combatState.mob;
    let logMsg = "";

    // 1. 玩家行动
    if (action === 'attack') {
        const dmg = Math.floor(Math.random() * 5) + 5; // 玩家基础攻击 5-10
        mob.hp -= dmg;
        logMsg += `你攻击了 ${mob.name}，造成 ${dmg} 点伤害。<br>`;
    } else if (action === 'defend') {
        logMsg += `你摆出防御姿态，减少下一次受到的伤害。<br>`;
    }

    // 2. 判定怪物死亡
    if (mob.hp <= 0) {
        mob.hp = 0;
        updateCombatUI(logMsg);
        setTimeout(() => endCombat(true), 800);
        return;
    }

    // 3. 怪物反击
    let mobDmg = Math.floor(Math.random() * 3) + mob.atk;
    if (action === 'defend') mobDmg = Math.floor(mobDmg / 2); // 防御减半
    
    player.hp -= mobDmg;
    logMsg += `${mob.name} 攻击了你！受到了 ${mobDmg} 点伤害。`;

    updateCombatUI(logMsg);

    // 4. 判定玩家死亡
    if (player.hp <= 0) {
        player.hp = 0;
        document.getElementById('combat-ui').classList.add('hidden');
        alert("你被打败了！游戏结束。");
        location.reload();
    }
}

function updateCombatUI(msg) {
    const mob = combatState.mob;
    document.getElementById('combat-mob-hp').innerText = mob.hp;
    // 更新血条宽度
    const pct = (mob.hp / mob.maxHp) * 100;
    document.getElementById('combat-mob-hp-bar').style.width = `${pct}%`;
    
    // 更新战斗日志
    const logEl = document.getElementById('combat-log');
    logEl.innerHTML += `<p>${msg}</p>`;
    logEl.scrollTop = logEl.scrollHeight;
    
    // 更新背景状态
    updateUI(); // 更新主界面的血量
}

function endCombat(win) {
    const tile = getTile(player.x, player.y);
    
    if (win) {
        log(`战斗胜利！击败了 ${combatState.mob.name}。`);
        // 从场景中移除怪物
        tile.contents.splice(combatState.mobIndex, 1);
        // 掉落奖励
        addItem("肉", 1);
        addItem("金币", Math.floor(Math.random()*5));
    } else {
        log("你逃跑了！");
    }

    combatState.inCombat = false;
    combatState.mob = null;
    document.getElementById('combat-ui').classList.add('hidden');
    document.getElementById('combat-log').innerHTML = ''; // 清空战斗日志
    updateUI();
}

// --- 通用 UI 更新 ---

function updateUI() {
    // 状态栏
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;
    document.getElementById('coord-x').innerText = player.x;
    document.getElementById('coord-y').innerText = player.y;
    
    const tile = getTile(player.x, player.y);
    document.getElementById('biome-name').innerText = BIOMES[tile.type].name;
    document.getElementById('biome-name').style.color = getComputedStyle(document.body).getPropertyValue('--accent'); // 简单的颜色处理

    // 渲染地图 (保持之前的逻辑)
    renderMap();

    // **渲染场景交互区 (关键)**
    const sceneGrid = document.getElementById('scene-grid');
    sceneGrid.innerHTML = '';
    
    if (tile.contents.length === 0) {
        sceneGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#999;font-size:12px;">这片区域空空荡荡...<br>(点击下方“搜寻”试试)</div>';
    } else {
        tile.contents.forEach((item, index) => {
            const btn = document.createElement('div');
            // 根据类型添加样式
            btn.className = `scene-card ${item.type === 'mob' ? 'mob' : 'resource'}`;
            
            // 图标映射
            let icon = item.type === 'mob' ? '👾' : '🌲';
            if(item.name.includes('石')) icon = '🪨';
            if(item.name.includes('草')) icon = '🌿';
            if(item.name.includes('尸') || item.name.includes('骷髅')) icon = '☠️';

            // 按钮内容
            let html = `<div class="card-icon">${icon}</div><div>${item.name}</div>`;
            if (item.type === 'res') {
                html += `<div class="card-hp">x${item.count}</div>`;
            } else {
                html += `<div class="card-hp">LV.${Math.floor(item.atk/2)}</div>`;
            }
            
            btn.innerHTML = html;
            btn.onclick = () => interact(index);
            sceneGrid.appendChild(btn);
        });
    }

    // 渲染背包预览
    const invKeys = Object.keys(player.inventory);
    document.getElementById('inv-preview').innerText = invKeys.length > 0 
        ? "背包: " + invKeys.map(k => `${k} x${player.inventory[k]}`).join(', ')
        : "背包: 空";
}

// 地图渲染独立出来方便调用
function renderMap() {
    const mapEl = document.getElementById('grid-map');
    mapEl.innerHTML = '';
    const viewDist = isMapEnlarged ? 6 : 3;
    const gridSize = viewDist * 2 + 1;
    mapEl.style.gridTemplateColumns = `repeat(${gridSize}, 24px)`;
    mapEl.style.gridTemplateRows = `repeat(${gridSize}, 24px)`;

    for (let y = player.y - viewDist; y <= player.y + viewDist; y++) {
        for (let x = player.x - viewDist; x <= player.x + viewDist; x++) {
            const cell = document.createElement('div');
            const t = getTile(x, y);
            if (!t.explored) {
                cell.className = 'cell fog';
            } else {
                cell.className = `cell ${BIOMES[t.type].color} explored`;
                cell.innerText = BIOMES[t.type].name[0];
                if (x===player.x && y===player.y) {
                    cell.classList.add('player');
                    cell.innerText = '我';
                }
            }
            mapEl.appendChild(cell);
        }
    }
}

// 辅助
function passTime() { gameTime = (gameTime + 1) % 24; document.getElementById('time').innerText = gameTime < 12 ? "白天" : "黑夜"; }
function addItem(n, c) { player.inventory[n] = (player.inventory[n]||0) + c; }
function log(m) { 
    const logEl = document.getElementById('game-log'); 
    logEl.innerHTML = `<p>> ${m}</p>` + logEl.innerHTML; 
}
function toggleMapSize() { isMapEnlarged = !isMapEnlarged; updateUI(); }

// 启动
initGame();

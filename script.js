// --- 配置 ---
const BIOMES = {
    PLAINS: { name: "草原", code: "bg-PLAINS", items: ["草丛", "野花", "兔子"], res: ["草丛", "野花"], mobs: ["兔子"] },
    FOREST: { name: "森林", code: "bg-FOREST", items: ["树木", "浆果", "蘑菇", "森林狼"], res: ["树木", "浆果"], mobs: [{name: "森林狼", hp: 30, atk: 8}] },
    DESERT: { name: "沙漠", code: "bg-DESERT", items: ["仙人掌", "枯木", "蝎子"], res: ["仙人掌", "枯木"], mobs: [{name: "蝎子", hp: 25, atk: 12}] },
    MOUNTAIN: { name: "山脉", code: "bg-MOUNTAIN", items: ["石块", "铁矿石", "山羊"], res: ["石块", "铁矿石"], mobs: [{name: "山羊", hp: 40, atk: 6}] },
    GOBI: { name: "戈壁", code: "bg-GOBI", items: ["石块", "沙硕", "巨蜥"], res: ["石块", "沙硕"], mobs: [{name: "巨蜥", hp: 50, atk: 10}] }
};

// --- 游戏状态 ---
let player = { x: 11, y: 3, hp: 100, maxHp: 100, hunger: 100, water: 100, inventory: {} };
let exploredMap = {};
let worldMapContents = {}; // 存储每个坐标的持久化资源和怪物

// 战斗临时状态
let combatState = { inCombat: false, mob: null, mobIndex: -1, mobCoord: null };

// --- 核心工具：地形生成 ---
function getBiomeType(x, y) {
    const val = Math.abs(Math.sin(x * 12.9898 + y * 4.1414));
    if (val < 0.2) return "PLAINS";
    if (val < 0.4) return "FOREST";
    if (val < 0.6) return "GOBI";
    if (val < 0.8) return "MOUNTAIN";
    return "DESERT";
}

function getTileContents(x, y) {
    const key = `${x},${y}`;
    if (worldMapContents[key]) return worldMapContents[key];

    // 第一次进入时生成内容
    const typeKey = getBiomeType(x, y);
    const biome = BIOMES[typeKey];
    const contents = [];
    const count = 3 + Math.floor(Math.random() * 4); // 3-6个物体

    for(let i=0; i<count; i++) {
        const isMob = Math.random() < 0.35; // 35% 几率是怪物
        
        if (isMob && biome.mobs.length > 0) {
            const mobTemplate = biome.mobs[Math.floor(Math.random() * biome.mobs.length)];
            contents.push({
                type: 'mob',
                name: mobTemplate.name,
                hp: mobTemplate.hp,
                maxHp: mobTemplate.hp,
                atk: mobTemplate.atk,
                id: Date.now() + Math.random() // 唯一ID
            });
        } else if (biome.res.length > 0) {
            const resName = biome.res[Math.floor(Math.random() * biome.res.length)];
            contents.push({
                type: 'res',
                name: resName,
                count: Math.floor(Math.random() * 5) + 3, // 3-7个资源
                id: Date.now() + Math.random()
            });
        }
    }

    worldMapContents[key] = contents;
    return contents;
}

// --- 移动逻辑 ---
function move(dx, dy) {
    if (combatState.inCombat || player.hp <= 0) return;
    
    player.x += dx;
    player.y += dy;
    player.hunger -= 1;
    player.water -= 1;
    
    refreshLocation();
    log(`向${dx === 1 ? '东' : dx === -1 ? '西' : dy === 1 ? '南' : '北'}移动，坐标 [${player.x}, ${player.y}]`);
}

// --- 刷新所有界面 ---
function refreshLocation() {
    // 1. 记录当前坐标及周围已探索
    const currentKey = `${player.x},${player.y}`;
    exploredMap[currentKey] = true;
    exploredMap[`${player.x+1},${player.y}`] = true;
    exploredMap[`${player.x-1},${player.y}`] = true;
    exploredMap[`${player.x},${player.y+1}`] = true;
    exploredMap[`${player.x},${player.y-1}`] = true;

    // 2. 获取地形和物品
    const typeKey = getBiomeType(player.x, player.y);
    const biome = BIOMES[typeKey];
    const items = getTileContents(player.x, player.y);

    // 3. 更新顶部UI
    document.getElementById('loc-name').innerText = biome.name;
    document.getElementById('coord').innerText = `${player.x},${player.y}`;
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;

    // 4. 渲染主画面：网格地图
    renderBigMap(); 

    // 5. 渲染交互详情区：资源/怪物按钮
    renderScene(items);
}

// 渲染主画面：网格地图
function renderBigMap() {
    const mapEl = document.getElementById('big-grid');
    mapEl.innerHTML = '';
    
    const range = 4; // 9x9 视野
    
    for (let y = player.y - range; y <= player.y + range; y++) {
        for (let x = player.x - range; x <= player.x + range; x++) {
            const cell = document.createElement('div');
            const key = `${x},${y}`;
            
            if (exploredMap[key]) {
                const type = getBiomeType(x, y);
                cell.className = `map-cell ${BIOMES[type].code}`;
                cell.innerText = BIOMES[type].name[0]; // 显示首字
            } else {
                cell.className = 'map-cell fog'; // 迷雾
            }

            if (x === player.x && y === player.y) {
                cell.classList.add('player');
                cell.innerText = "我";
            }
            
            mapEl.appendChild(cell);
        }
    }
}

// 渲染交互详情区
function renderScene(items) {
    const grid = document.getElementById('scene-grid');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = '<div style="color:#999;font-size:12px;padding:5px;">当前区域没有发现任何可交互目标。</div>';
    }
    
    items.forEach((item, index) => {
        const btn = document.createElement('div');
        btn.className = `grid-btn ${item.type}`; 
        
        let valText;
        if (item.type === 'res') {
            valText = `(${item.count})`;
        } else {
            valText = `(LV${Math.floor(item.atk/2)})`;
        }
        btn.innerText = item.name + valText;
        
        btn.onclick = () => interact(item, index, player.x, player.y);
        
        grid.appendChild(btn);
    });
}

// --- 交互系统 ---
function interact(item, index, x, y) {
    if (item.type === 'res') {
        // 采集逻辑
        addItem(item.name, item.count);
        log(`采集了 ${item.name} x${item.count}。`);
        // 从持久化数据中移除资源
        const key = `${x},${y}`;
        worldMapContents[key].splice(index, 1);
        
        // 刷新 UI
        refreshLocation(); 
    } else if (item.type === 'mob') {
        // 战斗逻辑
        startCombat(item, index, x, y);
    }
}

function search() {
    log("你在周围探索了一番，发现了一些新的小东西...");
    player.hunger -= 2;
    // 强制增加一些随机资源
    const key = `${player.x},${player.y}`;
    const biome = BIOMES[getBiomeType(player.x, player.y)];
    if(biome.res.length > 0) {
        const resName = biome.res[Math.floor(Math.random() * biome.res.length)];
        worldMapContents[key].push({type: 'res', name: resName, count: Math.floor(Math.random() * 3) + 1, id: Date.now() + Math.random()});
    }

    refreshLocation(); 
}

// --- 战斗系统 (简化) ---
function startCombat(mobData, index, x, y) {
    combatState = { inCombat: true, mob: mobData, mobIndex: index, mobCoord: `${x},${y}` };
    document.getElementById('combat-ui').classList.remove('hidden');
    // ... 战斗初始化和循环逻辑需要在这里实现 ...
    log(`进入战斗：遭遇 ${mobData.name}！`);
    
    // 简单地模拟战斗结束
    setTimeout(() => {
        endCombat(true); // 假设胜利
    }, 1500); 
}

function endCombat(win) {
    document.getElementById('combat-ui').classList.add('hidden');
    
    if (win) {
        log(`战斗胜利！击败了 ${combatState.mob.name}。`);
        // 从持久化数据中移除怪物
        worldMapContents[combatState.mobCoord].splice(combatState.mobIndex, 1);
    } else {
        log("你逃跑了。");
    }
    
    combatState.inCombat = false;
    refreshLocation();
}

// --- 辅助功能 ---
function addItem(n, c) { player.inventory[n] = (player.inventory[n]||0) + c; }
function log(msg) { 
    const el = document.getElementById('game-log');
    const p = document.createElement('p');
    p.innerText = "> " + msg;
    el.prepend(p);
}

// 启动
init();

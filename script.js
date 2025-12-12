// --- 配置 ---
const BIOMES = {
    // 基础地形（已存在的）
    PLAINS: { 
        name: "草原", code: "bg-PLAINS", 
        res: ["花", "草", "橡木"], 
        mobs: [{name: "兔子", type: "Peaceful"}, {name: "牛", type: "Peaceful"}, {name: "僵尸", type: "Hostile"}] 
    },
    FOREST: { 
        name: "森林", code: "bg-FOREST", 
        res: ["橡木", "桦木", "浆果"], 
        mobs: [{name: "狼", type: "Peaceful"}, {name: "蜘蛛", type: "Hostile"}, {name: "骷髅", type: "Hostile"}] 
    },
    DESERT: { 
        name: "沙漠", code: "bg-DESERT", 
        res: ["沙子", "仙人掌", "枯木"], 
        mobs: [{name: "沙虫", type: "Hostile"}, {name: "僵尸", type: "Hostile"}] 
    },
    MOUNTAIN: { 
        name: "山脉", code: "bg-MOUNTAIN", 
        res: ["圆石", "煤矿石", "铁矿石"], 
        mobs: [{name: "山羊", type: "Peaceful"}, {name: "爬行者", type: "Hostile"}] 
    },
    GOBI: { 
        name: "戈壁", code: "bg-GOBI", 
        res: ["泥土", "砾石", "石英"], 
        mobs: [{name: "巨蜥", type: "Hostile"}, {name: "流浪者", type: "Hostile"}] 
    },
    
    // Minecraft 新增地形
    SNOWY: { 
        name: "雪原", code: "bg-SNOWY", 
        res: ["雪块", "云杉木", "冰块"], 
        mobs: [{name: "北极熊", type: "Peaceful"}, {name: "雪傀儡", type: "Peaceful"}, {name: "流浪者", type: "Hostile"}] 
    },
    SWAMP: { 
        name: "沼泽", code: "bg-SWAMP", 
        res: ["粘土", "睡莲", "黑橡木"], 
        mobs: [{name: "史莱姆", type: "Hostile"}, {name: "女巫", type: "Hostile"}] 
    },
    OCEAN: { 
        name: "海洋", code: "bg-OCEAN", 
        res: ["水", "海草", "粘土"], 
        mobs: [{name: "海龟", type: "Peaceful"}, {name: "守卫者", type: "Hostile"}] 
    },
    MESA: { 
        name: "黏土山", code: "bg-MESA", 
        res: ["染色陶瓦", "红沙"], 
        mobs: [{name: "羊", type: "Peaceful"}, {name: "骷髅", type: "Hostile"}] 
    }
};

let exploredMap = {}; 
let player = { x: 11, y: 3, hp: 100, hunger: 100, water: 100 };
let currentSceneItems = []; 


// --- 核心工具：地形生成 (getBiomeType 需要更新以包含新地形) ---
function getBiomeType(x, y) {
    // 简单的伪随机，保证固定坐标地形不变
    const hash = Math.abs(Math.sin(x * 12.9898 + y * 4.1414)) * 1000;
    
    // 划分范围以包含所有 9 种地形
    if (hash < 110) return "PLAINS";
    if (hash < 220) return "FOREST";
    if (hash < 330) return "GOBI";
    if (hash < 440) return "MOUNTAIN";
    if (hash < 550) return "DESERT";
    if (hash < 660) return "SNOWY"; // 新增
    if (hash < 770) return "SWAMP"; // 新增
    if (hash < 880) return "OCEAN"; // 新增
    return "MESA";                 // 新增 (剩余范围)
}

function getBiome(x, y) {
    return getBiomeType(x, y);
}


// 新增：地图探索状态
let exploredMap = {}; 
let player = { x: 11, y: 3, hp: 100, hunger: 100, water: 100 };
let currentSceneItems = [];

// --- 核心工具：地形生成 (使用更复杂的伪随机) ---
function getBiomeType(x, y) {
    const hash = Math.abs(Math.sin(x * 12.9898 + y * 4.1414)) * 1000;
    if (hash < 200) return "PLAINS";
    if (hash < 400) return "FOREST";
    if (hash < 550) return "GOBI";
    if (hash < 700) return "MOUNTAIN";
    if (hash < 850) return "DESERT";
    if (hash < 900) return "RIVER";
    return "LAKE"; // 稀有地形
}

// 确保原始的 getBiome 函数被 getBiomeType 替换
function getBiome(x, y) {
    return getBiomeType(x, y);
}


// --- 初始化 ---
function init() {
    refreshLocation();
    log("游戏已加载，当前位于扩展难度。");
}

// --- 移动逻辑 ---
function move(dx, dy) {
    player.x += dx;
    player.y += dy;
    
    // 消耗
    player.hunger -= 1;
    player.water -= 1;
    
    refreshLocation();
    log(`移动到了 [${player.x}, ${player.y}]`);
}

// --- 刷新所有界面 (新增地图探索逻辑) ---
function refreshLocation() {
    // 1. 记录当前坐标及周围已探索
    const currentKey = `${player.x},${player.y}`;
    exploredMap[currentKey] = true;
    // 简单的视野机制：周围一圈也被点亮
    exploredMap[`${player.x+1},${player.y}`] = true;
    exploredMap[`${player.x-1},${player.y}`] = true;
    exploredMap[`${player.x},${player.y+1}`] = true;
    exploredMap[`${player.x},${player.y-1}`] = true;

    // 2. 更新顶部信息
    const type = getBiome(player.x, player.y);
    const biome = BIOMES[type];
    document.getElementById('loc-name').innerText = biome.name;
    document.getElementById('coord').innerText = `${player.x},${player.y}`;
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;
    document.getElementById('water').innerText = player.water;

    // 3. 生成并渲染中间的资源按钮
    generateItems(biome);
    renderScene();

    // 4. 更新左下角十字微型地图
    updateMiniMap();
    
    // 5. 如果地图弹窗打开，刷新它
    if (!document.getElementById('map-modal').classList.contains('hidden')) {
        renderBigMap();
    }
}


// 生成当前格子的物品 (使用新的 res 和 mobs 列表)
function generateItems(biome) {
    currentSceneItems = [];
    
    // 合并资源和生物列表
    const possibleItems = [
        ...biome.res.map(name => ({ name: name, type: 'res' })), 
        ...biome.mobs.map(mob => ({ name: mob.name, type: 'mob', mobType: mob.type }))
    ];

    const count = 8 + Math.floor(Math.random() * 5); // 8-12个物品
    
    for(let i=0; i<count; i++) {
        const itemTemplate = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        
        let item = { 
            name: itemTemplate.name,
            type: itemTemplate.type 
        };
        
        if (item.type === 'res') {
            item.count = Math.floor(Math.random() * 10) + 3; // 3-12个资源
        } else { // mob
            // 假设敌对生物等级更高
            const levelBase = itemTemplate.mobType === 'Hostile' ? 5 : 1; 
            item.count = `LV${levelBase + Math.floor(Math.random() * 5)}`; // LV1-LV10
        }
        
        currentSceneItems.push(item);
    }
}

// 渲染中间的按钮网格
function renderScene() {
    const grid = document.getElementById('scene-grid');
    grid.innerHTML = '';
    
    currentSceneItems.forEach(item => {
        const btn = document.createElement('div');
        // 根据类型添加样式 (怪物是红色)
        btn.className = `grid-btn ${item.type}`; 
        
        // 格式: 名字(数量/等级) -> 草丛(3) 或 蝎子(LV5)
        let countText = item.type === 'res' ? `(${item.count})` : `(${item.count})`;
        btn.innerText = item.name + countText;
        
        btn.onclick = () => {
            if(item.type === 'mob') log(`你攻击了 ${item.name}！(战斗系统待开发)`);
            else log(`你采集了 ${item.name} x${item.count}`);
            btn.style.opacity = "0.5"; // 点击后变灰示意
        };
        
        grid.appendChild(btn);
    });
}

// **关键：更新左下角十字地图**
function updateMiniMap() {
    // 获取四周的地形名字
    const n = BIOMES[getBiome(player.x, player.y - 1)].name;
    const s = BIOMES[getBiome(player.x, player.y + 1)].name;
    const w = BIOMES[getBiome(player.x - 1, player.y)].name;
    const e = BIOMES[getBiome(player.x + 1, player.y)].name;
    const c = BIOMES[getBiome(player.x, player.y)].name;

    document.getElementById('dir-n').innerText = n;
    document.getElementById('dir-s').innerText = s;
    document.getElementById('dir-w').innerText = w;
    document.getElementById('dir-e').innerText = e;
    document.getElementById('dir-c').innerText = c;
}

function search() {
    log("你在周围探索了一番，发现了新的资源...");
    player.hunger -= 2;
    refreshLocation(); // 重新生成资源
}

function log(msg) {
    const el = document.getElementById('game-log');
    const p = document.createElement('p');
    p.innerText = "> " + msg;
    el.prepend(p);
}

// --- 地图功能 (全屏弹窗) ---

function openMap() {
    document.getElementById('map-modal').classList.remove('hidden');
    renderBigMap();
    log("打开了全屏地图。");
}

function closeMap() {
    document.getElementById('map-modal').classList.add('hidden');
    log("关闭了全屏地图。");
}

// ... (函数开头不变) ...

function renderBigMap() {
    const mapEl = document.getElementById('big-grid');
    if (!mapEl) return;
    mapEl.innerHTML = '';
    
    const range = 4; // 9x9 视野
    
    for (let y = player.y - range; y <= player.y + range; y++) {
        for (let x = player.x - range; x <= player.x + range; x++) {
            const cell = document.createElement('div');
            const key = `${x},${y}`;
            
            if (exploredMap[key]) {
                const type = getBiome(x, y);
                cell.className = `map-cell ${BIOMES[type].code}`;
                
                // *** 核心修改：确保显示至少两个字 ***
                let name = BIOMES[type].name;
                // 如果地形名只有一个字，我们至少显示前两个字 (这里我们假设所有地形名都至少有两个字，如果不是，需要截取)
                cell.innerText = name.substring(0, 2); 
            } else {
                cell.className = 'map-cell fog'; // 迷雾
                cell.innerText = '';
            }

            if (x === player.x && y === player.y) {
                cell.classList.add('player');
                // 玩家所在格，显示完整的两个字地形名
                cell.innerText = BIOMES[getBiome(x, y)].name.substring(0, 2); 
            }
            
            mapEl.appendChild(cell);
        }
    }
}


// 启动
init();

// --- 配置 ---
const BIOMES = {
    PLAINS: { name: "草原", code: "bg-PLAINS", items: ["草丛", "野花", "兔子"] },
    FOREST: { name: "森林", code: "bg-FOREST", items: ["树木", "浆果", "蘑菇", "森林狼"] },
    DESERT: { name: "沙漠", code: "bg-DESERT", items: ["仙人掌", "枯木", "蝎子"] },
    MOUNTAIN: { name: "山脉", code: "bg-MOUNTAIN", items: ["石块", "铁矿石", "山羊"] },
    GOBI: { name: "戈壁", code: "bg-GOBI", items: ["石块", "沙硕", "巨蜥"] },
    RIVER: { name: "河流", code: "bg-RIVER", items: ["水", "鱼", "芦苇"] }, // 新增
    LAKE: { name: "湖泊", code: "bg-LAKE", items: ["清水", "水草"] }, // 新增
};

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


// 生成当前格子的物品
function generateItems(biome) {
    currentSceneItems = [];
    const count = 8 + Math.floor(Math.random() * 5); // 8-12个物品
    
    for(let i=0; i<count; i++) {
        const itemBase = biome.items[Math.floor(Math.random() * biome.items.length)];
        const isMob = ["狼", "蝎子", "巨蜥", "山羊"].some(k => itemBase.includes(k));
        
        currentSceneItems.push({
            name: itemBase,
            count: isMob ? `LV${Math.floor(Math.random()*10)+1}` : Math.floor(Math.random()*10)+1,
            type: isMob ? 'mob' : 'res'
        });
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

// 启动
init();

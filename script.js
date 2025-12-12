// --- 配置 ---
const BIOMES = {
    PLAINS: { name: "草原", code: "bg-PLAINS", items: ["草丛", "野花", "兔子"] },
    FOREST: { name: "森林", code: "bg-FOREST", items: ["树木", "浆果", "蘑菇", "森林狼"] },
    DESERT: { name: "沙漠", code: "bg-DESERT", items: ["仙人掌", "枯木", "蝎子"] },
    MOUNTAIN: { name: "山脉", code: "bg-MOUNTAIN", items: ["石块", "铁矿石", "山羊"] },
    GOBI: { name: "戈壁", code: "bg-GOBI", items: ["石块", "沙硕", "巨蜥"] }
};

let player = { x: 11, y: 3, hp: 100, hunger: 100, water: 100 };
let currentSceneItems = []; 
let exploredMap = {}; // 记录已探索坐标 "x,y": true

// --- 核心工具：地形生成 ---
// 使用确定的数学算法，确保同一个坐标永远是同一个地形
function getBiomeType(x, y) {
    const val = Math.abs(Math.sin(x * 12.9898 + y * 4.1414));
    if (val < 0.2) return "PLAINS";
    if (val < 0.4) return "FOREST";
    if (val < 0.6) return "GOBI";
    if (val < 0.8) return "MOUNTAIN";
    return "DESERT";
}

// --- 初始化 ---
function init() {
    refreshLocation();
    log("游戏已加载。点击右上角[小地图]查看全貌。");
}

// --- 移动逻辑 ---
function move(dx, dy) {
    player.x += dx;
    player.y += dy;
    player.hunger -= 1;
    player.water -= 1;
    
    refreshLocation();
    log(`移动到了 [${player.x}, ${player.y}]`);
}

// --- 刷新逻辑 ---
function refreshLocation() {
    // 1. 记录当前坐标已探索
    exploredMap[`${player.x},${player.y}`] = true;
    // 简单的视野机制：周围一圈也被点亮
    exploredMap[`${player.x+1},${player.y}`] = true;
    exploredMap[`${player.x-1},${player.y}`] = true;
    exploredMap[`${player.x},${player.y+1}`] = true;
    exploredMap[`${player.x},${player.y-1}`] = true;

    // 2. 获取地形信息
    const typeKey = getBiomeType(player.x, player.y);
    const biome = BIOMES[typeKey];

    // 3. 更新顶部UI
    document.getElementById('loc-name').innerText = biome.name;
    document.getElementById('coord').innerText = `${player.x},${player.y}`;
    document.getElementById('hp').innerText = player.hp;
    document.getElementById('hunger').innerText = player.hunger;

    // 4. 生成中间的资源按钮
    generateItems(biome);
    renderScene();

    // 5. 更新左下角导航文字
    updateMiniPad();
    
    // 6. 如果地图开着，实时刷新地图
    if (!document.getElementById('map-modal').classList.contains('hidden')) {
        renderBigMap();
    }
}

// 生成物品
function generateItems(biome) {
    currentSceneItems = [];
    const count = 6 + Math.floor(Math.random() * 6);
    for(let i=0; i<count; i++) {
        const itemBase = biome.items[Math.floor(Math.random() * biome.items.length)];
        const isMob = ["狼", "蝎子", "巨蜥", "山羊", "兔子"].some(k => itemBase.includes(k));
        currentSceneItems.push({
            name: itemBase,
            val: Math.floor(Math.random()*10)+1,
            type: isMob ? 'mob' : 'res'
        });
    }
}

// 渲染中间按钮
function renderScene() {
    const grid = document.getElementById('scene-grid');
    grid.innerHTML = '';
    currentSceneItems.forEach(item => {
        const btn = document.createElement('div');
        btn.className = `grid-btn ${item.type}`; 
        // 模仿截图：资源显示数量，生物显示等级
        let valText = item.type === 'res' ? `(${item.val})` : `(LV${item.val})`;
        btn.innerText = item.name + valText;
        btn.onclick = () => {
            log(`交互: ${item.name}`);
            btn.style.opacity = "0.4"; 
        };
        grid.appendChild(btn);
    });
}

// 更新左下角十字导航文字
function updateMiniPad() {
    const dirs = [
        {id: 'dir-n', x:0, y:-1},
        {id: 'dir-s', x:0, y:1},
        {id: 'dir-w', x:-1, y:0},
        {id: 'dir-e', x:1, y:0},
        {id: 'dir-c', x:0, y:0}
    ];
    
    dirs.forEach(d => {
        const type = getBiomeType(player.x + d.x, player.y + d.y);
        document.getElementById(d.id).innerText = BIOMES[type].name;
    });
}

// --- 地图功能 (核心更新) ---

function openMap() {
    document.getElementById('map-modal').classList.remove('hidden');
    renderBigMap();
}

function closeMap() {
    document.getElementById('map-modal').classList.add('hidden');
}

function renderBigMap() {
    const mapEl = document.getElementById('big-grid');
    mapEl.innerHTML = '';
    
    // 渲染 9x9 视野
    const range = 4; // 中心向外扩4格
    
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

// 搜索功能
function search() {
    log("搜索周围...");
    refreshLocation();
}

// 日志
function log(msg) {
    const el = document.getElementById('game-log');
    const p = document.createElement('p');
    p.innerText = "> " + msg;
    el.prepend(p);
}

init();

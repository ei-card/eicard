const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');

let allData = []; // This will hold EVERYTHING
let filteredData = []; // This holds what is currently visible

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

// 1. Initial Load: Fetch all files once
async function initializeApp() {
    grid.innerHTML = "<p class='loading'>データを読み込み中...</p>";
    
    const categories = ['menu', 'sign', 'pay', 'hotel'];
    try {
        // Fetch all files in parallel
        const fetchPromises = categories.map(cat => 
            fetch(`./data/${cat}.json`).then(res => res.json())
        );
        
        const results = await Promise.all(fetchPromises);
        allData = results.flat(); // Flatten the arrays into one
        
        displayTranslations(); // Initial display (Random 10)
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p style="color:red; padding:20px;">エラー: データの読み込みに失敗しました。/data/ フォルダを確認してください。</p>`;
    }
}

// 2. Display Logic
function displayTranslations(categoryFilter = "All") {
    const term = searchInput.value.toLowerCase();
    const katakanaTerm = toKatakana(term);
    
    grid.innerHTML = "";

    // Step A: Filter by Search Term (Global Search)
    let results = allData.filter(item => {
        const searchPool = (item.jp + item.en + (item.keywords || "")).toLowerCase();
        const searchPoolKatakana = toKatakana(searchPool);
        return searchPool.includes(term) || searchPoolKatakana.includes(katakanaTerm);
    });

    // Step B: Filter by Category (if not "All")
    if (categoryFilter !== "All") {
        results = results.filter(item => item.tag === categoryFilter);
    }

    // Step C: If no search term, pick 10 random items from the current results
    if (term === "" && results.length > 10) {
        results = results.sort(() => 0.5 - Math.random()).slice(0, 10);
    }

    if (results.length === 0) {
        grid.innerHTML = "<p class='no-results'>見つかりませんでした。別の言葉で試してください！</p>";
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-top">
                <h3>${item.jp}</h3>
                <div class="card-btns">
                    <button class="print-btn" onclick="printPhrase('${item.jp}', '${item.en}')">印刷</button>
                    <button class="copy-btn" data-text="${item.en}">コピー</button>
                </div>
            </div>
            <div class="en-text">${item.en}</div>
            <div class="context">${item.context}</div>
        `;
        grid.appendChild(card);
    });
}

// 3. Event Listeners
let currentActiveCategory = "All";

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentActiveCategory = btn.getAttribute('data-tag');
        // Clear active class from others
        document.querySelectorAll('.filter-btn').forEach(b => b.style.opacity = "0.6");
        btn.style.opacity = "1";
        
        displayTranslations(currentActiveCategory);
    });
});

let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        displayTranslations(currentActiveCategory);
    }, 300); 
});

// Print and Theme Logic remains same
window.printPhrase = (jp, en) => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}.box{border:2px solid #3498db;padding:40px;border-radius:15px;text-align:center;width:80%;position:relative;}.jp{font-size:18px;color:#7f8c8d;margin-bottom:8px;}.en{font-size:32px;color:#2c3e50;font-weight:bold;}.mark{margin-top:30px;color:#bdc3c7;font-size:10px;letter-spacing:1px;text-transform:uppercase;}</style></head><body><div class="box"><div class="jp">${jp}</div><div class="en">${en}</div><div class="mark">英換 Ei-Kan Project</div></div><script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
};

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
});

// Start the app
initializeApp();
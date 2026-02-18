const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');

let allData = []; 
let currentActiveCategory = "All";

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

// 1. Initial Load: Fetch all files once for Global Search
async function initializeApp() {
    grid.innerHTML = "<p class='loading'>データを読み込み中...</p>";
    
    // Make sure these match your filenames in the /data/ folder
    const categories = ['menu', 'sign', 'pay', 'hotel','admin'];
    try {
        const fetchPromises = categories.map(cat => 
            fetch(`./data/${cat}.json`).then(res => res.json())
        );
        
        const results = await Promise.all(fetchPromises);
        allData = results.flat(); 
        
        displayTranslations(); 
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p style="color:red; padding:20px;">エラー: /data/ フォルダ内のJSONファイルを読み込めませんでした。</p>`;
    }
}

// 2. Display Logic
function displayTranslations(categoryFilter = "All") {
    const term = searchInput.value.toLowerCase();
    const katakanaTerm = toKatakana(term);
    grid.innerHTML = "";

    // Search globally across all text and keywords
    let results = allData.filter(item => {
        const searchPool = (item.jp + item.en + (item.keywords || "")).toLowerCase();
        const searchPoolKatakana = toKatakana(searchPool);
        return searchPool.includes(term) || searchPoolKatakana.includes(katakanaTerm);
    });

    // Filter by category ONLY if we aren't searching
    if (categoryFilter !== "All" && term === "") {
        results = results.filter(item => item.tag === categoryFilter);
    }

    // Show 10 random cards if search is empty
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

grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
        const text = e.target.getAttribute('data-text');
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.innerText;
            e.target.innerText = "OK!";
            e.target.style.background = "#2ecc71";
            e.target.style.color = "white";
            
            setTimeout(() => {
                e.target.innerText = originalText;
                e.target.style.background = ""; 
                e.target.style.color = "";
            }, 1500);
        });
    }
});

// Search input
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => displayTranslations(currentActiveCategory), 300);
});

// Category buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentActiveCategory = btn.getAttribute('data-tag');
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        displayTranslations(currentActiveCategory);
    });
});

// Theme and Print
themeToggle.addEventListener('click', () => body.classList.toggle('dark-mode'));

window.printPhrase = (jp, en) => {
    const win = window.open('', '_blank');
    
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {
                    size: auto;
                    margin: 0; /* Removes browser headers/footers */
                }
                
                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh; /* Changed from height to min-height */
                    margin: 0;
                    padding: 0;
                    overflow: hidden; /* Prevents stray pixels from triggering page 2 */
                }
                
                .box {
                    border: 2px solid #3498db;
                    padding: 40px;
                    border-radius: 15px;
                    text-align: center;
                    width: 85%;
                    max-width: 600px;
                    background: white;
                }

                .jp {
                    font-size: 18px;
                    color: #7f8c8d;
                    margin-bottom: 12px;
                }

                .en {
                    font-size: 36px;
                    color: #2c3e50;
                    font-weight: bold;
                    line-height: 1.2;
                }

                .mark {
                    margin-top: 30px;
                    color: #bdc3c7;
                    font-size: 6px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
            </style>
        </head>
        <body>
            <div class="box">
                <div class="jp">${jp}</div>
                <div class="en">${en}</div>
                <div class="mark">英換 (Ei-Kan Project)</div>
            </div>
            <script>
                // We use a small delay to ensure the DOM is painted 
                // and the "about:blank" title is ready to be bypassed
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 300);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
};

// Start
initializeApp();
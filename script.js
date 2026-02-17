const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');
let translations = [];

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

async function loadData(category = "All") {
    grid.innerHTML = "<p class='loading'>読み込み中...</p>";
    const path = (category === "All") ? './data.json' : `./data/${category.toLowerCase()}.json`;
    try {
        const response = await fetch(path);
        translations = await response.json();
        displayTranslations();
    } catch (e) {
        grid.innerHTML = `<p style="color:red; padding:20px;">Error: Could not load ${category}</p>`;
    }
}

function displayTranslations() {
    const term = searchInput.value.toLowerCase();
    const katakanaTerm = toKatakana(term); // Normalized search term
    
    grid.innerHTML = "";
    
    const filtered = translations.filter(item => {
        // Combine JP, EN, and AI-generated keywords into one searchable string
        const searchPool = (item.jp + item.en + (item.keywords || "")).toLowerCase();
        const searchPoolKatakana = toKatakana(searchPool);
        
        return searchPool.includes(term) || searchPoolKatakana.includes(katakanaTerm);
    });

    if (filtered.length === 0) {
        grid.innerHTML = "<p class='no-results'>見つかりませんでした。</p>";
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-top">
                <h3>${item.jp}</h3>
                <div class="card-btns">
                    <button class="print-btn" onclick="printPhrase('${item.jp}', '${item.en}')">🖨️ Print</button>
                    <button class="copy-btn" data-text="${item.en}">📋 Copy</button>
                </div>
            </div>
            <div class="en-text">${item.en}</div>
            <div class="context">${item.context}</div>
        `;
        grid.appendChild(card);
    });
}

// Branded Print Function
window.printPhrase = (jp, en) => {
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .box { border: 2px solid #3498db; padding: 40px; border-radius: 15px; text-align: center; width: 80%; position: relative; }
                .jp { font-size: 18px; color: #7f8c8d; margin-bottom: 8px; }
                .en { font-size: 32px; color: #2c3e50; font-weight: bold; }
                /* SMALLER MARK */
                .mark { 
                    margin-top: 30px; 
                    color: #bdc3c7; 
                    font-size: 8px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }
            </style>
        </head>
        <body>
            <div class="box">
                <div class="jp">${jp}</div>
                <div class="en">${en}</div>
                <div class="mark">英換 Ei-Kan Project</div>
            </div>
            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
        </html>
    `);
};

// Theme Toggle
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Category Filtering (Switching between different JSON files)
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        searchInput.value = ""; // Clear search when switching
        loadData(tag);          // This calls the fetch logic for the specific file
    });
});

// Debounced Search (Waits 300ms after typing stops)
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        displayTranslations();
    }, 300); 
});

// Copy logic (Event Delegation)
grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
        const text = e.target.getAttribute('data-text');
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.innerText;
            e.target.innerText = "✅ OK!";
            setTimeout(() => e.target.innerText = originalText, 1500);
        });
    }
});

// Initial Load
loadData("All");
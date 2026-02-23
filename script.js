const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');

let allData = []; 
let currentActiveCategory = "All";

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

async function initializeApp() {
    let searchTimeout;
    grid.innerHTML = "<p class='loading'>データを読み込み中...</p>";
    const categories = ['menu', 'sign', 'pay', 'hotel', 'admin'];
    try {
        const fetchPromises = categories.map(cat => 
            fetch(`./data/${cat}.json`).then(res => res.json())
        );
        const results = await Promise.all(fetchPromises);
        allData = results.flat(); 
        displayTranslations(); 

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                displayTranslations(currentActiveCategory);
            }, 150);
        });
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {

                if (btn.classList.contains('active')) return;

                document.querySelectorAll('.filter-btn')
                    .forEach(b => b.classList.remove('active'));

                btn.classList.add('active');

                currentActiveCategory = btn.getAttribute('data-tag');

                searchInput.value = ""; // reset search when switching mode
                displayTranslations(currentActiveCategory);
            });
        });

        // Set "All" as active by default after loading
        document.querySelector('[data-tag="All"]').classList.add('active');
    } catch (e) {
        grid.innerHTML = `<p style="color:red; padding:20px;">エラー: データを読み込めませんでした。</p>`;
    }
}

function displayTranslations(categoryFilter = "All") {

    const term = searchInput.value.toLowerCase();
    const katakanaTerm = toKatakana(term);
    grid.innerHTML = "";

    const isSearching = term.length > 0;

    const filtered = allData
        .filter(item => {

            const matchesCategory =
                isSearching ? true :
                (categoryFilter === "All" || item.tag === categoryFilter);

            const matchesSearch =
                item.jp.toLowerCase().includes(term) ||
                item.en.toLowerCase().includes(term) ||
                (item.keywords && item.keywords.toLowerCase().includes(term)) ||
                toKatakana(item.jp).includes(katakanaTerm);

            return matchesCategory && matchesSearch;
        })
        .sort((a, b) => a.en.localeCompare(b.en));

    if (isSearching) {
    document.querySelectorAll('.filter-btn')
        .forEach(b => b.classList.remove('active'));

    const allBtn = document.querySelector('[data-tag="All"]');
    if (allBtn) allBtn.classList.add('active');

    currentActiveCategory = "All";
    }

    if (filtered.length === 0) {

        const message = isSearching
            ? `「${term}」に一致するフレーズが見つかりません。`
            : `該当するフレーズが見つかりません。`;

        grid.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
                <p style="color: var(--text-sub); font-size: 0.9rem;">
                    別のキーワードをお試しください。
                </p>
            </div>
        `;
        resultInfo.textContent = "";
        return;
    }

    const limited = filtered.slice(0, 8);
    
    limited.forEach(item => {
        const reportSummary = `${item.jp}\n${item.en}${item.context ? `\n${item.context}` : ''}`;
        const reportUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfpbhutXoLYXMmI6aKyk0huRF_zpWxHVUwzdPWBwE8Q79xeIQ/viewform?usp=dialog&entry.1588045473=${encodeURIComponent(reportSummary)}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('.menu-container')) {
                openFullscreen(item.jp, item.en);
            }
        };
        card.innerHTML = `
            <div class="card-header-row">
                <div class="jp-text">${item.jp}</div>
                <div class="menu-container">
                    <button class="menu-btn" onclick="toggleMenu(event)">⋮</button>
                    <div class="menu-content">
                        <a href="#" onclick="handleDownload('${item.jp}', '${item.en}')">画像を保存</a>
                        <a href="#" onclick="handlePrint('${item.jp}', '${item.en}')">印刷</a>
                        <div class ="report-item"><a href="${reportUrl}" target="_blank">報告</a></div>
                    </div>
                </div>
            </div>
            <div class="en-text">${item.en}</div>
                ${item.context ? `<p class="context-text">${item.context}</p>` : ''}
                <button class="copy-btn" onclick="handleCopy(this, '${item.en}')">コピー</button>
        `;
        grid.appendChild(card);
    });
}

window.toggleMenu = (e) => {
    e.stopPropagation();
    const menu = e.target.nextElementSibling;
    document.querySelectorAll('.menu-content').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
};

// 1. Fullscreen with Dynamic Font Scaling
window.openFullscreen = (jp, en) => {
    const fs = document.getElementById('fullscreenOverlay');
    const jpEl = document.getElementById('fs-jp');
    const enEl = document.getElementById('fs-en');
    
    jpEl.innerText = jp;
    enEl.innerText = en;

    // Adaptive sizing: shorter text is bigger, longer text shrinks
    const jpSize = jp.length > 10 ? 8 : 12; // vmin
    const enSize = en.length > 10 ? 8 : 12;  // vmin
    
    jpEl.style.fontSize = `${jpSize}vmin`;
    enEl.style.fontSize = `${enSize}vmin`;

    fs.style.display = 'flex';
};

window.closeFullscreen = () => {
    document.getElementById('fullscreenOverlay').style.display = 'none';
};

// 2. The Unified A4 Visual Template
const getUnifiedA4HTML = (jp, en) => `
    <div id="a4-template" style="
        width: 297mm; height: 210mm; 
        background: white;
        display: flex; 
        flex-direction: column; 
        justify-content: center;
        align-items: center; 
        text-align: center; 
        padding: 20mm;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans JP', 'Hiragino Sans', sans-serif;
    ">
        <div style="
            background: rgba(255, 255, 255, 0.95);
            padding: 40px 30px;
            border-radius: 20px;
            text-align: center;
            width: 100%;
        ">
           <div style="font-size: 28pt; font-weight: 600; color: #1a2a3a; margin-bottom: 10px;">
                ${jp}
            </div>
            <div style="font-size: 56pt; font-weight: 700; color: #1a2a3a; margin-bottom: 10px; line-height: 1.15;">
                ${en}
            </div>
            <div style="
                border-top: 2px solid #f1f2f6;
                padding-top: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
            ">
                <span style="
                    font-size: 10pt; 
                    color: #bdc3c7; 
                    font-weight: bold; 
                    letter-spacing: 2px;
                    text-transform: uppercase;
                ">英換 - EIKAN PROJECT</span>
        </div>
    </div>
`;

// 3. Unified Print/Download Actions
window.handlePrint = (jp, en) => {
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
            <head>
                <style>
                    * { box-sizing: border-box; }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                    }
                    @page { 
                        size: A4 landscape;
                        margin: 0; 
                    }
                    .a4-container {
                        width: 100vw;
                        height: 100vh;
                        page-break-after: avoid;
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>${getUnifiedA4HTML(jp, en)}</body>
        </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
};

window.handleDownload = async (jp, en) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getUnifiedA4HTML(jp, en);
    document.body.appendChild(container);

    const canvas = await html2canvas(
        container.querySelector('#a4-template'),
        { scale: 2, useCORS: true }
    );

    document.body.removeChild(container);

    canvas.toBlob(async (blob) => {

        const file = new File([blob], `Eikan_${jp}.png`, { type: 'image/png' });

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Eikan Image'
                });
                return;
            } catch (err) {
                console.log("Share cancelled");
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Eikan_${jp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    });
};

window.handleCopy = (btn, text) => {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        
        // Visual feedback
        btn.innerText = "OK!";
        btn.classList.add('copied'); // Use CSS class for style if possible
        btn.style.background = "#2ecc71";
        btn.style.color = "white";
        btn.style.borderColor = "#2ecc71";
        btn.style.alignItems = "center";

        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('copied');
            // Reset inline styles
            btn.style.background = "";
            btn.style.color = "";
            btn.style.borderColor = "";
        }, 1500);
    });
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-container')) {
        document.querySelectorAll('.menu-content').forEach(m => m.classList.remove('show'));
    }
});

initializeApp();

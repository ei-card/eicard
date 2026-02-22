const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');

let allData = []; 
let currentActiveCategory = "All";

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

async function initializeApp() {
    grid.innerHTML = "<p class='loading'>データを読み込み中...</p>";
    const categories = ['menu', 'sign', 'pay', 'hotel', 'admin'];
    try {
        const fetchPromises = categories.map(cat => 
            fetch(`./data/${cat}.json`).then(res => res.json())
        );
        const results = await Promise.all(fetchPromises);
        allData = results.flat(); 
        displayTranslations(); 

        searchInput.addEventListener('input', () => displayTranslations(currentActiveCategory));
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 1. Remove 'active' class from all buttons
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                
                // 2. Add 'active' class to the clicked button
                btn.classList.add('active');
                
                // 3. Filter the data
                const tag = btn.getAttribute('data-tag');
                currentActiveCategory = tag;
                displayTranslations(tag);
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

    const filtered = allData.filter(item => {
        const matchesCategory = (categoryFilter === "All" || item.tag === categoryFilter);
        const matchesSearch = 
            item.jp.toLowerCase().includes(term) || 
            item.en.toLowerCase().includes(term) || 
            (item.keywords && item.keywords.toLowerCase().includes(term)) || // Hits
            toKatakana(item.jp).includes(katakanaTerm);
        return matchesCategory && matchesSearch;
    });

        for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        // Limit to 8
        const limited = filtered.slice(0, 12);

    limited.forEach(item => {
        // Prepare Report URL
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
            <div class="card-actions">
                <button class="copy-btn" onclick="handleCopy(this, '${item.en}')">コピー</button>
            </div>
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
        font-family: 'Helvetica Neue', Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
    ">
        <div style="
            background: rgba(255, 255, 255, 0.95);
            padding: 40px 30px;
            border-radius: 20px;
            text-align: center;
            width: 100%;
        ">
            <div style="font-size: 36pt; color: #7f8c8d; margin-bottom: 15px;">${jp}</div>
            <div style="font-size: 70pt; color: #2c3e50; font-weight: 800; line-height: 1.2; margin-bottom: 25px;">${en}</div>
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
                ">英換 EIKAN PROJECT</span>
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
    // Create hidden off-screen renderer
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getUnifiedA4HTML(jp, en);
    document.body.appendChild(container);

    const canvas = await html2canvas(container.querySelector('#a4-template'), {
        scale: 2, // High resolution
        useCORS: true
    });
    document.body.removeChild(container);

    // Smart Save: Use Share API for Mobile, Direct Download for PC
    canvas.toBlob(async (blob) => {
        const file = new File([blob], `Eikan_${jp}.png`, { type: 'image/png' });
        
        // Detect Mobile Share capability
        if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Save to Photos',
                });
            } catch (err) { console.log("Share cancelled"); }
        } else {
            // Standard PC Download
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = `Eikan_${jp}.png`;
            link.click();
        }
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

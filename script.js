const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');
const showMoreBtn = document.getElementById('showMoreBtn');
const showMoreContainer = document.getElementById('showMoreContainer');

let allData = []; 
let currentActiveCategory = "All";
let visibleCount = window.innerWidth < 600 ? 6 : 9;
const LOAD_INCREMENT = 21;
let shuffledAllData = [];
let selectedItems = new Map(); 
let selectionMode = false;

const toKatakana = (str) => {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
};

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

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
        const featured = allData.filter(item => item.featured === true);
        const nonFeatured = allData.filter(item => item.featured !== true);

        shuffledAllData = [
            ...featured,
            ...shuffleArray(nonFeatured)
        ];
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
                visibleCount = 9;
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

    const sourceData = categoryFilter === "All" ? shuffledAllData : allData;

    let filtered = sourceData.filter(item => {
        const matchesTag = (categoryFilter === "All" || item.tag === categoryFilter);
        const matchesSearch = !term || 
            item.jp.toLowerCase().includes(term) || 
            item.en.toLowerCase().includes(term) ||
            (item.keywords && item.keywords.toLowerCase().includes(term)) ||
            (item.keywords && item.keywords.includes(katakanaTerm));
        return matchesTag && matchesSearch;
    });

    // Featured first
    filtered.sort((a, b) => (b.featured === true ? 1 : 0) - (a.featured === true ? 1 : 0));

    let itemsToRender = filtered;

    if (!isSearching) {

        itemsToRender = filtered.slice(0, visibleCount);

        if (visibleCount < filtered.length) {
            showMoreContainer.style.display = "block";
        } else {
            showMoreContainer.style.display = "none";
        }

    } else {
        itemsToRender = filtered;
        showMoreContainer.style.display = "none";
    }

    if (filtered.length === 0) {
        grid.innerHTML = "<p class='no-results'>該当する表現が見つかりませんでした。</p>";
        return;
    }

    itemsToRender.forEach(item => {
        const reportSummary = `${item.jp}\n${item.en}${item.context ? `\n${item.context}` : ''}`;
        const reportUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfpbhutXoLYXMmI6aKyk0huRF_zpWxHVUwzdPWBwE8Q79xeIQ/viewform?usp=dialog&entry.1588045473=${encodeURIComponent(reportSummary)}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.jp = item.jp;
        card.dataset.en = item.en;

        card.onclick = (e) => {
            if (
                e.target.closest('button') ||
                e.target.closest('.menu-container')
            ) return;

            if (selectionMode) {
                const key = item.jp;

                if (selectedItems.has(key)) {
                    selectedItems.delete(key);
                    card.classList.remove('selected');
                } else {
                    selectedItems.set(key, { jp: item.jp, en: item.en });
                    card.classList.add('selected');
                }

                updateSelectionBar();
                return;
            }

            openFullscreen(item.jp, item.en);
        };

        card.innerHTML = `
            <div class="card-header-row">
                <div class="jp-text">${item.jp}</div>
                <div class="menu-container">
                    <button class="menu-btn" onclick="toggleMenu(event)">⋮</button>
                    <div class="menu-content">
                        <a href="#" onclick="handleDownload('${item.jp}', '${item.en}')">画像を保存</a>
                        <a href="#" onclick="handlePrint('${item.jp}', '${item.en}')">印刷</a>
                        <div class="report-item">
                            <a href="${reportUrl}" target="_blank">報告</a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="en-text">${item.en}</div>
            ${item.context ? `<p class="context-text">${item.context}</p>` : ''}
            <button class="copy-btn" onclick="handleCopy(this, '${item.en}')">コピー</button>
        `;

        grid.appendChild(card);
    });

    // Stagger animation
    document.querySelectorAll('.card').forEach((card, index) => {
        setTimeout(() => card.classList.add('show'), index * 40);
    });
}

window.toggleMenu = (e) => {
    e.stopPropagation();
    const menu = e.target.nextElementSibling;
    document.querySelectorAll('.menu-content').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
    document.querySelectorAll('.card').forEach(c => 
    c.classList.remove('menu-open')
);

e.target.closest('.card').classList.add('menu-open');
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
        width: 1123px;
        height: 794px;
        background: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 80px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans JP', 'Hiragino Sans', sans-serif;
    ">
        <div style="
            width: 70%;
        ">
            <div style="
                font-size: 36px;
                font-weight: 500;
                color: #a4abb8;
                margin-bottom: 20px;
            ">
                ${jp}
            </div>

            <div style="
                font-size: 82px;
                font-weight: 700;
                color: #1a2a3a;
                line-height: 1.15;
                margin-bottom: 30px;
            ">
                ${en}
            </div>

            <div style="
                border-top: 2px solid #f1f2f6;
                padding-top: 18px;
                font-size: 12px;
                letter-spacing: 2px;
                color: #bdc3c7;
                font-weight: bold;
            ">
                英換 — EIKAN PROJECT
            </div>
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
                    html, body { margin: 0; padding: 0; }

                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }

                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
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
    trackAction('download_png', jp);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getUnifiedA4HTML(jp, en);
    document.body.appendChild(container);

    const canvas = await html2canvas(
        container.querySelector('#a4-template'),
        {
            scale: 1,
            backgroundColor: "#ffffff",
            useCORS: true
        }
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

// --- 1. GA4 TRACKING HELPER ---
const trackAction = (actionName, label) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', actionName, { 'event_label': label });
    }
};

// --- 2. ABOUT/GUIDE CONTENT ---
// --- 2. ABOUT/GUIDE/PRIVACY CONTENT -----
const pageData = {
    about: `
        <h2 style="color:var(--accent); font-weight:900;">英換 (EIKAN) について</h2>
        <p>英換は、日本の店舗や公共施設が外国人のお客様と円滑にコミュニケーションを取るために作成した表現集です。</p>
        <p>現場で自然に使える英語表現を厳選し、検索・表示・印刷までシンプルに行えるよう設計しています。 </p>
        <p>どなたでも無料でご利用いただけます。店頭掲示やタブレット表示など、現場に合わせてご活用ください。</p>
    `,
    guide: `
        <h2 style="color:var(--accent); font-weight:900;">使いかた</h2>
        <p><strong>1. 検索:</strong> キーワードやカテゴリーから必要な表現を探します。</p>
        <p><strong>2. クイック操作:</strong> カードをクリックして「全画面」で提示したり、メニューから1枚ずつ「画像保存」や「印刷」が可能です。</p>
        <p><strong>3. まとめて処理:</strong> <br>
        右下の <strong>チェックマーク(✓)</strong> を押すと選択モードになります。複数のカードを選んで、一括でPDF保存や印刷が可能です。現場に合わせた独自の掲示物リストを数秒で作れます。</p>
        <p><strong>4. 伝える:</strong> 印刷して壁に貼る、またはタブレットでお客様に直接見せてご活用ください。</p>
    `,
    privacy:`
        <h3 style="font-size:1.1rem; margin-top:20px;">プライバシーとデータ利用について</h3>
        <p>当プロジェクトでは、サービスの改善（どの言葉がよく使われているか、印刷や保存の頻度など）を把握するために匿名のアナリティクスを使用しています。</p>
        <ul style="padding-left:20px; color:var(--text-sub);">
            <li><strong>目的:</strong> 追加が必要な表現の特定と、新機能追加の優先順位を調べるため。</li>
        </ul>
        <strong>収集したデータはサイト内統計にのみ使用し、第三者への販売や個人情報の収集は一切行いません。</strong>
    `
};

window.showPage = (key) => {
    document.getElementById('pageBody').innerHTML = pageData[key];
    document.getElementById('pageOverlay').style.display = 'flex';
};

window.closePage = () => {
    document.getElementById('pageOverlay').style.display = 'none';
};

showMoreBtn.addEventListener('click', () => {
    visibleCount += LOAD_INCREMENT;
    displayTranslations(currentActiveCategory);

    window.scrollBy({ top: 300, behavior: 'smooth' });
});

const backToTopBtn = document.getElementById('backToTop');

function handleBackToTopVisibility() {
    const pageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;

    const isLongPage = pageHeight > viewportHeight * 1.5; 
    const scrolledEnough = window.scrollY > viewportHeight;

    if (isLongPage && scrolledEnough) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
}

window.addEventListener('scroll', handleBackToTopVisibility);
window.addEventListener('resize', handleBackToTopVisibility);

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

const selectionBar = document.getElementById('selectionBar');
const selectionCount = document.getElementById('selectionCount');

function updateSelectionBar() {
    const count = selectedItems.size;

    selectionCount.innerText = `選択中 (${count})`;

    if (selectionMode) {
        selectionBar.classList.add('show');
    } else {
        selectionBar.classList.remove('show');
    }
    // Enable/disable buttons
    const actionButtons = document.querySelectorAll('.selection-actions button');

    actionButtons.forEach(btn => {
        btn.disabled = count === 0;
    });
}

window.clearSelection = () => {
    selectedItems.clear();

    document.querySelectorAll('.card.selected')
        .forEach(card => card.classList.remove('selected'));

    updateSelectionBar();
};

window.toggleSelect = (e, jp, en) => {
    e.stopPropagation();

    const card = e.target.closest('.card');

    if (e.target.checked) {
        selectedItems.set(jp, { jp, en });
        card.classList.add('selected');
    } else {
        selectedItems.delete(jp);
        card.classList.remove('selected');
    }

    updateSelectionBar();
};

const multiSelectFab = document.getElementById('multiSelectFab');

multiSelectFab.addEventListener('click', function () {

    selectionMode = !selectionMode;

    document.body.classList.toggle('selection-mode', selectionMode);
    this.classList.toggle('active', selectionMode);

    if (selectionMode) {
        this.innerText = "✕";
    } else {
        this.innerText = "✓";
        clearSelection();
    }

    updateSelectionBar();
});

window.printSelected = () => {
    if (selectedItems.size === 0) return;

    const win = window.open('', '_blank');

    let pages = '';

    selectedItems.forEach(item => {
        pages += `
            <div style="page-break-after: always;">
                ${getUnifiedA4HTML(item.jp, item.en)}
            </div>
        `;
    });

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
                    }
                    @page { size: A4 landscape; margin: 0; }
                    body { margin: 0; }
                </style>
            </head>
            <body>${pages}</body>
        </html>
    `);

    win.document.close();
    win.onload = () => {
        win.print();
        win.close();
    };
};

window.downloadSelectedPDF = async () => {
    if (selectedItems.size === 0) return;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1123, 794] // same as template
    });

    let index = 0;

    for (const item of selectedItems.values()) {

        // Render hidden DOM
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.innerHTML = getUnifiedA4HTML(item.jp, item.en);
        document.body.appendChild(container);

        const canvas = await html2canvas(
            container.querySelector('#a4-template'),
            { scale: 2 }
        );

        const imgData = canvas.toDataURL("image/png");

        if (index > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, 1123, 794);

        document.body.removeChild(container);
        index++;
    }

    pdf.save("Eikan_Cards.pdf");

    selectedItems.clear();
    updateSelectionBar();
};

initializeApp();

const searchHints = [
    "例: 予約、ヴィーガン対応、土足禁止...",
    "例: アレルギー、免税、WiFi...",
    "例: 電子マネー、マイナンバーカード、卵不使用...",
    "例: 現金のみ、チェックアウト、申請書...",
    "例: 写真撮影禁止、住民票、盛り合わせ...",
    "例: 営業時間、蕎麦、パスポート..."
];

const searchHintEl = document.getElementById("searchHint");

let hintIndex = 0;
let hintInterval;

function rotateHint() {
    if (searchInput.value.length !== 0) return;

    searchHintEl.style.opacity = "0";

    setTimeout(() => {
        hintIndex = (hintIndex + 1) % searchHints.length;
        searchHintEl.textContent = searchHints[hintIndex];
        searchHintEl.style.opacity = "1";
    }, 250);
}

function startHintRotation() {
    hintInterval = setInterval(rotateHint, 3500);
}

function stopHintRotation() {
    clearInterval(hintInterval);
}

searchInput.addEventListener("input", () => {
    searchHintEl.style.display = searchInput.value.length > 0 ? "none" : "block";
});

searchInput.addEventListener("focus", stopHintRotation);

searchInput.addEventListener("blur", () => {
    if (searchInput.value.length === 0) {
        searchHintEl.style.display = "block";
        startHintRotation();
    }
});

// Initialize
searchHintEl.textContent = searchHints[0];
startHintRotation();
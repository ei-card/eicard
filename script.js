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
                const tag = btn.getAttribute('data-tag');
                currentActiveCategory = tag;
                displayTranslations(tag);
            });
        });
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
        card.innerHTML = `
            <div class="card-header-row">
                <div class="jp-text">${item.jp}</div>
                <div class="menu-container">
                    <button class="menu-btn" onclick="toggleMenu(event)">⋮</button>
                    <div class="menu-content">
                        <a href="#" onclick="downloadPhraseImage('${item.jp}', '${item.en}')">画像を保存</a>
                        <a href="#" onclick="printPhrase('${item.jp}', '${item.en}')">印刷</a>
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

const getVisualTemplate = (jp, en) => `
    <div id="capture-target" style="
        box-sizing: border-box;
        width: 100%;
        max-width: 95vw; 
        max-height: 95vh;
        margin: 0 auto;
        padding: 0px; 
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Helvetica Neue', Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
    ">
        <div style="
            background: rgba(255, 255, 255, 0.95);
            padding: 40px 30px;
            border-radius: 20px;
            text-align: center;
            width: 100%;
        ">
            <div style="font-size: 20px; color: #7f8c8d; margin-bottom: 15px;">${jp}</div>
            <div style="font-size: 40px; color: #2c3e50; font-weight: 800; line-height: 1.2; margin-bottom: 25px;">${en}</div>
            <div style="
                border-top: 2px solid #f1f2f6;
                padding-top: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
            ">
                <span style="
                    font-size: 7px; 
                    color: #bdc3c7; 
                    font-weight: bold; 
                    letter-spacing: 2px;
                    text-transform: uppercase;
                ">英換 EIKAN PROJECT</span>
        </div>
    </div>
`;

window.downloadPhraseImage = (jp, en) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px'; // Hide it off-screen
    container.style.top = '0';
    container.innerHTML = getVisualTemplate(jp, en);
    document.body.appendChild(container);

    const target = container.querySelector('#capture-target');

    html2canvas(target, { 
        backgroundColor: null, 
        scale: 5, // Retina quality
        logging: false 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Eikan_${jp.replace(/\s+/g, '_').substring(0, 20)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        // Cleanup
        document.body.removeChild(container);
    }).catch(err => {
        console.error("Image generation failed:", err);
        alert("画像の保存に失敗しました。");
        document.body.removeChild(container);
    });
};

window.printPhrase = (jp, en) => {
    const win = window.open('', '', 'width=1200,height=800');
    
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>英換 - Full Page Print</title>
            <style>
                @page { 
                    margin: 0; 
                    size: auto; 
                }

                body { 
                    margin: 0; 
                    padding: 0; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    width: 100vw; 
                    height: 100vh;
                    overflow: hidden;
                }

                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }

                #capture-target {
                    display: flex;
                    justify-content: center;
                    transform-origin: center;
                    align-items: center;
                    box-sizing: border-box;
                    border-radius: 0px;
                    padding: 5vw; 
                }
            </style>
        </head>
        <body>
        ${getVisualTemplate(jp, en)}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
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

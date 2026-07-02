let curso = null;
let slideAtual = null;
let historico = [];
let timer = null;
const cacheImagens = new Map();

async function carregarCurso() {
    const resp = await fetch("curso.json?nocache=" + Date.now());
    curso = await resp.json();
    const params = new URLSearchParams(window.location.search);
    abrirSlide(params.get("slide") || curso.slide_inicial, false);
}

function escalaInfo() {
    const img = document.getElementById("slide-img");
    const rect = img.getBoundingClientRect();

    return {
        left: rect.left,
        top: rect.top,
        scaleX: rect.width / curso.largura,
        scaleY: rect.height / curso.altura
    };
}

function posicionarElemento(el, item) {
    const e = escalaInfo();

    el.style.left = (e.left + item.x * e.scaleX) + "px";
    el.style.top = (e.top + item.y * e.scaleY) + "px";
    el.style.width = (item.largura * e.scaleX) + "px";
    el.style.height = (item.altura * e.scaleY) + "px";
}

function preloadArquivo(src) {
    if (!src || cacheImagens.has(src)) return;

    const img = new Image();
    img.src = src;
    cacheImagens.set(src, img);
}

function preloadSlide(id) {
    if (!curso || !curso.slides || !curso.slides[id]) return;

    const s = curso.slides[id];
    preloadArquivo(s.imagem);

    if (s.gifs) {
        s.gifs.forEach(g => preloadArquivo(g.arquivo));
    }
}

function preloadProximos(s) {
    if (!s) return;

    if (s.proximo) preloadSlide(s.proximo);

    if (s.botoes) {
        s.botoes.forEach(b => {
            if (b.destino) preloadSlide(b.destino);
        });
    }
}

function abrirSlide(id, salvarHistorico = true) {
    if (!curso || !curso.slides[id]) {
        console.warn("Slide não encontrado:", id);
        return;
    }

    if (slideAtual && salvarHistorico) {
        historico.push(slideAtual);
    }

    slideAtual = id;
    clearTimeout(timer);

    const s = curso.slides[id];
    const img = document.getElementById("slide-img");
    const camadaGifs = document.getElementById("camada-gifs");
    const camadaBotoes = document.getElementById("camada-botoes");
    const audio = document.getElementById("audio");

    camadaGifs.innerHTML = "";
    camadaBotoes.innerHTML = "";

    img.onload = () => {
        if (s.gifs) {
            s.gifs.forEach(g => {
                const gif = document.createElement("img");
                gif.src = g.arquivo + "?t=" + Date.now();
                gif.className = "overlay-gif";
                camadaGifs.appendChild(gif);
                posicionarElemento(gif, g);
            });
        }

        if (s.botoes) {
            s.botoes.forEach(b => {
                const btn = document.createElement("button");
                btn.className = "botao-invisivel";
                btn.title = b.destino_url || b.destino || "";

                btn.onclick = () => {
                    if (b.destino_url) {
                        window.location.href = b.destino_url;
                    } else if (b.destino) {
                        abrirSlide(b.destino);
                    }
                };

                camadaBotoes.appendChild(btn);
                posicionarElemento(btn, b);
            });
        }

        preloadProximos(s);
    };

    img.src = s.imagem;

    if (s.audio) {
        audio.src = s.audio;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    } else {
        audio.pause();
        audio.removeAttribute("src");
    }

    if (s.tempo && s.tempo > 0 && s.proximo) {
        timer = setTimeout(() => abrirSlide(s.proximo), s.tempo * 1000);
    }
}

function proximo() {
    const s = curso.slides[slideAtual];
    if (s && s.proximo) abrirSlide(s.proximo);
}

function anterior() {
    if (historico.length > 0) abrirSlide(historico.pop(), false);
}

function reiniciar() {
    historico = [];
    abrirSlide(curso.slide_inicial, false);
}

function voltarMenu() {
    window.location.href = (curso && curso.menu_url) ? curso.menu_url : "index.html";
}

function voltarPortal() {
    window.location.href = (curso && curso.portal_url) ? curso.portal_url : "index.html";
}

function reajustarTelaMobile() {
    if (!slideAtual) return;

    setTimeout(() => {
        if (slideAtual) abrirSlide(slideAtual, false);
    }, 120);

    setTimeout(() => {
        if (slideAtual) abrirSlide(slideAtual, false);
    }, 450);

    setTimeout(() => {
        if (slideAtual) abrirSlide(slideAtual, false);
    }, 900);
}

window.addEventListener("load", reajustarTelaMobile);
window.addEventListener("resize", reajustarTelaMobile);
window.addEventListener("orientationchange", reajustarTelaMobile);
window.addEventListener("pageshow", reajustarTelaMobile);

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", reajustarTelaMobile);
    window.visualViewport.addEventListener("scroll", reajustarTelaMobile);
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reajustarTelaMobile();
});

document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") proximo();
    if (e.key === "ArrowLeft") anterior();
    if (e.key === "Home") voltarMenu();
    if (e.key === "Escape") voltarPortal();
});

document.addEventListener("dblclick", () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
    }
});

carregarCurso();

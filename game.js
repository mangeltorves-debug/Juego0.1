// ==========================================
// 1. CONFIGURACIÓN INICIAL Y VARIABLES
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let monedas = 0;
let rondaActual = 1;
let estadoJuego = 'menu'; 
let hordaSuperada = false;
const mouse = { x: 0, y: 0 };
const keys = {};

// Objetos de la Tienda (Movido arriba para que sea accesible)
const itemsTienda = [
    { nombre: "Anillo de Poder", precio: 150, efecto: () => Heroe.stats.daño += 15, descripcion: "+15 Daño" },
    { nombre: "Botas de Hermes", precio: 100, efecto: () => Heroe.stats.velocidad += 1, descripcion: "+1 Vel." },
    { nombre: "Coraza Real", precio: 200, efecto: () => Heroe.stats.hpMax += 50, descripcion: "+50 Vida" },
    { nombre: "Amuleto de Vida", precio: 80, efecto: () => Heroe.stats.hpActual = Heroe.stats.hpMax, descripcion: "Curar Todo" }
];

// Eventos
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// ==========================================
// 2. CLASES
// ==========================================
class Personaje {
    constructor(nombre, hp, daño, velocidad, desbloqueado = false) {
        this.nombre = nombre;
        this.hpMax = hp;
        this.hpActual = hp;
        this.daño = daño;
        this.velocidad = velocidad;
        this.desbloqueado = desbloqueado;
    }
}

class Jugador {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.stats = null;
    }
    dibujar() {
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - 10, (this.stats.hpActual / this.stats.hpMax) * this.width, 5);
    }
    actualizar() {
        if ((keys['ArrowUp'] || keys['w']) && this.y > 0) this.y -= this.stats.velocidad;
        if ((keys['ArrowDown'] || keys['s']) && this.y < canvas.height - this.height) this.y += this.stats.velocidad;
        if ((keys['ArrowLeft'] || keys['a']) && this.x > 0) this.x -= this.stats.velocidad;
        if ((keys['ArrowRight'] || keys['d']) && this.x < canvas.width - this.width) this.x += this.stats.velocidad;
    }
}

class Proyectil {
    constructor(x, y, dx, dy, daño) {
        this.x = x; this.y = y; this.radio = 5; this.velocidad = 7;
        this.dx = dx; this.dy = dy; this.daño = daño;
    }
    dibujar() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fillStyle = "#ffff00"; ctx.fill(); ctx.closePath();
    }
    actualizar() { this.x += this.dx * this.velocidad; this.y += this.dy * this.velocidad; }
}

class Enemigo {
    constructor(x, y, hp, velocidad) {
        this.x = x; this.y = y; this.width = 25; this.height = 25;
        this.hp = hp; this.velocidad = velocidad;
    }
    dibujar() { ctx.fillStyle = "#ff4444"; ctx.fillRect(this.x, this.y, this.width, this.height); }
    actualizar(objetivo) {
        const dx = objetivo.x - this.x;
        const dy = objetivo.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            this.x += (dx / dist) * this.velocidad;
            this.y += (dy / dist) * this.velocidad;
        }
    }
}

// ==========================================
// 3. LÓGICA Y FUNCIONES
// ==========================================
const personajes = [
    new Personaje("Guerrero", 120, 15, 3, true),
    new Personaje("Explorador", 80, 10, 6, true),
    new Personaje("Mago", 70, 25, 4, true),
    new Personaje("Tanque", 200, 8, 2, true),
    new Personaje("Asesino", 90, 20, 5, true),
    new Personaje("Berserker", 150, 30, 2, false)
];

const Heroe = new Jugador(canvas.width / 2, canvas.height / 2);
const proyectiles = [];
const enemigos = [];

function spawnHorda() {
    const cantidad = 30 + (Math.floor(rondaActual / 5) * 10);
    hordaSuperada = false;
    for (let i = 0; i < cantidad; i++) {
        let x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        let y = Math.random() * canvas.height;
        enemigos.push(new Enemigo(x, y, 30 + (rondaActual * 2), 1.2 + (rondaActual * 0.01)));
    }
}

function elegirMejora(tipo) {
    // Aplicar mejora según el tipo
    if (tipo === 'daño') Heroe.stats.daño += 5;
    if (tipo === 'velocidad') Heroe.stats.velocidad += 0.5;
    if (tipo === 'hp') {
        Heroe.stats.hpMax += 25;
        Heroe.stats.hpActual = Heroe.stats.hpMax;
    }
    
    document.getElementById('menu-recompensa').style.display = 'none';
    abrirTienda();
}

function abrirTienda() {
    estadoJuego = 'tienda';
    const menuTienda = document.getElementById('menu-tienda');
    const estante = document.getElementById('estante-tienda');
    menuTienda.style.display = 'flex';
    estante.innerHTML = ''; 

    itemsTienda.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-tienda';
        div.innerHTML = `
            <h4>${item.nombre}</h4>
            <p>${item.descripcion}</p>
            <p>💰 ${item.precio}</p>
            <button onclick="comprarItem('${item.nombre}')" ${monedas < item.precio ? 'disabled' : ''}>Comprar</button>
        `;
        estante.appendChild(div);
    });
}

function comprarItem(nombre) {
    const item = itemsTienda.find(i => i.nombre === nombre);
    if (monedas >= item.precio) {
        monedas -= item.precio;
        item.efecto();
        abrirTienda(); 
    }
}

function cerrarTienda() {
    document.getElementById('menu-tienda').style.display = 'none';
    estadoJuego = 'jugando';
    rondaActual++;
    spawnHorda();
}

setInterval(() => {
    if (estadoJuego === 'jugando') {
        const centroX = Heroe.x + 15;
        const centroY = Heroe.y + 15;
        const diffX = mouse.x - centroX;
        const diffY = mouse.y - centroY;
        const distancia = Math.sqrt(diffX * diffX + diffY * diffY);
        const dx = diffX / distancia;
        const dy = diffY / distancia;
        proyectiles.push(new Proyectil(centroX, centroY, dx, dy, Heroe.stats.daño));
    }
}, 500);

// ==========================================
// 4. MOTOR PRINCIPAL
// ==========================================
function gameLoop() {
    if (estadoJuego === 'jugando') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        document.getElementById('hp').innerText = Math.round(Heroe.stats.hpActual);
        document.getElementById('coins').innerText = monedas;
        document.getElementById('round').innerText = rondaActual;

        Heroe.actualizar();
        Heroe.dibujar();

        proyectiles.forEach((p, pi) => {
            p.actualizar(); p.dibujar();
            if(p.x > canvas.width || p.x < 0 || p.y > canvas.height || p.y < 0) proyectiles.splice(pi, 1);
        });

        enemigos.forEach((en, ei) => {
            en.actualizar(Heroe);
            en.dibujar();

            proyectiles.forEach((p, pi) => {
                const dist = Math.sqrt((p.x - (en.x + 12))**2 + (p.y - (en.y + 12))**2);
                if (dist < 15) {
                    en.hp -= p.daño;
                    proyectiles.splice(pi, 1);
                    if (en.hp <= 0) {
                        enemigos.splice(ei, 1);
                        monedas += 5; // Ganar monedas por baja
                    }
                }
            });

            const distH = Math.sqrt((Heroe.x - en.x)**2 + (Heroe.y - en.y)**2);
            if (distH < 20) Heroe.stats.hpActual -= 0.2;
        });

        if (enemigos.length === 0 && !hordaSuperada) {
            hordaSuperada = true;
            estadoJuego = 'recompensa';
            document.getElementById('menu-recompensa').style.display = 'flex';
        }

        if (Heroe.stats.hpActual <= 0) {
            alert("Has caído en batalla, mi rey. Ronda: " + rondaActual);
            location.reload();
        }
    }
    requestAnimationFrame(gameLoop);
}

function iniciarJuego(idx) {
    Heroe.stats = { ...personajes[idx] };
    Heroe.stats.hpActual = Heroe.stats.hpMax;
    document.getElementById('menu-inicio').style.display = 'none';
    estadoJuego = 'jugando';
    spawnHorda();
}

function renderizarMenu() {
    const cont = document.getElementById('contenedor-personajes');
    cont.innerHTML = '';
    personajes.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = `tarjeta-heroe ${p.desbloqueado ? '' : 'bloqueado'}`;
        d.innerHTML = `<h3>${p.nombre}</h3><p>❤️${p.hpMax} ⚔️${p.daño}</p>`;
        if (p.desbloqueado) d.onclick = () => iniciarJuego(i);
        cont.appendChild(d);
    });
}

function verificarLogros() {
    if (rondaActual === 5 && !personajes[5].desbloqueado) {
        personajes[5].desbloqueado = true;
        alert("¡EXCELENTÍSIMO! Desbloqueaste al Berserker.");
        renderizarMenu();
    }
}

renderizarMenu();
gameLoop();
/****** INIT ******/

// DOM elements 

const waveRadios = document.getElementsByName('waveform');
const delayRange = document.getElementById('delay');
const reverbRange = document.getElementById('reverb');
const frequencyLabel = document.getElementById('frequency');
const helpButton = document.getElementById('help');
const closeButton = document.getElementById('close');
const modal = document.getElementById('modal');
const startScreen = document.getElementById('start-screen')

// Init Canvas 

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

canvas.width = getCanvasDimensions().width;
canvas.height = getCanvasDimensions().height;

const CANVAS_BG = getComputedStyle(canvas).getPropertyValue('background-color');

let particles = [];
let animation;

// Init Web Audio API

const audioContext = new AudioContext();
const osc = audioContext.createOscillator();
const gainNode = audioContext.createGain();
const delayNode = audioContext.createDelay();
let delayGain = new GainNode(audioContext);

let oscStarted = false;
let click = false;
let touch = false;
let feedback = 0.3;
let delay = 250;
osc.type = 'sine';

const MAX_GAIN = 0;
const MIN_GAIN = -2;
const MIN_FREQ = 20;
const MAX_FREQ = 1000;

// Init Visualizer

const visualizer = document.getElementById('visualizer');
const vcontext = visualizer.getContext('2d');
const analyser = audioContext.createAnalyser();
let buffer = analyser.frequencyBinCount;
let dataArray = new Uint8Array(buffer);
let animateVisualizer;

const STROKE_COLOR = getComputedStyle(document.body).getPropertyValue('--primary');

visualizer.width = visualizer.getBoundingClientRect().width;
visualizer.height = visualizer.getBoundingClientRect().height;

vcontext.strokeStyle =  STROKE_COLOR;    
vcontext.strokeWidth = 2;


/***** LOGIC *****/  

// Init web audio (allows audio to start because interaction)

const webAudioInit = () => {
    startScreen.style.display = 'none';
}

// Music funcs 

const initMusic = () => {
    if(delayGain){
        delayGain.gain.cancelScheduledValues(audioContext.currentTime);
    }
    osc.connect(audioContext.destination);
    osc.connect(gainNode);
    osc.connect(delayNode);
    
    delayNode.connect(delayGain);
    delayNode.connect(audioContext.destination);
    delayNode.connect(analyser);
    
    delayGain.connect(audioContext.destination)
    delayGain.connect(delayNode);
    
    gainNode.connect(audioContext.destination);
    gainNode.connect(analyser);

    analyser.connect(audioContext.destination);
}

const makeMusic = (e) => {
    initMusic();
    updateSound(e);

    const now = audioContext.currentTime;
    delayNode.delayTime.setValueAtTime(delay / 1000, now);
    delayGain.gain.setValueAtTime(feedback, now);
}

const updateSound = (e) => {
    //frequency
    const frequency = rescale(getPointerPosition(e).x, 0, canvas.width, MIN_FREQ, MAX_FREQ);
    osc.frequency.value = frequency;
    frequencyLabel.innerHTML = `Frequency: ${Math.floor(frequency)} Hz`

    //gain
    const gain = rescale(getPointerPosition(e).y, 0, canvas.height, MAX_GAIN, MIN_GAIN);
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
    
}

const stopMusic = () => {
    if (delayGain){
        const now = audioContext.currentTime;
        delayGain.gain.setTargetAtTime(0, now + 2, 0.5);
    }
    osc.disconnect();
    frequencyLabel.innerHTML = 'Frequency: 000 Hz';
}

const setWaveForm = (e) => {
    osc.type = e.target.value;
}

const setDelay = (e) => {
    delay = e.target.value;
}

const setReverb = (e) => {
   feedback = e.target.value;
}

// Visuals

const drawMouseTrail = (e) => {
    addParticle(e);
    window.requestAnimationFrame(moveParticle.bind(e));
}

const addParticle = (e) => {
    const x = getPointerPosition(e).x;
    const y = getPointerPosition(e).y;
    const hue = rescale(getPointerPosition(e).x, 0, canvas.width, 0, 360);
    const type = osc.type;

    let point = new Point (x, y, hue, type);
    particles.push(point);
}

const moveParticle = (e) => {
    animation = window.requestAnimationFrame(moveParticle.bind(e));

    for (let particle of particles) {
        if (particle.light <= 0){
            particles.splice(particles.indexOf(particle), 1);
        } 
        particle.draw();
        particle.update();
    } 
     
    if (particles.length == 0){
        clearCanvas();
    } 
}

const clearCanvas = () => {
    cancelAnimationFrame(animation);
    particles = [];   
    context.fillStyle = CANVAS_BG;
    context.beginPath();
    context.beginPath();
    context.rect(0,0, canvas.width, canvas.height);
    context.fill();     
}

class Point {
    constructor (x, y, hue, shape) {
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.shape = shape;
        this.size = 2;
        this.light = 70;
    }

    update(){
        this.size += 2;
        this.light -= 0.5;
    }

    draw() {
        context.strokeStyle = `hsl(${this.hue}, 50%, ${this.light}%)`;
        context.fillStyle = CANVAS_BG;
        context.beginPath();
        switch (this.shape) {
            case 'sine':
                context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
                break;
            case 'square': 
                context.rect(this.x - this.size * 0.5, this.y - this.size * 0.5, this.size, this.size)
                break;
            case 'sawtooth': 
                context.moveTo(this.x, this.y - this.size * 0.5);
                context.lineTo(this.x + this.size * 0.5, this.y - this.size * 0.233)
                context.lineTo(this.x + this.size * 0.5, this.y + this.size * 0.2333)
                context.lineTo(this.x, this.y + this.size * 0.5)
                context.lineTo(this.x - this.size * 0.5, this.y + this.size * 0.2333)
                context.lineTo(this.x - this.size * 0.5, this.y - this.size * 0.233);
                context.lineTo(this.x, this.y - this.size * 0.5)
                break;
            case 'triangle': 
                context.moveTo(this.x, this.y - this.size * 0.4);
                context.lineTo(this.x + this.size * 0.5, this.y + this.size * 0.4)
                context.lineTo(this.x - this.size * 0.5, this.y + this.size * 0.4);
                context.lineTo(this.x, this.y - this.size * 0.4) 
        }
        context.fill();
        context.stroke();
    }
}

// Visualizer 

const visualize = () => {
    clearVisualizer();
    animateVisualizer = requestAnimationFrame(drawVisualizer);
}

const drawVisualizer = () => {
    clearVisualizer();
    requestAnimationFrame(drawVisualizer)

    const slice = visualizer.width / buffer;
    let x = 0;
    
    analyser.getByteTimeDomainData(dataArray);
    vcontext.beginPath();

    for(let i = 0; i < buffer; i++) {
      let v = dataArray[i] / 128;
      let y = v * visualizer.height / 2;

      if(i === 0) {
        vcontext.moveTo(x, y);
      } else {
        vcontext.lineTo(x, y);
      }

      x += slice;
    } 

    vcontext.lineTo(visualizer.width, visualizer.height/2);
    vcontext.stroke();
}

const clearVisualizer = () => {
    vcontext.fillStyle = CANVAS_BG;
    vcontext.beginPath()
    vcontext.rect(0,0, visualizer.width, visualizer.height);
    vcontext.fill();
}

// Utils 

const getPointerPosition = (e) => {
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const offsetX = canvas.getBoundingClientRect().left;
    const offsetY = canvas.getBoundingClientRect().top;
    let pointerX;
    let pointerY;

    if (click){
        pointerX = e.clientX;
        pointerY = e.clientY
    }
    else if (touch){
        pointerX = e.changedTouches[0].clientX;
        pointerY = e.changedTouches[0].clientY; 
    }

    return {
        x: (pointerX - offsetX) * scaleX,
        y : (pointerY - offsetY) * scaleY
    }
}

function getCanvasDimensions() {
    return {
        height: canvas.getBoundingClientRect().height,
        width: canvas.getBoundingClientRect().width
    }
}

const rescale = (valueToScale, oldMin, oldMax, newMin, newMax) => {
    let scaledValue = (valueToScale / (oldMax - oldMin) * (newMax - newMin)) + newMin;
    return scaledValue;
}

const mouseIsOut = (e) => {
    const offsetTop = canvas.getBoundingClientRect().top;
    const offsetBottom = offsetTop + canvas.height;
    const offsetLeft = canvas.getBoundingClientRect().left;
    const offsetRift = offsetLeft + canvas.width;
    const posX = e.clientX;
    const posY = e.clientY;

    if (posX < offsetLeft || posX > offsetRift || posY < offsetTop || posY > offsetBottom){
        return true;
    }
    else {
        return false;
    }
}

// Display

const openModal = () => {
    modal.style.display = 'block';
}

const closeModal = () => {
    modal.style.display = 'none';
}

/***** EVENTS *****/

// All 

for (let radio of waveRadios){
    radio.addEventListener('change', setWaveForm);
}

delayRange.addEventListener('change', setDelay);

reverbRange.addEventListener('change', setReverb);

window.addEventListener('load', visualize);

window.addEventListener('resize', () => {
    canvas.width = getCanvasDimensions().width;
    canvas.height = getCanvasDimensions().height;
})

// Desktop

startScreen.addEventListener('click', webAudioInit)

canvas.addEventListener('mousedown', (e) => {
    click = true;
    touch = false;
    if (oscStarted == false){
        osc.start();
        oscStarted = true;
    }
    clearCanvas();
    drawMouseTrail(e);
    makeMusic(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (click){
        addParticle(e);
        updateSound(e);
    }
});

canvas.addEventListener('mouseup', () => {
    click = false;
    stopMusic();
});


window.addEventListener('mousemove', (e) => {
    if(click){
        if(mouseIsOut(e)){
            click = false;
            touch = false;
            stopMusic();
            clearVisualizer();
        };
    }
})

// Touch events

canvas.addEventListener('touchstart', (e) => {
    click = false;
    touch = true;
    if (oscStarted == false){
        osc.start();
        oscStarted = true;
    }
    clearCanvas();
    drawMouseTrail(e);
    makeMusic(e);
});

canvas.addEventListener('touchmove', (e) => {
        addParticle(e);
        updateSound(e);
});

canvas.addEventListener('touchend', () => {
    touch = false;
    stopMusic();
});

// Toggle modal

helpButton.addEventListener('click', openModal);
closeButton.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target == modal){
        closeModal();
    }
})

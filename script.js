let threads = [];
let running = false;
let completed = 0;
let totalWaiting = 0;

class AsyncSemaphore {
    constructor(limit) {
        this.limit = limit;
        this.active = 0;
        this.waiters = [];
    }

    async acquire() {
        if (this.active < this.limit) {
            this.active++;
            return;
        }
        return new Promise(resolve => {
            this.waiters.push(resolve);
        });
    }

    release() {
        this.active--;
        if (this.waiters.length > 0) {
            this.active++;
            const resolve = this.waiters.shift();
            resolve();
        }
    }

    reset() {
        this.active = 0;
        this.waiters = [];
    }
}

let syncMechanism = null;

// Initialize speed label
document.addEventListener('DOMContentLoaded', () => {
    const speedInput = document.getElementById('speed');
    const speedValue = document.getElementById('speedValue');
    
    speedInput.addEventListener('input', function() {
        speedValue.innerText = this.value + ' ms';
    });
});

function createThreads(n) {
    let container = document.getElementById("threads");
    container.innerHTML = "";
    threads = [];

    for (let i = 1; i <= n; i++) {
        let div = document.createElement("div");
        div.className = "thread ready";
        div.id = "t" + i;
        
        let nameDiv = document.createElement("div");
        nameDiv.className = "thread-name";
        nameDiv.innerText = "T" + i;
        
        let stateDiv = document.createElement("div");
        stateDiv.className = "thread-state";
        stateDiv.innerText = "Ready";
        
        div.appendChild(nameDiv);
        div.appendChild(stateDiv);
        
        container.appendChild(div);
        threads.push(div);
    }
}

function updateThreadState(t, stateClass, stateText) {
    t.className = "thread " + stateClass;
    t.querySelector('.thread-state').innerText = stateText;
}

function log(msg) {
    let box = document.getElementById("logBox");
    let time = new Date().toLocaleTimeString();
    box.innerHTML += `[${time}] ${msg}<br>`;
    box.scrollTop = box.scrollHeight;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runThread(t, speed, mechanism) {
    if (!running) return;

    let tName = t.querySelector('.thread-name').innerText;

    updateThreadState(t, "waiting", "Waiting");
    log(`${tName} is waiting for resource`);
    
    totalWaiting++;
    document.getElementById("stat-waiting").innerText = "Total Waiting Events: " + totalWaiting;

    // Acquire lock if needed
    if (mechanism !== "None" && syncMechanism) {
        await syncMechanism.acquire();
    }

    if (!running) {
        if (mechanism !== "None" && syncMechanism) syncMechanism.release();
        return;
    }

    updateThreadState(t, "running", "Running");
    document.getElementById("status").innerText = `${tName} acquired resource`;
    
    if (mechanism === "Monitor") {
        log(`${tName} entered monitor`);
    } else if (mechanism !== "None") {
        log(`${tName} acquired lock`);
    }

    document.getElementById("recommendation").innerText = "Thread is performing initial processing.";

    await sleep(speed);
    if (!running) {
        if (mechanism !== "None" && syncMechanism) syncMechanism.release();
        return;
    }

    updateThreadState(t, "critical", "Critical");
    log(`${tName} in critical section`);
    document.getElementById("status").innerText = `${tName} in critical section`;
    document.getElementById("recommendation").innerText = "Thread is modifying shared data.";

    await sleep(speed);
    
    // Release lock
    if (mechanism !== "None" && syncMechanism) {
        syncMechanism.release();
        if (mechanism === "Monitor") {
            log(`${tName} exited monitor`);
        } else {
            log(`${tName} released lock`);
        }
    }

    if (!running) return;

    updateThreadState(t, "finished", "Finished");
    completed++;

    document.getElementById("stats").innerText = "Total Completed Threads: " + completed;
    document.getElementById("status").innerText = `${tName} finished execution`;
    document.getElementById("recommendation").innerText = completed === threads.length ? "Simulation complete." : "Waiting for other threads...";
}

async function start() {
    running = true;
    completed = 0;
    totalWaiting = 0;

    let n = document.getElementById("threadCount").value;
    let speed = document.getElementById("speed").value;
    let mech = document.getElementById("mechanism").value;
    
    let limit = 1;
    if (mech === "Semaphore") {
        limit = parseInt(document.getElementById("semaphoreLimit").value);
    }
    
    syncMechanism = new AsyncSemaphore(limit);

    document.getElementById("status").innerText = `Starting simulation with ${mech}...`;
    document.getElementById("recommendation").innerText = "Observe the thread states.";
    document.getElementById("stat-waiting").innerText = "Total Waiting Events: 0";
    document.getElementById("stats").innerText = "Total Completed Threads: 0";
    document.getElementById("logBox").innerHTML = "";

    createThreads(n);

    for (let t of threads) {
        runThread(t, speed, mech);
    }
}

function pause() {
    running = false;
    document.getElementById("status").innerText = "Simulation paused";
    document.getElementById("recommendation").innerText = "Click Start to begin a new simulation or Reset to clear.";
}

function reset() {
    running = false;
    completed = 0;
    totalWaiting = 0;
    
    if (syncMechanism) {
        syncMechanism.reset();
    }
    
    document.getElementById("threads").innerHTML = "";
    document.getElementById("logBox").innerHTML = "";
    
    document.getElementById("status").innerText = "Waiting to start simulation...";
    document.getElementById("recommendation").innerText = "Choose a mechanism and start the simulation.";
    document.getElementById("stat-waiting").innerText = "Total Waiting Events: 0";
    document.getElementById("stats").innerText = "Total Completed Threads: 0";
}
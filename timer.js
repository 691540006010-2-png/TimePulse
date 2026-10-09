const LOG_KEY='timepulse_logs_v1';
const TIMER_KEY='timepulse_timer_v1';

let logs=[];
let timer={
    mode:'stopwatch',
    status:'idle',
    start:null,
    elapsed:0,
    target:1500,
    task:'',
    category:'💻 งานทั่วไป'
};

window.onload=()=>{
    loadLogs();
    loadTimer();
    setDate();
    initCharts();
    syncTimer();
    renderTable();
    updateDashboardStats();

    setInterval(updateTimerDisplay,200);
    setInterval(setDate,60000);
};


function setDate(){
    const d=new Date();

    document.getElementById('currentDateDisplay').textContent=
        d.toLocaleDateString('th-TH',{
            weekday:'short',
            year:'numeric',
            month:'short',
            day:'numeric'
        });

    if(!document.getElementById('manualDate').value)
        document.getElementById('manualDate').value=
            d.toISOString().split('T')[0];
}


function switchTimerMode(mode){

    if(timer.status!=='idle'){
        toast('กรุณาหยุดหรือบันทึกก่อนเปลี่ยนโหมด');
        return;
    }

    timer.mode=mode;

    const sw=document.getElementById('modeStopwatchBtn');
    const cd=document.getElementById('modeCountdownBtn');
    const area=document.getElementById('countdownPresetsArea');
    const bar=document.getElementById('progressBarContainer');

    sw.style.background=mode==='stopwatch'?'#4f46e5':'#eef2ff';
    sw.style.color=mode==='stopwatch'?'white':'#4338ca';

    cd.style.background=mode==='countdown'?'#4f46e5':'#eef2ff';
    cd.style.color=mode==='countdown'?'white':'#4338ca';

    area.classList.toggle('hidden',mode!=='countdown');
    bar.classList.toggle('hidden',mode!=='countdown');

    document.getElementById('timerSubtext').textContent=
        mode==='stopwatch'
        ?'กดเริ่มเพื่อเริ่มบันทึกเวลา'
        :'กำหนดเวลาและเริ่มโฟกัส';

    saveTimer();
    updateTimerDisplay();
}


function setCountdownPreset(min){

    if(timer.status!=='idle')return;

    timer.target=min*60;
    timer.elapsed=0;

    customMinutes.value=min;
    customHours.value=0;
    customSeconds.value=0;

    saveTimer();
    updateTimerDisplay();
    toast(`ตั้งเวลา ${min} นาทีแล้ว`);
}


function applyCustomCountdown(){

    if(timer.status!=='idle')return;

    const h=+customHours.value||0;
    const m=+customMinutes.value||0;
    const s=+customSeconds.value||0;
    const total=h*3600+m*60+s;

    if(total<=0){
        toast('กรุณาระบุเวลาให้มากกว่า 0');
        return;
    }

    timer.target=total;
    timer.elapsed=0;

    saveTimer();
    updateTimerDisplay();
}


function toggleTimer(){

    timer.task=
        taskNameInput.value.trim()||
        'งานที่ไม่ได้ระบุชื่อ';

    timer.category=
        taskCategorySelect.value;

    if(timer.status==='idle'||timer.status==='paused'){
        timer.status='running';
        timer.start=Date.now();
        toast('เริ่มจับเวลา');
    }else{
        timer.elapsed+=
            Math.floor((Date.now()-timer.start)/1000);

        timer.status='paused';
        timer.start=null;
        toast('หยุดชั่วคราว');
    }

    saveTimer();
    updateTimerUI();
}


function resetTimer(){

    timer.status='idle';
    timer.start=null;
    timer.elapsed=0;

    saveTimer();
    updateTimerUI();
    updateTimerDisplay();
}


function getElapsed(){

    let e=timer.elapsed;

    if(timer.status==='running')
        e+=Math.floor((Date.now()-timer.start)/1000);

    return e;
}


function updateTimerDisplay(){

    let e=getElapsed();

    if(timer.mode==='countdown'){

        let remain=timer.target-e;

        if(remain<=0&&timer.status==='running'){
            timer.elapsed=timer.target;
            timer.status='idle';
            saveTimer();
            updateTimerUI();
            playDone();
            saveSession(true);
            return;
        }

        remain=Math.max(0,remain);

        timerDisplay.textContent=formatTime(remain);

        timerProgressBar.style.width=
            `${Math.max(0,remain/timer.target*100)}%`;

    }else{

        timerDisplay.textContent=
            formatTime(e);
    }
}


function updateTimerUI(){

    const running=timer.status==='running';
    const paused=timer.status==='paused';

    startPauseText.textContent=
        running?'หยุดชั่วคราว':
        paused?'ทำต่อ':'เริ่มจับเวลา';

    startPauseBtn.style.background=
        running?'#f59e0b':
        paused?'#4f46e5':'#10b981';

    timerStatusBadge.textContent=
        running?'กำลังบันทึกเวลา':
        paused?'พักชั่วคราว':'พร้อมใช้งาน';
}


function saveSession(auto=false){

    const e=getElapsed();

    if(e<5&&!auto){
        toast('เวลาไม่ถึง 5 วินาที');
        return;
    }

    logs.unshift({
        id:Date.now(),
        taskName:
            taskNameInput.value.trim()||
            timer.task||
            'กิจกรรมจับเวลา',
        category:taskCategorySelect.value,
        date:new Date().toISOString().split('T')[0],
        timestamp:Date.now(),
        durationSeconds:e,
        mode:timer.mode==='stopwatch'
            ?'จับเวลาสะสม'
            :'ตั้งเวลาถอยหลัง',
        notes:auto
            ?'บันทึกอัตโนมัติ'
            :'บันทึกจากตัวจับเวลา'
    });

    saveLogs();

    timer.status='idle';
    timer.start=null;
    timer.elapsed=0;
    saveTimer();

    taskNameInput.value='';

    renderTable();
    updateDashboardStats();

    toast('บันทึกเรียบร้อย');
}


function completeAndSaveSession(){
    saveSession(false);
}


function handleManualLogSubmit(e){

    e.preventDefault();

    const h=+manualHours.value||0;
    const m=+manualMinutes.value||0;
    const sec=h*3600+m*60;

    if(sec<=0){
        toast('กรุณาระบุเวลา');
        return;
    }

    logs.unshift({
        id:Date.now(),
        taskName:manualTaskName.value.trim(),
        category:manualCategory.value,
        date:manualDate.value,
        timestamp:new Date(manualDate.value).getTime(),
        durationSeconds:sec,
        mode:'ย้อนหลัง (Manual)',
        notes:manualNotes.value.trim()||'บันทึกย้อนหลัง'
    });

    saveLogs();

    manualTaskName.value='';
    manualNotes.value='';

    renderTable();
    updateDashboardStats();

    toast('เพิ่มข้อมูลแล้ว');
}


function loadLogs(){

    try{
        logs=JSON.parse(localStorage.getItem(LOG_KEY))||[];
    }catch{
        logs=[];
    }

    if(!logs.length){
        logs=[
            sample('ออกแบบ UI','💻 งานทั่วไป',5400,0),
            sample('เรียน JavaScript','📚 การเรียน',3000,0),
            sample('ออกกำลังกาย','🏃 สุขภาพ',2700,-1)
        ];
        saveLogs();
    }
}


function sample(task,cat,sec,day){

    const d=new Date();
    d.setDate(d.getDate()+day);

    return{
        id:Date.now()+Math.random(),
        taskName:task,
        category:cat,
        date:d.toISOString().split('T')[0],
        timestamp:d.getTime(),
        durationSeconds:sec,
        mode:'จับเวลาสะสม',
        notes:'ข้อมูลตัวอย่าง'
    };
}


function saveLogs(){
    localStorage.setItem(
        LOG_KEY,
        JSON.stringify(logs)
    );
}


function loadTimer(){

    try{
        timer={
            ...timer,
            ...JSON.parse(
                localStorage.getItem(TIMER_KEY)||'{}'
            )
        };
    }catch{}
}


function saveTimer(){
    localStorage.setItem(
        TIMER_KEY,
        JSON.stringify(timer)
    );
}


function syncTimer(){

    taskNameInput.value=timer.task||'';
    taskCategorySelect.value=timer.category||'💻 งานทั่วไป';

    switchTimerMode(timer.mode||'stopwatch');

    updateTimerUI();
    updateTimerDisplay();
}


function formatTime(sec){

    sec=Math.max(0,Math.floor(sec));

    const h=Math.floor(sec/3600);
    const m=Math.floor(sec%3600/60);
    const s=sec%60;

    return [h,m,s]
        .map(x=>String(x).padStart(2,'0'))
        .join(':');
}


function playDone(){

    if(typeof confetti==='function')
        confetti({
            particleCount:100,
            spread:70
        });

    try{
        const c=new AudioContext();
        const o=c.createOscillator();
        const g=c.createGain();

        o.frequency.value=600;
        g.gain.value=.2;

        o.connect(g);
        g.connect(c.destination);

        o.start();
        o.stop(c.currentTime+.5);
    }catch{}
}
let categoryChartInstance;
let weeklyChartInstance;


function updateDashboardStats(){

    const today=new Date().toISOString().split('T')[0];
    const week=Date.now()-7*86400000;

    let todaySec=0;
    let weekSec=0;
    const cats={};

    logs.forEach(l=>{

        const t=new Date(l.date).getTime()||l.timestamp;

        if(l.date===today)
            todaySec+=l.durationSeconds;

        if(t>=week)
            weekSec+=l.durationSeconds;

        cats[l.category]=
            (cats[l.category]||0)+l.durationSeconds;
    });


    const todayH=(todaySec/3600).toFixed(1);
    const weekH=(weekSec/3600).toFixed(1);

    headerTodayHours.textContent=todayH;
    statTodayHours.textContent=`${todayH} ชม.`;
    statWeeklyHours.textContent=`${weekH} ชม.`;
    statDailyAverage.textContent=
        (weekSec/3600/7).toFixed(1);

    statTotalCount.textContent=
        `${logs.length} รายการ`;


    let top='-';
    let max=0;

    Object.keys(cats).forEach(k=>{
        if(cats[k]>max){
            max=cats[k];
            top=k;
        }
    });

    statTopCategory.textContent=top;
    statTopCategorySub.textContent=
        max?`รวม ${(max/3600).toFixed(1)} ชั่วโมง`:'ไม่มีข้อมูล';

    updateCharts(cats);
}


function initCharts(){

    categoryChartInstance=new Chart(
        categoryChart,
        {
            type:'doughnut',
            data:{
                labels:[],
                datasets:[{
                    data:[],
                    backgroundColor:[
                        '#6366f1',
                        '#8b5cf6',
                        '#10b981',
                        '#f59e0b',
                        '#ec4899',
                        '#64748b'
                    ]
                }]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false
            }
        }
    );


    weeklyChartInstance=new Chart(
        weeklyBarChart,
        {
            type:'bar',
            data:{
                labels:[],
                datasets:[{
                    label:'ชั่วโมง',
                    data:[],
                    backgroundColor:'#6366f1'
                }]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                scales:{
                    y:{beginAtZero:true}
                }
            }
        }
    );
}


function updateCharts(cats){

    categoryChartInstance.data.labels=
        Object.keys(cats);

    categoryChartInstance.data.datasets[0].data=
        Object.values(cats)
        .map(x=>(x/3600).toFixed(2));

    categoryChartInstance.update();


    const labels=[];
    const data=[];

    for(let i=6;i>=0;i--){

        const d=new Date();
        d.setDate(d.getDate()-i);

        const date=d.toISOString().split('T')[0];

        labels.push(
            d.toLocaleDateString(
                'th-TH',
                {weekday:'short',day:'numeric'}
            )
        );

        data.push(
            (
                logs
                .filter(x=>x.date===date)
                .reduce(
                    (a,x)=>a+x.durationSeconds,
                    0
                )/3600
            ).toFixed(2)
        );
    }

    weeklyChartInstance.data.labels=labels;
    weeklyChartInstance.data.datasets[0].data=data;
    weeklyChartInstance.update();
}


function renderTable(){

    const search=
        searchInput.value.toLowerCase().trim();

    const cat=
        filterCategory.value;

    const result=logs.filter(l=>
        (
            l.taskName.toLowerCase().includes(search)||
            (l.notes||'').toLowerCase().includes(search)
        ) &&
        (cat==='ALL'||l.category===cat)
    );


    logsTableBody.innerHTML='';

    emptyState.classList.toggle(
        'hidden',
        result.length>0
    );


    result.forEach(l=>{

        logsTableBody.innerHTML+=`
        <tr>
            <td>${new Date(l.date).toLocaleDateString('th-TH')}</td>
            <td>${escapeHTML(l.taskName)}</td>
            <td>${l.category}</td>
            <td>${l.mode||'-'}</td>
            <td>${formatTime(l.durationSeconds)}</td>
            <td>
                <button onclick="promptDeleteLog('${l.id}')">
                    🗑️
                </button>
            </td>
        </tr>`;
    });
}


function promptDeleteLog(id){

    showModal(
        'ลบรายการ',
        'ต้องการลบรายการนี้หรือไม่?',
        ()=>{
            logs=logs.filter(x=>String(x.id)!==String(id));
            saveLogs();
            renderTable();
            updateDashboardStats();
            toast('ลบแล้ว');
        }
    );
}


function promptClearAllData(){

    if(!logs.length){
        toast('ไม่มีข้อมูล');
        return;
    }

    showModal(
        'ล้างข้อมูลทั้งหมด',
        'ข้อมูลทั้งหมดจะถูกลบ',
        ()=>{
            logs=[];
            saveLogs();
            renderTable();
            updateDashboardStats();
            toast('ล้างข้อมูลแล้ว');
        }
    );
}


function exportToCSV(){

    if(!logs.length){
        toast('ไม่มีข้อมูล');
        return;
    }

    let csv='\uFEFF';
    csv+='วันที่,ชื่องาน,หมวดหมู่,โหมด,วินาที,เวลา,หมายเหตุ\n';

    logs.forEach(l=>{
        csv+=[
            l.date,
            `"${(l.taskName||'').replaceAll('"','""')}"`,
            `"${l.category}"`,
            `"${l.mode||''}"`,
            l.durationSeconds,
            formatTime(l.durationSeconds),
            `"${(l.notes||'').replaceAll('"','""')}"`
        ].join(',')+'\n';
    });

    const a=document.createElement('a');

    a.href=URL.createObjectURL(
        new Blob(
            [csv],
            {type:'text/csv;charset=utf-8'}
        )
    );

    a.download=
        `TimePulse_${new Date().toISOString().split('T')[0]}.csv`;

    a.click();

    toast('ส่งออก CSV แล้ว');
}


function showModal(title,msg,action){

    modalTitle.textContent=title;
    modalMessage.textContent=msg;

    const btn=document.getElementById(
        'modalConfirmBtn'
    );

    btn.onclick=()=>{
        action();
        closeModal();
    };

    confirmModal.classList.remove('hidden');
}


function closeModal(){
    confirmModal.classList.add('hidden');
}


function toast(msg){

    const d=document.createElement('div');

    d.textContent=msg;

    toastContainer.appendChild(d);

    setTimeout(
        ()=>d.remove(),
        2500
    );
}


function escapeHTML(s){

    return s.replace(
        /[&<>"']/g,
        c=>({
            '&':'&amp;',
            '<':'&lt;',
            '>':'&gt;',
            '"':'&quot;',
            "'":'&#039;'
        }[c])
    );
}
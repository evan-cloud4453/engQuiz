const socket = io();
let currentRole = '';
let myName = '';

// 시험 데이터 상태
let currentPartIndex = 0;
let currentQIndex = 0;
let remainingTime = 0;
let timerInterval = null;
let userAnswers = {}; // { "0_0": "A", "0_1": "B" ... } (partIndex_qIndex)

// 화면 전환 함수
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showLoginForm(role) {
    document.getElementById('student-form').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('teacher-form').style.display = role === 'teacher' ? 'block' : 'none';
}

function login(role) {
    const data = { role: role };
    if (role === 'student') data.name = document.getElementById('student-name').value;
    if (role === 'teacher') data.password = document.getElementById('teacher-pw').value;
    socket.emit('login', data);
}

// 소켓 리스너: 로그인
socket.on('loginSuccess', (data) => {
    currentRole = data.role;
    if (currentRole === 'teacher') switchScreen('teacher-screen');
    if (currentRole === 'student') {
        myName = data.name;
        switchScreen('waiting-screen');
    }
});
socket.on('loginFail', (msg) => alert(msg));

// ==========================================
// [선생님 모드 로직]
// ==========================================
socket.on('updateStudents', (students) => {
    if (currentRole !== 'teacher') return;
    const container = document.getElementById('student-list');
    container.innerHTML = '';
    
    Object.values(students).forEach(st => {
        const card = document.createElement('div');
        card.className = 'student-card';
        
        let actionBtn = '';
        if (st.status === 'waiting') {
            actionBtn = `<button onclick="socket.emit('startTest', '${st.id}')" class="btn btn-inline">시험 시작 승인</button>`;
        } else if (st.status === 'testing' || st.status === 'paused') {
            actionBtn = `<button onclick="socket.emit('togglePause', '${st.id}')" class="btn outline btn-inline">
                            ${st.status === 'testing' ? '일시 정지' : '시험 재개'}
                         </button>`;
        }

        // 실시간 답안 현황 출력용 (최근 답안)
        let recentAnswer = st.liveAnswers[`p${st.currentPart}_q${st.currentQ - 1}`] || '입력중...';

        card.innerHTML = `
            <h3>${st.name} <span class="student-status">[${st.status}]</span></h3>
            <p>현재 위치: Part ${st.currentPart} - ${st.currentQ}번 문제</p>
            <p>최근 선택 답안: <span style="color:var(--accent-color)">${recentAnswer}</span></p>
            ${actionBtn}
        `;
        container.appendChild(card);
    });
});

// ==========================================
// [학생 모드 로직]
// ==========================================
socket.on('testStarted', () => {
    // 선생님이 승인하면 첫 번째 파트 디렉션 화면으로 이동
    currentPartIndex = 0;
    showPartDirection();
});

socket.on('testPaused', () => {
    clearInterval(timerInterval);
    document.getElementById('pause-overlay').style.display = 'flex';
});

socket.on('testResumed', () => {
    document.getElementById('pause-overlay').style.display = 'none';
    startTimer();
});

function showPartDirection() {
    const partData = partsInfo[currentPartIndex];
    document.getElementById('dir-title').textContent = partData.title;
    document.getElementById('dir-desc').innerHTML = partData.instruction;
    document.getElementById('dir-time').textContent = `${Math.floor(partData.timeLimit / 60)}분`;
    
    remainingTime = partData.timeLimit;
    switchScreen('direction-screen');
}

function startPart() {
    currentQIndex = 0;
    switchScreen('quiz-screen');
    renderQuestion();
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingTime--;
        
        let m = Math.floor(remainingTime / 60).toString().padStart(2, '0');
        let s = (remainingTime % 60).toString().padStart(2, '0');
        document.getElementById('quiz-timer').textContent = `${m}:${s}`;

        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            alert("시간이 초과되었습니다. 다음 파트로 강제 이동합니다.");
            moveToNextPart();
        }
    }, 1000);
}

function renderQuestion() {
    const partData = partsInfo[currentPartIndex];
    const qData = partData.questions[currentQIndex];
    const isLastQ = (currentQIndex === partData.questions.length - 1);
    
    document.getElementById('quiz-title').textContent = `${partData.title} (${currentQIndex + 1}/${partData.questions.length})`;
    document.getElementById('question-text').textContent = `Q. ${qData.q}`;
    
    const optContainer = document.getElementById('options-container');
    const textInput = document.getElementById('text-answer');
    
    optContainer.innerHTML = '';
    textInput.style.display = 'none';
    textInput.value = '';

    const savedAnswer = userAnswers[`${currentPartIndex}_${currentQIndex}`];

    // 객관식 vs 주관식(철자쓰기) UI 분기
    if (qData.options) {
        optContainer.style.display = 'block';
        qData.options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.textContent = opt;
            if (savedAnswer === opt) btn.classList.add('selected');
            
            btn.onclick = () => {
                document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                saveAnswer(opt);
            };
            optContainer.appendChild(btn);
        });
    } else {
        // 주관식(철자쓰기 파트6)
        textInput.style.display = 'block';
        if (savedAnswer) textInput.value = savedAnswer;
        textInput.oninput = (e) => saveAnswer(e.target.value);
    }

    // 네비게이션 버튼 (자유로운 이동 지원)
    document.getElementById('prev-btn').style.display = currentQIndex === 0 ? 'none' : 'inline-block';
    const nextBtn = document.getElementById('next-btn');
    if (isLastQ) {
        nextBtn.textContent = "현재 파트 제출 (조기 종료)";
        nextBtn.onclick = () => {
            if(confirm("이 파트의 풀이를 마치고 제출하시겠습니까?")) moveToNextPart();
        };
    } else {
        nextBtn.textContent = "다음 문항";
        nextBtn.onclick = handleNext;
    }
}

function saveAnswer(ans) {
    userAnswers[`${currentPartIndex}_${currentQIndex}`] = ans;
    // 서버로 실시간 전송 (선생님 모니터링용)
    socket.emit('liveAnswer', { part: currentPartIndex + 1, qIndex: currentQIndex, answer: ans });
}

function handleNext() { currentQIndex++; renderQuestion(); }
function handlePrev() { currentQIndex--; renderQuestion(); }

function moveToNextPart() {
    clearInterval(timerInterval);
    currentPartIndex++;
    if (currentPartIndex < partsInfo.length) {
        showPartDirection();
    } else {
        // 모든 파트 종료
        switchScreen('result-screen');
    }
}

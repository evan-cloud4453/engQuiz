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

// =====================================
// 1. 오디오 로직 (원본 유지)
// =====================================
const bgm = document.getElementById('bgm');
const quizBgm = document.getElementById('quiz-bgm');
const soundCorrect = document.getElementById('sound-correct');
const soundWrong = document.getElementById('sound-wrong');
    
let isBGMMuted = false; let isSFXMuted = false; let bgmStarted = false;
bgm.volume = 0.3; quizBgm.volume = 0.3; soundCorrect.volume = 0.3; soundWrong.volume = 0.3;

function updateBGMVolume(vol) { bgm.volume = vol; quizBgm.volume = vol; if (vol > 0 && isBGMMuted) toggleBGMMute(); }
function updateSFXVolume(vol) { soundCorrect.volume = vol; soundWrong.volume = vol; if (vol > 0 && isSFXMuted) toggleSFXMute(); }

function toggleBGMMute() {
    isBGMMuted = !isBGMMuted; bgm.muted = isBGMMuted; quizBgm.muted = isBGMMuted;
    const btn = document.getElementById('mute-bgm-btn');
    btn.textContent = isBGMMuted ? '켜기' : '음소거';
    btn.style.color = isBGMMuted ? 'var(--wrong-color)' : 'var(--accent-color)';
    if(bgmStarted && !isBGMMuted) {
        if(document.getElementById('quiz-screen').classList.contains('active')) quizBgm.play().catch(()=>{});
        else bgm.play().catch(()=>{});
    }
}
function toggleSFXMute() {
    isSFXMuted = !isSFXMuted; soundCorrect.muted = isSFXMuted; soundWrong.muted = isSFXMuted;
    const btn = document.getElementById('mute-sfx-btn');
    btn.textContent = isSFXMuted ? '켜기' : '음소거';
    btn.style.color = isSFXMuted ? 'var(--wrong-color)' : 'var(--accent-color)';
}

// =====================================
// 2. 커스텀 팝업 (모달) 로직
// =====================================
function customAlert(msg, callback) {
    document.getElementById('modal-msg').innerHTML = msg;
    document.getElementById('modal-btn-no').style.display = 'none';
    const yesBtn = document.getElementById('modal-btn-yes');
    yesBtn.onclick = () => { document.getElementById('custom-modal').style.display = 'none'; if(callback) callback(); };
    document.getElementById('custom-modal').style.display = 'flex';
}

function customConfirm(msg, yesCallback) {
    document.getElementById('modal-msg').innerHTML = msg;
    document.getElementById('modal-btn-no').style.display = 'inline-block';
    const yesBtn = document.getElementById('modal-btn-yes');
    const noBtn = document.getElementById('modal-btn-no');
    
    yesBtn.onclick = () => { document.getElementById('custom-modal').style.display = 'none'; if(yesCallback) yesCallback(); };
    noBtn.onclick = () => { document.getElementById('custom-modal').style.display = 'none'; };
    document.getElementById('custom-modal').style.display = 'flex';
}

// =====================================
// 4. 앱 로직 및 소켓 통신
// =====================================
const socket = io();
let currentRole = '';
let myName = '';
let currentPartIndex = 0; let currentQIndex = 0; let remainingTime = 0;
let timerInterval = null; let userAnswers = {}; 

let globalRecords = []; 
// let myLocalRecords = JSON.parse(localStorage.getItem('myVocabRecords')) || []; 

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);

    if(!bgmStarted) return;
    if (id === 'quiz-screen') { bgm.pause(); quizBgm.play().catch(()=>{}); } 
    else { quizBgm.pause(); bgm.play().catch(()=>{}); }
}

function showLoginForm(role) {
    document.getElementById('main-menu-btns').style.display = 'none';
    document.getElementById('student-form').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('teacher-form').style.display = role === 'teacher' ? 'block' : 'none';
    
    if(!bgmStarted) { bgm.play().catch(()=>{}); bgmStarted = true; }
}

function cancelLogin() {
    document.getElementById('student-form').style.display = 'none';
    document.getElementById('teacher-form').style.display = 'none';
    document.getElementById('main-menu-btns').style.display = 'block';
}

function login(role) {
    const data = { role: role };
    if (role === 'student') {
        data.name = document.getElementById('student-name').value.trim();
        if(!data.name) { customAlert("이름을 입력해주세요."); return; }
    } else {
        data.password = document.getElementById('teacher-pw').value;
        if(!data.password) { customAlert("비밀번호를 입력해주세요."); return; }
    }
    socket.emit('login', data);
}

socket.on('loginSuccess', (data) => {
    currentRole = data.role;
    const badge = document.getElementById('mode-badge');
    badge.style.display = 'block';

    if (currentRole === 'teacher') {
        badge.textContent = '감독관 모드'; 
        badge.className = 'mode-teacher';
        switchScreen('teacher-screen');
    } else {
        myName = data.name;
        badge.textContent = `수험자: ${myName}`; 
        badge.className = 'mode-student';
        switchScreen('waiting-screen');
    }
});
socket.on('loginFail', (msg) => customAlert(msg));

// 선생님 현황판
socket.on('updateStudents', (students) => {
    if (currentRole !== 'teacher') return;
    const container = document.getElementById('student-list');
    container.innerHTML = '';
    
    if (Object.keys(students).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">접속한 학생이 없습니다.</p>';
        return;
    }

    Object.values(students).forEach(st => {
        const card = document.createElement('div');
        card.className = 'student-card';
        let statusText = '대기중'; let statusColor = 'var(--accent-color)';
        let actionBtn = `<button onclick="socket.emit('startTest', '${st.id}')" class="btn btn-inline">시험 승인</button>`;
        let progressInfo = '-';

        if (st.status === 'testing') {
            statusText = '응시중'; statusColor = 'var(--correct-color)';
            actionBtn = `<button onclick="socket.emit('togglePause', '${st.id}')" class="btn outline btn-inline" style="border-color:var(--wrong-color); color:var(--wrong-color);">일시 정지</button>`;
            progressInfo = `Part ${st.currentPart} 진행 중`;
        } else if (st.status === 'paused') {
            statusText = '정지됨'; statusColor = 'var(--wrong-color)';
            actionBtn = `<button onclick="socket.emit('togglePause', '${st.id}')" class="btn outline btn-inline" style="border-color:var(--correct-color); color:var(--correct-color);">시험 재개</button>`;
            progressInfo = `Part ${st.currentPart} 정지됨`;
        } else if (st.status === 'waiting_approval') {
            statusText = '최종 제출(승인대기)'; statusColor = '#ffdc73';
            actionBtn = `<button onclick="socket.emit('approveTest', '${st.id}')" class="btn btn-inline" style="background-color:var(--correct-color); color:#000;">최종 종료 승인</button>`;
            progressInfo = `모든 파트 제출 완료`;
        } else if (st.status === 'completed') {
            statusText = '채점 완료'; statusColor = 'var(--text-muted)';
            actionBtn = `<span style="color:var(--text-muted); font-size:0.9em;">저장 완료</span>`;
            progressInfo = `점수: ${st.finalData.score} / ${st.finalData.total}`;
        }

        card.innerHTML = `
            <h3>${st.name} <span class="student-status" style="color:${statusColor};">${statusText}</span></h3>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
                <div style="color: var(--text-muted); font-size: 0.95em;">진척도: <span style="color:var(--text-main);">${progressInfo}</span></div>
                <div>${actionBtn}</div>
            </div>
        `;
        container.appendChild(card);
    });
});

socket.on('updateRecords', (records) => { globalRecords = records; });

// ★ [수정됨] 시험 시작 시 서버에서 엑셀 데이터를 받아 덮어쓰는 로직
socket.on('testStarted', (serverQuizData) => { 
    if (serverQuizData) {
        partsInfo = serverQuizData; // 활성화된 엑셀 시험지로 교체
    }
    
    // 만약 엑셀 데이터도 없고 기본 데이터도 없으면 차단
    if (!partsInfo || partsInfo.length === 0) { 
        customAlert("현재 배정된 시험지가 없습니다. 감독관에게 문의하세요."); 
        return; 
    }
    
    currentPartIndex = 0; 
    showPartDirection(); 
});

socket.on('testPaused', () => { clearInterval(timerInterval); document.getElementById('pause-overlay').style.display = 'flex'; });
socket.on('testResumed', () => { document.getElementById('pause-overlay').style.display = 'none'; startTimer(); });

socket.on('testApproved', (record) => {
    document.getElementById('res-score').textContent = record.score;
    document.getElementById('res-total').textContent = record.total;
    switchScreen('result-screen');
});

// 단어 철자 무작위 섞기 함수
function scrambleWord(word) {
    let arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join(', ');
}

function showPartDirection() {
    const partData = partsInfo[currentPartIndex];
    document.getElementById('dir-title').textContent = partData.title;
    document.getElementById('dir-desc').innerHTML = partData.instruction;
    document.getElementById('dir-time').textContent = `${Math.floor(partData.timeLimit / 60)}분`;
    
    const exBox = document.getElementById('dir-example');
    exBox.innerHTML = '';
    
    if(partData.example) {
        // 단어 뜻 묻는 파트(1,3,5)는 중앙정렬 및 크게
        if(currentPartIndex === 0 || currentPartIndex === 2 || currentPartIndex === 4) {
            exBox.className = "mini-quiz centered-example";
        } else {
            exBox.className = "mini-quiz";
        }

        let exHtml = '';
        if (currentPartIndex === 4) {
            let scrambled = scrambleWord(partData.example.answer);
            exHtml = `<div class="mini-q">Q. ${partData.example.q} <br><span style="font-size:0.7em; color:var(--text-muted); font-weight:normal;">( ${scrambled} )</span></div>`;
        } else {
            exHtml = `<div class="mini-q">Q. ${partData.example.q}</div>`;
        }

        if (partData.example.options) {
            partData.example.options.forEach(opt => {
                let hlClass = (opt === partData.example.answer) ? 'highlight' : '';
                exHtml += `<div class="mini-opt ${hlClass}">${opt}</div>`;
            });
        } else {
            exHtml += `<div class="mini-opt highlight" style="text-align:center;">정답 입력 예시: ${partData.example.answer}</div>`;
        }
        exBox.innerHTML = exHtml;
        exBox.style.display = 'block';
    } else {
        exBox.style.display = 'none';
    }

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
            customAlert("시간이 초과되어 다음 단계로 강제 이동합니다.", () => { moveToNextPart(true); });
        }
    }, 1000);
}

function renderProgress() {
    const container = document.getElementById('progress-container');
    container.innerHTML = '';
    const partData = partsInfo[currentPartIndex];
    
    partData.questions.forEach((_, i) => {
        const box = document.createElement('div');
        box.className = 'progress-box';
        if (i === currentQIndex) box.classList.add('current');
        
        const savedAns = userAnswers[`${currentPartIndex}_${i}`];
        if (savedAns !== undefined && savedAns.trim() !== '') {
            box.classList.add('solved');
        } else if (i < currentQIndex || savedAns === '') { 
            box.classList.add('unsolved');
        }
        container.appendChild(box);
    });
}

function renderQuestion() {
    renderProgress(); 
    const partData = partsInfo[currentPartIndex];
    const qData = partData.questions[currentQIndex];
    const isLastQ = (currentQIndex === partData.questions.length - 1);
    
    document.getElementById('quiz-part-title').textContent = `${partData.title} (${currentQIndex + 1} / ${partData.questions.length})`;
    
    const qWrapper = document.getElementById('question-wrapper');
    const qContent = document.getElementById('question-text-content');
    const optContainer = document.getElementById('options-container');
    const textInput = document.getElementById('text-answer');
    
    optContainer.innerHTML = ''; textInput.style.display = 'none'; textInput.value = '';

    if (currentPartIndex === 0 || currentPartIndex === 2 || currentPartIndex === 4) {
        qWrapper.classList.add('centered');
        document.getElementById('q-number').style.display = 'none';
    } else {
        qWrapper.classList.remove('centered');
        document.getElementById('q-number').style.display = 'inline';
    }

    if (currentPartIndex === 4) { 
        let scrambled = scrambleWord(qData.answer);
        qContent.innerHTML = `${qData.q} <br><span style="font-size:0.7em; color:var(--text-muted); font-weight:normal;">( ${scrambled} )</span>`;
    } else {
        qContent.innerHTML = qData.q.replace(/\n/g, '<br>');
    }
    
    const savedAnswer = userAnswers[`${currentPartIndex}_${currentQIndex}`];

    if (qData.options) {
        optContainer.style.display = 'flex';
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
        textInput.style.display = 'block';
        if (savedAnswer) textInput.value = savedAnswer;
        textInput.oninput = (e) => saveAnswer(e.target.value);
    }

    document.getElementById('prev-btn').style.visibility = currentQIndex === 0 ? 'hidden' : 'visible';
    const nextBtn = document.getElementById('next-btn');
    if (isLastQ) {
        nextBtn.textContent = "현재 파트 제출"; nextBtn.style.color = "#000"; nextBtn.className = "btn btn-inline";
    } else {
        nextBtn.textContent = "다음 문항 →"; nextBtn.className = "btn outline btn-inline"; nextBtn.style.color = "";
    }
    socket.emit('updateProgress', { part: currentPartIndex + 1, qIndex: currentQIndex + 1 });
}

function saveAnswer(ans) { 
    userAnswers[`${currentPartIndex}_${currentQIndex}`] = ans; 
    renderProgress();
}

function handleNextClick() {
    const isLastQ = (currentQIndex === partsInfo[currentPartIndex].questions.length - 1);
    if (isLastQ) {
        const partData = partsInfo[currentPartIndex];
        let hasUnsolved = false;
        for(let i=0; i<partData.questions.length; i++) {
            if(!userAnswers[`${currentPartIndex}_${i}`] || userAnswers[`${currentPartIndex}_${i}`].trim() === '') {
                hasUnsolved = true; break;
            }
        }
        if(hasUnsolved) {
            customConfirm("풀지 않은 문제가 존재합니다. 다시 한 번 확인해주세요.<br><br>그래도 제출하시겠습니까?", () => moveToNextPart());
        } else {
            customConfirm("제출 이후에는 수정이 불가합니다. 이 파트를 제출하시겠습니까?", () => moveToNextPart());
        }
    } else {
        currentQIndex++; renderQuestion();
    }
}
function handlePrev() { currentQIndex--; renderQuestion(); }

function moveToNextPart(isForced = false) {
    clearInterval(timerInterval);
    currentPartIndex++;
    if (currentPartIndex < partsInfo.length) {
        showPartDirection();
    } else {
        let details = []; let score = 0; let total = 0;
        partsInfo.forEach((part, pIdx) => {
            part.questions.forEach((qData, qIdx) => {
                let uAns = userAnswers[`${pIdx}_${qIdx}`];
                let isCorrect = false;

                if (uAns && uAns.trim() !== '') {
                    // 대소문자 무시 치환 검사
                    let cleanUser = uAns.trim().toLowerCase();
                    let cleanCorrect = qData.answer.trim().toLowerCase();
                    isCorrect = (cleanUser === cleanCorrect);
                } else {
                    uAns = "미입력";
                }

                if(isCorrect) score++;
                total++;
                details.push({
                    partTitle: part.title,
                    q: qData.q,
                    userAns: uAns,
                    correctAns: qData.answer,
                    isCorrect: isCorrect
                });
            });
        });
        console.log("서버 전송 데이터:", { score, total, details }); 
        socket.emit('submitTest', { score, total, details });
        switchScreen('waiting-approval-screen');
    }
}

// =====================================
// 기록 열람 및 삭제 로직
// =====================================
function showStudentRecords() {
    if(!myName) {
        customAlert("이름을 먼저 입력한 후 내 기록을 열람해주세요.");
        return;
    }
    // ★ 로컬이 아닌 서버 데이터(globalRecords)에서 내 기록만 필터링합니다.
    const myRecords = globalRecords.filter(r => r.studentName === myName);
    document.getElementById('records-title').textContent = `${myName}님의 기록`;
    
    // ★ 학생은 기록 삭제를 할 수 없도록 삭제 버튼 영역을 비워둡니다.
    document.getElementById('record-delete-area').innerHTML = '';

    renderRecordList(myRecords, 'student');
    switchScreen('records-screen');
}

function goBackFromRecords() {
    switchScreen(currentRole === 'teacher' ? 'teacher-screen' : 'waiting-screen');
}

// 학생 로그아웃(메인으로 나가기) 기능 추가
function logoutStudent() {
    // 모든 상태와 소켓 연결을 가장 완벽하게 초기화하는 방법
    location.reload(); 
}

function showTeacherRecords() {
    document.getElementById('records-title').textContent = "모든 학생 제출 기록";
    
    const delArea = document.getElementById('record-delete-area');
    delArea.innerHTML = `<button class="btn outline btn-inline" style="padding: 5px 15px; font-size:0.85em; border-color:var(--wrong-color); color:var(--wrong-color);" onclick="clearAllServerRecords()">전체 기록 서버 삭제</button>`;

    renderRecordList(globalRecords, 'teacher');
    switchScreen('records-screen');
}

function renderRecordList(records, role) {
    const list = document.getElementById('records-list');
    list.innerHTML = '';
    if (records.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:30px;">보관된 기록이 없습니다.</p>';
        return;
    }
    
    [...records].reverse().forEach(rec => {
        const item = document.createElement('div');
        item.className = 'record-item';
        
        let nameTag = role === 'teacher' ? `<strong style="color:var(--accent-color); font-size:1.1em;">[${rec.studentName}]</strong><br>` : '';
        let delBtn = role === 'teacher' ? `<br><button onclick="deleteServerRecord(${rec.id})" style="margin-top:10px; background:none; border:none; color:var(--wrong-color); text-decoration:underline; cursor:pointer; font-family:'Noto Serif KR';">이 기록 삭제</button>` : '';

        item.innerHTML = `
            <div>
                ${nameTag}
                <span style="color:var(--text-muted); font-size:0.85em;">${rec.date}</span>
                <div style="margin-top:8px;">점수: <span style="color:var(--correct-color); font-weight:bold;">${rec.score}</span> / ${rec.total}</div>
                ${delBtn}
            </div>
            <button class="btn outline btn-inline" style="padding:10px; font-size:0.9em;" onclick="openReview(${rec.id}, '${role}')">상세 보기</button>
        `;
        list.appendChild(item);
    });
}

function clearMyLocalRecords(name) {
    customConfirm("정말로 내 기기에 저장된 기록을 영구 삭제하시겠습니까?", () => {
        myLocalRecords = myLocalRecords.filter(r => r.studentName !== name);
        localStorage.setItem('myVocabRecords', JSON.stringify(myLocalRecords));
        showStudentRecords();
    });
}

function clearAllData() {
    customConfirm("로컬 저장소의 모든 캐시 데이터를 삭제하시겠습니까?", () => {
        localStorage.removeItem('myVocabRecords');
        myLocalRecords = [];
        customAlert("삭제되었습니다.", () => location.reload());
    });
}

function clearAllServerRecords() {
    customConfirm("서버에 보관된 모든 학생의 기록을 영구 삭제하시겠습니까?", () => {
        socket.emit('deleteAllRecords');
        setTimeout(() => showTeacherRecords(), 300);
    });
}

function deleteServerRecord(id) {
    customConfirm("이 학생의 해당 기록을 삭제하시겠습니까?", () => {
        socket.emit('deleteRecord', id);
        setTimeout(() => showTeacherRecords(), 300);
    });
}

function openReview(recordId, role) {
    const records = globalRecords;
    const record = records.find(r => r.id === recordId);
    
    document.getElementById('review-title').textContent = `${record.studentName || '나'}의 오답노트`;
    const container = document.getElementById('review-content');
    container.innerHTML = '';

    let currentPartTitle = '';
    let qIndexInPart = 1;

    record.details.forEach((item) => {
        if(currentPartTitle !== item.partTitle) {
            currentPartTitle = item.partTitle;
            qIndexInPart = 1;
            const partHeader = document.createElement('div');
            partHeader.style.color = "var(--accent-color)";
            partHeader.style.fontSize = "1.1em";
            partHeader.style.fontWeight = "bold";
            partHeader.style.margin = "25px 0 10px 0";
            partHeader.style.borderBottom = "1px solid var(--border-color)";
            partHeader.style.paddingBottom = "5px";
            partHeader.textContent = `[ ${currentPartTitle} ]`;
            container.appendChild(partHeader);
        }

        const card = document.createElement('div');
        card.className = 'review-q-card';
        card.style.borderLeft = item.isCorrect ? '4px solid var(--correct-color)' : '4px solid var(--wrong-color)';
        
        const badgeClass = item.isCorrect ? 'badge correct' : 'badge wrong';
        
        // 스크램블 문제 괄호 제거
        let cleanQ = item.q.replace(/<br><span style='color:var\(--text-muted\); font-weight:normal;'>\(.*\)<\/span>/, "");

        card.innerHTML = `
            <div style="margin-bottom:15px; line-height:1.5;">
                <span class="${badgeClass}">${item.isCorrect ? '정답' : '오답'}</span>
                <strong style="font-size:1.1em; margin-left:8px;">Q${qIndexInPart}. ${cleanQ.replace(/\n/g, '<br>')}</strong>
            </div>
            <div style="font-size:0.95em; color:var(--text-muted);">
                나의 선택: <strong style="color:var(--text-main);">${item.userAns}</strong><br>
                실제 정답: <strong style="color:var(--correct-color);">${item.correctAns}</strong>
            </div>
        `;
        container.appendChild(card);
        qIndexInPart++;
    });
    switchScreen('review-screen');
}

function viewMyRecentRecord() {
    const nameInput = document.getElementById('student-name').value.trim();
    const myRecords = globalRecords.filter(r => r.studentName === myName);
    if(myRecords.length > 0) openReview(myRecords[myRecords.length-1].id, 'student');
}

// =====================================
// 5. 엑셀 업로드 및 문제 관리 알고리즘
// =====================================
function handleFileUpload(event) {
    const file = event.target.files[0];
    const quizName = document.getElementById('quiz-name-input').value.trim();
    
    if (!quizName) { customAlert("시험지 이름을 먼저 입력해주세요."); event.target.value = ''; return; }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, {defval: ""}); 

        // 알고리즘: 형식 변환 및 공백 예외 처리
        const parsedQuiz = parseExcelToQuiz(rows);

        if (!parsedQuiz) {
            customAlert("업로드 불가: 엑셀 파일 형식이 손상되었거나,<br>특정 Part의 문제가 완전히 누락되었습니다.");
        } else {
            socket.emit('uploadQuiz', { id: Date.now(), name: quizName, data: parsedQuiz });
            customAlert(`[${quizName}] 시험지가 성공적으로 저장되었습니다.`);
            document.getElementById('quiz-name-input').value = '';
        }
        event.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

function parseExcelToQuiz(rows) {
    let parts = [
        { title: "Part 1. 단순 의미 파악", timeLimit: 480, instruction: "제시된 영단어의 정확한 뜻을 고르시오.", questions: [] },
        { title: "Part 2. 동의어/반의어 파악", timeLimit: 420, instruction: "짝지어진 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", questions: [] },
        { title: "Part 3. 품사/의미 파악", timeLimit: 300, instruction: "제시된 단어의 정확한 품사와 뜻을 고르시오.", questions: [] },
        { title: "Part 4. 실전 문맥 파악", timeLimit: 900, instruction: "다음 문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.", questions: [] },
        { title: "Part 5. 철자 배열 (Scramble)", timeLimit: 540, instruction: "제시된 한글 뜻과 무작위 알파벳 단서를 보고 올바른 철자를 타이핑 하시오.", questions: [] },
        { title: "Part 6. 철자 입력 주관식", timeLimit: 960, instruction: "해석과 첫 글자 단서를 보고 문맥에 맞는 단어를 입력하시오.", questions: [] }
    ];

    rows.forEach(row => {
        let cleanRow = {};
        for(let key in row) cleanRow[key.trim()] = String(row[key]).trim();
        if (!cleanRow.Question || !cleanRow.Answer || !cleanRow.Part) return;

        const pIndex = parseInt(cleanRow.Part) - 1;
        if (pIndex >= 0 && pIndex < 6) {
            let qObj = { q: cleanRow.Question, answer: cleanRow.Answer };
            if (pIndex < 4) { 
                qObj.options = [cleanRow.OptionA, cleanRow.OptionB, cleanRow.OptionC, cleanRow.OptionD].filter(Boolean);
            }
            parts[pIndex].questions.push(qObj);
        }
    });

    // 안전장치: 한 파트라도 문제가 0개면 에러 처리
    for (let i = 0; i < 6; i++) {
        if (parts[i].questions.length === 0) return null; 
    }
    return parts;
}

socket.on('updateQuizzes', (quizzes) => {
    if(currentRole !== 'teacher') return;
    const list = document.getElementById('quiz-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(quizzes.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); font-size:0.9em;">저장된 시험지가 없습니다.</p>';
        return;
    }

    [...quizzes].reverse().forEach(q => {
        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `
            <div><strong style="color:var(--accent-color); font-size:1.1em;">📝 ${q.name}</strong></div>
            <div style="display:flex; gap:5px;">
                <button class="btn outline btn-inline" style="padding:6px 12px; font-size:0.85em; color:#fff;" onclick="socket.emit('setActiveQuiz', ${q.id})">이 시험지 활성화</button>
                <button class="btn outline btn-inline" style="padding:6px 12px; font-size:0.85em; border-color:var(--wrong-color); color:var(--wrong-color);" onclick="if(confirm('이 시험지를 영구 삭제하시겠습니까?')) socket.emit('deleteQuiz', ${q.id})">삭제</button>
            </div>
        `;
        list.appendChild(item);
    });
});

socket.on('activeQuizChanged', (quizName) => {
    if(currentRole === 'teacher') customAlert(`적용 완료: 이제 학생들은 [${quizName}] 시험을 보게 됩니다.`);
});

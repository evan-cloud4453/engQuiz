// =====================================
// 1. 오디오 및 기본 설정
// =====================================
const bgm = document.getElementById('bgm');
const quizBgm = document.getElementById('quiz-bgm');
const soundCorrect = document.getElementById('sound-correct');
const soundWrong = document.getElementById('sound-wrong');
    
let isBGMMuted = false; let isSFXMuted = false; let bgmStarted = false;
if(bgm) bgm.volume = 0.3; 
if(quizBgm) quizBgm.volume = 0.3; 
if(soundCorrect) soundCorrect.volume = 0.3; 
if(soundWrong) soundWrong.volume = 0.3;

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
// 2. 팝업 UI (모달)
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
// 3. 메인 앱 로직 및 소켓 통신
// =====================================
const socket = io();
let currentRole = '';
let myName = '';
let currentPartIndex = 0; let currentQIndex = 0; let remainingTime = 0;
let timerInterval = null; let userAnswers = {}; 
let globalRecords = []; 

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);

    if(!bgmStarted) return;
    if (id === 'quiz-screen') { if(bgm) bgm.pause(); if(quizBgm) quizBgm.play().catch(()=>{}); } 
    else { if(quizBgm) quizBgm.pause(); if(bgm) bgm.play().catch(()=>{}); }
}

function showLoginForm(role) {
    document.getElementById('main-menu-btns').style.display = 'none';
    document.getElementById('student-form').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('teacher-form').style.display = role === 'teacher' ? 'block' : 'none';
    
    if(!bgmStarted && bgm) { bgm.play().catch(()=>{}); bgmStarted = true; }
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

// =====================================
// 4. 감독관 현황판 관리
// =====================================
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

// =====================================
// 5. 학생 시험 진행 로직
// =====================================
socket.on('updateRecords', (records) => { globalRecords = records; });

// ★ 새로 추가: 서버에서 보내는 경고 메시지 알림창
socket.on('serverAlert', (msg) => {
    customAlert(msg);
});

socket.on('testStarted', (serverQuizData) => { 
    // 무조건 서버에서 준 활성화된 엑셀 데이터만 사용 (내장 문제 사용 금지)
    if (!serverQuizData || serverQuizData.length === 0) { 
        customAlert("현재 배정된 시험지가 없습니다. 감독관에게 문의하세요."); 
        return; 
    }
    
    partsInfo = serverQuizData; // 엑셀 데이터로 덮어쓰기
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
    
    // ★ 1. 조잡한 강조를 빼고 세련된 여백과 글자색으로만 총 문제 수 표시
    document.getElementById('dir-desc').innerHTML = `
        <div style="font-size:1.1em; color:var(--text-main); margin-bottom:8px;">${partData.instruction}</div>
        <div style="font-size:0.9em; color:var(--text-muted);">총 문항 수 : ${partData.questions.length}문제</div>
    `;
    
    document.getElementById('dir-time').textContent = `${Math.floor(partData.timeLimit / 60)}분`;
    
    const exBox = document.getElementById('dir-example');
    exBox.innerHTML = '';
    
    if(partData.example) {
        if(currentPartIndex === 0 || currentPartIndex === 2 || currentPartIndex === 4) {
            exBox.className = "mini-quiz centered-example";
        } else {
            exBox.className = "mini-quiz";
        }

        let formattedExQ = formatBlanks(partData.example.q).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        
        // ★ 1. 예시 문항이라는 점을 투박한 배지 대신 세련된 텍스트로 안내
        let exHtml = `<div style="text-align:left; color:var(--text-muted); font-size:0.85em; margin-bottom:5px;">[ 예시 문항 ]</div>`;
        if(currentPartIndex === 0 || currentPartIndex === 2 || currentPartIndex === 4) {
            exHtml = `<div style="text-align:center; color:var(--text-muted); font-size:0.85em; margin-bottom:10px;">[ 예시 문항 ]</div>`;
        }

        if (currentPartIndex === 4) {
            let scrambled = scrambleWord(partData.example.answer);
            exHtml += `<div class="mini-q">Q. ${formattedExQ} <br><span style="font-size:0.75em; color:var(--text-muted);">( 단서: ${scrambled} )</span></div>`;
        } else {
            exHtml += `<div class="mini-q">Q. ${formattedExQ}</div>`;
        }

        if (partData.example.options) {
            partData.example.options.forEach(opt => {
                let hlClass = (opt === partData.example.answer) ? 'highlight' : '';
                exHtml += `<div class="mini-opt ${hlClass}">${opt}</div>`;
            });
        } else {
            exHtml += `<div class="mini-opt highlight" style="text-align:center; margin-top:10px;">정답 입력 예시: ${partData.example.answer}</div>`;
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
    const totalQ = partData.questions.length;
    
    // ★ 3. 비대칭 해결 알고리즘: 문제 수를 정확히 반으로 나누어 CSS Grid로 강제 정렬
    let cols = totalQ;
    if (totalQ > 15) {
        cols = Math.ceil(totalQ / 2); // 예: 30개면 15개씩 2줄로 완벽히 분할
    }
    
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gap = '5px';
    
    partData.questions.forEach((_, i) => {
        const box = document.createElement('div');
        box.className = 'progress-box';
        
        if (i === currentQIndex) box.classList.add('current');
        
        const savedAns = userAnswers[`${currentPartIndex}_${i}`];
        
        // ★ 2. 노란색 사라짐 버그 해결 로직
        if (savedAns !== undefined && savedAns.trim() !== '') {
            // 정답을 입력한 확실한 상태 = 초록색
            box.classList.add('solved');
        } else { 
            // 아직 도달하지 않았거나, 도달했다가 빈칸으로 둔 모든 경우 = 무조건 노란색 유지
            box.classList.add('unsolved');
        }
        
        box.onclick = () => { 
            currentQIndex = i; 
            renderQuestion(); 
        };
        
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
    textInput.oninput = null; // 이벤트 초기화

    if (currentPartIndex === 0 || currentPartIndex === 2 || currentPartIndex === 4) {
        qWrapper.classList.add('centered');
        document.getElementById('q-number').style.display = 'none';
    } else {
        qWrapper.classList.remove('centered');
        document.getElementById('q-number').style.display = 'inline';
    }

    // ★ 3. 언더바 통일 적용
    let formattedQ = formatBlanks(qData.q).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    const savedAnswer = userAnswers[`${currentPartIndex}_${currentQIndex}`] || "";
    
    if (currentPartIndex === 4) { 
        // ★ 6. Part 5 실시간 철자 하이라이트 기능 추가
        // 단어를 배열로 쪼개서 각각의 스팬(span) 태그로 감쌉니다.
        let scrambledArr = scrambleWord(qData.answer).split(', '); 
        let hintHtml = scrambledArr.map((char, idx) => `<span class="hint-letter" id="hint-${idx}">${char}</span>`).join('');
        
        qContent.innerHTML = `${formattedQ} <br><div style="margin-top:20px; font-size:0.85em; text-align:center;">${hintHtml}</div>`;
        
        textInput.style.display = 'block';
        textInput.value = savedAnswer;
        
        // 입력할 때마다 정답 저장 및 하이라이트 업데이트
        textInput.oninput = (e) => {
            saveAnswer(e.target.value);
            updateScrambleHints(e.target.value, scrambledArr);
        };
        // 화면 처음 뜰 때 기존 입력값이 있으면 하이라이트 적용
        updateScrambleHints(savedAnswer, scrambledArr);
        
    } else {
        qContent.innerHTML = formattedQ;
        
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
            textInput.value = savedAnswer;
            textInput.oninput = (e) => saveAnswer(e.target.value);
        }
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

// ★ 6. Part 5 실시간 하이라이트를 위한 알고리즘 함수 (새로 추가)
function updateScrambleHints(typedText, scrambledArr) {
    let typedChars = typedText.toLowerCase().replace(/\s/g, '').split('');
    
    document.querySelectorAll('.hint-letter').forEach((el) => {
        let char = el.textContent.toLowerCase();
        let matchIdx = typedChars.indexOf(char);
        
        if (matchIdx !== -1) {
            typedChars.splice(matchIdx, 1); // 사용한 철자는 배열에서 제거
            el.classList.add('used'); // 파란색 불 켜기
        } else {
            el.classList.remove('used'); // 불 끄기
        }
    });
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
            customConfirm("풀지 않은 문제가 존재합니다. 다시 한 번 확인해주세요.<br>그래도 제출하시겠습니까?", () => moveToNextPart());
        } else {
            customConfirm("제출 이후에는 수정이 불가능합니다.<br>이 파트를 제출하시겠습니까?", () => moveToNextPart());
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
// 6. 기록 열람 및 삭제 로직
// =====================================
function showStudentRecords() {
    if(!myName) { customAlert("이름을 먼저 입력한 후 기록을 열람해주세요."); return; }
    reviewReturnScreen = 'waiting-screen'; // ★ 대기실에서 왔다고 기록
    const myRecords = globalRecords.filter(r => r.studentName === myName);
    document.getElementById('records-title').textContent = `${myName}님의 기록`;
    document.getElementById('record-delete-area').innerHTML = '';
    renderRecordList(myRecords, 'student');
    switchScreen('records-screen');
}

function goBackFromRecords() { switchScreen(currentRole === 'teacher' ? 'teacher-screen' : 'waiting-screen'); }

function logoutStudent() { location.reload(); }

function showTeacherRecords() {
    reviewReturnScreen = 'teacher-screen'; // ★ 선생님 화면에서 왔다고 기록
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

function clearAllData() {
    customConfirm("로컬 저장소의 모든 데이터를 삭제하시겠습니까?", () => {
        localStorage.clear();
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
    const record = globalRecords.find(r => r.id === recordId);
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
            partHeader.style.cssText = "color:var(--accent-color); font-size:1.1em; font-weight:bold; margin:25px 0 10px 0; border-bottom:1px solid var(--border-color); padding-bottom:5px;";
            partHeader.textContent = `[ ${currentPartTitle} ]`;
            container.appendChild(partHeader);
        }

        const card = document.createElement('div');
        card.className = 'review-q-card';
        card.style.borderLeft = item.isCorrect ? '4px solid var(--correct-color)' : '4px solid var(--wrong-color)';
        
        const badgeClass = item.isCorrect ? 'badge correct' : 'badge wrong';
        let cleanQ = item.q.replace(/<br><span style='color:var\(--text-muted\); font-weight:normal;'>\(.*\)<\/span>/, "");
        let formattedReviewQ = cleanQ.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

        card.innerHTML = `
            <div style="margin-bottom:15px; line-height:1.5;">
                <span class="${badgeClass}">${item.isCorrect ? '정답' : '오답'}</span>
                <strong style="font-size:1.1em; margin-left:8px;">Q${qIndexInPart}. ${formattedReviewQ}</strong>
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
    reviewReturnScreen = 'result-screen'; // ★ 결과 화면에서 왔다고 기록
    const myRecords = globalRecords.filter(r => r.studentName === myName);
    if(myRecords.length > 0) openReview(myRecords[myRecords.length-1].id, 'student');
}

// =====================================
// 7. 엑셀 업로드 및 문제 관리
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
    // 기존 data.js에 있던 예시, 안내문, 제한시간을 모두 포함하여 기본 뼈대를 튼튼하게 만듭니다.
    let parts = [
        { 
            title: "Part 1. 단순 의미 파악", timeLimit: 480, instruction: "제시된 영단어의 정확한 뜻을 고르시오.", 
            example: { q: "inadvertently", options: ["(A) 꼼꼼하게, 세심하게", "(B) 점차로, 서서히", "(C) 무심코, 부주의하게", "(D) 주목할 만하게"], answer: "(C) 무심코, 부주의하게" },
            questions: [] 
        },
        { 
            title: "Part 2. 동의어/반의어 파악", timeLimit: 420, instruction: "다음 중 짝지어진 단어의 관계(동의어/반의어)가 <b>나머지 셋과 다른 하나</b>를 고르시오.", 
            example: { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) abandon - give up", "(B) reduce - decrease", "(C) expand - contract", "(D) distinguish - differentiate"], answer: "(C) expand - contract" },
            questions: [] 
        },
        { 
            title: "Part 3. 품사/의미 파악", timeLimit: 300, instruction: "제시된 영단어의 올바른 품사와 뜻이 바르게 짝지어진 보기를 고르시오. (명사: n. / 동사: v. / 형용사: adj. / 부사: ad.)", 
            example: { q: "consistently", options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) ad. 지속적으로, 일관되게"], answer: "(D) ad. 지속적으로, 일관되게" },
            questions: [] 
        },
        { 
            title: "Part 4. 실전 문맥 파악", timeLimit: 900, instruction: "다음 문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.", 
            example: { q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.", options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"], answer: "(B) spaciously" },
            questions: [] 
        },
        { 
            title: "Part 5. 철자 배열 (Scramble)", timeLimit: 540, instruction: "제시된 한글 뜻과 무작위로 섞인 알파벳 단서를 보고, 올바른 영단어 철자를 <b>직접 타이핑</b> 하시오.", 
            example: { q: "할당하다, 배정하다", answer: "allocate" },
            questions: [] 
        },
        { 
            title: "Part 6. 철자 입력 주관식", timeLimit: 960, instruction: "해석과 첫 글자 단서를 보고, 문맥에 맞는 단어를 <b>정확한 철자로</b> 입력하시오.", 
            example: { q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)", answer: "promoted" },
            questions: [] 
        }
    ];

    rows.forEach(row => {
        let cleanRow = {};
        for(let key in row) cleanRow[key.trim()] = String(row[key]).trim();
        if (!cleanRow.Question || !cleanRow.Answer || !cleanRow.Part) return;

        // 예시 문구(※)가 포함된 설명용 행은 건너뛰기
        if (cleanRow.Question.includes("※")) return;

        const pIndex = parseInt(cleanRow.Part) - 1;
        if (pIndex >= 0 && pIndex < 6) {
            let qObj = { q: cleanRow.Question, answer: cleanRow.Answer };
            if (pIndex < 4) { 
                qObj.options = [cleanRow.OptionA, cleanRow.OptionB, cleanRow.OptionC, cleanRow.OptionD].filter(Boolean);
            }
            parts[pIndex].questions.push(qObj);
        }
    });

    for (let i = 0; i < 6; i++) {
        if (parts[i].questions.length === 0) return null; 
    }
    return parts;
}

// --- [새로 추가] 헬퍼 함수 및 변수 ---
let reviewReturnScreen = 'records-screen'; // 8. 오답노트 복귀 화면 추적용

// 3. 빈칸을 언더바(_)로 통일하는 함수 (3개 이상의 - 또는 _ 를 찾아 통일)
function formatBlanks(text) {
    return text.replace(/[-_]{3,}/g, '_______');
}

// 8. 오답노트에서 뒤로가기 누를 때 원래 있던 곳으로 이동
function goBackFromReview() {
    switchScreen(reviewReturnScreen);
}

// =====================================
// [새로 추가] 엑셀 템플릿 다운로드 기능
// =====================================
function downloadExcelTemplate() {
    const headers = ["Part", "Question", "OptionA", "OptionB", "OptionC", "OptionD", "Answer"];
    
    // 사용자에게 보여줄 주석(가이드) 행 데이터 생성
    const exampleRow1 = [
        "1", 
        "meticulously (※이 줄은 객관식 예시입니다. 지우고 문제를 입력하세요)", 
        "(A) 완전히, 전부 합하여", "(B) 꼼꼼하게, 세심하게", "(C) 합작으로", "(D) 압도적으로", 
        "(B) 꼼꼼하게, 세심하게"
    ];
    const emptyRow1 = ["1", "", "", "", "", "", ""];
    
    const exampleRow5 = [
        "5",
        "호환이 되는, 화합할 수 있는 (※주관식은 Option칸을 비워둡니다)",
        "", "", "", "",
        "compatible"
    ];
    const emptyRow5 = ["5", "", "", "", "", "", ""];

    // 시트 생성 및 파일 다운로드 트리거
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow1, emptyRow1, exampleRow5, emptyRow5]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz_Template");
    
    XLSX.writeFile(wb, "Vocab_Quiz_Template.xlsx");
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
        
        // ★ 네이티브 confirm() 대신 시스템 UI 모달인 customConfirm()으로 교체
        item.innerHTML = `
            <div><strong style="color:var(--accent-color); font-size:1.1em;">${q.name}</strong></div>
            <div style="display:flex; gap:5px;">
                <button class="btn outline btn-inline" style="padding:6px 12px; font-size:0.85em; color:#fff;" onclick="socket.emit('setActiveQuiz', ${q.id})">활성화</button>
                <button class="btn outline btn-inline" style="padding:6px 12px; font-size:0.85em; border-color:var(--wrong-color); color:var(--wrong-color);" onclick="customConfirm('시험지를 영구 삭제하시겠습니까?', () => socket.emit('deleteQuiz', ${q.id}))">삭제</button>
            </div>
        `;
        list.appendChild(item);
    });
});

socket.on('activeQuizChanged', (quizName) => {
    if(currentRole === 'teacher') customAlert(`학생들은 [${quizName}] 시험을 보게 됩니다.`);
});

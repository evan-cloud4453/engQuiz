const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const mongoose = require('mongoose'); // ★ 추가

// 1. DB 연결 (복사한 주소를 안에 넣으세요)
mongoose.connect(process.env.MONGO_URI);

// 2. 데이터 구조(Schema) 설정
const recordSchema = new mongoose.Schema({
    id: Number,
    studentName: String,
    date: String,
    score: Number,
    total: Number,
    details: Array
});
const Record = mongoose.model('Record', recordSchema);

const quizSchema = new mongoose.Schema({
    id: Number,
    name: String,
    data: Array
});
const Quiz = mongoose.model('Quiz', quizSchema);

let testRecords = []; 
let quizzes = [];
let activeQuizData = null;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let students = {}; 
let teacherSocketId = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 로그인
    socket.on('login', (data) => {
        if (data.role === 'teacher') {
            if (data.password === 'admin123') { 
            teacherSocketId = socket.id;
            socket.emit('loginSuccess', { role: 'teacher' });
            
            // ★ 핵심 수정: 우체국(Room)을 거치지 않고 직통(socket)으로 순서대로 보냅니다!
            socket.emit('updateStudents', students);
            socket.emit('updateRecords', testRecords);
            socket.emit('updateQuizzes', quizzes);
        } else {
                socket.emit('loginFail', '비밀번호가 틀렸습니다.');
            }
        } else if (data.role === 'student') {
            const name = data.name;
            const isExist = Object.values(students).find(s => s.name === name);
            if (isExist) {
                socket.emit('loginFail', '이미 접속 중인 이름입니다.');
                return;
            }
            
            students[socket.id] = {
                id: socket.id,
                name: name,
                status: 'waiting',
                currentPart: 1,
                currentQ: 1,
                finalData: null
            };
            
            socket.emit('loginSuccess', { role: 'student', name: name });
            socket.emit('updateRecords', testRecords);
            
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // ★ 학생 시험 승인 로직 (방어 코드 추가됨)
    socket.on('startTest', (studentId) => {
        if (socket.id === teacherSocketId) {
            
            // [추가된 로직] 활성화된 문제지가 없는 경우 차단!
            if (!activeQuizData || activeQuizData.length === 0) {
                if (quizzes.length === 0) {
                    // 저장된 엑셀이 아예 없을 때
                    socket.emit('serverAlert', '적용할 문제가 없습니다. <br>문제를 업로드 후 [활성화]해 주세요.');
                } else {
                    // 엑셀은 있는데 [활성화] 버튼을 안 눌렀을 때
                    socket.emit('serverAlert', '문제지 [활성화]가 되지 않았습니다. <br>문제 관리소에서 [활성화]를 눌러주세요.');
                }
                return; // 여기서 즉시 중단 (학생에게 안 넘어감)
            }

            // 문제지가 정상 적용되어 있으면 시험 시작
            if (students[studentId]) {
                students[studentId].status = 'testing';
                io.to(studentId).emit('testStarted', activeQuizData);
                io.to(teacherSocketId).emit('updateStudents', students);
            }
        }
    });

    // 퀴즈 업로드, 삭제, 활성화 이벤트
    // ★ 엑셀 시험지 업로드 (DB 저장)
    socket.on('uploadQuiz', async (quizData) => { 
        if (socket.id === teacherSocketId) {
            // [핵심 수정] 서버에서 억지로 합치던 로직을 제거하고, 
            // index.html에서 예시문과 합쳐서 보낸 데이터를 그대로 DB에 저장합니다!
            const newQuiz = new Quiz({
                id: quizData.id,
                name: quizData.name,
                data: quizData.data 
            });
            await newQuiz.save(); // DB에 영구 저장!
            
            quizzes.push(quizData);
            io.emit('updateQuizzes', quizzes);
        }
    });

    // ★ 엑셀 시험지 삭제 (DB 삭제)
    socket.on('deleteQuiz', async (quizId) => { // async 추가
        if (socket.id === teacherSocketId) {
            await Quiz.deleteOne({ id: quizId }); // DB에서도 영구 삭제!
            
            quizzes = quizzes.filter(q => q.id !== quizId);
            io.emit('updateQuizzes', quizzes);
        }
    });

    socket.on('setActiveQuiz', (quizId) => {
        if (socket.id === teacherSocketId) {
            const target = quizzes.find(q => q.id === quizId);
            if(target) {
                activeQuizData = target.data;
                socket.emit('activeQuizChanged', target.name);
            }
        }
    });

    socket.on('togglePause', (studentId) => {
        if (students[studentId]) {
            if (students[studentId].status === 'testing') {
                students[studentId].status = 'paused';
                io.to(studentId).emit('testPaused');
            } else if (students[studentId].status === 'paused') {
                students[studentId].status = 'testing';
                io.to(studentId).emit('testResumed');
            }
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    socket.on('updateProgress', (data) => {
        if (students[socket.id]) {
            students[socket.id].currentPart = data.part;
            students[socket.id].currentQ = data.qIndex;
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    socket.on('submitTest', (finalData) => {
        if (students[socket.id]) {
            students[socket.id].status = 'waiting_approval';
            students[socket.id].finalData = finalData;
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    socket.on('approveTest', async (studentId) => { 
        let st = students[studentId];
        if (st && st.status === 'waiting_approval') {
            st.status = 'completed';
            const recordData = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                studentName: st.name,
                date: new Date().toLocaleString(),
                score: st.finalData.score,
                total: st.finalData.total,
                details: st.finalData.details
            };

            // ★ 기존 fs.writeFileSync 대신 DB에 저장!
            const newRecord = new Record(recordData);
            await newRecord.save(); 

            testRecords.push(recordData);

            io.to(studentId).emit('testApproved', recordData);
            if (teacherSocketId) {
                io.to(teacherSocketId).emit('updateStudents', students);
                io.emit('updateRecords', testRecords);
            }
        }
    });

    // 선생님: 학생 기록 삭제 기능
    socket.on('deleteRecord', async (recordId) => {
        if (socket.id === teacherSocketId) {
            await Record.deleteOne({ id: recordId }); // DB 삭제
            testRecords = testRecords.filter(r => r.id !== recordId);
            io.emit('updateRecords', testRecords);
        }
    });    

    socket.on('deleteAllRecords', async () => {
        if (socket.id === teacherSocketId) {
            await Record.deleteMany({}); // DB 전체 삭제
            testRecords = [];
            io.emit('updateRecords', testRecords);
        }
    });

    // 로그아웃 처리
socket.on('logout', () => {
        if (students[socket.id]) {
            delete students[socket.id]; // 서버 대기열에서 즉시 삭제
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // [새로 추가] 끊긴 학생이 자동으로 재연결을 시도할 때 과거 정보를 복구합니다.
    socket.on('reconnectStudent', (data) => {
        // 기존 이름으로 메모리에 남아있는 학생 찾기
        let oldSocketId = Object.keys(students).find(key => students[key].name === data.name);
        
        if (oldSocketId) {
            // 과거 데이터 복구 및 소켓 ID(통신선) 최신화
            let studentData = students[oldSocketId];
            delete students[oldSocketId]; // 옛날 끊어진 선 삭제
            
            studentData.id = socket.id; // 새로운 통신선 연결
            studentData.status = data.status; // 상태 복구 (testing 등)
            students[socket.id] = studentData;
        } else {
            // 데이터가 아예 날아간 경우 백업용으로 새로 생성
            students[socket.id] = {
                id: socket.id,
                name: data.name,
                status: data.status || 'testing',
                currentPart: data.currentPart || 1,
                currentQ: data.currentQ || 1,
                finalData: null
            };
        }
        if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
    });

    socket.on('disconnect', () => {
        if (socket.id === teacherSocketId) {
            teacherSocketId = null;
        } else if (students[socket.id]) {
            // ★ 핵심: 화면이 꺼져도 즉시 삭제하지 않고 '연결 끊김' 상태로 유지합니다!
            students[socket.id].status = 'disconnected';
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
            
            // 만약 30분 동안 돌아오지 않으면 그때야 메모리에서 삭제합니다.
            setTimeout(() => {
                if (students[socket.id] && students[socket.id].status === 'disconnected') {
                    delete students[socket.id];
                    if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
                }
            }, 30 * 60 * 1000); 
        }
    });

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    // 1. DB에서 데이터를 가져올 때 순수 데이터(.lean())로 가져와 충돌 완벽 방지
    testRecords = await Record.find({}).lean(); 
    
    // 2. 시험지 목록 불러오기
    quizzes = await Quiz.find({}).lean(); 
    
    // ★ 핵심 수정: 강제 자동 활성화 로직 삭제! 
    // 이제 서버가 켜지면 무조건 '비활성화(null)' 상태로 시작합니다.
    activeQuizData = null; 
    
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
};

startServer();

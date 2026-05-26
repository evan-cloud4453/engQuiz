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
                io.to(teacherSocketId).emit('updateStudents', students);
                io.emit('updateRecords', testRecords);
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

    socket.on('startTest', (studentId) => {
        if (students[studentId]) {
            students[studentId].status = 'testing';
            io.to(studentId).emit('testStarted', activeQuizData || null);
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 퀴즈 업로드, 삭제, 활성화 이벤트
    // ★ 엑셀 시험지 업로드 (DB 저장)
    socket.on('uploadQuiz', async (quizData) => { // async 추가
        if (socket.id === teacherSocketId) {
            const newQuiz = new Quiz(quizData);
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
            await Record.deleteOne({ id: recordId }); // ✅ DB 삭제
            testRecords = testRecords.filter(r => r.id !== recordId);
            io.emit('updateRecords', testRecords);
        }
    });    

    socket.on('deleteAllRecords', async () => {
        if (socket.id === teacherSocketId) {
            await Record.deleteMany({}); // ✅ DB 전체 삭제
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

    socket.on('disconnect', () => {
        if (socket.id === teacherSocketId) {
            teacherSocketId = null;
        } else if (students[socket.id]) {
            delete students[socket.id];
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    // 1. DB에서 학생 기록 불러오기
    testRecords = await Record.find({}); 
    
    // 2. ★ DB에서 선생님이 올렸던 시험지 목록 불러오기
    quizzes = await Quiz.find({}); 
    // 저장된 엑셀이 하나라도 있으면 가장 최근에 올린 것을 기본 활성화
    if (quizzes.length > 0) activeQuizData = quizzes[quizzes.length - 1].data; 
    
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
};

startServer();

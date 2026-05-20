const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // public 폴더 안의 파일들을 서비스함

let students = {}; // 학생 상태 저장
let teacherSocketId = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 로그인 처리
    socket.on('login', (data) => {
        if (data.role === 'teacher') {
            if (data.password === 'admin123') { // 관리자 비밀번호
                teacherSocketId = socket.id;
                socket.emit('loginSuccess', { role: 'teacher' });
                // 현재 대기 중이거나 진행 중인 학생 목록 전송
                io.to(teacherSocketId).emit('updateStudents', students);
            } else {
                socket.emit('loginFail', '비밀번호가 틀렸습니다.');
            }
        } else if (data.role === 'student') {
            const name = data.name;
            // 중복 이름 체크 (간단한 구현)
            const isExist = Object.values(students).find(s => s.name === name);
            if (isExist) {
                socket.emit('loginFail', '이미 접속 중인 이름입니다. 관리자에게 문의하세요.');
                return;
            }
            
            students[socket.id] = {
                id: socket.id,
                name: name,
                status: 'waiting', // waiting, testing, paused, finished
                currentPart: 1,
                currentQ: 1,
                liveAnswers: {}, // 실시간 선택 답안
                score: 0
            };
            
            socket.emit('loginSuccess', { role: 'student', name: name });
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 선생님: 시험 시작 승인
    socket.on('startTest', (studentId) => {
        if (students[studentId]) {
            students[studentId].status = 'testing';
            io.to(studentId).emit('testStarted');
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 선생님: 일시 정지 및 재개
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

    // 학생: 실시간 답안 선택 현황 전송
    socket.on('liveAnswer', (data) => {
        if (students[socket.id]) {
            students[socket.id].currentPart = data.part;
            students[socket.id].currentQ = data.qIndex + 1;
            students[socket.id].liveAnswers[`p${data.part}_q${data.qIndex}`] = data.answer;
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 접속 종료 처리
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
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
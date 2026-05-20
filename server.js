const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let students = {}; // 현재 접속/진행 중인 학생 상태
let testRecords = []; // 선생님이 승인한 모든 학생의 시험 결과 보관소
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
                io.to(teacherSocketId).emit('updateRecords', testRecords);
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
                status: 'waiting', // waiting, testing, paused, waiting_approval, completed
                currentPart: 1,
                currentQ: 1,
                finalData: null
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

    // 학생: 진척도 실시간 업데이트
    socket.on('updateProgress', (data) => {
        if (students[socket.id]) {
            students[socket.id].currentPart = data.part;
            students[socket.id].currentQ = data.qIndex;
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 학생: 시험 조기/최종 제출 (승인 대기 상태로 전환)
    socket.on('submitTest', (finalData) => {
        if (students[socket.id]) {
            students[socket.id].status = 'waiting_approval';
            students[socket.id].finalData = finalData;
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    // 선생님: 최종 시험 종료 승인
    socket.on('approveTest', (studentId) => {
        let st = students[studentId];
        if (st && st.status === 'waiting_approval') {
            st.status = 'completed';
            
            // 기록 생성
            const record = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                studentName: st.name,
                date: new Date().toLocaleString(),
                score: st.finalData.score,
                total: st.finalData.total,
                details: st.finalData.details
            };
            testRecords.push(record); // 서버에 저장

            io.to(studentId).emit('testApproved', record); // 학생에게 결과 전송
            if (teacherSocketId) {
                io.to(teacherSocketId).emit('updateStudents', students);
                io.to(teacherSocketId).emit('updateRecords', testRecords); // 선생님 기록 갱신
            }
        }
    });

    // 접속 종료
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

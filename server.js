const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let students = {}; 
let testRecords = []; 
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
                status: 'waiting',
                currentPart: 1,
                currentQ: 1,
                finalData: null
            };
            socket.emit('loginSuccess', { role: 'student', name: name });
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
        }
    });

    socket.on('startTest', (studentId) => {
        if (students[studentId]) {
            students[studentId].status = 'testing';
            io.to(studentId).emit('testStarted');
            if (teacherSocketId) io.to(teacherSocketId).emit('updateStudents', students);
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

    socket.on('approveTest', (studentId) => {
        let st = students[studentId];
        if (st && st.status === 'waiting_approval') {
            st.status = 'completed';
            const record = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                studentName: st.name,
                date: new Date().toLocaleString(),
                score: st.finalData.score,
                total: st.finalData.total,
                details: st.finalData.details
            };
            testRecords.push(record);

            io.to(studentId).emit('testApproved', record);
            if (teacherSocketId) {
                io.to(teacherSocketId).emit('updateStudents', students);
                io.to(teacherSocketId).emit('updateRecords', testRecords);
            }
        }
    });

    // 선생님: 학생 기록 삭제 기능
    socket.on('deleteRecord', (recordId) => {
        if (socket.id === teacherSocketId) {
            testRecords = testRecords.filter(r => r.id !== recordId);
            io.to(teacherSocketId).emit('updateRecords', testRecords);
        }
    });
    
    // 선생님: 전체 기록 삭제 기능
    socket.on('deleteAllRecords', () => {
        if (socket.id === teacherSocketId) {
            testRecords = [];
            io.to(teacherSocketId).emit('updateRecords', testRecords);
        }
    });

    // 로그아웃 처리
    socket.on('logout', () => {
        if (socket.id === teacherSocketId) {
            teacherSocketId = null;
        } else if (students[socket.id]) {
            delete students[socket.id];
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
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

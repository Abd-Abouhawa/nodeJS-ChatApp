const express = require('express');
const http = require('http');
const path = require('path');
const Filter = require('bad-words');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server); // to work SOCKETIO as a server
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const {
    addUser,
    removeUser,
    getUser,
    getUserInRoom
} = require('./utils/users');
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
    console.log('New WebSocket connection');


    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });
        if (error) {
            return callback(error);
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'));

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        });

        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `< ${user.username} > has joined!`));
        callback(); // without any argument that's means without any error
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();
        if (user) {
            if (filter.isProfane(message)) {
                return callback('profanity is not allowed!');
            }
            io.to(user.room).emit('message', generateMessage(user.username, message));
            callback();
        }

    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `< ${user.username} > has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            });

        }

    })

    socket.on('sendLocation', (location, acknowledgement) => {
        const user = getUser(socket.id);
        if (user) {

            const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url));
            acknowledgement();
        }
    })

})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
})


// socket.join() : - we can only use on the server
// - allows us to join a given chat room and we pass to it the name of the room we're trying to join


// io.to('room name').emit : it emits an event to everybody in a specific room
// socket.broadcast.to('room name').emit : similar to above , but it sending an event to everyone except for the specific client









// .on : to receive 
// .emit : to send
// .broadcast.emit => send it to everybody except the current client
// broadcast events : An event that occurs when you do something
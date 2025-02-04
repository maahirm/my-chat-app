// server side code
const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const { generateMsg } = require('./utilities')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./user-util')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 8080
const publicDir = path.join(__dirname, './public')

app.use(express.static(publicDir))

io.on('connection', socket => {
    console.log('New WebSocket connection')
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });
        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMsg('Administrator', `Welcome to the Chat App, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMsg(`${user.username} has joined!`))
        // socket.broadcast.to(user.room).emit('message', generateMsg('Administrator', `${user.username} has joined!`))
        io.to(user.room).emit('dataRoom', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback();
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMsg(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMsg(`${user.username} has left!`))
            // io.to(user.room).emit('message', generateMsg('Administrator', `${user.username} has left!`))
            io.to(user.room).emit('dataRoom', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server up on port ${port}`);
})
const express = require('express');
const http = require('http');
const io = require('socket.io');
const Game = require('../utils/Game');
const EventBus = require('../utils/EventBus');

const DEFAULT_USER_NAME = 'user';

class Server {
    constructor() {
        this.app = express();
        this.http = http.createServer(this.app);
        this.io = io(this.http);
        this.games = {};
        this.eventBus = new EventBus();

        this.subscribeToListenPort();
        this.subscribeToUserConnect();
        this.subscribeToGameEvents();
    }

    get rooms() {
        return Object
            .keys(this.io.sockets.adapter.rooms)
            .map((room) => this.getRoom(this.games[room]));
    }

    sendRoomUsers(room) {
        let nameSpace = this.io.of('/').in(room);

        nameSpace.clients((err, clients) => {
            let users = clients.map((id) => this.getUser(nameSpace.connected[id]));
            this.io.to(room).emit('users', users);
        });
    }

    subscribeToUserConnect() {
        this.io.on('connection', (socket) => {
            console.log('user connected');
            socket.leave(socket.id);
            this.setAdditionalSocketProps(socket);
            socket.emit('currentUser', this.getUser(socket));

            this.subscribeToNeedRooms(socket);
            this.subscribeToNeedUsers(socket);
            this.subscribeToGetUserName(socket);

            this.subscribeToJoinRoom(socket);
            this.subscribeToLeaveRoom(socket);
            this.subscribeToChangeUserName(socket);

            this.subscribeToSendingMessage(socket);
            this.subscribeToDrawing(socket);

            this.subscribeToStartRound(socket);
            this.subscribeToCheckAnswer(socket);

            this.subscribeToDisconnectUser(socket);
        });
    }

    subscribeToChangeUserName(socket) {
        socket.on('changeName', (userName) => {
            socket.userName = userName;
            socket.emit('currentUser', this.getUser(socket));

            this.getUserRoom(socket)
                ? this.sendRoomUsers(this.getUserRoom(socket))
                : null;
        });
    }

    subscribeToGetUserName(socket) {
        socket.on('getUserName', () => {
            socket.emit('user', socket.userName);
        });
    }

    subscribeToNeedUsers(socket) {
        socket.on('getUsers', (room) => this.sendRoomUsers(room));
    }

    subscribeToNeedRooms(socket) {
        socket.on('getRooms', () => this.io.emit('rooms', this.rooms));
    }

    subscribeToJoinRoom(socket) {
        socket.on('joinRoom', (room, maxPoints, roundDuration) => this.joinToRoom(socket, room, maxPoints, roundDuration));
    }

    joinToRoom(socket, room, maxPoints, roundDuration) {
        if (!this.games[room]) {
            let game = new Game(socket, room, this.eventBus, maxPoints, roundDuration);
            socket.isPresenter = true;
            this.games[room] = game;
        } else {
            this.games[room].addUser(socket);
        }

        socket.join(room);
        socket.emit('currentUser', this.getUser(socket));
        this.io.emit('rooms', this.rooms);
        this.sendRoomUsers(room);
    }

    subscribeToLeaveRoom(socket) {
        socket.on('leaveRoom', (room) => this.leaveRoom(socket, room));
    }

    leaveRoom(socket, room) {
        if (this.games[room]) {
            this.games[room].removeUser(socket);

            if (!this.games[room].users.length) {
                this.games[room].stopRound();
                delete this.games[room];
            } else if (socket.isPresenter) {
                this.games[room].stopRound();
                this.games[room].setNextPresenter();
                this.io.to(room).emit('roundEnded', `Presenter "${socket.userName}" leaved room`);
            }
        }

        socket.isPresenter = false;
        socket.leave(room);
        this.io.emit('rooms', this.rooms);
        this.sendRoomUsers(room);
    }

    subscribeToSendingMessage(socket) {
        socket.on('sendMessage', (room, message) => {
            this.io.to(room).emit('message', {
                message,
                userName: socket.userName,
            });
        });
    }

    subscribeToDisconnectUser(socket) {
        let rooms;
        socket.on('disconnecting', () => rooms = Object.keys(socket.rooms));

        socket.on('disconnect', () => {
            console.log('user disconnected');
            if (rooms[0]) {
                this.leaveRoom(socket, rooms[0]);
            }

            rooms = [];
        });
    }

    subscribeToDrawing(socket) {
        socket.on('drawing', (room, data) => socket.broadcast.to(room).emit('draw', data));
        socket.on('clearBoard', (room) => socket.broadcast.to(room).emit('clear'));
    }

    subscribeToStartRound(socket) {
        socket.on('startRound', () => {
            let room = this.getUserRoom(socket);
            if (this.games[room]) {
                this.games[room].startRound();
            }
        });

        socket.on('changeWord', () => {
            let room = this.getUserRoom(socket);
            if (this.games[room]) {
                this.games[room].changeWord();
            }
        });
    }

    subscribeToGameEvents() {
        this.eventBus.on('startRound', (socket, word) => {
            socket.emit('sendWordToPresenter', word);
            socket.broadcast
                .to(this.getUserRoom(socket))
                .emit('roundStarted', `Round started. Presenter is "${socket.userName}"`);
        });

        this.eventBus.on('changeWord', (socket, word) => socket.emit('sendWordToPresenter', word));

        this.eventBus.on('timer', (room, time) => {
            this.io.to(room).emit('timer', time);
        });

        this.eventBus.on('wrongAnswer', (socket, msg) =>
            socket.emit('wrongAnswer', msg));

        this.eventBus.on('endRoundWithWinner', (room, socket) => {
            this.io.to(room).emit('roundEnded', `Winner of the round is "${socket.userName}"`);
            this.io.to(room).emit('clear');
        });

        this.eventBus.on('endRoundWithoutWinner', (room) => {
            this.io.to(room).emit('roundEnded', `No one guessed the word`);
            this.io.to(room).emit('clear');
        });

        this.eventBus.on('endGame', (room, socket) => {
            this.io.to(room).emit('roundEnded', `Congratulations! Winner of the game is "${socket.userName}"`);
            this.io.to(room).emit('clear');
            this.sendRoomUsers(room);
        });

        this.eventBus.on('changePresenter', (room, socket) => {
            this.sendRoomUsers(room);
            this.games[room].users
                .forEach((u) => u.emit('currentUser', this.getUser(u)));
        });
    }

    subscribeToCheckAnswer(socket) {
        socket.on('checkAnswer', (word) => {
            let room = this.getUserRoom(socket);
            if (!this.games[room]) {
                return;
            }

            this.games[room].checkUserAnswer(socket, word);
        });
    }

    subscribeToListenPort() {
        this.http.listen(process.env.PORT || 4001, () => console.log('listening on *:4001'));
    }

    getRoom(game) {
        return {
            name: game.room,
            maxPoints: game.maxPoints,
            roundDuration: game.roundDuration,
        };
    }

    getUser(socket) {
        return {
            id: socket.id,
            name: socket.userName,
            isPresenter: socket.isPresenter,
            points: socket.points,
        };
    }

    getUserRoom(socket) {
        return Object.keys(socket.rooms)[0];
    }

    setAdditionalSocketProps(socket) {
        socket.userName = DEFAULT_USER_NAME;
        socket.isPresenter = false;
        socket.points = 0;
    }
};

module.exports = Server;

const getWord = require('./wordGenerator');

const SECONDS_IN_MINUTE = 60;
const DEFAULT_DURATION = 2;
const DEFAULT_POINTS = 5;

class Game {
    constructor(presenter, room, eventBus, maxPoints = DEFAULT_POINTS, roundDuration = DEFAULT_DURATION) {
        this.presenter = 0;
        this.users = [presenter];
        this.room = room;
        this.eventBus = eventBus;
        this.roundDuration = roundDuration;
        this.maxPoints = maxPoints;
    }

    addUser(user) {
        this.users.push(user);
    }

    removeUser(user) {
        this.users = this.users.filter((u) => u.id != user.id);
    }

    startRound() {
        getWord()
            .then((word) => {
                this.word = word;
                this.eventBus.trigger('startRound', this.users[this.presenter], word);
            })
            .then(() => this.startTimer());
    }

    changeWord() {
        getWord()
            .then((word) => {
                this.word = word;
                this.eventBus.trigger('changeWord', this.users[this.presenter], word);
            });
    }

    startTimer() {
        let countdown = this.roundDuration * SECONDS_IN_MINUTE;
        this.timer = setInterval(() => {
            if (countdown <= 0) {
                this.stopRound();
                this.eventBus.trigger('endRoundWithoutWinner', this.room);
                this.setNextPresenter();
                return;
            }

            countdown--;
            let time = {
                minutes: Math.floor(countdown / SECONDS_IN_MINUTE),
                seconds: Math.floor(countdown % SECONDS_IN_MINUTE),
            };
            this.eventBus.trigger('timer', this.room, time);
        }, 1000);
    }

    stopRound() {
        clearInterval(this.timer);
    }

    setNextPresenter() {
        if (this.users[this.presenter]) {
            this.users[this.presenter].isPresenter = false;
        }

        this.presenter = this.users[this.presenter + 1]
            ? this.presenter = this.presenter + 1
            : 0;

        this.users[this.presenter].isPresenter = true;
        this.eventBus.trigger('changePresenter', this.room, this.users[this.presenter]);
    }

    checkUserAnswer(user, word) {
        if (!this.isCorrectWord(word)) {
            this.eventBus.trigger('wrongAnswer', user, `"${word}" is a wrong answer`);
            return;
        }

        this.stopRound();
        user.points = user.points + 1;
        this.setNextPresenter();

        if (user.points === this.maxPoints) {
            this.eventBus.trigger('endGame', this.room, user);
            this.users.forEach((u) => u.points = 0);
        } else {
            this.eventBus.trigger('endRoundWithWinner', this.room, user);
        }
    }

    isCorrectWord(word) {
        if (this.word) {
            return word.toLocaleLowerCase() === this.word.toLocaleLowerCase()
                ? true
                : false;
        }

        return false;
    }
}

module.exports = Game;

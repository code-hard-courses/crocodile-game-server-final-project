# Crocodile (charades) game - server side

# Graduation project at HTP (it-academy). Crocodile (charades) game - server side

# How to setup

```
# clone repo
git clone https://github.com/kulikmaxim/crocodile-game-server-final-project.git

# go to directory
cd crocodile-game-server-final-project

# install dependencies
npm install

# run app
npm run start
```
# Deployment [(Heroku)](https://devcenter.heroku.com/articles/deploying-nodejs)
```
heroku create
git add .
git commit -m "Start with app"
git push heroku master
heroku open
```

# App structure
```
'|-- app',
  '    |-- .eslintrc.js',
  '    |-- .gitignore',
  '    |-- index.js',
  '    |-- package.json',
  '    |-- README.md',
  '    |-- server',
  '    |   |-- Server.js',
  '    |-- utils',
  '        |-- EventBus.js',
  '        |-- Game.js',
  '        |-- wordGenerator.js',
  '' 
```

# Technologies and tools

- [Node.js](https://nodejs.org/en/)
- [Socket.IO](https://socket.io/) - real-time bidirectional event-based communication
- [Wordnik](http://developer.wordnik.com/) - word generator API

# App info
-------------

[Presentation](https://sss)
[Hosting](https://tranquil-wave-78594.herokuapp.com/)

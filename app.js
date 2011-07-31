
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration
var RedisStore = require('connect-redis')(express);
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "boo", store: new RedisStore }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'Solomka.tv'
  });
});


app.get('/video', function(req, res){
  res.render('video', {
    title: 'Solomka.tv',
	roomName: 'Тестовый сеанс'
  });
});
	
app.get('/chat', function(req, res){
  console.log(nicknames);
  res.render('chat', {
    title: 'Solomka.tv::chat'
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// MongoDB
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/solomkatv');

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var ChatMessage = new Schema({
  messageId : ObjectId,
  author : { type: String, default: 'anonymous' },
  message : String,
  date  :  { type: Date, default: Date.now }
});

// Soket.io

var io = require('socket.io').listen(app);

var nicknames = {};

io.sockets.on('connection', function (socket) {
  socket.on('user message', function (msg) {
    var chatMessage = mongoose.model('ChatMessage', ChatMessage);
    var chatMessageInstance = new chatMessage();
    chatMessageInstance.author = socket.nickname;
    chatMessageInstance.message = msg;
    chatMessageInstance.save(function (err) {
    });
    socket.broadcast.emit('user message', socket.nickname, msg);
  });

  socket.on('nickname', function (nick, fn) {
    if (nicknames[nick]) {
      fn(true);
    } else {
      fn(false);
      nicknames[nick] = socket.nickname = nick;
      socket.broadcast.emit('announcement', nick + ' connected');
      io.sockets.emit('nicknames', nicknames);
    }
  });

  socket.on('disconnect', function () {
    if (!socket.nickname) return;

    delete nicknames[socket.nickname];
    socket.broadcast.emit('announcement', socket.nickname + ' disconnected');
    socket.broadcast.emit('nicknames', nicknames);
  });
  
});

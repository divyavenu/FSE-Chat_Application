var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	usernames =[ ];


var sqlite3 = require('sqlite3').verbose(),
	fs = require('fs'),
	dbFile = './chat.db',
	dbExists=fs.existsSync(dbFile),
	db = new sqlite3.Database(dbFile);



db.get("SELECT name from sqlite_master WHERE type='table' AND name='chat_store'",function(err,rows){
	if(err !== null) {
    console.log(err);
  }
  else if(rows === undefined) {
    db.run('CREATE TABLE `chat_store` (' +
    '`name` TEXT,' +
    '`msg` TEXT,' +
    '`time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP)', function(err) {
      if(err !== null) {
        console.log(err);
      }
      else {
        console.log(" 'chat_store' initialized.");
      }
    });
	}

	else{
		 console.log(" chat already initialized.");
	}
});

server.listen(8080);



app.get('/',function(req,res){
	res.sendFile(__dirname + '/index.html');

});



io.sockets.on('connection',function(socket){

		query = "SELECT * FROM(SELECT * FROM 'chat_store' ORDER BY time DESC LIMIT 5 ) T1 ORDER BY time ";

			db.all(query,function(err,rows){
			if(err){
				console.log(" old Message not loading");
			}
			else{
				rows.forEach(function(row){
					socket.emit('old message',{user_nm:row.name,msg:row.msg,time:row.time});
				});
			}
		  }) ;



	socket.on('new user',function(data,callback){
		if(usernames.indexOf(data)!=-1){
			callback(false);
		}else{
			callback(true);
			socket.user_name=data;			//Storing name of each user within the socket
			usernames.push(socket.user_name);
			io.sockets.emit('usernames',usernames);
		
		}
	});


	socket.on('send message',function(data){
		var currentTime = new Date().toLocaleTimeString();
		query = "INSERT INTO 'chat_store' " + "VALUES('" + socket.user_name+"','"+data+"','"+currentTime+"')";
		db.run(query,function(err){
			if(err){
				console.log("Message not inserted");
			}
		}) ;
		


		io.sockets.emit('new message',{msg:data, user_nm:socket.user_name,time:currentTime}); 	
	
	});

	function updatenamelist(){
		io.sockets.emit('usernames',usernames);
	}

	socket.on('disconnect',function(data){
		if(!socket.user_name) return;
		usernames.splice(usernames.indexOf(socket.user_name),1);
		updatenamelist();

	});

});



var socketio=require('socket.io');
var io;
var guestNumber=1;
var nickNames={};
var namesUsed=[];
var currentRoom={};
exports.listen=function(server){
	io=socketio.listen(server);
	io.set('log level',1);
	console.log("socketio listen start.....")
	io.sockets.on('connection',function(socket){
		////分配置黎称
		guestNumber=assignGuestName(socket,guestNumber,nickNames,namesUsed);
		
		joinRoom(socket,'Lobby');
		//转发消息
		handleMessageBroadcasting(socket,nickNames);
		//请求更名
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		//创建房间
		handleRoomJoining(socket);
		socket.on('rooms',function(){
			socket.emit('rooms',io.sockets.manager.rooms);
		})
		handleClientDisconnection(socket  ,nickNames,namesUsed);
		/*socket.on('disconnect',function(){
			console.log("a user disconnect.....")
	    });*/
	   /* socket.on('message',function(message){
	    	console.log("现在我可以转发你的消息了哦~:"+message.text)
			//广播消息其它客户端可以收到消息broadcast
			socket.broadcast.emit('message', message);
		})*/
	})
}

function assignGuestName(socket,guestNumber,nickNames,namesUsed){
	console.log("assignGuestName completely....")
	var name='Guest'+guestNumber;
	nickNames[socket.id]=name;
	socket.emit('nameResult',{
		success:true,
		name:name
	})
	namesUsed.push(name);
	return guestNumber+1;

}
function joinRoom(socket,room){
	console.log("joinRoom completely....")
	socket.join(room);
	currentRoom[socket.id]=room;
	socket.emit('joinResult',{"room":room});
	socket.broadcast.to(room).emit('message',{
		text:nickNames[socket.id]+' has joined '+room+"."
	})
	var usersInRoom=io.sockets.clients(room);
	if(usersInRoom.length>1){
		var usersInRoomSummary='Users currnetly in '+room+':';
		for(var index in usersInRoom){
			var userSocketId=usersInRoom[index].id;
			if(userSocketId!=socket.id){
				if(index>0){
					usersInRoomSummary+=', ';
				}
				usersInRoomSummary+=nickNames[userSocketId];
			}
		}
	}
	usersInRoomSummary+='.';
	socket.emit('message',{text:usersInRoomSummary});
}
function handleMessageBroadcasting(socket,nickNames){
	console.log("handleMessageBroadcasting completely....")
	socket.on('message',function(message){
		socket.broadcast.to(message.room).emit('message',
			{text:nickNames[socket.id]+": "+message.text}
		)
	})
}
function handleNameChangeAttempts(socket,nickNames,namesUsed){
	console.log("handleNameChangeAttempts completely....")
	socket.on('nameAttempt',function(name){
		if(name.indexOf('Guest')==0){
			socket.emit('nameResult',{
				success:false,
				message:'Names cannot begin with "Guest".'
			})
		}else{
			if(namesUsed.indexOf(name)==-1){
				var previousName=nickNames[socket.id];
				var previousNameIndex=namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id]=name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult',{
					success:true,
					name:name
				})
				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text:previousName+' is now known as '+name+'.'
				})
			}else{
				socket.emit('nameResult',{
					success:false,
					message:'That name is already in use'
				})
			}
		}
	})
}
function handleRoomJoining(socket){
	console.log("handleRoomJoining completely....")
	socket.on('join',function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket,room.newRoom);
	})
}
		
function handleClientDisconnection(socket,nickNames,namesUsed){
	console.log("handleClientDisconnection completely....")
	socket.on('disconnect',function(){
		var nameIndex=namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}


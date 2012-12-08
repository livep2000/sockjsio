var events = require('events');

var async           = require('async');
var clients         = {};
var rooms           = {};
var http            = require('http');
var sockjs          = require('sockjs');
var util            = require('util');
var _sendRoomNames  = true;

var _sockserver     = sockjs.createServer(
	{
	log: function(error, message) 
		{
		// console.log(message);
		}
	});

var httpserver = http.createServer();

exports.listen = function ( port, url ,prefix, sendRoomNames ) 
	{
   	events.EventEmitter.call(this);
    	_sendRoomNames = sendRoomNames;
    	_sockserver.installHandlers(httpserver, {prefix: prefix});
    	httpserver.listen(port, url);
    	return _sockserver;
    	};
    
exports.on = function( eventName , callback )    
	{
	_sockserver.on( eventName , function( connection )
		{ 
		clients[connection.id] = connection;
		clients[connection.id].rooms = new Object();

		// ------------ Managing sending to clients without any room data -----------
		var sendToClients = function(data, sendType )
			{
			if (!data) { return;}
			else if (sendType == "send")
				{
				connection.write( JSON.stringify( {data:data} ) ); 
				}
			else
				{ // type = broadcast
                		async.forEach(Object.keys( clients ), function( key )
					{  
					if (sendType == "broadcast") 
						{
						if (  key != connection.id ) { clients[key].write( JSON.stringify({data:data}) );  }
						}
                    			});
				}
			};

        	connection.sendClient = function(data)
                	{
			sendToClients(data , "send"); 
			};

        	connection.broadcastClient = function(data) // send to all but sender
                	{
			sendToClients(data , "broadcast");
                	};
            
		// ------------ Managing sending to rooms -----------
		var sendToRooms = function(roomName, data, sendType )
			{
			if (!rooms[roomName])		// no room to send to
				{
				async.forEach( Object.keys( clients ), function( connectionID )
					{ 
					if ( clients [connectionID] ) 					// if client exists
						{
						if (clients [connectionID].inRoom )			// and is in some room
							{
							clients [connectionID].inRoom[roomName] = null; 	// delete this room from the client inRoom
							delete(clients [connectionID].inRoom[roomName]);
							} 
						}	
       					});
				}
			else if (!data) { return (false); } 		// nothing to send
			else if (sendType == "send")
				{
				if (_sendRoomNames) {toSend = JSON.stringify( {roomName:roomName, data:data} );  }
				else {toSend = JSON.stringify( {data:data}); }
				clients[connection.id].write( toSend );
				}
			else		// type broadcast 
				{
				if (_sendRoomNames) {toSend = JSON.stringify( {roomName:roomName, data:data} );  }
				else {toSend = JSON.stringify( {data:data}); }
   	 			async.forEach( Object.keys( rooms[roomName].inRoom ), function( key, callback )
					{ 
					if (  key != connection.id ) { clients[key].write( toSend );  }
       				}); 
				}
			};
			    
		// send to all in room except the sender
       		connection.broadcastRoom = function ( roomName, data ) 
            		{
			sendToRooms(roomName, data, "broadcast");
            		};

		// send to this connection if in this room
		connection.sendRoom = function (roomName, data )
			{
			sendToRooms(roomName, data, "send");
 			};

		// ------------ Join and Leave -----------
       		connection.join = function(roomName)
            		{
            		if ( !rooms[ roomName ] )
                		{
                		rooms[ roomName ] = new Object();
                		rooms[ roomName ].inRoom = new Object();
                		rooms[ roomName ].inRoom[ connection.id ] = true;               
                		connection.emit('roomopen', roomName);				 // fire roomopen event
                		}
            		rooms[ roomName ].inRoom[ connection.id ] = true;
            		clients[connection.id].rooms[ roomName ] = true;
			connection.emit('joining' , roomName );
            		};            
            
        	connection.leave = function(roomName)
                	{
           		rooms[ roomName ].inRoom[ connection.id ] = null;
                	delete( rooms[ roomName ].inRoom[ connection.id ] );
           
           		clients[ connection.id ].rooms[ roomName ] = null;
               	 	delete (clients[ connection.id ].rooms[ roomName ] );

                	connection.emit('leaving' , roomName );
                	if ( Object.keys( rooms[ roomName ].inRoom ).length == 0  )
                    		{ // Left room and no users are in there anymore -> close room
                    		rooms[ roomName ] == null;
                    		delete( rooms[ roomName ] );
		  		connection.emit('roomclose', roomName);  // fire event roomclose
                    		}
                	}; 

		// ------------ Covering rooms and clients @ onclose -----------
		connection.on( "close", function()
			{
			var roomsThisUser = Object.keys( clients[ connection.id ].rooms )
            		async.forEach( roomsThisUser, function( roomName )
				{   
				connection.emit('leaving' , roomName );
                		rooms[ roomName ].inRoom[ connection.id ] = null;
                		delete( rooms[ roomName ].inRoom[ connection.id ] );
												// check if the room is empty now
				if( Object.keys( rooms[ roomName ].inRoom ).length == 0  )
					{  								// if so - >  remove the room -> it is closed
					rooms[ roomName ] = null;
					delete( rooms[ roomName ] );
					connection.emit('roomclose', roomName);
					}
                		}); 

            		clients[ connection.id ] = null;
            		delete (clients[ connection.id ]);
            		});

		// ----------------   is this user in this room ?
		connection.isInRoom = function ( roomName )
    			{
			if (rooms[ roomName ] )
				{
    	        		if ( rooms[ roomName ].inRoom[connection.id] )
        	        		{
        	        		return ( true );
                    			}
				else
					{
					return ( false ) ;
					}
				}
   		 	else
                		{
       				return ( false ) ;
                		}
   		 	};

        	connection.joined = function ( )
    			{
			if ( clients[ connection.id ].rooms )
				{
				return (  Object.keys(clients[ connection.id ].rooms )  ) ; 
    	            		}
   			};

        	callback (connection);
        	});
    	};

// emit Clients -> outside connection

exports.emitClient = function( data ) // send to all clients
	{
	if (!data) {return (false); }
	else
		{
		async.forEach(Object.keys( clients ), function( key )
			{  
			clients[key].write( JSON.stringify({data:data}) ); 
			});
		}
	};


// ------------- emitroom -> outside connection
exports.emitRoom = function ( roomName, data )  // emitroom, send all to the room
	{

	if (!data) { return; }
	else
		{

		if ( rooms[roomName] )
			{
			var toSend = "";
			toSend = JSON.stringify( {roomName:roomName, data:data} );  
   	 		async.forEach( Object.keys( rooms[roomName].inRoom ), function( key, callback )
				{   
				clients[key].write( toSend );
       				});
			}
		else
			{
			console.log("room not exists anymore: " + roomName);
			async.forEach( Object.keys( clients ), function( connectionID, callback )
				{ 
				if ( clients [connectionID] ) 					// if client exists
					{
					if (clients [connectionID].inRoom )			// and is in some room
						{
						clients [connectionID].inRoom[roomName] = null; 	// delete this room from the client inRoom array
						delete(clients [connectionID].inRoom[roomName]);
						} 
					}
				
       				});
			}
  		}
 	}; 

// ---------- check if a room exists   
exports.roomExists = function ( roomName )
	{
	if (rooms[ roomName ] ) { return (true); }
	else { return (false ); }
    	}; 

// ---------- Return array with user id's in this room   
exports.usersInRoom = function ( roomName )
	{
	if (rooms[ roomName ] )
		{
        	return ( Object.keys ( rooms[ roomName ].inRoom) ) ;
		}
	else { return ({});  }
    	}; 
 
// ---------- Return array with all user names   
exports.allRooms = function()
	{
	return Object.keys( rooms );
	}

// ---------- Return array with all client id's 
exports.clients = function ( )
    	{
	return Object.keys( clients );
    	}; 

// ---------- Return individual client by id   
exports.client = function ( clientid )
    {
    if ( clients[clientid] )
        {
        return ( clients[clientid] );
        }
    else
        {
        return ( {} );
        }
    };
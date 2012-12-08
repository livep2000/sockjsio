Warning: Version 0.0.1 is in the absolute alpha fase and created by a Node beginner.
I must be doing some things wrong, please feel free to correct me with feedback. 

Sockjsio is a multiroom manager based on the sockjs client (https://github.com/sockjs/sockjs-client) 
and sockjs-node (https://github.com/sockjs/sockjs-node) server.

Dependecies are aync and sockjs. Install if not allready done
	
	npm install sockjs
	npm install async

Defining a server is plane and simple:

var sockjsio = require('./sockjsio');

sockjsio.listen( port[int], url[string], prefix[string], sendRoomNames[bool] );

If 'SendRoomNames' is true, every response to a room hase a property roomName, corresponding that roomname.
Just pick a prefix like '/A', channels are not used since we use rooms.

A simple echo example:

    var sockjsio = require('./sockjsio');
    sockjsio.listen( 8080 , '0.0.0.0', "/A", true );
    
    sockjsio.on('connection', function( connection )
	{
	connection.on('roomopen', function( roomName )
		{
		console.log(connection.id + " opened room " + roomName );
		});

	    connection.join("room1");
	    connection.join("room2");
	    connection.leave("room2");
	
	    connection.on('data', function( response )
	        {
            	var data = JSON.parse( response );
      
            	// possible ways to send a message
            	connection.emitRoom( data.roomName, data.message );  		// Send to whole room including connection
            	connection.broadcastRoom( data.roomName, data.message );  	// Send to all in this room but connection
            	connection.sendRoom( data.roomName, data.message );  	    // Send to this connection if in this room

            	connection.emitClient( data.message );				        // Send to all clients on the server
            	connection.broadcastClient( data.message );			        // Send to all except connection
            	connection.sendClient( data.message );				        // Send to this connection
            	});

	    var isInroom = connection.isInRoom('room1'); 				    // = true if in 'room1'	
	    var joined = connection.joined(); 				                // Array with roomnames
	    });

Within the connections there are some handy events they all return the roomName.

    connection.on('roomopen', function( roomName )
        {
        console.log(connection.id + " opened room " + roomName );
        });

- roomopen: fired when room hase opened. 
- roomclose : fired after a room hase closed.
- leaving: fired when a client left a room.
- joining: fired when a client hase joined a room.

There are two other functions within connections:

    var isInroom = connection.isInRoom('room1'); 		    // Bool true / false	
    var joined = connection.joined(); 				        // Array with roomnames the client joined

To make it complete: 

    var roomExists = sockjsio.roomExists("room2");		    // False: this user hase left the room
    var usersInRoom = sockjsio.usersInRoom("room1");	    // Array with connection id's of joined sockets
    var clients = sockjsio.clients();				        // Array with all connection id's on the server
    var client = sockjsio.client(socketID);				    // Get a socket with that ID
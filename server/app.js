var sockjsio = require('./sockjsio');

sockjsio.listen( 8005 , '0.0.0.0', "/A", true );

sockjsio.on('connection', function( connection ) 
	{
	// These events become handy when writing your own client manager
	connection.on('roomopen', function( roomName ) 
        	{
        	connection.emitRoom( 'commandroom', connection.userName + " opened room " + roomName );
        	});

    	connection.on('roomclose', function( roomName ) 
        	{
        	connection.emitRoom( 'commandroom', connection.userName + " closed room " + roomName );
        	});

	connection.on('joining', function( roomName) 
        	{
		connection.emitRoom( 'commandroom', connection.userName + " joining room " + roomName );
        	});

    	connection.on('leaving', function( roomName ) 
        	{
        	connection.emitRoom( 'commandroom', connection.userName + " left room " + roomName );
        	});

    connection.on('data', function( response ) 
        {
	var data = par(response);
        if (data.MTYP == 'chat')
		{
		data.message = connection.userName + ": " + data.message;
		connection.emitRoom( data.roomName, data.message );  	// send to whole room including connection
 		// connection.broadcastRoom( data.roomName, data.message );  	// send to all in this room but connection
        	// connection.sendRoom(data.roomName, data.message );  		// send to this connection if in this room

		// connection.emitClient(data.message);				// send to all clients on the server
		// connection.broadcastClient(data.message);			// send to all except connection
		// connection.sendClient(data.message);				// send to this connection
            	}
	else if (data.MTYP == 'username')						// no roomName; not sending to a room
		{
		connection.userName = data.userName; 		// feel free to attach custom data, if connection closed -> gone
		connection.join("room1");
		connection.join("room2");
   		connection.join("commandroom");
            	//connection.join("testroom");
           	//connection.leave("testroom");
		}
	else
		{ log('No messagetype defined.'); }
	});
    });  

var str = function(obj)
	{
	return JSON.stringify(obj);
	}

var par = function(str)
	{
	return JSON.parse(str);
	}

var log = function( message )
	{
	console.log( message );
	}
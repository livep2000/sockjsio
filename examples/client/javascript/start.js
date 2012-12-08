var connection;
function connect()
	{
	var userName = $("#username").val();
	if (userName)
		{
		connection = new SockJS('http://localhost:8005/A');
		connection.onopen = function () 
            		{
			connection.send( STR({ userName: userName, MTYP: 'username'}) );
            		};
            
        	connection.onerror = function (error) 
            		{
	        	log("on error" + error);		
            		};

        	connection.onmessage = function (response) 
            		{
           	 	var data = JSON.parse( response.data );
            		$("#" + data.roomName ).append("<br>" + data.data);
			$("#" + data.roomName ).prop({ scrollTop: $("#" + data.roomName ).prop("scrollHeight") });
            		};
            
        	connection.onclose = function(e) 
            		{
            		log("on close" + e);
            		};
		}
	else {alert('Please provide a username.'); }
	}

$(document).ready(function() 
	{
	$('.chatinput').keypress(function(event)
		{ 
		if(event.which == 13)
			{
			if( event.target.id == 'input1') { send('room1') ;}
			if( event.target.id == 'input2') { send('room2') ;}
			} 
		});

	$("div.chattext").mouseup(function(event)
		{
		$(event.target).prop({ scrollTop: $(event.target).prop("scrollHeight") });
        	});
	});
	    
 function send(toRoom)
 	{
	var toSend = "";
	if(toRoom == "room1")
		{
		toSend = $("#input1").val();
		$("#input1").val('');
		}
	if(toRoom == "room2")
		{
		toSend = $("#input2").val();
		$("#input2").val('');
		}

    	if (toSend != "" && connection )
        	{
        	connection.send( STR({roomName: toRoom, message: toSend, MTYP: 'chat'}) );
        	}
	}
     
function STR(obj)
	{
	return  JSON.stringify(obj);
	}

function PAR(str)
	{
	return JSON.parse( str );
	}
  
function log(message)
    	{
    	console.log(message);
    	}
    

    
            



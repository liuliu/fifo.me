var pidfile = fs.openSync("/var/run/fifo/fifo.pid", "w"); 
fs.writeSync(pidfile, process.pid.toString()); 
fs.closeSync(pidfile); 

var express = require("express");
var fifo = express.createServer(
	  express.logger()
	, express.bodyParser()
	, express.cookieParser()
	, express.static(__dirname + "/site")
);

var redis = require("redis").createClient();
var _ = require("underscore");
var enforcer = require("./enforcer");
var Todo = require("./models").Todo;

fifo.get(
	"/sntp",
	function (request, response) {
		response.json((new Date).getTime());
	}
);

fifo.get(
	"/todos/:id",
	enforcer.login_required,
	function (request, response) {
		redis.mget(["todos:version|uid:" + request.uid,
			"todos:" + request.params.id + "|uid:" + request.uid], function (err, replies) {
				response.json({"data": JSON.parse(replies[1]), "version": replies[0]});
			});
	}
);

fifo.get(
	"/todos",
	enforcer.login_required,
	enforcer.params_typed({"start": "integer", "batch_size": "integer"}),
	function (request, response) {
		var params = _.extend({"start": 0, "batch_size": 30}, request.query, request.body);
		redis.lrange("todos|uid:" + request.uid, -(params.start + params.batch_size), params.batch_size, function (err, replies) {
			var i;
			for (i = 0; i < replies.length; i++)
				replies[i] = "todos:" + replies[i] + "|uid:" + request.uid;
			replies.unshift("todos:version|uid:" + request.uid);
			redis.mget(replies, function (err, replies) {
				var version = replies.shift();
				for (i = 0; i < replies.length; i++)
					replies[i] = JSON.parse(replies[i]);
				response.json({"data": replies, "version": version});
			});
		});
	}
);

var todo_params_required = ["lastTime", "totalTime", "estimateTime", "residualTime", "title", "done", "selected", "startTick", "lastAccess"];
var todo_params_typed = {"lastTime": "integer", "totalTime": "integer", "estimateTime": "integer", "residualTime": "integer", "title": "string", "done": "boolean", "selected": "boolean", "startTick": "number", "createTime": "number", "lastAccess": "number"};

function guid() {
	var charset = "0123456789abcdefghijklmnopqrstuvwxyz";
	var i, uniqid = "";
	for (i = 0; i < 8; i++)
		uniqid += charset.charAt(Math.floor(Math.random() * charset.length));
	return uniqid;
}

fifo.post(
	"/todos/(:id)?",
	enforcer.login_required,
	enforcer.params_required(todo_params_required),
	enforcer.params_typed(_.extend(_.clone(todo_params_typed), {"guid": "string"})),
	function (request, response) {
		var params = _.extend(_.clone(request.query), request.body);
		params.createTime = (new Date).getTime() / 1000;
		var todo = new Todo(params);
		todo.id = todo.attributes.id = request.params.id || params.guid || guid();
		redis.multi()
		.set("todos:" + todo.id + "|uid:" + request.uid, JSON.stringify(todo))
		.rpush("todos|uid:" + request.uid, todo.id)
		.incr("todos:version|uid:" + request.uid)
		.exec(function (err, replies) {
			response.json({"data": {"id": todo.id}, "version": replies[2]}, 201);
		});
	}
);

fifo.put(
	"/todos/:id",
	enforcer.login_required,
	enforcer.params_typed(todo_params_typed),
	function (request, response) {
		redis.get("todos:" + request.params.id + "|uid:" + request.uid, function (err, reply) {
			if (!reply) {
				response.json({"error": {"type": "RESTDataException", "message": "Error finding todo with id " + request.params.id + "."}});
				return;
			}
			todo = new Todo(JSON.parse(reply));
			var params = _.extend(_.clone(request.query), request.body);
			todo.set(params);
			redis.multi()
			.incr("todos:version|uid:" + request.uid)
			.set("todos:" + todo.id + "|uid:" + request.uid, JSON.stringify(todo))
			.exec(function (err, replies) {
				response.json({"data": {}, "version": replies[0]});
			});
		});
	}
);

fifo.listen(3124);

console.log("FIFO server is running at port 3124");

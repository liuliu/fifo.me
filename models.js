var Backbone = require("backbone");

var Todo = Backbone.Model.extend({
	defaults: {
		"lastTime": 0, // in minutes
		"totalTime": 0, // in minutes
		"estimateTime": 0, // in minutes
		"residualTime": 0, // in minutes
		"title": "Untitled",
		"done": false,
		"selected": false,
		"startTick" : 0, // in milliseconds
		"createTime": 0, // in seconds
		"lastAccess" : 0 // in seconds
	}
});

var TodoList = Backbone.Collection.extend({
	model: Todo
});

exports.Todo = Todo;
exports.TodoList = TodoList;

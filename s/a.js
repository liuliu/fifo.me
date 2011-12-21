$(function () {

	function IamNLP(text) {
		var token = text.toLowerCase().split(/[.,\s\(\[\)\]\{\}\/\\]+/);
		var i;
		var recHour = ["hours", "hour", "h", "hr"];
		var recMinute = ["minutes", "minute", "m", "min"];
		var hour = Number.NaN, minute = Number.NaN, matches;
		var recStage = 0;
		var e = 0;
		for (i = token.length - 1; i >= 0; i--) {
			switch (recStage) {
				case 0: // nothing here, looking hints for minutes
					// try to match key strings of minutes
					if (_.indexOf(recMinute, token[i]) >= 0)
						recStage = 1;
					// try to match exp such as 1m, 30mins, 1m30s etc.
					matches = token[i].match(/^(\d+)(m|min|mins|minute|minutes){1}((\d+)(s|sec|secs|second|seconds)?)?$/);
					if (!_.isNull(matches)) {
						minute = parseInt(matches[1]);
						recStage = 2;
						e = i;
					}
					// try to match key strings of hours
					if (_.indexOf(recHour, token[i]) >= 0)
						recStage = 3;
					// try to match exp such as 1h, 30hrs, 1h30s etc.
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}((\d+)(s|sec|secs|second|seconds){1})?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						recStage = 4;
						e = i;
					}
					// try to match exp such as 1h30m, 30hrs2m, 1h4minutes30s etc.
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}(\d+)(m|min|mins|minute|minutes){1}((\d+)(s|sec|secs|second|seconds)?)?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						minute = parseInt(matches[3]);
						recStage = 4;
						e = i;
					}
					// try to match exp such as 1h30, 1hr30 etc
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}(\d+)(m|min|mins|minute|minutes)?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						minute = parseInt(matches[3]);
						recStage = 4;
						e = i;
					}
					// try to match hh:mm:ss type exp
					matches = token[i].match(/^(\d+):(\d+)(:\d+)?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						minute = parseInt(matches[2]);
						recStage = 4;
						e = i;
					}
					break;
				case 1: // in "minutes" mode, find number
					minute = parseInt(token[i])
					if (!_.isNaN(minute)) {
						recStage = 2;
						e = i;
					}
					break;
				case 2: // got "minutes" already, looking hints for hours
					if (_.indexOf(recHour, token[i]) >= 0)
						recStage = 3;
					// try to match exp such as 1h, 30hrs, 1h30s etc.
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}((\d+)(s|sec|secs|second|seconds){1})?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						recStage = 4;
						e = i;
					}
					// try to match exp such as 1h30m, 30hrs2m, 1h4minutes30s etc.
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}(\d+)(m|min|mins|minute|minutes){1}((\d+)(s|sec|secs|second|seconds){1})?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						minute = parseInt(matches[3]);
						recStage = 4;
						e = i;
					}
					// try to match exp such as 1h30, 1hr30 etc
					matches = token[i].match(/^(\d+)(h|hr|hrs|hour|hours){1}(\d+)(m|min|mins|minute|minutes)?$/);
					if (!_.isNull(matches)) {
						hour = parseInt(matches[1]);
						minute = parseInt(matches[3]);
						recStage = 4;
						e = i;
					}
					break;
				case 3: // in "hours" mode, find number
					hour = parseInt(token[i]);
					if (!_.isNaN(hour)) {
						recStage = 4;
						e = i;
					}
					break;
			}
			if (recStage == 4)
				break;
		}
		if (_.isNaN(hour) && _.isNaN(minute))
			return null;
		if (_.isNaN(minute))
			minute = 0;
		if (!_.isNaN(hour))
			minute += hour * 60;
		if (e <= 0)
			return {time: minute};
		var patt = token[0];
		for (i = 1; i < e; i++)
			patt += "[.,\\s\\(\\[\\)\\]\\{\\}\\/\\\\]+" + token[i];
		matches = text.match(new RegExp(patt, "i"));
		if (_.isNull(matches) || matches.length <= 0)
			return {time: minute};
		return {time: minute, rest: matches[0]};
	}

	var Todo = Backbone.Model.extend({
		defaults: {
			"lastTime": 0, // in minutes
			"totalTime": 0, // in minutes
			"estimateTime": 0, // in minutes
			"title": "Untitled",
			"done": false,
			"selected": false,
			"startTick" : 0 // in seconds
		},

		decipher: function (text) {
			var result = IamNLP(text);
			if (_.isNull(result) || result.time <= 0)
				return false;
			if (!result.rest)
				return false;
			this.set({estimateTime: result.time, title: result.rest});
			return true;
		}
	});

	var TodoList = Backbone.Collection.extend({
		model: Todo
	});


	var readable = {
		fromTime: function (time) {
			if (time < 60)
				return time + "m";
			if (time % 60)
				return Math.floor(time / 60) + "h" + (time % 60) + "m";
			return Math.floor(time / 60) + "h";
		},

		fromSecond: function (time) {
			if (time < 60)
				return time + "s";
			var str = "";
			if (time % 60)
				str = (time % 60) + "s";
			time = Math.floor(time / 60);
			if (time < 60)
				return time + "m" + str;
			if (time % 60)
				return Math.floor(time / 60) + "h" + (time % 60) + "m" + str;
			return Math.floor(time / 60) + "h" + str;
		},

		toTime: function (text) {
			var result = IamNLP(text);
			if (_.isNull(result) || result.time <= 0)
				return -1;
			return result.time;
		}
	}

	function wobble(el) {
		var left = parseInt(el.css("margin-left"));
		el.animate({"margin-left": (left - 2).toString() + "px"}, 30)
		  .animate({"margin-left": (left + 2).toString() + "px"}, 60)
		  .animate({"margin-left": (left - 1).toString() + "px"}, 60)
		  .animate({"margin-left": (left + 1).toString() + "px"}, 60)
		  .animate({"margin-left": left.toString() + "px"}, 30);
	}

	var TodoView = Backbone.View.extend({
		tagName: "li",
		template: _.template('<span class="dot"></span><span class="bold"><%= title %></span>, <span class="todo-elapsed"></span> / <span class="todo-estimate"></span><span class="r" style="visibility:hidden">R</span>'),

		events: {
			"click .r": "retract",
			"click .dot": "complete"
		},

		initialize: function () {
			this.model.bind("change", this.render, this);
			this.model.bind("remove", this.remove, this);
		},

		trackTime: function () {
			this.$(".todo-elapsed").text(readable.fromTime(this.model.get("totalTime")));
			this.$(".todo-estimate").text(readable.fromTime(this.model.get("estimateTime")));
		},

		retract: function () {
			this.trigger("retract", this);
		},

		complete: function () {
			this.model.set({"lastTime": this.model.get("totalTime"), "done": true});
			this.trigger("complete", this);
		},

		render: function () {
			$(this.el).html(this.template(this.model.toJSON()));
			this.trackTime();
			if (this.model.get("done")) {
				if (!this.$(".dot").hasClass("gray"))
					this.$(".dot").addClass("gray");
				if (!$(this.el).hasClass("faint"))
					$(this.el).addClass("faint");
			} else {
				if (this.$(".dot").hasClass("gray"))
					this.$(".dot").removeClass("gray");
				if ($(this.el).hasClass("faint"))
					$(this.el).removeClass("faint");
				if (this.model.get("selected"))
					this.$(".r").css("visibility", "visible");
				else
					this.$(".r").css("visibility", "hidden");
			}
			return this;
		},

		remove: function () {
			$(this.el).remove();
		}
	});

	var AppView = Backbone.View.extend({
		/* private variables */
		current: null, // current todo item
		state: true, // true - started, false - stopped
		tick: 60, // the frequency to change item
		lastTick: 0, // last time press pause/resume
		clockh: null, // handle for interval clock

		events: {
			"keypress .type-in input": "onNewTodoKeypress",
			"keypress #hint-interval": "onIntervalKeypressOrFocusOut",
			"focusout #hint-interval": "onIntervalKeypressOrFocusOut",
			"click #boss" : "onBossClick"
		},

		initialize: function () {
			this.collection.bind("add", this.add, this);
			this.$("#hint-interval").val(readable.fromTime(this.tick));
		},

		pause: function () {
			if (this.current) {
				var minutes = Math.max(0, Math.floor(((new Date).getTime() - this.current.get("startTick")) / (60 * 1000)));
				var totalTime = this.current.get("lastTime") + minutes;
				this.current.set({"lastTime": totalTime, "totalTime": totalTime});
			}
			this.$("#boss").attr("class", "continue");
			this.$("#elapsed").text("");
			this.state = false;
			if (this.clockh) {
				clearInterval(this.clockh);
				this.clockh = null;
			}
		},

		resume: function () {
			this.lastTick = (new Date).getTime();
			if (this.current)
				this.current.set({"selected": true, "startTick": this.lastTick});
			this.$("#boss").attr("class", "pause");
			this.state = true;
			if (!this.clockh) {
				var that = this;
				this.clockh = setInterval(function () { that.clock(); } /* correct scoping */, 1000);
			}
		},

		next: function () {
			if (this.current) {
				var minutes = Math.max(0, Math.floor(((new Date).getTime() - this.current.get("startTick")) / (60 * 1000)));
				var totalTime = this.current.get("lastTime") + minutes;
				var done = (totalTime >= this.current.get("estimateTime")) || this.current.get("done");
				this.current.set({"lastTime": totalTime, "totalTime": totalTime, "selected": false, "done": done});
				var i = this.collection.indexOf(this.current) + 1;
				if (!done) {
					if (i < this.collection.size()) { // if retract from the last one, simply ignore that
						var newTodo = this.collection.at(i);
						this.collection.remove(this.current);
						var oldTodo = this.current;
						this.current = newTodo;
						this.collection.add(oldTodo);
					}
				} else if (i < this.collection.size()) {
					this.current = this.collection.at(i);
				} else {
					this.current = null;
					this.pause();
				}
			}
			if (this.current)
				this.current.set({"selected": true, "startTick": (new Date).getTime()});
			return this.current;
		},

		add: function (todo) {
			var todoView = new TodoView({model: todo});
			todoView.bind("retract", this.retractOne, this);
			todoView.bind("complete", this.completeOne, this);
			var i = this.collection.indexOf(todo);
			if (i < this.collection.size() - 1)
				this.$("#todo-list li:eq(" + i + ")").before(todoView.render().el);
			else
				this.$("#todo-list").append(todoView.render().el);
			if (!this.current) {
				this.current = todo;
				this.resume();
				this.clock();
			}
		},

		retractOne: function (todoView) {
			this.next();
		},

		completeOne: function (todoView) {
			if (this.current) {
				if (todoView.model != this.current) {
					var i = this.collection.indexOf(this.current);
					this.collection.remove(todoView.model);
					this.collection.add(todoView.model, {at: i});
				} else {
					this.next();
				}
			}
		},

		clock: function () {
			if (this.state && this.current) {
				var totalElapsed = Math.floor(((new Date).getTime() - this.lastTick) / 1000);
				this.$("#elapsed").text(readable.fromSecond(totalElapsed));
				var minutes = Math.floor(((new Date).getTime() - this.current.get("startTick")) / (60 * 1000));
				this.current.set({"totalTime": minutes + this.current.get("lastTime")});
				if (minutes >= this.tick || minutes + this.current.get("lastTime") >= this.current.get("estimateTime"))
					this.next();
			}
		},

		onNewTodoKeypress: function (e) {
			if (e.keyCode == 13) {
				var text = this.$(".type-in input").val();
				if (!text)
					return;
				var todo = new Todo;
				if (todo.decipher(text)) {
					this.collection.add(todo);
					if (this.$(".type-in").hasClass("type-in-error"))
						this.$(".type-in").removeClass("type-in-error");
					this.$(".type-in input").val("");
				} else {
					if (!this.$(".type-in").hasClass("type-in-error"))
						this.$(".type-in").addClass("type-in-error");
					wobble(this.$(".type-in"));
				}
			}
		},

		onIntervalKeypressOrFocusOut: function (e) {
			if (_.isUndefined(e.keyCode) || e.keyCode == 13) {
				var intervalHint = this.$("#hint-interval");
				var time = readable.toTime(intervalHint.val());
				if (time < 0) {
					if (!intervalHint.hasClass("error"))
						intervalHint.addClass("error");
					wobble(intervalHint);
				} else {
					this.tick = time;
					if (intervalHint.hasClass("error"))
						intervalHint.removeClass("error");
					intervalHint.val(readable.fromTime(this.tick));
				}
			}
		},

		onBossClick: function () {
			if (this.current) {
				if (this.state) {
					this.pause();
				} else {
					this.resume();
					this.clock();
				}
			}
		}
	});

	var todos = new TodoList;
	var application = new AppView({el: $(".todo"), collection: todos});
});

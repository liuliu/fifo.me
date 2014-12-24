(function () {

	function IamNLP(text) {
		var token = text.toLowerCase().split(/[.,\s\(\[\)\]\{\}\/\\]+/);
		var i;
		var recHour = ["hours", "hour", "h", "hr", "hrs"];
		var recMinute = ["minutes", "minute", "m", "min", "mins"];
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
		if (_.isNaN(hour) && _.isNaN(minute)) return null;
		if (_.isNaN(minute)) minute = 0;
		if (!_.isNaN(hour)) minute += hour * 60;
		if (e <= 0) return {time: minute};
		var patt = token[0];
		for (i = 1; i < e; i++)
			patt += "[.,\\s\\(\\[\\)\\]\\{\\}\\/\\\\]+" + token[i];
		matches = text.match(new RegExp(patt, "i"));
		if (_.isNull(matches) || matches.length <= 0) return {time: minute};
		return {time: minute, rest: matches[0]};
	}

	var storage = {};
	if (localStorage) {
		_.extend(storage, {
			set: function (key, data) {
				localStorage.setItem(key, JSON.stringify(data));
			},

			sset: function (key, data) {
				try {
					storage.set(key, data);
				} catch (e) {}
			},

			remove: function (key) {
				localStorage.removeItem(key);
			},

			get: function (key) {
				return JSON.parse(localStorage.getItem(key));
			},

			key: function (index) {
				return localStorage.key(index);
			},

			length: function () {
				return localStorage.length;
			}
		});
	} else {
		_.extend(storage, {
			set: function (key, data) {},
			sset: function (key, data) {},
			remove: function (key) {},
			get: function (key) { return null; },
			key: function (index) {return null; },
			length: function () { return 0; }
		});
	}

	window.getSyncedTime = (function () {
		var delta = storage.get("getSyncedTime.delta") || null;
		var syncing = false;
		return function (forceSync) {
			if ((_.isNull(delta) || forceSync) && !syncing) {
				var i = 0, count = 10, a = 0, before = (new Date).getTime();
				function accumulator() {
					$.ajax("/sntp", {cache: false, dataType: "json", success: function (data) {
						var after = (new Date).getTime();
						a += data - ((after - before) * 0.5 + before);
						i++;
						delta = a / i;
						storage.sset("getSyncedTime.delta", delta);
						if (i < count) {
							before = after;
							accumulator();
						} else {
							syncing = false;
						}
					}});
				}
				syncing = true;
				accumulator();
			} else if (!_.isNull(delta)) {
				return (new Date).getTime() + delta;
			} else {
				return (new Date).getTime();
			}
		};
	}).call(this);

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
		},

		urlRoot: "/todos",

		initialize: function (attrs, options) {
			if (!attrs.id && !attrs.guid)
				this.attributes.guid = guid();
			else if (!attrs.id)
				this.attributes.guid = attrs.id;
			this.guid = this.attributes.guid;
			this.state = 0; // stopped
		},

		decipher: function (text) {
			var result = IamNLP(text);
			if (_.isNull(result) || result.time <= 0 || !result.rest) return false;
			this.set({"estimateTime": result.time, "title": result.rest});
			return true;
		},

		done: function () {
			this.state = Todo.STOPPED;
			this.set({"lastAccess": getSyncedTime() / 1000, "lastTime": this.get("totalTime"), "residualTime": 0, "selected": false, "done": true});
			this.save();
		},

		elapsed: function (currentTime) {
			var minutes = Math.floor((currentTime - this.get("startTick")) / (60 * 1000)) + this.get("residualTime");
			this.set({"totalTime": minutes + this.get("lastTime")});
			return minutes;
		},

		resume: function (currentTime) {
			if (this.state != Todo.SUSPENDED && this.state != Todo.STOPPED)
				throw "illegal state, should resume only stopped or suspended Todo";
			this.state = Todo.ACTIVE;
			this.set({"selected": true, "startTick": currentTime});
			this.save();
		},

		pause: function (currentTime) {
			if (this.state != Todo.ACTIVE)
				throw "illegal state, should pause only active Todo";
			var minutes = Math.max(0, Math.floor((currentTime - this.get("startTick")) / (60 * 1000))) + this.get("residualTime");
			var totalTime = this.get("lastTime") + minutes;
			this.state = Todo.SUSPENDED;
			this.set({"residualTime": minutes, "totalTime": totalTime});
			this.save();
			return minutes;
		},

		stop: function (currentTime) {
			if (this.state != Todo.SUSPENDED && this.state != Todo.ACTIVE && this.state != Todo.STOPPED)
				throw "illegal state, should stop only stopped, suspended or active Todo";
			var minutes = Math.max(0, Math.floor((currentTime - this.get("startTick")) / (60 * 1000))) + this.get("residualTime");
			var totalTime = this.get("lastTime") + minutes;
			var done = (totalTime >= this.get("estimateTime")) || this.get("done");
			this.state = Todo.STOPPED;
			this.set({"lastAccess": currentTime / 1000, "lastTime": totalTime, "residualTime": 0, "totalTime": totalTime, "selected": false, "done": done});
			this.save();
			return minutes;
		}
	});

	Todo.STOPPED = 0;
	Todo.ACTIVE = 1;
	Todo.SUSPENDED = 2;

	function guid() {
		var charset = "0123456789abcdefghijklmnopqrstuvwxyz";
		var i, uniqid = "";
		for (i = 0; i < 8; i++)
			uniqid += charset.charAt(Math.floor(Math.random() * charset.length));
		return uniqid;
	}

	var FIFO = {version: 0};

	window.TodoList = Backbone.Collection.extend({
		model: Todo,

		url: "/todos",

		next: function (current) {
			var i = this.indexOf(current) + 1;
			if (i == 0) return null;
			if (!current.get("done")) {
				if (i < this.size()) { // if retract from the last one, simply ignore that
					var newTodo = this.at(i);
					this.remove(current);
					this.add(current);
					current = newTodo;
				}
				return current;
			} else if (i < this.size()) {
				return this.at(i);
			}
			return null;
		},

		reset: function (models, options) {
			Backbone.Collection.prototype.reset.call(this, models, _.extend(_.clone(options), {silent: true}));
			var gap = getSyncedTime() / 1000;
			this.comparator = function (model) {
				return model.get('done') ? model.get('lastAccess') - gap : model.get('lastAccess');
			};
			this.sort({silent: true});
			if (!options.silent) this.trigger('reset', this, options);
			return this;
		}
	});

	var readable = {
		fromTime: function (time) {
			if (time < 60) return time + "m";
			if (time % 60) return Math.floor(time / 60) + "h" + (time % 60) + "m";
			return Math.floor(time / 60) + "h";
		},

		fromSecond: function (time) {
			if (time < 60) return time + "s";
			var str = "";
			if (time % 60) str = (time % 60) + "s";
			time = Math.floor(time / 60);
			if (time < 60) return time + "m" + str;
			if (time % 60) return Math.floor(time / 60) + "h" + (time % 60) + "m" + str;
			return Math.floor(time / 60) + "h" + str;
		},

		toTime: function (text) {
			var result = IamNLP(text);
			if (_.isNull(result) || result.time <= 0) return -1;
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
		template: _.template('<div class="dot"><div></div></div><div class="title no-select"><div class="text"><div class="bold ellipsis"><%= title %></div>, <span class="todo-elapsed"></span> / <span class="todo-estimate"></span></div></div><div class="r" style="visibility:hidden">R</div>'),

		events: {
			"click .title": "edit",
			"click .r": "retract",
			"click .dot": "done"
		},

		initialize: function () {
			this.model.bind('change', this.render, this);
			this.model.bind('remove', this.remove, this);
			this.model.view = this;
		},

		retract: function () {
			this.trigger('retract', this);
		},

		done: function () {
			if (!this.model.get('done')) {
				this.model.done();
				this.trigger('done', this);
			}
		},

		edit: function () {
			if (!this.model.get('done')) {
				this.$(".title .text").html('<input class="edit" type="text">');
				var edit = this.$(".title .text .edit");
				edit.val(this.model.get('title') + ", " + readable.fromTime(this.model.get('estimateTime')));
				edit.focus();
				edit.select();
				var self = this;
				function change() {
					var text = edit.val();
					var oldEstimateTime = self.model.get('estimateTime');
					var oldTitle = self.model.get('title');
					if (self.model.decipher(text)) {
						if (oldEstimateTime != self.model.get('estimateTime') ||
							oldTitle != self.model.get('title')) {
							self.model.save();
						} else {
							self.render();
						}
					} else if (text.length == 0) { // sepcial case, if we cleaned all the texts, it goes back to what we start
						self.render();
					} else { 
						if (!edit.hasClass("edit-error"))
							edit.addClass("edit-error");
						wobble(edit);
						edit.focus();
					}
				}
				edit.focusout(change);
				edit.keypress(function (e) { if (e.keyCode == 13) change(); });
			} else {
				this.trigger('copy', this);
			}
		},

		render: function () {
			$(this.el).html(this.template(this.model.toJSON()));
			this.$(".title").attr('title', this.model.get('title'));
			this.$(".todo-elapsed").text(readable.fromTime(this.model.get("totalTime")));
			this.$(".todo-estimate").text(readable.fromTime(this.model.get("estimateTime")));
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

	function reconcile() {
	}

	(function () {
		// new sync can automatically remediate some errors etc.,
		// also, the create/update/delete request is in-order with this sync
		// additionally, it backs up data to localStorage
		var RESTSync = Backbone.sync;
		var syncQueue = [];
		var onfly = false;
		var InOrderSync = function (method, model, options) {
			if (method != "read") { // wrap request into a queue (in-order request)
				function sendInOrderRequest() {
					if (syncQueue.length > 0) {
						onfly = true;
						var request = syncQueue.shift();
						RESTSync(request.method, request.model, request.options);
					} else {
						onfly = false;
					}
				}
				(function () {
					var error = options.error;
					options.error = function (resp) {
						error(resp);
						sendInOrderRequest();
					};
					var success = options.success;
					options.success = function (resp, status, xhr) {
						success(resp.data, status, xhr);
						++FIFO.version;
						sendInOrderRequest();
					};
				}).call(this);
				var request = {"method": method, "model": model, "options": options};
				syncQueue.push(request);
			}
			var error = options.error;
			options.error = function (resp) {
				if (resp.error && resp.error.type && resp.error.type == "OAuthException") {
					FB.getLoginStatus(function(response) { // to renew access token
						if (response.status == 'connected') {
							options.error = error;
							RESTSync(method, model, options);
						} else {
							error(resp);
						}
					});
				} else {
					error(resp);
				}
			};
			var success = options.success;
			options.success = function (resp, status, xhr) {
				success(resp.data, status, xhr);
				if (resp.version > FIFO.version) // read doesn't bump up version
					reconcile();
				FIFO.version = resp.version;
			};
			if (method == "read")
				RESTSync(method, model, options);
			else if (!onfly)
				sendInOrderRequest();
		};
		Backbone.sync = function (method, model, options) {
			InOrderSync(method, model, options);
			if (method == "create" && model.guid)
				model.id = model.attributes.id = model.guid;
		};
	}).call(this);

	window.AppView = Backbone.View.extend({
		/* private variables */
		current: null, // current todo item
		state: true, // true - started, false - stopped
		tick: 60, // the frequency to change item
		lastTick: 0, // last time press pause/resume
		clockh: null, // handle for interval clock

		events: {
			"keypress .type-in input": "onNewTodoKeypress",
			"keypress #hint-interval": "onIntervalKeypress",
			"focusout #hint-interval": "onIntervalFocusOut",
			"click #boss": "onPlayClick",
		},

		initialize: function () {
			this.collection.bind("add", this.add, this);
			this.collection.bind("reset", this.reset, this);
			this.$("#hint-interval").val(readable.fromTime(this.tick));
			var self = this;
			$(window).resize(function () {
				if (self.current)
					self.scroll(self.current.view, true);
				else if (self.collection.size() > 0)
					self.scroll(self.collection.last().view, true);
			});
		},

		pause: function () {
			if (this.current) this.current.pause(getSyncedTime());
			this.$("#boss").attr("class", "continue");
			this.$("#elapsed").text("");
			this.state = false;
			if (this.clockh) {
				clearInterval(this.clockh);
				this.clockh = null;
			}
		},

		resume: function () {
			this.lastTick = getSyncedTime();
			if (this.current) this.current.resume(this.lastTick);
			this.$("#boss").attr("class", "pause");
			this.state = true;
			if (!this.clockh) {
				var that = this;
				this.clockh = setInterval(function () { that.clock(); } /* correct scoping */, 1000);
			}
		},

		next: function () {
			if (this.current) {
				this.current.stop(getSyncedTime());
				this.current = this.collection.next(this.current);
				if (!this.current)
					this.pause();
			}
			if (this.current) {
				this.current.resume(getSyncedTime());
				if (window.webkitNotifications && window.webkitNotifications.checkPermission() == 0) {
					window.webkitNotifications.createNotification("s/icon.png", "You have " + readable.fromTime(Math.min(this.current.get("estimateTime") - this.current.get("totalTime"), this.tick)) + " to work on", this.current.get("title")).show();
				}
				this.scroll(this.current.view, true);
			}
			return this.current;
		},

		scroll: function (todoView, animation) {
		},

		reset: function (todos) {
			this.$("#todo-list").empty();
			this.current = null;
			var self = this;
			todos.forEach(function (todo) {
				var todoView = new TodoView({model: todo});
				todoView.bind('retract', self.retractOne, self);
				todoView.bind('done', self.doneOne, self);
				todoView.bind('copy', self.copyOne, self);
				self.$("#todo-list").append(todoView.render().el);
				if (!todo.get('done') && !self.current) {
					currentView = todoView;
					self.current = todo;
					self.resume();
					self.clock();
				}
			});
			if (this.current)
				this.scroll(this.current.view);
			else if (todos.size() > 0)
				this.scroll(todos.last().view);
		},

		add: function (todo) {
			var todoView = new TodoView({model: todo});
			todoView.bind('retract', this.retractOne, this);
			todoView.bind('done', this.doneOne, this);
			todoView.bind('copy', this.copyOne, this);
			var i = this.collection.indexOf(todo);
			if (i < this.collection.size() - 1)
				this.$("#todo-list li:eq(" + i + ")").before(todoView.render().el);
			else
				this.$("#todo-list").append(todoView.render().el);
			if (!this.current) {
				this.current = todo;
				this.scroll(todoView, true);
				this.resume();
				this.clock();
			}
		},

		retractOne: function (todoView) {
			this.next();
		},

		doneOne: function (todoView) {
			if (this.current) {
				if (todoView.model != this.current) {
					var i = this.collection.indexOf(this.current);
					this.collection.remove(todoView.model);
					this.collection.add(todoView.model, {at: i});
					this.scroll(this.current.view, true);
				} else {
					this.next();
				}
			}
		},

		copyOne: function (todoView) {
			this.$(".type-in input").val(todoView.model.get('title') + ", " + readable.fromTime(todoView.model.get('estimateTime')));
		},

		clock: function () {
			if (this.state && this.current) {
				var totalElapsed = Math.floor((getSyncedTime() - this.lastTick) / 1000);
				var elapsed = this.current.elapsed(getSyncedTime());
				if (totalElapsed % 60 == 0)
					this.current.save();
				this.$("#elapsed").text(readable.fromSecond(totalElapsed) + " ~ " + readable.fromTime(Math.min(this.current.get('estimateTime') - this.current.get('totalTime'), this.tick - elapsed)));
				if (elapsed >= this.tick || this.current.get("totalTime") >= this.current.get("estimateTime"))
					this.next();
			}
		},

		onNewTodoKeypress: function (e) {
			if (e.keyCode == 13) {
				var text = this.$(".type-in input").val();
				if (!text) return;
				var self = this;
				var createTime = getSyncedTime() / 1000;
				var todo = new Todo({"createTime": createTime, "lastAccess": createTime});
				if (todo.decipher(text)) {
					todo.save();
					self.collection.add(todo);
					if (self.$(".type-in").hasClass("type-in-error"))
						self.$(".type-in").removeClass("type-in-error");
					self.$(".type-in input").val("");
				} else {
					if (!this.$(".type-in").hasClass("type-in-error"))
						this.$(".type-in").addClass("type-in-error");
					wobble(this.$(".type-in"));
				}
				if (window.webkitNotifications && window.webkitNotifications.checkPermission() != 0)
					window.webkitNotifications.requestPermission();
			}
		},

		onIntervalKeypress: function (e) {
			if (e.keyCode == 13) this.$(".type-in input").focus();
		},

		onIntervalFocusOut: function () {
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
		},

		onPlayClick: function () {
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
}).call(this);

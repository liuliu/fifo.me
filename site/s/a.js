(function () {

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

	var getSyncedTime = (function () {
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

	var TodoList = Backbone.Collection.extend({
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
		template: _.template('<div class="dot"><div></div></div><div class="title no-select"><div class="bold ellipsis"><%= title %></div>, <span class="todo-elapsed"></span> / <span class="todo-estimate"></span></div><span class="r" style="visibility:hidden">R</span>'),

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
				this.$(".title").html('<input class="edit" type="text">');
				var edit = this.$(".title .edit");
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
			var todoList = this.$("#todo-list");
			var page = todoList.height();
			var top = Math.min(Math.max($(todoView.el).offset().top - todoList.offset().top - 52, -10), Math.max(page - 4 /* padding to make it looks good */ - ((this.el).height() - this.$("#footer").height()), -10));
			if (animation)
				todoList.animate({'margin-top': -top + "px"}, 'fast', function (x, t, b, c, d) { return -c *(t/=d)*(t-2) + b; } /* easing out quad */);
			else
				todoList.css('margin-top', -top + "px");
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

	getSyncedTime(true); // force to sync at startup

	var animationIndex = 0;

	window.Scrollable = function (scroll, clipper, margin) {
		margin = margin || {};
		margin.top = margin.top || 0;
		margin.bottom = margin.bottom || 0;
		scroll = $(scroll);
		clipper = $(clipper);
		var scrollbar = null;
		function reinitScrollbar(force) {
			if (scrollbar) {
				if (force)
					scrollbar.remove();
				else
					return;
			}
			scrollbar = $('<div class="scrollbar"></div>');
			clipper.append(scrollbar);
			scrollbar.css('left', clipper.width() - 7);
			scrollbar.css('top', '0px');
			scrollbar.css('opacity', '0');
			scrollbar.sizeToFit = function () {
				scrollbar.out = (clipper.height() - margin.top - margin.bottom) + 4;
				scrollbar.on = Math.max(15, scrollbar.out * Math.min(1, (clipper.height() - margin.top - margin.bottom) / scroll.height()));
				scrollbar.css('height', Math.round(scrollbar.on) + 'px');
			};
			scrollbar.sizeToFit();
			scrollbar.show = function () {
				if (scrollbar.hid !== null) {
					clearTimeout(scrollbar.hid);
					scrollbar.hid = null;
				}
				scrollbar.css('opacity', '1');
			};
			scrollbar.hid = null;
			scrollbar.hide = function () {
				if (scrollbar.hid !== null) {
					clearTimeout(scrollbar.hid);
					scrollbar.hid = null;
				}
				scrollbar.hid = setTimeout(function () {
					if (scrollbar) {
						scrollbar.animate({'opacity': '0'}, 'fast', 'swing', function () {
							scrollbar.remove();
							scrollbar = null;
						});
						scrollbar.hid = null;
					}
				}, 800);
			};
		}

		function onWheel(e) {
			if (e.originalEvent.axis && e.originalEvent.HORIZONTAL_AXIS && e.originalEvent.axis == e.originalEvent.HORIZONTAL_AXIS)
				return;
			var delta = e.originalEvent.detail || -0.5 * e.originalEvent.wheelDeltaY;
			delta *= -0.5;
			if (earlyEnd) earlyEnd();
			var top = Math.max(Math.min(scroll.offset().top + delta, margin.top), Math.min((clipper.height() - margin.bottom) - scroll.height(), margin.top));
			reinitScrollbar();
			scrollbar.sizeToFit();
			scrollbar.show();
			min = -margin.top;
			max = Math.max(min, scroll.height() - (clipper.height() - margin.bottom));
			scrollbar[0].style.transform =
			scrollbar[0].style.MozTransform =
			scrollbar[0].style.webkitTransform = tracker(-top);
			scrollbar.hide();
			scroll.css("margin-top", top + "px");
		}

		clipper.bind('mousewheel', onWheel);
		clipper.bind('MozMousePixelScroll', onWheel);

		/* from Scrollability, added support for Firefox, very nice scrolling with CSS3 keyframes animation */

		var ss = document.createElement("style");
		document.head.appendChild(ss);
		globalStyleSheet = document.styleSheets[document.styleSheets.length - 1];

		var touched = false;
		var isTouch = 'ontouchstart' in window;
		var position = 0;
		var min = -margin.top;
		var max = Math.max(min, scroll.height() - (clipper.height() - margin.bottom));
		var timeStep = 0;
		var lastTime = 0;
		var velocity = 0;
		var lastTouch = 0;
		var bounceLimit = 0;
		var stopped = false;
		var touchStart = 0;
		var showedScrollbar = false;

		function onTouchStart(e) {
			var touch = isTouch ? e.touches[0] : e;
			lastTouch = touchStart = touch.clientY;
			min = -margin.top;
			max = Math.max(min, scroll.height() - (clipper.height() - margin.bottom));
			if (earlyEnd) earlyEnd();
			position = -scroll.offset().top;
			scroll.css("margin-top", "0px");
			scroll[0].style.transform =
			scroll[0].style.MozTransform =
			scroll[0].style.webkitTransform = reposition(position);
			bounceLimit = (Math.min(scroll.height(), clipper.height() - margin.bottom - margin.top)) * kBounceLimit;
			lastTime = e.timeStamp;
			showedScrollbar = false;
			touched = true;
		}

		var kFriction = 0.9925;
		var kStoppedThreshold = 4;
		var kLockThreshold = 10;
		var kBounceLimit = 0.75;
		var kBounceDecelRate = 0.01;
		var kBounceTime = 240;
		var kAnimationStep = 4;
		var kKeyframeIncrement = 24;

		function track(touch, time) {
			timeStep = time - lastTime;
			lastTime = time;
			velocity = -(touch - lastTouch);
			lastTouch = touch;
			stopped = !(Math.abs(velocity) >= kStoppedThreshold);
			if (position > max) {
				var excess = position - max;
				velocity *= (1.0 - excess / bounceLimit) * kBounceLimit;
			} else if (position < min) {
				var excess = min - position;
				velocity *= (1.0 - excess / bounceLimit) * kBounceLimit;
			}
			position += velocity;
		}

		function easeOutExpo(t, b, c, d) {
		    return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
		}

		function reposition(position) {
			return $.browser.webkit ? "translate3d(0," + Math.round(-position) + "px,0)" : "translatey(" + Math.round(-position) + "px)";
		}

		function tracker(position) {
			var po = Math.round(margin.top - 2 + (scrollbar.out - scrollbar.on) * (position - min) / (max - min));
			var height = Math.max(5, Math.min(Math.min(po + scrollbar.on - (margin.top - 2), scrollbar.out + margin.top - 2 - po), scrollbar.on));
			po = Math.max(margin.top - 2, po) - (scrollbar.on - height) * 0.5; // default transfrom-origin is 50% 50%
			return $.browser.webkit ? "translate3d(0," + po + "px,0) scaley(" + height / scrollbar.on + ")" : "translatey(" + po + "px) scaley(" + height / scrollbar.on + ")";
		}

		function generateCSSKeyframes(keyframes, name, time, scrollbar, browser) {
			browser = browser || "";
			var lines = ['@' + browser + 'keyframes ' + name + ' {'];

			keyframes.forEach(function(keyframe) {
				var percent = (keyframe.time / time) * 100;
				var frame = Math.floor(percent) + '% {'
					+ browser + 'transform: ' + (scrollbar ? tracker(keyframe.position) : (keyframe.css || reposition(keyframe.position))) + ';'
					+ '}';
					lines.push(frame);
			});

			lines.push('}');

			return lines.join('\n'); 
		}

		function createTimeline() {
			var time = 0;
			var lastPosition = position;
			var lastKeyTime = 0;
			var lastDiff = 0;
			var decelOrigin;
			var decelDelta;
			var decelStep = 0;
			var decelTime;
			var keyframes = [];

			var continues = true;
			while (continues) {
				if (position > max) {
					if (velocity > 0) {
						// Slowing down
						var excess = position - max;
						var elasticity = (1.0 - excess / bounceLimit);
						velocity = Math.max(velocity - kBounceDecelRate, 0) * elasticity;
						position += velocity;
					} else {
						// Bouncing back
						if (!decelStep) {
							decelOrigin = position;
							decelDelta = max - position;
						}
						position = easeOutExpo(decelStep, decelOrigin, decelDelta, kBounceTime);
						continues = ++decelStep <= kBounceTime && Math.floor(Math.abs(position)) > max;
					}
				} else if (position < min) {
					if (velocity < 0) {
							// Slowing down
							var excess = min - position;
							var elasticity = (1.0 - excess / bounceLimit);
							velocity = Math.min(velocity + kBounceDecelRate, 0) * elasticity;
							position += velocity;
					} else {
						// Bouncing back
						if (!decelStep) {
							decelOrigin = position;
							decelDelta = min - position;
						}
						position = easeOutExpo(decelStep, decelOrigin, decelDelta, kBounceTime);
						continues = ++decelStep <= kBounceTime && Math.ceil(position) < min;
					}
				} else {
					continues = Math.floor(Math.abs(velocity)*10) > 0;
					if (!continues)
						break;

					velocity *= kFriction;
					position += velocity;
				}

				saveKeyframe(!continues);            
				time += kAnimationStep;
			}

			if (position > max) {
				position = max;
				saveKeyframe(true);
			} else if (position < min) {
				position = min;
				saveKeyframe(true);
			}

			var totalTime = keyframes.length ? keyframes[keyframes.length - 1].time : 0;

			var name = "scrollability" + (animationIndex++);

			return {time: totalTime, position: position, keyframes: keyframes, name: name};

			function saveKeyframe(force) {
				var diff = position - lastPosition;
				// Add a new frame when we've changed direction, or passed the prescribed granularity
				if (force || (time-lastKeyTime >= kKeyframeIncrement || (lastDiff < 0 != diff < 0))) {
					keyframes.push({position: position, time: time});

					lastDiff = diff;
					lastPosition = position;
					lastKeyTime = time;
				}
			}
		}

		var cleanup = false;
		var earlyEnd, normalEnd;

		function terminate() {
			scroll[0].removeEventListener("animationend", normalEnd);
			scroll[0].removeEventListener("mozAnimationEnd", normalEnd);
			scroll[0].removeEventListener("webkitAnimationEnd", normalEnd);
			scroll[0].style.transform =
			scroll[0].style.MozTransform =
			scroll[0].style.webkitTransform = "";
			scroll[0].style.animation =
			scroll[0].style.MozAnimation =
			scroll[0].style.webkitAnimation = "";
			if (scrollbar) {
				scrollbar[0].style.transform =
				scrollbar[0].style.MozTransform =
				scrollbar[0].style.webkitTransform = tracker(position);
				scrollbar[0].style.animation =
				scrollbar[0].style.MozAnimation =
				scrollbar[0].style.webkitAnimation = "";
				scrollbar.hide();
			}
			if (cleanup) {
				for (var i = 0, end = globalStyleSheet.cssRules.length; i < end; i++)
					globalStyleSheet.deleteRule(0);
				cleanup = false;
			}
			scroll.css("margin-top", -Math.round(position) + "px");
			earlyEnd = normalEnd = null;
		}

		function play(node, name, time) {
			if (name) {
				node.style.animation =
				node.style.MozAnimation =
				node.style.webkitAnimation = name + " " + time + "ms linear both";
			}
			node.style.animationPlayState =
			node.style.MozAnimationPlayState =
			node.style.webkitAnimationPlayState = name ? "running" : "paused";
		}

		function takeoff() {
			if (stopped)
				velocity = 0;
			position += velocity;
			scroll[0].style.transform =
			scroll[0].style.MozTransform =
			scroll[0].style.webkitTransform = reposition(position);
			if (scrollbar) {
				scrollbar[0].style.transform =
				scrollbar[0].style.MozTransform =
				scrollbar[0].style.webkitTransform = tracker(position);
			}
			velocity = (velocity / timeStep) * kAnimationStep;

			var timeline = createTimeline();
			if (!timeline.time) {
				terminate();
				return;
			}

			earlyEnd = function () {
				play(scroll[0]);
				if (scrollbar) play(scrollbar[0]);
				var transform = $.browser.webkit ?  getComputedStyle(scroll[0]).webkitTransform : getComputedStyle(scroll[0]).MozTransform;
				if ($.browser.webkit) {
					position = -(new WebKitCSSMatrix(transform).m42);
				} else {
					var vals = transform.split(",");
					position = -parseFloat(vals[vals.length - 1]);
				}
				terminate();
			}

			normalEnd = function () {
				position = timeline.keyframes[timeline.keyframes.length - 1].position;
				if (scrollbar) play(scrollbar[0]);
				terminate();
			}

			if (cleanup) {
				for (var i = 0, end = globalStyleSheet.cssRules.length; i < end; i++)
					globalStyleSheet.deleteRule(0);
			}
        	globalStyleSheet.insertRule(generateCSSKeyframes(timeline.keyframes, timeline.name, timeline.time, false, $.browser.webkit ? '-webkit-' : '-moz-'), 0);
			if (scrollbar)
				globalStyleSheet.insertRule(generateCSSKeyframes(timeline.keyframes, timeline.name + 'scrollbar', timeline.time, true, $.browser.webkit ? '-webkit-' : '-moz-'), 0);
			scroll[0].addEventListener("animationend", normalEnd, false);
			scroll[0].addEventListener("mozAnimationEnd", normalEnd, false);
			scroll[0].addEventListener("webkitAnimationEnd", normalEnd, false);
			play(scroll[0], timeline.name, timeline.time);
			if (scrollbar) play(scrollbar[0], timeline.name + 'scrollbar', timeline.time);
			cleanup = true;
		}

		function onTouchMove(e) {
			e.preventDefault();
			if (touched) {
				var touch = isTouch ? e.touches[0] : e;
				track(touch.clientY, e.timeStamp);
				scroll[0].style.transform =
				scroll[0].style.MozTransform =
				scroll[0].style.webkitTransform = reposition(position);
				if (!showedScrollbar && Math.abs(touch.clientY - touchStart) > 10) {
					reinitScrollbar(true);
					scrollbar.sizeToFit();
					scrollbar[0].style.transform =
					scrollbar[0].style.MozTransform =
					scrollbar[0].style.webkitTransform = tracker(position);
					scrollbar.show();
					showedScrollbar = true;
				}
				if (scrollbar) {
					scrollbar[0].style.transform =
					scrollbar[0].style.MozTransform =
					scrollbar[0].style.webkitTransform = tracker(position);
				}
			}
		}

		function onTouchEnd(e) {
			if (touched) {
				takeoff();
				touched = false;
			}
		}

		if (isTouch) {
			document.addEventListener('touchstart', onTouchStart, false);
			document.addEventListener('touchmove', onTouchMove, false);
			document.addEventListener('touchend', onTouchEnd, false);
		} else {
			document.addEventListener('mousedown', onTouchStart, false);
			document.addEventListener('mousemove', onTouchMove, false);
			document.addEventListener('mouseup', onTouchEnd, false);
		}
	}

	window.todos = new TodoList;

	function isMobile() {
		var agent = navigator.userAgent || navigator.vendor || window.opera;
		return (/android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(agent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(agent.substr(0, 4)));
	}

	var AppRouter = Backbone.Router.extend({
		routes: {
			"/login": 'login',
			"/cover": 'cover',
			"/": 'index'
		},

		initialize: function () {
			this.loginTemplate = _.template($("#login-template").html());
			this.coverTemplate = _.template($("#cover-template").html());
			this.indexTemplate = _.template($("#index-template").html());
		},

		login: function () {
			$("#container").html(this.loginTemplate({}));
			$(".login").click(function () {
				FB.login(function(response) {
					if (response.authResponse) {
						window.appRouter.navigate(isMobile() ? "/" : "/cover", true);
					}
				}, {display: (isMobile() ? 'touch' : 'page')});
			});
		},

		cover: function () {
			var self = this;
			FB.api('/me', function (response) {
				$("#container").html(self.coverTemplate(response));
				$(".big-popup").click(function () {
					var top = (window.screen.availHeight - 480) / 2 - 30;
					var left = (window.screen.availWidth * 4 / 3 - 320) / 2;
					var newWindow = window.open("/", "FIFO WebApp", "width=320,height=480,top=" + top +",left=" + left);
					if (window.focus)
						newWindow.focus();
				});
			});
		},

		index: function () {
			var self = this;
			FB.getLoginStatus(function(response) { // to renew access token
				if (response.status == 'connected') {
					if (!isMobile() && window.name != "FIFO WebApp") {
						window.appRouter.navigate(isMobile() ? "/" : "/cover", true);
					} else {
						$("#container").html(self.indexTemplate({}));
						window.application = new AppView({el: $(".todo"), collection: todos});
						window.scrollable = new Scrollable($("#todo-list"), $(".todo"), {'top': 10, 'bottom': $("#footer").height() - 4});
						window.todos.fetch();
					}
				} else {
					window.appRouter.navigate("/login", true);
				}
			});
		}
	});

	window.appRouter = new AppRouter();
	Backbone.history.start({pushState: true});
}).call(this);

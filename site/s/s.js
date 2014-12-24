(function () {

	/* from Scrollability, added support for Firefox, very nice scrolling with CSS3 keyframes animation */

	var ss = document.createElement("style");
	document.head.appendChild(ss);
	globalStyleSheet = document.styleSheets[document.styleSheets.length - 1];

	var prefixed_transform = Modernizr.prefixed('transform').replace(/([A-Z])/g, function(str,m1){ return '-' + m1.toLowerCase(); }).replace(/^ms-/,'-ms-');;
	var prefixed_keyframes = prefixed_transform.replace(/transform/g, "keyframes");
	var transitionPropertyNames = {
		'WebkitTransition' : 'webkitTransition',
		'MozTransition'    : 'MozTransition',
		'OTransition'      : 'oTransition',
		'msTransition'     : 'msTransition',
		'transition'       : 'transition'
	};
	var transitionPropertyName = transitionPropertyNames[Modernizr.prefixed('transition')];
	var transformPropertyNames = {
		'WebkitTransform' : 'webkitTransform',
		'MozTransform'    : 'MozTransform',
		'OTransform'      : 'oTransform',
		'msTransform'     : 'msTransform',
		'transform'       : 'transform'
	};
	var transformPropertyName = transformPropertyNames[Modernizr.prefixed('transform')];
	var transformOriginPropertyNames = {
		'WebkitTransformOrigin' : 'webkitTransformOrigin',
		'MozTransformOrigin'    : 'MozTransformOrigin',
		'OTransformOrigin'      : 'oTransformOrigin',
		'msTransformOrigin'     : 'msTransformOrigin',
		'transformOrigin'       : 'transformOrigin'
	};
	var transformOriginPropertyName = transformOriginPropertyNames[Modernizr.prefixed('transformOrigin')];
	var animationPropertyNames = {
		'WebkitAnimation' : 'webkitAnimation',
		'MozAnimation'    : 'MozAnimation',
		'OAnimation'      : 'oAnimation',
		'msAnimation'     : 'msAnimation',
		'animation'       : 'animation'
	};
	var animationPropertyName = animationPropertyNames[Modernizr.prefixed('animation')];
	var animationPlayStatePropertyNames = {
		'WebkitAnimationPlayState' : 'webkitAnimationPlayState',
		'MozAnimationPlayState'    : 'MozAnimationPlayState',
		'OAnimationPlayState'      : 'oAnimationPlayState',
		'msAnimationPlayState'     : 'msAnimationPlayState',
		'animationPlayState'       : 'animationPlayState'
	};
	var animationPlayStatePropertyName = animationPlayStatePropertyNames[Modernizr.prefixed('animationPlayState')];
	var animationEndEventNames = {
		'WebkitAnimation' : 'webkitAnimationEnd',
		'MozAnimation'    : 'animationend',
		'OAnimation'      : 'animationend',
		'msAnimation'     : 'animationend',
		'animation'       : 'animationend'
	};
	var animationEndEventName = animationEndEventNames[Modernizr.prefixed('animation')];

	function generateCSSKeyframes(keyframes, name, time, format) {
		var lines = ['@' + prefixed_keyframes + " " + name + ' {'];

		keyframes.forEach(function(keyframe) {
			var percent = (keyframe.time / time) * 100;
			var frame = Math.floor(percent) + '% {'
				+ prefixed_transform + ': ' + format(keyframe.position) + ';'
				+ '}';
				lines.push(frame);
		});

		lines.push('}');

		return lines.join('\n'); 
	}

	function Animator(animator, prefix, formatter) {
		animator[0].style[transformOriginPropertyName] = "0 0";

		this.state = Animator.IDLE;
		var cleanup = false;
		var alternating = Animator.alternating;
		Animator.alternating = !Animator.alternating;

		this.play = function (timeline) {
			if (this.state != Animator.IDLE)
				throw "Animator.play starts at an illegal state";
			if (cleanup) {
				if (alternating)
					globalStyleSheet.deleteRule(0);
				else
					globalStyleSheet.deleteRule(globalStyleSheet.cssRules.length - 1);
				cleanup = false;
			}
			if (alternating)
				globalStyleSheet.insertRule(generateCSSKeyframes(timeline.keyframes, timeline.name + prefix, timeline.time, formatter), 0);
			else
				globalStyleSheet.insertRule(generateCSSKeyframes(timeline.keyframes, timeline.name + prefix, timeline.time, formatter), globalStyleSheet.cssRules.length);
			cleanup = true;
			animator[0].addEventListener(animationEndEventName, this.stop);
			animator[0].style[animationPropertyName] = timeline.name + prefix + " " + timeline.time + "ms linear both";
			animator[0].style[animationPlayStatePropertyName] = "running";
			this.state = Animator.PLAY;
		};

		this.pause = function () {
			if (this.state != Animator.PLAY)
				throw "Animator.pause is called at an illegal state";
			animator[0].style[animationPlayStatePropertyName] = "pause";
			this.state = Animator.PAUSE;
		};

		var self = this;

		this.stop = function () {
			if (self.state != Animator.PLAY && self.state != Animator.PAUSE)
				throw "Animator.stop is called at an illegal state";
			animator[0].removeEventListener(animationEndEventName, self.stop);
			self.pause();
			var transform = getComputedStyle(animator[0])[transformPropertyName];
			animator[0].style[animationPropertyName] = "";
			animator[0].style[animationPlayStatePropertyName] = "";
			animator[0].style[transformPropertyName] = transform;
			self.state = Animator.IDLE;
			if (self.didStop)
				self.didStop();
		};

		this.set = function (position) {
			if (this.state == Animator.PLAY || this.state == Animator.PAUSE)
				this.stop();
			animator[0].style[transformPropertyName] = formatter(position);
		};
	}

	_.extend(Animator, {alternating: true, IDLE: 1, PAUSE: 2, PLAY: 3});

	var animationIndex = 0;

	window.Scrollable = function (scroll, clipper, margin) {
		margin = margin || {};
		margin.top = margin.top || 0;
		margin.bottom = margin.bottom || 0;
		scroll = $(scroll);
		clipper = $(clipper);
		this.position = 0;
		var self = this;

		var indicator = $('<div class="indicator"></div>');
		clipper.append(indicator);
		indicator.css('left', clipper.width() - 7);
		indicator.css('top', '0px');
		indicator.css('opacity', '0');
		indicator.css('position', 'absolute');
		_.extend(indicator, {
			visible: false,
			sizeToFit: function () {
				indicator.out = (clipper.height() - margin.top - margin.bottom) + 4;
				indicator.on = Math.max(15, indicator.out * Math.min(1, (clipper.height() - margin.top - margin.bottom) / scroll.height()));
				indicator.css('height', Math.round(indicator.on) + 'px');
			},
			show: function () {
				if (indicator.timeout !== null) {
					clearTimeout(indicator.timeout);
					indicator.timeout = null;
				}
				indicator[0].style[transitionPropertyName] = '';
				indicator[0].style.opacity = '1';
				indicator.visible = true;
			},
			timeout: null,
			hide: function () {
				indicator.visible = false;
				indicator.timeout = setTimeout(function () {
					indicator[0].style.opacity = '0';
					indicator[0].style[transitionPropertyName] = 'opacity 0.33s linear';
					indicator.timeout = null;
				}, 800);
			}
		});
		indicator.sizeToFit();

		scroll.animator = new Animator(scroll, "-scroll", Modernizr.csstransforms3d ?
			function (position) { return "translate3d(0," + Math.round(-position) + "px,0)"; } :
			function (position) { return "translatey(" + Math.round(-position) + "px)"; });
		indicator.animator = new Animator(indicator, "-indicator", Modernizr.csstransforms3d ?
			function (position) {
				var pos = Math.round(margin.top - 2 + (indicator.out - indicator.on) * (position - min) / (max - min));
				var height = Math.max(5, Math.min(Math.min(pos + indicator.on - (margin.top - 2), indicator.out + margin.top - 2 - pos), indicator.on));
				pos = Math.max(margin.top - 2, pos); // default transfrom-origin is 50% 50%
				return "translate3d(0," + pos + "px,0) scale3d(1," + height / indicator.on + ",1)";
			} :
			function (position) {
				var pos = Math.round(margin.top - 2 + (indicator.out - indicator.on) * (position - min) / (max - min));
				var height = Math.max(5, Math.min(Math.min(pos + indicator.on - (margin.top - 2), indicator.out + margin.top - 2 - pos), indicator.on));
				pos = Math.max(margin.top - 2, pos); // default transfrom-origin is 50% 50%
				return "translatey(" + pos + "px) scaley(" + height / indicator.on + ")";
			});
		indicator.animator.didStop = indicator.hide;

		function recalibrate() {
			var transform = getComputedStyle(scroll[0])[transformPropertyName];
			if (window.WebKitCSSMatrix) {
				self.position = -(new WebKitCSSMatrix(transform).m42);
			} else {
				var vals = transform.split(",");
				self.position = -parseFloat(vals[vals.length - 1]);
			}
		}

		function onWheel(e) {
			if (e.originalEvent.axis && e.originalEvent.HORIZONTAL_AXIS && e.originalEvent.axis == e.originalEvent.HORIZONTAL_AXIS)
				return;
			var delta = e.originalEvent.detail || -0.5 * e.originalEvent.wheelDeltaY;
			delta *= 0.5;
			min = -margin.top;
			max = Math.max(min + 1e-4, scroll.height() - (clipper.height() - margin.bottom));
			if (scroll.animator.state != Animator.IDLE) {
				scroll.animator.stop();
				recalibrate();
			}
			self.position = Math.min(Math.max(self.position + delta, min), max);
			indicator.sizeToFit();
			indicator.show();
			indicator.animator.set(self.position);
			indicator.hide();
			scroll.animator.set(self.position);
		}

		clipper.bind('mousewheel', onWheel);
		clipper.bind('MozMousePixelScroll', onWheel);

		var touched = false;
		var isTouch = 'ontouchstart' in window;
		var min = -margin.top;
		var max = Math.max(min + 1e-4, scroll.height() - (clipper.height() - margin.bottom));
		var timeStep = 0;
		var lastTime = 0;
		var velocity = 0;
		var lastTouch = 0;
		var bounceLimit = 0;
		var stopped = false;
		var touchStart = 0;

		function onTouchStart(e) {
			var touch = isTouch ? e.touches[0] : e;
			if (touch.clientY > clipper.height() - margin.bottom + 4)
				return;
			lastTouch = touchStart = touch.clientY;
			min = -margin.top;
			max = Math.max(min + 1e-4, scroll.height() - (clipper.height() - margin.bottom));
			if (scroll.animator.state != Animator.IDLE) {
				scroll.animator.stop();
				recalibrate();
			}
			indicator.sizeToFit();
			if (indicator.animator.state != Animator.IDLE) {
				indicator.animator.stop();
				indicator.animator.set(self.position);
			}
			indicator.show();
			bounceLimit = (Math.min(scroll.height(), clipper.height() - margin.bottom - margin.top)) * kBounceLimit;
			lastTime = e.timeStamp;
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
			if (self.position > max) {
				var excess = self.position - max;
				velocity *= (1.0 - excess / bounceLimit) * kBounceLimit;
			} else if (self.position < min) {
				var excess = min - self.position;
				velocity *= (1.0 - excess / bounceLimit) * kBounceLimit;
			}
			self.position += velocity;
		}

		function easeOutExpo(t, b, c, d) {
		    return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
		}

		function createTimeline() {
			var time = 0;
			var lastPosition = self.position;
			var lastKeyTime = 0;
			var lastDiff = 0;
			var decelOrigin;
			var decelDelta;
			var decelStep = 0;
			var decelTime;
			var keyframes = [];

			var continues = true;
			while (continues) {
				if (self.position > max) {
					if (velocity > 0) {
						// Slowing down
						var excess = self.position - max;
						var elasticity = (1.0 - excess / bounceLimit);
						velocity = Math.max(velocity - kBounceDecelRate, 0) * elasticity;
						self.position += velocity;
					} else {
						// Bouncing back
						if (!decelStep) {
							decelOrigin = self.position;
							decelDelta = max - self.position;
						}
						self.position = easeOutExpo(decelStep, decelOrigin, decelDelta, kBounceTime);
						continues = ++decelStep <= kBounceTime && Math.floor(Math.abs(self.position)) > max;
					}
				} else if (self.position < min) {
					if (velocity < 0) {
							// Slowing down
							var excess = min - self.position;
							var elasticity = (1.0 - excess / bounceLimit);
							velocity = Math.min(velocity + kBounceDecelRate, 0) * elasticity;
							self.position += velocity;
					} else {
						// Bouncing back
						if (!decelStep) {
							decelOrigin = self.position;
							decelDelta = min - self.position;
						}
						self.position = easeOutExpo(decelStep, decelOrigin, decelDelta, kBounceTime);
						continues = ++decelStep <= kBounceTime && Math.ceil(self.position) < min;
					}
				} else {
					continues = Math.floor(Math.abs(velocity)*10) > 0;
					if (!continues)
						break;

					velocity *= kFriction;
					self.position += velocity;
				}

				saveKeyframe(!continues);            
				time += kAnimationStep;
			}

			if (self.position > max) {
				self.position = max;
				saveKeyframe(true);
			} else if (self.position < min) {
				self.position = min;
				saveKeyframe(true);
			}

			var totalTime = keyframes.length ? keyframes[keyframes.length - 1].time : 0;

			var name = "scrollability" + (animationIndex++);

			return {time: totalTime, position: self.position, keyframes: keyframes, name: name};

			function saveKeyframe(force) {
				var diff = self.position - lastPosition;
				// Add a new frame when we've changed direction, or passed the prescribed granularity
				if (force || (time-lastKeyTime >= kKeyframeIncrement || (lastDiff < 0 != diff < 0))) {
					keyframes.push({position: self.position, time: time});

					lastDiff = diff;
					lastPosition = self.position;
					lastKeyTime = time;
				}
			}
		}

		function takeoff() {
			if (stopped)
				velocity = 0;
			self.position += velocity;
			scroll.animator.set(self.position);
			indicator.animator.set(self.position);
			velocity = (velocity / timeStep) * kAnimationStep;

			var timeline = createTimeline();
			if (!timeline.time) {
				indicator.hide();
				return;
			}

			indicator.animator.play(timeline);
			scroll.animator.play(timeline);
		}

		function onTouchMove(e) {
			e.preventDefault();
			if (touched) {
				var touch = isTouch ? e.touches[0] : e;
				track(touch.clientY, e.timeStamp);
				scroll.animator.set(self.position);
				indicator.animator.set(self.position);
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

		this.goto = function (position) {
			self.position = position;
			scroll.animator.set(position);
			indicator.animator.set(position);
		};
	}
}).call(this);

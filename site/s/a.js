(function () {

	getSyncedTime(true); // force to sync at startup

	window.todos = new TodoList;

	function isMobile() {
		var agent = navigator.userAgent || navigator.vendor || window.opera;
		return (/android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(agent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(agent.substr(0, 4)));
	}

	var AppRouter = Backbone.Router.extend({
		routes: {
			"/unsupport": 'unsupport',
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

		unsupport: function () {
		},

		index: function () {
			var self = this;
			if (Modernizr.csstransitions && Modernizr.cssanimations &&
				Modernizr.rgba && Modernizr.opacity && Modernizr.boxshadow &&
				Modernizr.localstorage && (Modernizr.csstransforms || Modernizr.csstransforms3d)) {
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
			} else {
				window.appRouter.navigate("/unsupport", true);
			}
		}
	});

	window.appRouter = new AppRouter();
	Backbone.history.start({pushState: true});

	window.fbAsyncInit = function() {
		FB.init({
			appId      : '312070565482641', // App ID
			channelUrl : '//fifo.me/channel.html', // Channel File
			status     : true, // check login status
			cookie     : true, // enable cookies to allow the server to access the session
			xfbml      : false // parse XFBML
		});
		window.appRouter.navigate("/", true);
	};

	// Load the SDK Asynchronously
	(function(d){
		var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
		js = d.createElement('script'); js.id = id; js.async = true;
		js.src = "//connect.facebook.net/en_US/all.js";
		d.getElementsByTagName('head')[0].appendChild(js);
	}(document));

}).call(this);

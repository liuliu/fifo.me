var facebook = require("./facebook").client;
var _ = require("underscore");

exports.login_required = function () {
	var redirect_uri = arguments[0];
	var login_required = function (request, response, next) {
		facebook.getSessionByRequestHeaders(request.headers)(function (session) {
			if (session) {
				request.fbsession = session;
				session.getId()(function (uid) {
					request.uid = uid;
					next();
				});
			} else {
				if (redirect_uri) {
					response.redirect(redirect_uri);
				} else {
					response.json({"error": {"type": "OAuthException", "message": "Error validating login information."}}, 401);
				}
			}
		});
	}
	if (arguments.length > 1) {
		redirect_uri = null;
		return login_required.apply(this, arguments);
	} else {
		return login_required;
	}
};

exports.params_required = function () {
	var params = arguments;
	if (arguments.length <= 0)
		throw "argument length is zero in params_required";
	var isArray = Array.isArray || function (obj) {
		return toString.call(obj) == '[object Array]';
	};
	if (isArray(arguments[0])) {
		params = arguments[0];
	} else {
		var i;
		for (i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] != "string")
				throw "some arguments are not string in params_required";
		}
		params = arguments;
	}
	return function (request, response, next) {
		var i, err = false;
		var req = _.extend(_.clone(request.query), request.body, request.params);
		for (i = 0; i < params.length; i++) {
			if (req[params[i]] === undefined || req[params[i]] === null) {
				response.json({"error": {"type": "RESTParamException", "message": "Error requiring parameter " + params[i] + "."}}, 400);
				err = true;
				break;
			}
		}
		if (!err) next();
	};
};

exports.params_typed = function () {
	var params;
	if (arguments.length <= 0)
		throw "argument length is zero in params_typed";
	if (typeof arguments[0] == "object") {
		params = arguments[0];
	} else {
		if (arguments.length % 2 == 1)
			throw "arguments are not paired in params_typed";
		var i;
		params = {};
		for (i = 0; i < arguments.length; i += 2) {
			if (typeof arguments[i] != "string")
				throw "some key arguments are not string in params_typed";
			params[arguments[i]] = arguments[i + 1];
		}
	}
	return function (request, response, next) {
		var i, err = false;
		var req = _.extend(_.clone(request.query), request.body, request.params);
		for (i in params) {
			if (req[i] !== undefined && req[i] !== null) {
				if (typeof params[i] == "object" && typeof params[i].test == "function") {
					if (typeof req[i] != "string" || !params[i].test(req[i])) {
						response.json({"error": {"type": "RESTParamException", "message": "Error validating parameter " + i + "'s type."}}, 400);
						err = true;
						break;
					}
				} else if (typeof params[i] == "string") {
					switch (params[i]) {
						case "number":
							if (typeof req[i] == "string") {
								req[i] = parseFloat(req[i]);
							}
							if (typeof req[i] != "number" || isNaN(req[i])) {
								response.json({"error": {"type": "RESTParamException", "message": "Error validating parameter " + i + "'s type."}}, 400);
								err = true;
							}
							break;
						case "integer":
							if (typeof req[i] == "string") {
								req[i] = parseInt(req[i]);
							}
							if (typeof req[i] != "number" || isNaN(req[i]) || req[i] != parseInt(req[i])) {
								response.json({"error": {"type": "RESTParamException", "message": "Error validating parameter " + i + "'s type."}}, 400);
								err = true;
							}
							break;
						case "boolean":
							if (typeof req[i] == "string") {
								switch (req[i].toLowerCase()) {
									case "1":
									case "t":
									case "y":
									case "yes":
									case "true":
										req[i] = true;
										break;
									case "0":
									case "f":
									case "n":
									case "no":
									case "false":
										req[i] = false;
										break;
								}
							}
							if (typeof req[i] != "boolean") {
								response.json({"error": {"type": "RESTParamException", "message": "Error validating parameter " + i + "'s type."}}, 400);
								err = true;
							}
							break;
						case "string":
							if (typeof req[i] != "string" &&
								(typeof req[i] != "number" || isNaN(req[i]))) {
								response.json({"error": {"type": "RESTParamException", "message": "Error validating parameter " + i + "'s type."}}, 400);
								err = true;
							}
							break;
					}
					if (err) break;
				}
			}
		}
		if (!err) next();
	};
};

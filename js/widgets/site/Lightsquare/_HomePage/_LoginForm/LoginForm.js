define(function(require) {
	require("css!./login_form.css");
	var html = require("file!./login_form.html");
	var Ractive = require("lib/dom/Ractive");
	
	function LoginForm(user, parent) {
		this._user = user;
		
		this._template = new Ractive({
			el: parent,
			template: html,
			data: {
				register: false,
				error: ""
			}
		});
		
		this._template.on("submit", (function(event) {
			event.original.preventDefault();
			
			this._clearError();
			
			var username = (this._template.get("username") || "").toString();
			var password = (this._template.get("password") || "").toString();
			
			if(this._template.get("register")) {
				this._user.register(username, password);
			}
			
			else {
				this._user.login(username, password);
			}
		}).bind(this));
		
		this._template.on("login", (function(event) {
			this._template.set("register", false);
			this._clearError();
		}).bind(this));
		
		this._template.on("register", (function(event) {
			this._template.set("register", true);
			this._clearError();
		}).bind(this));
		
		this._user.LoggedIn.addHandler(this, function() {
			this._clearForm();
		});
		
		this._user.LoginFailed.addHandler(this, function(data) {
			this._setError(data.reason);
		});
		
		this._user.Registered.addHandler(this, function() {
			this._clearForm();
		});
		
		this._user.RegistrationFailed.addHandler(this, function(data) {
			this._setError(data.reason);
		});
	}
	
	LoginForm.prototype._clearForm = function() {
		this._template.set("username", "");
		this._template.set("password", "");
	}
	
	LoginForm.prototype._clearError = function() {
		this._template.set("error", "");
	}
	
	LoginForm.prototype._setError = function(message) {
		this._template.set("error", message);
	}
	
	return LoginForm;
});
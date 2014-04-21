define(function(require) {
	require("css!./resources/lightsquare.css");
	var html = require("file!./resources/lightsquare.html");
	var linksHtml = require("file!./resources/links.html");
	var Template = require("lib/dom/Template");
	var Ractive = require("lib/dom/Ractive");
	var Router = require("lib/Router");
	var PageCache = require("./_PageCache");
	
	function Lightsquare(app, parent) {
		this._app = app;
		this._template = new Template(html, parent);
		this._pageCache = new PageCache(this._template.main);
		this._setupRouter();
		this._setupLinks();
		this._listenForNewGames();
		this._router.loadPath();
		this._openCurrentGames();
	}
	
	Lightsquare.prototype._openCurrentGames = function() {
		this._app.getGames().forEach((function(game) {
			this._router.loadPath("/game/" + game.getId());
		}).bind(this));
	}
	
	Lightsquare.prototype._listenForNewGames = function() {
		this._app.GamesReceived.addHandler(this, function(data) {
			data.games.forEach((function(game) {
				this._addGameLink(game);
			}).bind(this));
		});
		
		this._app.GameReady.addHandler(this, function(data) {
			this._addGameLink(data.game);
			this._goToGame(data.game);
		});
	}
	
	Lightsquare.prototype._addGameLink = function(game) {
		var href = "/game/" + game.getId();
		
		this._links.get("links").push({
			href: href,
			label: game.getId()
		});
	}
	
	Lightsquare.prototype._goToGame = function(game) {
		this._router.loadPath("/game/" + game.getId());
	}
	
	Lightsquare.prototype._showPage = function(url, callback) {
		if(this._pageCache.hasPage(url)) {
			this._pageCache.showPage(url);
		}
		
		else {
			callback();
		}
	}
	
	Lightsquare.prototype._setupRouter = function() {
		this._router = new Router();
		
		this._router.PathChanged.addHandler(this, function() {
			this._links.set("currentPath", window.location.pathname);
		});
		
		this._router.addRoute("/", (function(params, url) {
			this._showPage(url, (function() {
				require(["./_HomePage/HomePage"], (function(HomePage) {
					var page = this._pageCache.createPage(url);
					
					new HomePage(this._app, page);
					
					this._pageCache.showPage(url);
				}).bind(this));
			}).bind(this));
		}).bind(this));
		
		this._router.addRoute("/game/:id", (function(params, url) {
			this._showPage(url, (function() {
				require(["./_GamePage/GamePage"], (function(GamePage) {
					if(!this._pageCache.hasPage(url)) {
						var id = params["id"];
						
						if(this._app.hasGame(id)) {
							var page = this._pageCache.createPage(url);
							
							new GamePage(this._app.getGame(id), page);
							
							this._pageCache.showPage(url);
						}
						
						else {
							this._app.spectateGame(id);
						}
					}
				}).bind(this));
			}).bind(this));
		}).bind(this));
	}
	
	Lightsquare.prototype._setupLinks = function() {
		this._links = new Ractive({
			template: linksHtml,
			el: this._template.nav,
			data: {
				links: [
					{
						href: "/",
						label: "Home"
					}
				],
				currentPath: window.location.pathname
			}
		});
		
		this._links.on("click", (function(event) {
			event.original.preventDefault();
			this._router.loadPath(event.context.href);
		}).bind(this));
	}
	
	return Lightsquare;
});
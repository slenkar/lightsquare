define(function(require) {
	var Event = require("lib/Event");
	var html = require("file!./game_page.html");
	require("css!./game_page.css");
	var Board = require("widgets/chess/Board/Board");
	var History = require("widgets/chess/History/History");
	var Colour = require("chess/Colour");
	var Move = require("chess/Move");
	var PieceType = require("chess/PieceType");
	var Ractive = require("lib/dom/Ractive");
	var Chat = require("./_Chat/Chat");
	
	var viewRelevance = {
		PLAYER: "player",
		OPPONENT: "opponent"
	};
	
	function GamePage(game, user, parent) {
		this.PlayerClockTick = new Event(this);
		this.Rematch = new Event(this);
		
		this._user = user;
		this._viewingAs = Colour.white;
		this._setupGame(game);
		
		this._template = new Ractive({
			el: parent,
			template: html,
			data: {}
		});
		
		this._updateTemplate();
		this._setupChat();
		this._setupBoard();
		this._setupHistory();
		this._setupControls();
		this._updateUserDependentElements();
		this._handleUserEvents();
	}
	
	GamePage.prototype.getPlayerColour = function() {
		return this._game.getUserColour();
	}
	
	GamePage.prototype._userIsPlaying = function() {
		return (this.getPlayerColour() !== null);
	}
	
	GamePage.prototype.getTimingStyle = function() {
		return this._game.getTimingStyle();
	}
	
	GamePage.prototype.getPlayerName = function(colour) {
		return this._game.getPlayer(colour).username;
	}
	
	GamePage.prototype.getTimeLeft = function(colour) {
		return this._game.getTimeLeft(colour);
	}
	
	GamePage.prototype.getId = function() {
		return this._game.getId();
	}
	
	GamePage.prototype.gameIsInProgress = function() {
		return this._game.isInProgress();
	}
	
	GamePage.prototype._setupGame = function(game) {
		this._game = game;
		
		this._game.Move.addHandler(this, function(move) {
			this._history.move(move);
			this._board.setBoardArray(move.getPositionAfter().getBoardArray());
			this._template.set("userIsActivePlayer", this._userIsActivePlayer());
			this._template.set("drawOffered", false);
			this._template.set("canClaimDraw", this._game.isDrawClaimable());
			this._history.select(move);
		});
		
		this._game.DrawOffered.addHandler(this, function() {
			this._template.set("drawOffered", true);
		});
		
		this._game.ClockTick.addHandler(this, function(times) {
			if(this.getPlayerColour() === this._game.getActiveColour()) {
				this.PlayerClockTick.fire();
			}
			
			this._updateClocks(times);
		});
		
		this._game.Rematch.addHandler(this, function(game) {
			this._setupGame(game);
			this._updateTemplate();
			this._updateBoard();
			this._updateHistory();
			this._updateUserDependentElements();
			this.Rematch.fire(game);
		});
		
		this._game.GameOver.addHandler(this, function(result) {
			this._template.set("result", result);
			this._template.set("isInProgress", false);
		});
		
		this._game.Aborted.addHandler(this, function() {
			this._template.set("isInProgress", false);
		});
	}
	
	GamePage.prototype._setupBoard = function() {
		this._board = new Board(this._template.nodes.board);
		
		this._board.SelectPiece.addHandler(this, function(data) {
			if(!this._userIsActivePlayer() || data.piece.colour !== this.getPlayerColour() || !this._game.isInProgress()) {
				data.cancel = true;
			}
		});
		
		this._board.Move.addHandler(this, function(moveEvent) {
			var promoteTo = (this._user.getPrefs().alwaysQueen ? PieceType.queen : moveEvent.promoteTo);
			
			if(promoteTo === null && (new Move(this._game.getPosition(), moveEvent.from, moveEvent.to)).isPromotion()) {
				moveEvent.promptForPromotionPiece();
			}
			
			else {
				this._game.move(moveEvent.from, moveEvent.to, promoteTo);
			}
		});
		
		this._updateBoard();
		this._setBoardPrefs();
	}
	
	GamePage.prototype._setBoardPrefs = function() {
		var prefs = this._user.getPrefs();
		
		if(prefs.boardStyle) {
			this._board.setSquareStyle(prefs.boardStyle);
		}
		
		if(prefs.pieceStyle) {
			this._board.setPieceStyle(prefs.pieceStyle);
		}
		
		if(prefs.boardSize) {
			this._board.setSquareSize(prefs.boardSize);
		}
	}
	
	GamePage.prototype._setupControls = function() {
		this._template.on("resign", (function() {
			this._game.resign();
		}).bind(this));
		
		this._template.on("offer_or_accept_draw", (function() {
			if(this._userIsActivePlayer()) {
				this._game.acceptDraw();
			}
			
			else {
				this._game.offerDraw();
			}
		}).bind(this));
		
		this._template.on("claim_draw", (function() {
			this._game.claimDraw();
		}).bind(this));
		
		this._template.on("rematch", (function() {
			this._game.offerOrAcceptRematch();
		}).bind(this));
		
		this._template.on("new_game", (function() {
			
		}).bind(this));
	}
	
	GamePage.prototype._setupHistory = function() {
		this._history = new History(this._template.nodes.history);
		
		this._updateHistory();
		
		this._history.UserSelect.addHandler(this, function(move) {
			this._board.setBoardArray(move.getPositionAfter().getBoardArray());
		});
	}
	
	GamePage.prototype._updateHistory = function() {
		this._history.clear();
		
		this._game.getHistory().forEach((function(move) {
			this._history.move(move);
		}).bind(this));
		
		this._history.select(this._game.getLastMove());
	}
	
	GamePage.prototype._updateBoard = function() {
		this._board.setBoardArray(this._game.getPosition().getBoardArray());
	}
	
	GamePage.prototype._updateTemplate = function() {
		this._template.set({
			players: {},
			result: this._game.getResult(),
			isInProgress: this._game.isInProgress(),
			userIsPlaying: this._userIsPlaying(),
			userIsActivePlayer: this._userIsActivePlayer(),
			drawOffered: this._game.isDrawOffered(),
			canClaimDraw: this._game.isDrawClaimable(),
			timingDescription: this._game.getTimingStyle().getDescription()
		});
	}
	
	GamePage.prototype._userIsActivePlayer = function() {
		return (this.getPlayerColour() === this._game.getActiveColour());
	}
	
	GamePage.prototype._setupChat = function() {
		this._chat = new Chat(this._game, this._template.nodes.chat);
	}
	
	GamePage.prototype._relevanceFromColour = function(colour) {
		return (colour === this._viewingAs ? viewRelevance.PLAYER : viewRelevance.OPPONENT);
	}
	
	GamePage.prototype._updateUserDependentElements = function() {
		this._viewingAs = this.getPlayerColour() || Colour.white;
		this._board.setViewingAs(this._viewingAs);
		this._updatePlayerInfo();
		this._template.set("userIsPlaying", this._userIsPlaying());
	}
	
	GamePage.prototype._updatePlayerInfo = function() {
		Colour.forEach((function(colour) {
			var player = this._game.getPlayer(colour);
			var relevance = this._relevanceFromColour(colour);
			
			this._template.set("players." + relevance + ".username", player.username);
			this._template.set("players." + relevance + ".rating", player.rating);
		}).bind(this));
	}
	
	GamePage.prototype._updateClocks = function(times) {
		Colour.forEach((function(colour) {
			this._template.set("players." + this._relevanceFromColour(colour) + ".time", times[colour]);
		}).bind(this));
	}
	
	GamePage.prototype._handleUserEvents = function() {
		this._user.HasIdentity.addHandler(this, function() {
			this._updateUserDependentElements();
			this._setBoardPrefs();
		});
		
		this._user.PrefsChanged.addHandler(this, function() {
			this._setBoardPrefs();
		});
		
		this._user.LoggedIn.addHandler(this, function() {
			this._updateUserDependentElements();
			this._setBoardPrefs();
		});
		
		this._user.LoggedOut.addHandler(this, function() {
			this._updateUserDependentElements();
			this._setBoardPrefs();
		});
	}
	
	return GamePage;
});
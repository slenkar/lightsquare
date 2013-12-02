function Game() {
	this.Moved=new Event(this);

	this.owner=null;
	this.white=null;
	this.black=null;
	this.state=GAME_STATE_IN_PROGRESS;
	this.fen=null;
	this.mtimeStart=mtime();
	this.mtimeFinish=null;
	this.type=GAME_TYPE_STANDARD;
	this.variant=VARIANT_STANDARD;
	this.subvariant=SUBVARIANT_NONE;
	this.bughouseOtherGame=null;
	this.format=GAME_FORMAT_QUICK;
	this.result=null;
	this.resultDetails=null;
	this.whiteRatingOld=null;
	this.whiteRatingNew=null;
	this.blackRatingOld=null;
	this.blackRatingNew=null;
	this.clockStartIndex=1;
	this.clockStartDelay=0;
	this.timingInitial=600;
	this.timingIncrement=0;
	this.timingStyle=TIMING_SUDDEN_DEATH;
	this.timingOvertime=false;
	this.timingOvertimeCutoff=40;
	this.timingOvertimeIncrement=600;
	this.eventType=EVENT_TYPE_CASUAL;
	this.event=null;
	this.round=1;
	this.threefoldClaimable=false;
	this.fiftymoveClaimable=false;
	this.drawOffered=null;
	this.undoRequested=false;
	this.undoGranted=false;
	this.rated=true;

	this.position=new Position();
	this.startingPosition=new Position();
	this.board=new Board();
	this.history=new History();
	this.clock=new Clock();
	this.piecesTaken=new PiecesTaken();

	this.history.SelectedMoveChanged.addHandler(this, function(data) {
		if(data.move!==null) {
			this.position.setFen(data.move.resultingFen);
		}

		else {
			this.position.setFen(this.startingPosition.getFen());
		}

		this.board.setBoard(this.position.board);
	});
}

Game.prototype.setStartingFen=function(fen) {
	this.startingPosition.setFen(fen);
	this.setFen(fen);
}

Game.prototype.setFen=function(fen) {
	this.history.clear();
	this.position.setFen(fen);
	this.board.setFen(fen);
	this.history.startingColour.set(this.position.active);
	this.history.startingFullmove.set(this.position.fullmove);
}

Game.prototype.countLegalMoves=function(colour) {
	var legalMoves=0;
	var piece, available;

	for(var sq=0; sq<this.position.board.length; sq++) {
		piece=this.position.board[sq];

		if(piece!==SQ_EMPTY && Util.getColour(piece)===colour) {
			available=Util.moves_available(Util.getType(piece), sq, colour);

			for(var n=0; n<available.length; n++) {
				if(this.move(sq, available[n], QUEEN, true).legal) {
					legalMoves++;
				}
			}
		}
	}

	return legalMoves;
}

Game.prototype.getLegalMovesFrom=function(square) {
	var legalMoves=[];
	var available;
	var piece=this.position.board[square];

	if(piece!==SQ_EMPTY) {
		available=Util.getReachableSquares(Util.getType(piece), square, Util.getColour(piece));

		for(var n=0; n<available.length; n++) {
			if(this.move(square, available[n], QUEEN, true).legal) {
				legalMoves.push(available[n]);
			}
		}
	}

	return legalMoves;
}

Game.prototype.move=function(from, to, promoteTo, dryrun) {
	promoteTo=promoteTo||QUEEN;
	dryrun=dryrun||false;

	var colour=this.position.active;
	var piece=new Piece(this.position.board[from]);
	var targetPiece=new Piece(this.position.board[to]);
	var move=this.history.createMove();

	move.from=from;
	move.to=to;

	if(Util.isOnBoard(from) && Util.isOnBoard(to) && piece.type!==SQ_EMPTY && piece.colour===colour) {
		var label=new MoveLabel();
		var position=new Position(this.position.getFen());
		var fromCoords=Util.coordsFromSquare(from);
		var toCoords=Util.coordsFromSquare(to);
		var relFrom=Util.getRelativeSquare(from, colour);
		var relTo=Util.getRelativeSquare(to, colour);
		var oppColour=Util.getOppColour(colour);

		var isUnobstructed=(
			!Util.isBlocked(this.position.board, from, to)
			&& (targetPiece.type===SQ_EMPTY || targetPiece.colour!==colour)
		);

		label.piece=Fen.getPieceChar[Util.getPiece(piece.type, WHITE)];
		label.to=Util.getAlgebraicSquare(to);

		if(piece.type!==PAWN && piece.type!==KING) {
			label.disambiguation=Util.disambiguate(this.position.board, piece.type, colour, from, to);
		}

		if(targetPiece.colour===oppColour && targetPiece.type!==SQ_EMPTY) {
			label.sign=SIGN_CAPTURE;
			move.capturedPiece=this.position.board[to];
		}

		if(Util.isRegularMove(piece.type, fromCoords, toCoords) && isUnobstructed) {
			move.isValid=true;
			move.boardChanges[from]=SQ_EMPTY;
			move.boardChanges[to]=this.position.board[from];
		}

		else if(piece.type===PAWN && isUnobstructed) {
			var capturing=Util.isPawnCapture(relFrom, relTo);
			var validPromotion=false;
			var promotion=false;

			if(capturing) {
				label.disambiguation=Util.file_str(from);
				label.sign=SIGN_CAPTURE;
			}

			label.piece="";

			if(Util.isPawnPromotion(relTo)) {
				promotion=true;

				if(promoteTo>=KNIGHT && promoteTo<=QUEEN) {
					move.boardChanges[to]=Util.getPiece(promoteTo, colour);
					label.special=SIGN_PROMOTE+Fen.getPieceChar[Util.getPiece(promoteTo, WHITE)];
					move.promoteTo=promoteTo;
					validPromotion=true;
				}
			}

			if(validPromotion || !promotion) {
				if(targetPiece.type===SQ_EMPTY) {
					if(Util.isDoublePawnMove(relFrom, relTo)) {
						position.epTarget=Util.getRelativeSquare(relTo-8, colour);
						move.isValid=true;
					}

					else if(Util.isPawnMove(relFrom, relTo)) {
						move.isValid=true;
					}

					else if(capturing && to===this.position.epTarget) {
						move.boardChanges[Util.getEpPawn(from, to)]=SQ_EMPTY;
						label.sign=SIGN_CAPTURE;
						move.capturedPiece=Util.getPiece(PAWN, oppColour);
						move.isValid=true;
					}
				}

				else if(capturing) {
					move.isValid=true;
				}
			}

			if(move.isValid) {
				move.boardChanges[from]=SQ_EMPTY;

				if(!promotion) {
					move.boardChanges[to]=this.position.board[from];
				}
			}
		}

		else if((piece.type===KING || piece.type===ROOK) && !this.isInCheck(colour)) {
			move.isCastling=true;

			if(this.variant===VARIANT_960) {
				var backrank=[0, 7][colour];

				if(Util.yFromSquare(from)===backrank && Util.yFromSquare(to)===backrank) {
					kingSquare=this.position.kingPositions[colour];
					rookSquare=null;

					//find out whether it's kingside or queenside based on move direction

					var side;

					if(piece.type===ROOK) {
						side=(Util.xFromSquare(from)<Util.xFromSquare(to))?QUEENSIDE:KINGSIDE;
					}

					else if(piece.type===KING) {
						side=(Util.xFromSquare(from)>Util.xFromSquare(to))?QUEENSIDE:KINGSIDE;
					}

					var rookDestinationFile=[5, 3][side];
					var kingDestinationFile=[6, 2][side];
					var edge=[7, 0][side];

					//if rook move, rook is on from square

					if(piece.type===ROOK) {
						rookSquare=from;
					}

					//if king move, find rook between edge and king

					else {
						var rookSquares=Util.getSquaresBetween(Util.squareFromCoords([edge, backrank]), kingSquare, true);
						var sq;

						for(var i=0; i<rookSquares.length; i++) {
							sq=rookSquares[i];

							if(this.position.board[sq]===Util.getPiece(ROOK, colour)) {
								rookSquare=sq;

								break;
							}
						}
					}

					/*
					this bit finds out which squares to check to see that the only 2 pieces
					on the bit of the back rank used for castling are the king and the rook
					*/

					if(rookSquare!==null) {
						var kingDestination=Util.squareFromCoords([kingDestinationFile, backrank]);
						var rookDestination=Util.squareFromCoords([rookDestinationFile, backrank]);

						var outermostSquare=kingSquare;
						var innermostSquare=rookSquare;

						var kingFile=Util.xFromSquare(kingSquare);
						var rookFile=Util.xFromSquare(rookSquare);

						if(Math.abs(edge-rookDestinationFile)>Math.abs(edge-kingFile)) { //rook dest is further out
							outermostSquare=rookDestination;
						}

						if(Math.abs(edge-kingDestinationFile)<Math.abs(edge-rookFile)) { //king dest is further in
							innermostSquare=kingDestination;
						}

						var squares=Util.getSquaresBetween(innermostSquare, outermostSquare, true);

						var kings=0;
						var rooks=0;
						var others=0;
						var pc;

						for(var i=0; i<squares.length; i++) {
							sq=squares[i];
							pc=this.position.board[sq];

							if(pc!==SQ_EMPTY) {
								if(pc===Util.getPiece(ROOK, colour)) {
									rooks++;
								}

								else if(pc===Util.getPiece(KING, colour)) {
									kings++;
								}

								else {
									others++;

									break;
								}
							}
						}

						if(kings===1 && rooks===1 && others===0) {
							var throughCheck=false;
							var between=Util.getSquaresBetween(kingSquare, kingDestination);
							var n;

							for(var i=0; i<between.length; i++) {
								n=between[i];

								if(Util.getAllAttackers(this.position.board, n, oppColour).length>0) {
									throughCheck=true;

									break;
								}
							}

							if(!throughCheck) {
								label.piece="";
								label.to="";
								label.special=CastlingDetails.signs[side];
								move.boardChanges[kingSquare]=SQ_EMPTY;
								move.boardChanges[rookSquare]=SQ_EMPTY;
								move.boardChanges[kingDestination]=Util.getPiece(KING, colour);
								move.boardChanges[rookDestination]=Util.getPiece(ROOK, colour);
								move.isValid=true;
							}
						}
					}
				}
			}

			else { //standard (could be GAME_TYPE_STANDARD or just null)
				if(piece.type===KING && isUnobstructed) {
					var castling=new CastlingDetails(from, to);

					if(castling.isValid && this.position.castlingRights.get(colour, castling.Side)) {
						//not blocked or through check

						var throughCheck=false;
						var between=Util.getSquaresBetween(from, to);
						var n;

						for(var i=0; i<between.length; i++) {
							n=between[i];

							if(Util.getAllAttackers(this.position.board, n, oppColour).length>0) {
								throughCheck=true;

								break;
							}
						}

						if(!Util.isBlocked(this.position.board, from, castling.rookStartPos) && !throughCheck) {
							label.piece="";
							label.to="";
							label.special=castling.sign;
							move.boardChanges[from]=SQ_EMPTY;
							move.boardChanges[to]=Util.getPiece(KING, colour);
							move.boardChanges[castling.rookStartPos]=SQ_EMPTY;
							move.boardChanges[castling.rookEndPos]=Util.getPiece(ROOK, colour);
							move.isValid=true;
						}
					}
				}
			}
		}

		if(move.isValid) {
			var action;

			for(var square in move.boardChanges) {
				square=parseInt(square);
				position.setSquare(square, move.boardChanges[square]);
			}

			//test whether the player is in check on temporary board

			var playerKingAttackers=Util.getAllAttackers(position.board, position.kingPositions[colour], oppColour);

			if(playerKingAttackers.length===0) {
				move.isLegal=true;
			}
		}

		if(move.isLegal) {
			var oldPosition=this.position;

			this.position=position;

			if(colour===BLACK) {
				this.position.fullmove++;
			}

			this.position.active=oppColour;

			if(move.capturedPiece!==null || piece.type===PAWN) {
				this.position.fiftymoveClock=0;
			}

			else {
				this.position.fiftymoveClock++;
			}

			if(piece.type!==PAWN || !Util.isDoublePawnMove(relFrom, relTo)) {
				this.position.epTarget=null;
			}

			if(piece.type===KING || move.isCastling) {
				for(file=0; file<8; file++) {
					this.position.castlingRights.set(colour, file, false, CastlingRights.MODE_FILE);
				}
			}

			else if(piece.type===ROOK) {
				this.position.castlingRights.set(colour, Util.xFromSquare(from), false, CastlingRights.MODE_FILE);
			}

			if(this.isInCheck(oppColour)) {
				label.check=SIGN_CHECK;
			}

			if(this.isMated(oppColour)) {
				label.check=SIGN_MATE;
			}

			if(!dryrun) {
				this.drawOffered=null; //FIXME using WHITE/BLACK/null for this .. call it "drawOfferedBy" or something?
				this.undoRequested=false;

				if(this.isMated(oppColour)) {
					this._gameOver(Result.WinResult[colour], RESULT_DETAILS_CHECKMATE);
				}

				else {
					//games are automatically drawn only if mate is impossible, not if it's just not forceable.

					if(!this.canMate(WHITE) && !this.canMate(BLACK)) {
						this._gameOver(RESULT_DRAW, RESULT_DETAILS_INSUFFICIENT);
					}

					/*
					moves available will sometimes return 0 in bughouse games, e.g.
					when the player would be mated normally but can wait to put a
					piece in the way, so stalemate by being unable to move has been
					left out for bughouse.  obviously the best way would be to also
					check whether it's possible that pieces will become available,
					but that's too much of a performance hit (on the server at least).
					*/

					if(this.countLegalMoves(oppColour)===0 && this.type!==GAME_TYPE_BUGHOUSE) {
						this._gameOver(RESULT_DRAW, RESULT_DETAILS_STALEMATE);
					}

					if(this.position.fiftymoveClock>49) {
						this.fiftymoveClaimable=true;
					}

					this._checkThreefold();
				}

				move.resultingFen=this.position.getFen();

				if(this.history.move(move)) {
					move.success=true;

					this.Moved.fire();
				}

				else { //if adding to the history fails for some reason, set back to the original position
					this.position=oldPosition;
				}
			}

			else {
				this.position=oldPosition;
			}
		}
	}

	return move;
}

Game.prototype.isInCheck=function(colour) {
	return (Util.getAllAttackers(
		this.position.board,
		this.position.kingPositions[colour],
		Util.getOppColour(colour)
	).length>0);
}

Game.prototype.isMated=function(colour) {
	return (this.isInCheck(colour) && this.countLegalMoves(colour)===0);
}

Game.prototype.canMate=function(colour) {
	var pieces=[];
	var bishops=[];
	var knights=[];

	pieces[KNIGHT]=0;
	pieces[BISHOP]=0;
	bishops[WHITE]=0;
	bishops[BLACK]=0;
	knights[WHITE]=0;
	knights[BLACK]=0;

	var piece, pieceColour, pieceType;

	for(var sq=0; sq<64; sq++) {
		piece=this.position.board[sq];
		pieceColour=Util.getColour(piece);
		pieceType=Util.getType(piece);

		if(pieceType!==SQ_EMPTY && pieceType!==KING) {
			if(pieceColour===colour && (pieceType===PAWN || pieceType===ROOK || pieceType===QUEEN)) {
				return true;
			}

			if(pieceType===BISHOP) {
				bishops[pieceColour]++;
			}

			if(pieceType===KNIGHT) {
				knights[pieceColour]++;
			}

			pieces[pieceType]++;
		}
	}

	return (
		(bishops[WHITE]>0 && bishops[BLACK]>0)
		|| (pieces[BISHOP]>0 && pieces[KNIGHT]>0)
		|| (pieces[KNIGHT]>2 && knights[colour]>0)
	);
}

Game.prototype.undo=function() {
	this.history.undo();
}

Game.prototype.squareContainsMovablePiece=function(square) {
	var piece=this.board.getSquare(square);
	var colour=Util.getColour(piece);
	var result=false;
	var reachable;

	if(piece!==SQ_EMPTY) {
		reachable=Util.getReachableSquares(Util.getType(piece), square, colour);

		for(var i=0; i<reachable.length; i++) {
			if(this.move(square, reachable[i], QUEEN, true).isLegal) {
				result=true;

				break;
			}
		}
	}

	return result;
}

Game.prototype._checkTime=function(colour) {
	if(this.time[colour]<1) {
		var oppColour=Util.getOppColour(colour);
		var result=this.canMate(oppColour)?oppColour:DRAW;
		this._gameOver(result, RESULT_DETAILS_TIMEOUT);
	}
}

Game.prototype._calculateTime=function() {
	/*
	LiveGame implements this with stuff about the server time
	diff etc.  No point implementing it here yet.
	*/
}

Game.prototype._checkThreefold=function() {
	var fen=this.position.getFen();
	var limit=3;
	var n=0;

	if(fen===this.startingPosition.getFen()) {
		limit--;
	}

	this.history.mainLine.moveList.each(function(move) {
		if(move.fen===fen) {
			n++;
		}
	});

	this.threefoldClaimable=(n>=limit);
}

Game.prototype._gameOver=function(result, result_details) {
	this.state=GAME_STATE_FINISHED;
	this.result=result;
	this.resultDetails=result_details;
	this.drawOffered=null;
	this.undoGranted=false;
	this.undoRequested=false;
}
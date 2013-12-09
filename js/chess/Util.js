var Util={
	colourFromHalfmove: function(halfmove) {
		return (Util.getHalfmoveIndex(halfmove)===1?BLACK:WHITE);
	},

	getOppColour: function(colour) {
		return (colour===BLACK?WHITE:BLACK);
	},

	getOppGame: function(gameId) {
		return (gameId?0:1);
	},

	fullmoveIndexFromHalfmove: function(halfmove) { //which fullmove the halfmove is in, zero-based
		return Math.floor(halfmove/2);
	},

	fullmoveFromHalfmove: function(halfmove) { //PGN fullmove number
		return Util.fullmoveIndexFromHalfmove(halfmove)+1;
	},

	halfmoveFromFullmove: function(fullmove) {
		return (fullmove-1)*2;
	},

	fullmoveDotFromColour: function(colour) { //NOTE relies on colours being 0 and 1
		return [".", "..."][colour];
	},

	getHalfmoveIndex: function(halfmove) {
		return halfmove%2;
	},

	getType: function(piece) {
		return piece&TYPE;
	},

	getColour: function(piece) {
		return piece>>COLOUR;
	},

	getPiece: function(type, colour) {
		return (colour<<COLOUR)|type;
	},

	isOnBoard: function(square) {
		return (square>-1 && sq<64);
	},

	getSquareColour: function(square) {
		return (!(((square%2)+(Math.floor(square/8)%2))%2))?BLACK:WHITE;
	},

	getRelativeSquare: function(square, colour) {
		return (colour===BLACK?63-square:square);
	},

	xFromSquare: function(square) {
		return (square%8);
	},

	yFromSquare: function(square) {
		return ((square-Util.xFromSquare(square))/8);
	},

	fileFromSquare: function(square) {
		return FILE.substr(square%8, 1);
	},

	rankFromSquare: function(sq) {
		return RANK.substr(((sq-(sq%8))/8), 1);
	},

	squareFromAlgebraic: function(algebraicSquare) {
		return Util.squareFromCoords([
			FILE.indexOf(algebraicSquare.charAt(X)),
			RANK.indexOf(algebraicSquare.charAt(Y))
		]);
	},

	algebraicFromSquare: function(square) {
		return Util.fileFromSquare(square)+Util.rankFromSquare(square);
	},

	coordsFromSquare: function(square) {
		var x=square%8;
		var y=(square-x)/8;

		return [x, y];
	},

	squareFromCoords: function(coords) {
		return (coords[Y]*8)+coords[X];
	},

	squaresAreOnSameFile: function(squareA, squareB) {
		return Util.fileFromSquare(squareA)===Util.fileFromSquare(squareB);
	},

	squaresAreOnSameRank: function(squareA, squareB) { //abs sq nos
		return Util.rankFromSquare(a)===Util.rankFromSquare(b);
	},

	isRegularMove: function(type, fromCoords, toCoords) {
		var diff=[
			Math.abs(fromCoords[X]-toCoords[X]),
			Math.abs(fromCoords[Y]-toCoords[Y])
		];

		if(diff[X]===0 && diff[Y]===0) {
			return false;
		}

		switch(type) {
			case PAWN: {
				return false;
			}
			
			case KNIGHT: {
				return ((diff[X]===2 && diff[Y]===1) || (diff[X]===1 && diff[Y]===2));
			}

			case BISHOP: {
				return (diff[X]===diff[Y]);
			}

			case ROOK: {
				return (diff[X]===0 || diff[Y]===0);
			}

			case QUEEN: {
				return (diff[X]===diff[Y] || (diff[X]===0 || diff[Y]===0));
			}

			case KING: {
				return ((diff[X]===1 || diff[X]===0) && (diff[Y]===1 || diff[Y]===0));
			}
		}
	},

	isPawnMove: function(from, to) {
		return (to-from===8);
	},

	isDoublePawnMove: function(from, to) {
		return (from>7 && from<16 && to-from===16);
	},

	isPawnCapture: function(from , to) {
		var fromCoords=Util.coordsFromSquare(from);
		var toCoords=Util.coordsFromSquare(to);

		return (toCoords[Y]-fromCoords[Y]===1 && Math.abs(toCoords[X]-fromCoords[X])===1);
	},

	isPawnPromotion: function(to) {
		return (to>55);
	},

	getEpPawn: function(capturerFrom, capturerTo) {
		return Util.squareFromCoords([Util.xFromSquare(capturerTo), Util.yFromSquare(capturerFrom)]);
	},

	getDiagonalDistance: function(fromCoords, toCoords) {
		return Math.abs(fromCoords[X]-toCoords[X]);
	},

	getSquaresBetween: function(from, to, inclusive) {
		var squares=[];

		//go from lower to higher sq so same loop can be used in either dir

		var temp=from;
		from=Math.min(from, to);
		to=Math.max(temp, to);

		var fromCoords=Util.coordsFromSquare(from);
		var toCoords=Util.coordsFromSquare(to);

		var difference=Math.abs(from-to);
		var increment;

		if(inclusive) {
			squares.push(from);
		}

		if(Util.isRegularMove(BISHOP, fromCoords, toCoords)) {
			var distance=Util.getDiagonalDistance(fromCoords, toCoords);

			if(distance>0) {
				increment=difference/distance;

				for(var n=from+increment; n<to; n+=increment) {
					squares.push(n);
				}
			}
		}

		else if(Util.isRegularMove(ROOK, fromCoords, toCoords)) {
			increment=difference>7?8:1; //?vertical:horizontal

			for(var n=from+increment; n<to; n+=increment) {
				squares.push(n);
			}
		}

		if(inclusive) {
			squares.push(to);
		}

		return arr;
	},

	isBlocked: function(board, from, to) {
		var squares=Util.getSquaresBetween(from, to);

		for(var i=0; i<squares.length; i++) {
			if(board[squares[i]]!==SQ_EMPTY) {
				return true;
			}
		}

		return false;
	},

	/*
	returns a list of squares reachable from "from" by a piece of type "type", including
	all pawn moves and castling, without taking into account any other information or
	rules such as not moving through other pieces, moving into check, or capturing own
	pieces.
	*/

	getReachableSquares: function(type, from, colour) {
		var fromCoords=Util.coordsFromSquare(from);
		var squares=[];

		switch(type) {
			case PAWN: {
				var relSquare=Util.getRelativeSquare(from, colour);

				//double

				if(relSquare<16) {
					squares.push(Util.getRelativeSquare(relSquare+16, colour));
				}

				//single and captures

				var relCoords=Util.coordsFromSquare(relSquare);
				var x, y;

				for(var xDiff=-1; xDiff<2; xDiff++) {
					x=relCoords[X]+xDiff;
					y=relCoords[Y]+1;

					if(x>-1 && x<8 && y>-1 && y<8) {
						squares.push(Util.getRelativeSquare(Util.squareFromCoords([x, y]), colour));
					}
				}

				break;
			}

			case KNIGHT: {
				var xDiffs=[-1, -1, 1, 1, -2, -2, 2, 2];
				var yDiffs=[-2, 2, -2, 2, 1, -1, 1, -1];
				var x, y;

				for(var i=0; i<8; i++) {
					x=fromCoords[X]+xDiffs[i];
					y=fromCoords[Y]+yDiffs[i];

					if(x>-1 && x<8 && y>-1 && y<8) {
						squares.push(Util.squareFromCoords([x, y]));
					}
				}

				break;
			}

			case BISHOP: {
				var diffs=[1, -1];
				var coords;

				for(var ix=0; ix<diffs.length; ix++) {
					for(var iy=0; iy<diffs.length; iy++) {
						coords=[fromCoords[X], fromCoords[Y]];

						while(coords[X]>0 && coords[X]<7 && coords[Y]>0 && coords[Y]<7) {
							coords[X]+=diffs[ix];
							coords[Y]+=diffs[iy];

							squares.push(Util.squareFromCoords([coords[X], coords[Y]]));
						}
					}
				}

				break;
			}

			case ROOK: {
				/*
				the algorithm here is to go off on both axes at once adding squares
				that are on the same file or rank as the from square
				*/

				var squareOnRank, squareOnFile;

				for(var n=0; n<8; n++) {
					squareOnRank=(fromCoords[Y]*8)+n;
					squareOnFile=fromCoords[X]+(n*8);

					if(squareOnRank!==from) {
						squares.push(squareOnRank);
					}

					if(squareOnFile!==from) {
						squares.push(squareOnFile);
					}
				}

				break;
			}

			case QUEEN: {
				var rookMovesAvailable=Util.getReachableSquares(ROOK, from, colour);
				var bishopMovesAvailable=Util.getReachableSquares(BISHOP, from, colour);

				squares=rookMovesAvailable.concat(bishopMovesAvailable);

				break;
			}

			case KING: {
				//regular king moves:

				var x, y;

				for(var xDiff=-1; xDiff<2; xDiff++) {
					x=fromCoords[X]+xDiff;

					if(x>-1 && x<8) {
						for(var yDiff=-1; yDiff<2; yDiff++) {
							y=fromCoords[Y]+yDiff;

							if(y>-1 && y<8) {
								squares.push(Util.squareFromCoords([x, y]));
							}
						}
					}
				}

				//castling moves:

				var xDiff=[-2, 2];

				for(var i=0; i<xDiff.length; i++) {
					x=fromCoords[X]+xDiff[i];

					if(x>-1 && x<8) {
						squares.push(Util.squareFromCoords([x, fromCoords[Y]]));
					}
				}

				break;
			}
		}

		return squares;
	},

	getAttackers: function(board, type, square, colour) {
		/*
		king and pawn attacks are different to their normal moves (kings
		aren't attacking the squares they can castle to)
		*/

		if(type===PAWN) {
			return Util.getPawnAttackers(board, square, colour);
		}

		else if(type===KING) {
			return Util.getKingAttackers(board, square, colour);
		}

		/*
		the rest can all use getReachableSquares
		*/

		else {
			var attackers=[];
			var piece=Util.getPiece(type, colour);
			var candidateSquares=Util.getReachableSquares(type, square, colour);
			var candidateSquare;

			for(var i=0; i<candidateSquares.length; i++) {
				candidateSquare=candidateSquares[i];

				if(board[candidateSquare]===piece && !Util.isBlocked(board, square, candidateSquare)) {
					attackers.push(candidateSquare);
				}
			}

			return attackers;
		}
	},

	getPawnAttackers: function(board, square, colour) {
		var attackers=[];
		var piece=Util.getPiece(PAWN, colour);
		var playerColour=Util.getOppColour(colour);
		var relSquare=Util.getRelativeSquare(square, playerColour);
		var relCoords=Util.coordsFromSquare(relSquare);
		var xDiffs=[-1, 1];
		var xDiff;
		var x, y, candidateSquare;

		for(var i=0; i<xDiffs.length; i++) {
			xDiff=xDiffs[i];
			x=relCoords[X]+xDiff;
			y=relCoords[Y]+1;

			if(x>-1 && x<8 && y>-1 && y<8) {
				candidateSquare=Util.getRelativeSquare(Util.squareFromCoords([x, y]), playerColour);

				if(board[candidateSquare]===piece) {
					attackers.push(candidateSquare);
				}
			}
		}

		return attackers;
	},

	getKingAttackers: function(board, square, colour) {
		var attackers=[];
		var piece=Util.getPiece(KING, colour);
		var coords=Util.coordsFromSquare(square);
		var x, y, candidateSquare;

		for(var xDiff=-1; xDiff<2; xDiff++) {
			x=coords[X]+xDiff;

			if(x>-1 && x<8) {
				for(var yDiff=-1; yDiff<2; yDiff++) {
					y=coords[Y]+yDiff;

					if(y>-1 && y<8) {
						candidateSquare=Util.squareFromCoords([x, y]);

						if(board[candidateSquare]===piece) {
							attackers.push(candidateSquare);
						}
					}
				}
			}
		}

		return attackers;
	},

	getAllAttackers: function(board, square, colour) {
		var attackers=[];
		var pieceTypes=[PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING];

		for(var i=0; i<pieceTypes.length; i++) {
			attackers=attackers.concat(Util.getAttackers(board, pieceTypes[i], square, colour));
		}

		return attackers;
	},

	disambiguate: function(board, type, colour, from, to) {
		var str="";
		var piecesInRange=Util.getAttackers(board, type, to, colour);
		var sq;

		var disambiguation={
			file: "",
			rank: ""
		};

		for(var i=0; i<piecesInRange.length; i++) {
			sq=piecesInRange[i];

			if(sq!==from) {
				if(Util.rankFromSquare(sq)===Util.rankFromSquare(from)) {
					disambiguation.file=Util.fileFromSquare(from);
				}

				if(Util.fileFromSquare(sq)===Util.fileFromSquare(from)) {
					disambiguation.rank=Util.rankFromSquare(from);
				}
			}
		}

		str=disambiguation.file+disambiguation.rank;

		//if neither rank nor file is the same, specify file

		if(piecesInRange.length>1 && str==="") {
			str=Util.fileFromSquare(from);
		}

		return str;
	},

	elo: function(p, o, s) {
		return Math.round((p+(((p>-1 && p<2100)?32:((p>2099 && p<2400)?24:16))*(s-(1/(1+(Math.pow(10, ((o-p)/400)))))))));
	}
}
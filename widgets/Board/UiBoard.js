/*
NOTE for updating this in the future - MoveInfo is a complete wreck.
definition is in ResetMoveInfo.  used in all kinds of places, don't
bother trying to edit.

TODO refactor MoveInfo
*/

function UiBoard(parent) {
	Board.implement(this);
	Control.implement(this, parent, true);

	this.CoordsF=[];
	this.CoordsR=[];
	this.Squares=[]; //array of anonymous objects (see def in SetupHtml)

	//square the mouse is over
	this.CurrentMouseOverSq=null;

	//square the currently dragging piece will drop on if dropped (see Sq..Over/Out events)
	this.CurrentPieceOverSq=null;

	this.UserMove=new Event(this);
	this.DragDrop=new Event(this);
	this.DragMove=new Event(this);
	this.MouseOver=new Event(this);
	this.DragOff=new Event(this);
	this.SquareClicked=new Event(this);
	this.SelectPiece=new Event(this);
	this.PieceSelected=new Event(this); //fires after SelectPiece if no one cancels it
	this.Deselected=new Event(this);
	this.SqMouseOver=new Event(this);
	this.SqMouseOut=new Event(this);
	this.SqPieceOver=new Event(this);
	this.SqPieceOut=new Event(this);

	this.init_hilite_styles();

	//NOTE premove highlighting is done the manual way (board.HiliteSq(sq, board.HlPremoveFrom))

	this.HilitPossibilities=[];
	this.HilitLastMoveFrom=null;
	this.HilitLastMoveTo=null;
	this.HilitCanSelect=null;
	this.HilitCanDrop=null;
	this.HilitSelected=null;

	/*
	move action processing
	*/

	this.MoveMode=UiBoard.MOVE_MODE_CLICK_CLICK|UiBoard.MOVE_MODE_DRAG_DROP;
	this.MoveInfo={};
	this.ResetMoveInfo();

	/*
	MoveInfo

		Mode: CLK or DD
		Selected: have mousedowned on a piece
		InProgress: (CLK) have clicked on a piece (DD) have started to drag (mousedown+moved)
		Piece: the piece being moved, or null
		From: the square being moved from, or null
	*/

	/*
	putting the rank coords dead center made them look slightly too low.
	this value moves them up (positive values) or down (negative values)
	by the specified number of pixels.
	*/

	this.coord_r_hinting=1;

	//Properties

	/*
	NOTE css colours are mostly stored with the hash here, but square colours
	aren't because of how prefs are stored.  probably none should be stored with
	hash anywhere
	*/

	this.border=["#5f5f5f", "#5f5f5f"]; //colour of each pixel of border, from outside to inside
	this.show_coords_padding=true; //whether to have gaps around bottom and left to fit coordinates
	this.show_coords=true; //whether to show the coordinates
	this.coord_size_r=18; //how big a gap to have for coordinates on the left
	this.coord_size_f=18; //how big a gap to have for coordinates on the bottom
	this.coords_font_family="sans-serif";
	this.coords_font_size=11;
	this.coords_font_color="#303030";
	this.square_size=45;
	this.view_as=WHITE;
	this.img_dir_board="/img/board";
	this.img_dir_piece="/img/piece";
	this.board_style=null;
	this.piece_style=PIECE_STYLE_ALPHA;
	this.square_colour=[];
	this.square_colour[WHITE]="f0d9b5";
	this.square_colour[BLACK]="b58863";
	this.square_highlight_border=0; //gap around the edge of the highlight div to fit a border in
	this.html_updates_enabled=true; //visual updates can be temporarily turned off entirely to ensure consistency when multiple events are causing updates
	this.container_border=true;
	this.container_background="#efefef";
	this.container_shadow=true;
	this.container_border_border_width=1;
	this.container_border_border_colour="#dfdfdf";

	this.init_props();

	this.SetupHtml();
}

/*
NOTE PieceStore uses these as well
*/

UiBoard.SQ_ZINDEX_ABOVE=5; //currently dragging square
UiBoard.SQ_ZINDEX_NORMAL=4; //normal square
UiBoard.SQ_ZINDEX_BELOW=2; //square highlight nodes

//exponential enum constants

UiBoard.MOVE_MODE_NONE=1;
UiBoard.MOVE_MODE_CLICK_CLICK=2;
UiBoard.MOVE_MODE_DRAG_DROP=4;

/*
initialise default square highlighting styles
*/

UiBoard.prototype.init_hilite_styles=function() {
	/*
	NOTE these styles all need to specify the same set of properties,
	otherwise styles from other highlight types will be left over.
	*/

	this.HlNone={
		visibility: "hidden"
	};

	this.HlPossibility={
		visibility: "inherit",
		backgroundColor: "#99e457",
		backgroundImage: "none",
		opacity: ".9"
	};

	this.HlLastMoveFrom={
		visibility: "inherit",
		backgroundColor: "#62c1fe",
		//backgroundColor: "#62afe0",
		//backgroundImage: "-webkit-radial-gradient(center, ellipse cover, rgba(110, 182, 226, 1) 0%, rgba(110, 182, 226, 0) 70%)",
		opacity: ".5"
	};

	this.HlLastMoveTo={
		visibility: "inherit",
		backgroundColor: "#62c1fe",
		//backgroundColor: "#62afe0",
		//backgroundImage: "-webkit-radial-gradient(center, ellipse cover, rgba(110, 182, 226, 1) 0%, rgba(110, 182, 226, 0) 70%)",
		opacity: ".8"
	};

	this.HlPremoveFrom={
		visibility: "inherit",
		backgroundColor: "#199a65",
		backgroundImage: "none",
		opacity: ".9"
	};

	this.HlPremoveTo={
		visibility: "inherit",
		backgroundColor: "#199a65",
		backgroundImage: "none",
		opacity: ".9"
	};

	this.HlCanSelect={
		visibility: "inherit",
		backgroundColor: "#fbfddd",
		backgroundImage: "none",
		opacity: ".9"
	};

	this.HlCanDrop={
		visibility: "inherit",
		backgroundColor: "#fbfddd",
		backgroundImage: "none",
		opacity: ".9"
	};

	this.HlSelected={
		visibility: "inherit",
		backgroundColor: "#C9F06B",
		//backgroundImage: "",
		//boxShadow: "inset 0 0 3px 2px rgba(255, 255, 229, 0.8)",
		opacity: ".8"
	};
}

UiBoard.prototype.init_props=function() {
	this.HtmlUpdatesEnabled=setter(this, function() {
		return this.html_updates_enabled;
	}, function(value) {
		this.html_updates_enabled=value;

		if(value===true) {
			this.UpdateSquares();
		}
	});

	this.SquareColour=setter(this, function() {
		return this.square_colour;
	}, function(value) {
		if(this.square_colour!==value) {
			this.square_colour=value;
			this.UpdateHtml();
		}
	});

	this.CoordsFontSize=setter(this, function() {
		return this.coords_font_size;
	}, function(value) {
		if(this.coords_font_size!==value) {
			this.coords_font_size=value;
			this.UpdateHtml();
		}
	});

	this.CoordsFontFamily=setter(this, function() {
		return this.coords_font_family;
	}, function(value) {
		if(this.coords_font_family!==value) {
			this.coords_font_family=value;
			this.UpdateHtml();
		}
	});

	this.CoordsFontColor=setter(this, function() {
		return this.coords_font_color;
	}, function(value) {
		if(this.coords_font_color!==value) {
			this.coords_font_color=value;
			this.UpdateHtml();
		}
	});

	this.ImgDirBoard=setter(this, function() {
		return this.img_dir_board;
	}, function(value) {
		if(this.img_dir_board!==value) {
			this.img_dir_board=value;
			this.UpdateHtml();
		}
	});

	this.ImgDirPiece=setter(this, function() {
		return this.img_dir_piece;
	}, function(value) {
		if(this.img_dir_piece!==value) {
			this.img_dir_piece=value;
			this.PromoteDialog.ImgDirPiece(value);
			this.UpdateHtml();
		}
	});

	this.ViewAs=setter(this, function() {
		return this.view_as;
	}, function(value) {
		if(this.view_as!==value) {
			this.view_as=value;
			this.UpdateHtml();
		}
	});

	this.CoordSizeF=setter(this, function() {
		return this.coord_size_f;
	}, function(value) {
		if(this.coord_size_f!==value) {
			this.coord_size_f=value;
			this.UpdateHtml();
		}
	});

	this.CoordSizeR=setter(this, function() {
		return this.coord_size_r;
	}, function(value) {
		if(this.coord_size_r!==value) {
			this.coord_size_r=value;
			this.UpdateHtml();
		}
	});

	this.ShowCoordsPadding=setter(this, function() {
		return this.show_coords_padding;
	}, function(value) {
		if(this.show_coords_padding!==value) {
			this.show_coords_padding=value;
			this.UpdateHtml();
		}
	});

	this.ShowCoords=setter(this, function() {
		return this.show_coords;
	}, function(value) {
		if(this.show_coords!==value) {
			this.show_coords=value;

			if(this.show_coords) {
				this.ShowCoordsPadding(true);
			}

			this.UpdateHtml();
		}
	});

	this.squareSize=setter(this, function() {
		return this.square_size;
	}, function(value) {
		if(this.square_size!==value) {
			this.square_size=parseInt(value);
			this.PromoteDialog.SquareSize(value);
			this.UpdateHtml();
		}
	});

	this.BoardStyle=setter(this, function() {
		return this.board_style;
	}, function(value) {
		if(this.board_style!==value) {
			this.board_style=value;
			this.UpdateHtml();
		}
	});

	this.PieceStyle=setter(this, function() {
		return this.piece_style;
	}, function(value) {
		if(this.piece_style!==value) {
			this.piece_style=value;
			this.PromoteDialog.PieceStyle(value);
			this.UpdateHtml();
		}
	});

	this.Border=setter(this, function() {
		return this.border;
	}, function(value) {
		this.board_style=value;
		this.UpdateHtml();
		this.UiUpdate.fire();
	});

	this.SquareHighlightBorder=setter(this, function() {
		return this.square_highlight_border;
	}, function(value) {
		if(this.board_style!==value) {
			this.board_style=value;
			this.UpdateHtml();
		}
	});

	this.ContainerBorder=setter(this, function() {
		return this.container_border;
	}, function(value) {
		if(this.container_border!==value) {
			this.container_border=value;
			this.UpdateHtml();
		}
	});

	this.ContainerBackground=setter(this, function() {
		return this.container_background;
	}, function(value) {
		if(this.container_background!==value) {
			this.container_background=value;
			this.UpdateHtml();
		}
	});

	this.ContainerShadow=setter(this, function() {
		return this.container_shadow;
	}, function(value) {
		if(this.container_shadow!==value) {
			this.container_shadow=value;
			this.UpdateHtml();
		}
	});

	this.ContainerBorderBorderWidth=setter(this, function() {
		return this.container_border_border_width;
	}, function(value) {
		if(this.container_border_border_width!==value) {
			this.container_border_border_width=value;
			this.UpdateHtml();
		}
	});

	this.ContainerBorderBorderColour=setter(this, function() {
		return this.container_border_border_colour;
	}, function(value) {
		if(this.container_border_border_colour!==value) {
			this.container_border_border_colour=value;
			this.UpdateHtml();
		}
	});

	this.OverallWidth=setter(this, function() {
		return this.get_overall_size(X);
	});

	this.OverallHeight=setter(this, function() {
		return this.get_overall_size(Y);
	});
}

UiBoard.prototype.SetupHtml=function() {
	var self=this;

	this.CoordsF=[];
	this.CoordsR=[];
	this.Squares=[];

	/*
	inner container so that the absolute-positioned things
	can be inside an absolute element, but the outer container (Node)
	can still be non-absolute so that it fills up its container
	*/

	this.inner_container=div(this.node);

	style(this.inner_container, {
		position: "absolute"
	});

	/*
	board
	*/

	this.border_container=div(this.inner_container);

	style(this.border_container, {
		position: "absolute",
		zIndex: 0
	});

	this.board_container=div(this.inner_container);

	style(this.board_container, {
		position: "absolute",
		zIndex: 1
	});

	this.board_div=div(this.board_container);

	this.board_div.addEventListener("mouseout", function(e) {
		self.UpdateMouseOverData(e);
	});

	var coord, coord_outer, coord_inner;

	/*
	rank coords
	*/

	for(var i=0; i<8; i++) {
		coord_outer=div(this.inner_container);
		coord_inner=div(coord_outer);

		coord={
			Container: coord_outer,
			Node: coord_inner
		};

		this.CoordsR.push(coord);
	}

	/*
	file coords
	*/

	for(var i=0; i<8; i++) {
		coord_outer=div(this.inner_container);
		coord_inner=div(coord_outer);

		coord={
			Container: coord_outer,
			Node: coord_inner
		};

		this.CoordsF.push(coord);
	}

	/*
	squares
	*/

	var square, sq_outer, sq_inner, highlight;

	for(var r=0; r<8; r++) {
		for(var f=0; f<8; f++) {
			sq_outer=div(this.board_div);
			highlight=div(sq_outer);
			sq_inner=div(sq_outer);

			style(sq_outer, {
				position: "absolute"
			});

			style(sq_inner, {
				position: "absolute",
				zIndex: UiBoard.SQ_ZINDEX_NORMAL
			});

			style(highlight, {
				position: "absolute",
				zIndex: UiBoard.SQ_ZINDEX_BELOW,
				borderStyle: "solid",
				borderColor: "transparent",
				visibility: "hidden"
			});

			sq_inner.addEventListener("mousedown", function(e) {
				self.BoardMouseDown(e);
			});

			sq_inner.addEventListener("mouseup", function(e) {
				self.BoardMouseUp(e);
			});

			square={
				Container: sq_outer,
				Node: sq_inner,
				No: Util.fr_to_sq(f, r),
				Highlight: highlight
			};

			this.Squares.push(square);
		}
	}

	/*
	mousemove - no point adding to individual squares like mouseup/mousedown
	*/

	window.addEventListener("mousemove", function(e) {
		self.BoardMouseMove(e);
	});

	/*
	promote dialog - the board gets a promote dialog ready as there will usually be aboard there
	if the pd is needed, and it will usually have to be in the center of the board
	*/

	this.PromoteDialog=new PromoteDialog(this.board_div);
	this.PromoteDialog.Zindex(UiBoard.SQ_ZINDEX_ABOVE);
	this.PromoteDialog.ImgDirPiece(this.img_dir_piece);
	this.PromoteDialog.PieceStyle(this.piece_style);
	this.PromoteDialog.SquareSize(this.square_size);

	/*
	game over dialog - this is part of the board to simplifiy positioning it
	and getting the zIndex right.
	*/

	this.GameOverDialog=new GameOverDialog(this.board_div);
	this.GameOverDialog.Zindex(UiBoard.SQ_ZINDEX_ABOVE);

	/*
	force resign dialog
	*/

	this.ForceResignDialog=new ForceResignDialog(this.board_div);
	this.ForceResignDialog.Zindex(UiBoard.SQ_ZINDEX_ABOVE);

	this.UpdateHtml();
}

/*
set the size, position and other style attributes on the elements
*/

UiBoard.prototype.UpdateHtml=function() { //after switching colours ,changing size tec
	var rank_index, file_index, text;
	var board_size=this.GetBoardSize();
	var coord_size_r=this.CoordSizeR();
	var coord_size_f=this.CoordSizeF();
	var coord_display_size_r=this.show_coords_padding?coord_size_r:0;
	var coord_display_size_f=this.show_coords_padding?coord_size_f:0;
	var container_padding_r=this.container_border?coord_size_r:coord_display_size_r;
	var container_padding_f=this.container_border?coord_size_f:coord_display_size_f;
	var coords_display=this.show_coords_padding?"":"none";
	var coords_visibility=this.show_coords?"":"hidden";

	/*
	container border (bit around the edge with the shadow)
	*/

	style(this.node, {
		paddingTop: this.container_border?coord_size_f:0,
		paddingRight: this.container_border?coord_size_r:0,
		borderWidth: this.container_border?this.container_border_border_width:0,
		borderColor: this.container_border_border_colour,
		borderStyle: "solid",
		//borderRadius: 3,
		//boxShadow: (this.container_border && this.container_shadow)?"1px 1px 1px rgba(50, 50, 50, 0.3)":"none",
		backgroundColor: this.container_border?this.container_background:"inherit"
	});

	/*
	border
	*/

	//Dom.ClearNode(this.border_container);
	this.border_container.innerHTML="";
	//FIXME this is insane; make this all a template instead
	//make a template for the border and coords maybe, then
	//no fuck that, keep it as a completely dynamic control (everything needs calculations if size changes etc)
	//but make it better
	//this is actually quite clean, or as clean as a pixel-calculated layout
	//generation routine can be expected to be

	var border;
	var inner_border=this.border_container;

	for(var i=0; i<this.border.length; i++) {
		border=div(inner_border);

		style(border, {
			border: "1px solid "+this.border[i]
		});

		inner_border=border;
	}

	style(inner_border, {
		width: board_size,
		height: board_size
	});

	/*
	coords
	*/

	for(var i=0; i<8; i++) {
		style(this.CoordsR[i].Container, {
			position: "absolute",
			top: this.border.length+(this.square_size*i),
			left: 0,
			height: this.square_size,
			width: coord_display_size_r,
			display: coords_display,
			visibility: coords_visibility,
			cursor: "default"
		});

		style(this.CoordsF[i].Container, {
			position: "absolute",
			top: (this.border.length*2)+board_size,
			left: coord_size_r+this.border.length+(this.square_size*i),
			width: this.square_size,
			height: coord_display_size_f,
			display: coords_display,
			visibility: coords_visibility,
			cursor: "default"
		});


		if(this.view_as==WHITE) {
			rank_index=7-i;
			file_index=i;
		}

		else {
			rank_index=i;
			file_index=7-i;
		}


		this.CoordsR[i].Node.innerHTML=RANK.charAt(rank_index);

		style(this.CoordsR[i].Node, {
			marginTop: Math.round((this.square_size/2)-(this.coords_font_size/2))-this.coord_r_hinting
		});


		this.CoordsF[i].Node.innerHTML=FILE.charAt(file_index);

		/*
		NOTE these styles that are set by props (CoordsFontColor etc) are unnecessarily
		intensive - if something sets the font size and then the colour a whole load of
		dom nodes are deleted and then recreated needlessly.  but the other way is to
		have separate update functions for each style option, or do them directly in the
		prop Sets (but then they wouldn't be applied initially unless the prop set was
		called in initialisation.  maybe some system where you can call a "initialise_props"
		method that knows all the properties that have been added and does
		this[prop](this[prop]()).  logic could even be tucked away nicely in the Property
		class if classes implemented IPropertyLogging for the list.)

		up to now these optimisations seem pointless as the board comes up without any
		noticeable delay on fairly old hardware, but if it starts getting slow this is
		probably most of the problem.

		noticeable pauses seem to arise with about 200 board.CoordsFontColor.Set calls
		*/

		/*
		SOLUTION get rid of all the props, no point being able to change the font colour
		*/

		style(this.CoordsF[i].Node, {
			fontFamily: this.coords_font_family,
			fontSize: this.coords_font_size,
			fontWeight: "normal",
			color: this.coords_font_color,
			lineHeight: coord_display_size_f,
			textAlign: "center"
		});

		style(this.CoordsR[i].Node, {
			fontFamily: this.coords_font_family,
			fontSize: this.coords_font_size,
			color: this.coords_font_color,
			fontWeight: "normal",
			textAlign: "center"
		});
	}

	/*
	board
	*/

	style(this.node, {
		width: container_padding_r+(this.border.length*2)+board_size,
		height: container_padding_f+(this.border.length*2)+board_size
	});

	style(this.border_container, {
		top: 0,
		left: container_padding_r
	});

	style(this.board_container, {
		top: this.border.length,
		left: container_padding_r+this.border.length, //r is "rank" not "right"
		width: board_size,
		height: board_size
	});

	var bgimg="none";

	if(this.board_style!==null) {
		bgimg=Base.App.CssImg(this.img_dir_board+"/"+this.board_style+"/"+this.square_size+".png");
	}

	style(this.board_div, {
		position: "absolute",
		width: board_size,
		height: board_size,
		backgroundImage: bgimg
	});

	/*
	squares
	*/

	var square;

	for(var sq=0; sq<this.Squares.length; sq++) {
		square=this.Squares[sq];

		style(square.Container, {
			width: this.square_size,
			height: this.square_size,
			backgroundColor: "#"+this.square_colour[Util.sq_colour(sq)]
		});

		this.SetSquarePos(square, sq);

		style(square.Node, {
			width: this.square_size,
			height: this.square_size
		});

		style(square.Highlight, {
			width: this.square_size-(this.square_highlight_border*2),
			height: this.square_size-(this.square_highlight_border*2),
			borderWidth: this.square_highlight_border
		});
	}

	/*
	pieces
	*/

	this.UpdateSquares();

	/*
	dialogs
	*/

	var c=this.square_size*4; //center of the board

	this.PromoteDialog.SetLocation([c, c], true);
	this.GameOverDialog.SetLocation(c, c);
	this.ForceResignDialog.SetLocation(c, c);
}

UiBoard.prototype.SetSquare=function(sq, pc) {
	Board.prototype.SetSquare.call(this, sq, pc);

	if(this.html_updates_enabled) {
		this.SetHtmlSquare(sq, pc);
	}
}

UiBoard.prototype.SetHtmlSquare=function(sq, pc) {
	var bgimg="none";

	if(pc!==SQ_EMPTY) {
		bgimg="url("+this.img_dir_piece+"/"+this.piece_style+"/"+this.square_size+"/"+Fen.getPieceChar(pc)+".png)";
	}

	if(this.Squares[sq].Node.style.backgroundImage!==bgimg) { //performance is noticeably better with this check
		this.Squares[sq].Node.style.backgroundImage=bgimg;
	}
}

UiBoard.prototype.UpdateSquares=function() {
	for(var sq=0; sq<this.board.length; sq++) {
		this.SetHtmlSquare(sq, this.board[sq]);
	}
}

UiBoard.prototype.ResetMoveInfo=function() {
	this.MoveInfo={
		Mode: UiBoard.MOVE_MODE_CLICK_CLICK,
		Selected: false,
		InProgress: false,
		Piece: null,
		From: null,
		OffsetX: 0,
		OffsetY: 0
	};
}

UiBoard.prototype.SqFromMouseEvent=function(e, use_offsets, offsets) { //useoffsets to calc for middle of piece
	offsets=offsets||[this.MoveInfo.OffsetX, this.MoveInfo.OffsetY];

	var x=e.pageX;
	var y=e.pageY;

	if(use_offsets) {
		x+=(Math.round(this.square_size/2)-offsets[X]);
		y+=(Math.round(this.square_size/2)-offsets[Y]);
	}

	var os=getoffsets(this.board_div);

	return this.sq_from_offsets(x-os[X], this.GetBoardSize()-(y-os[Y]));
}

UiBoard.prototype.sq_from_offsets=function(x, y) {
	var f=(x-(x%this.square_size))/this.square_size;
	var r=(y-(y%this.square_size))/this.square_size;

	if(this.view_as==BLACK) {
		f=7-f;
		r=7-r;
	}

	return Util.fr_to_sq(f, r);
}

UiBoard.prototype.SetSquarePos=function(square, sq) {
	var x, y;
	var r=Util.y(sq);
	var f=Util.x(sq);

	if(this.view_as==BLACK) {
		x=this.square_size*(7-f);
		y=this.square_size*r;
	}

	else {
		x=this.square_size*f;
		y=this.square_size*(7-r);
	}

	/*
	absolute is relative to first absolute ancestor, so now that the board
	is absolute the squares don't have to add anything to these offsets
	*/

	style(square.Container, {
		top: y,
		left: x
	});
}

UiBoard.prototype.ResetSquarePos=function(square) { //return the inner bit to its container pos
	style(square.Node, {
		top: 0,
		left: 0
	});
}

UiBoard.prototype.SetSquareXyPos=function(square, x, y) { //takes mouse coords
	var os=getoffsets(square.Container);

	style(square.Node, {
		top: y-os[Y],
		left: x-os[X]
	});
}

UiBoard.prototype.BoardMouseDown=function(e) {
	e.preventDefault();

	if(this.MouseOnBoard(e)) {
		var sq=this.SqFromMouseEvent(e);
		var square=this.Squares[sq];
		var os=getoffsets(square.Container);

		if(this.MoveMode!==UiBoard.MOVE_MODE_NONE && !this.MoveInfo.Selected && !this.MoveInfo.InProgress && this.board[sq]!==SQ_EMPTY) { //first click or start of drag
			this.inc_z_index(square);
			this.MoveInfo.Selected=true;
			this.MoveInfo.From=sq;
			this.MoveInfo.Piece=this.board[sq];
			this.MoveInfo.OffsetX=e.pageX-os[X];
			this.MoveInfo.OffsetY=e.pageY-os[Y];
		}
	}
}

UiBoard.prototype.BoardMouseMove=function(e) {
	e.preventDefault();

	var sq=this.SqFromMouseEvent(e);

	//update mouseover sq and fire events

	this.UpdateMouseOverData(e);
	this.UpdatePieceOverData(e);

	var args;

	if(this.MoveInfo.Selected && !this.MoveInfo.InProgress) { //down and not already up on same square
		args={
			Square: sq,
			Piece: this.board[sq],
			Dragging: true,
			Cancel: false
		};

		this.SelectPiece.fire(args);

		if(args.Cancel) {
			this.ResetMoveInfo();
			this.reset_z_index(this.Squares[sq]);
		}

		else {
			this.MoveInfo.Mode=UiBoard.MOVE_MODE_DRAG_DROP;
			this.MoveInfo.InProgress=true;
			this.PieceSelected.fire({Sq: sq});
		}
	}

	if(this.MoveInfo.Selected && this.MoveInfo.Mode===UiBoard.MOVE_MODE_DRAG_DROP) {
		args={
			Square: sq,
			Piece: this.MoveInfo.Piece,
			Cancel: false
		};

		this.DragMove.fire(args);

		if(!args.Cancel) {
			this.SetSquareXyPos(this.Squares[this.MoveInfo.From], e.pageX-this.MoveInfo.OffsetX, e.pageY-this.MoveInfo.OffsetY);
		}
	}
}

UiBoard.prototype.BoardMouseUp=function(e) {
	e.preventDefault();

	var args;

	var sq=this.SqFromMouseEvent(e); //where the mouse pointer is

	if(this.MoveInfo.InProgress && this.MoveInfo.Mode===UiBoard.MOVE_MODE_DRAG_DROP) {
		sq=this.SqFromMouseEvent(e, true, [this.MoveInfo.OffsetX, this.MoveInfo.OffsetY]); //where the middle of the piece is
	}

	var square=this.Squares[sq];
	var from_square=null;

	if(this.MoveInfo.From!==null) {
		from_square=this.Squares[this.MoveInfo.From];
	}

	args={
		Square: sq,
		MoveInfo: this.MoveInfo,
		Cancel: false,
		Event: e
	};

	if(this.MoveInfo.Mode===UiBoard.MOVE_MODE_CLICK_CLICK) {
		this.SquareClicked.fire(args);
	}

	else if(this.MoveInfo.Mode===UiBoard.MOVE_MODE_DRAG_DROP && this.MoveInfo.InProgress) {
		this.DragDrop.fire(args);
	}

	if(!args.Cancel) {
		if(this.MoveInfo.InProgress) { //was dragging, now dropped; or second click
			this.Deselected.fire();

			if(this.MouseOnBoard(e, true)) {
				if(sq!=this.MoveInfo.From) {
					this.UserMove.fire({
						From: this.MoveInfo.From,
						To: sq,
						Piece: this.getSquare(this.MoveInfo.From),
						Event: e
					});
				}
			}

			else {
				this.DragOff.fire({
					From: this.MoveInfo.From
				});
			}

			this.ResetSquarePos(from_square);
			this.ResetMoveInfo();
		}

		else if(this.MoveMode&UiBoard.MOVE_MODE_CLICK_CLICK && this.MoveInfo.Selected && sq===this.MoveInfo.From && !this.MoveInfo.InProgress) { //clicking on first square
			args={
				Square: sq,
				Piece: this.board[sq],
				Dragging: false,
				Cancel: false
			};

			this.SelectPiece.fire(args);

			if(args.Cancel) {
				this.ResetMoveInfo();
			}

			else {
				this.MoveInfo.InProgress=true;
				this.MoveInfo.Mode=UiBoard.MOVE_MODE_CLICK_CLICK;
				this.PieceSelected.fire({Sq: sq});
			}
		}
	}

	else {
		if(from_square!==null) {
			this.ResetSquarePos(from_square);
		}

		this.ResetMoveInfo();
	}

	if(from_square!==null) {
		this.reset_z_index(from_square);
	}

	this.UpdatePieceOverData(e); //no piece over if not dragging
}

UiBoard.prototype.inc_z_index=function(square) {
	style(square.Node, {
		zIndex: UiBoard.SQ_ZINDEX_ABOVE
	});
}

UiBoard.prototype.reset_z_index=function(square) {
	style(square.Node, {
		zIndex: UiBoard.SQ_ZINDEX_NORMAL
	});
}

UiBoard.prototype.MouseOnBoard=function(e, use_offsets, offsets) {
	offsets=offsets||[this.MoveInfo.OffsetX, this.MoveInfo.OffsetY];

	var x=e.pageX;
	var y=e.pageY;

	if(use_offsets) {
		x+=(Math.round(this.square_size/2)-offsets[X]);
		y+=(Math.round(this.square_size/2)-offsets[Y]);
	}

	var os=getoffsets(this.board_div);

	x-=os[X];
	y-=os[Y];

	y=this.GetBoardSize()-y;

	return this.coords_on_board(x, y);
}

UiBoard.prototype.coords_on_board=function(x, y) {
	return !(x<0 || x>this.GetBoardSize() || y<0 || y>this.GetBoardSize());
}

/*
look at all these fucking functions for highlighting squares

and ones for fucking unhighlighting squares as well
*/

UiBoard.prototype.HiliteSq=function(sq, style) {
	style(this.Squares[sq].Highlight, style);
}

UiBoard.prototype.UnhiliteSq=function(sq) {
	if(sq!==null) {
		style(this.Squares[sq].Highlight, this.HlNone);
	}
}

UiBoard.prototype.HilitePossibilities=function(sqs) {
	for(var i=0; i<this.HilitPossibilities.length; i++) {
		this.UnhiliteSq(this.HilitPossibilities[i]);
	}

	this.HilitPossibilities=sqs;

	for(var i=0; i<this.HilitPossibilities.length; i++) {
		this.HiliteSq(this.HilitPossibilities[i], this.HlPossibility);
	}
}

UiBoard.prototype.HiliteLastMoveFrom=function(sq) {
	this.UnhiliteSq(this.HilitLastMoveFrom);
	this.HilitLastMoveFrom=sq;
	this.HiliteSq(sq, this.HlLastMoveFrom);
}

UiBoard.prototype.HiliteLastMoveTo=function(sq) {
	this.UnhiliteSq(this.HilitLastMoveTo);
	this.HilitLastMoveTo=sq;
	this.HiliteSq(sq, this.HlLastMoveTo);
}

UiBoard.prototype.HiliteCanSelect=function(sq) {
	this.UnhiliteSq(this.HilitCanSelect);
	this.HilitCanSelect=sq;
	this.HiliteSq(sq, this.HlCanSelect);
}

UiBoard.prototype.HiliteCanDrop=function(sq) {
	this.UnhiliteSq(this.HilitCanDrop);
	this.HilitCanDrop=sq;
	this.HiliteSq(sq, this.HlCanDrop);
}

UiBoard.prototype.HiliteSelected=function(sq) {
	this.UnhiliteSq(this.HilitSelected);
	this.HilitSelected=sq;
	this.HiliteSq(sq, this.HlSelected);
}

UiBoard.prototype.UnhilitePossibilities=function() {
	for(var i=0; i<this.HilitPossibilities.length; i++) {
		this.UnhiliteSq(this.HilitPossibilities[i]);
	}

	this.HilitPossibilities=[];
}

UiBoard.prototype.UnhiliteLastMoveFrom=function() {
	this.UnhiliteSq(this.HilitLastMoveFrom);
	this.HilitLastMoveFrom=null;
}

UiBoard.prototype.UnhiliteLastMoveTo=function() {
	this.UnhiliteSq(this.HilitLastMoveTo);
	this.HilitLastMoveTo=null;
}

UiBoard.prototype.UnhiliteCanSelect=function() {
	this.UnhiliteSq(this.HilitCanSelect);
	this.HilitCanSelect=null;
}

UiBoard.prototype.UnhiliteCanDrop=function() {
	this.UnhiliteSq(this.HilitCanDrop);
	this.HilitCanDrop=null;
}

UiBoard.prototype.UnhiliteSelected=function() {
	this.UnhiliteSq(this.HilitSelected);
	this.HilitSelected=null;
}

UiBoard.prototype.GetBoardSize=function() {
	return this.square_size*8;
}

UiBoard.prototype.UpdateMouseOverData=function(e) {
	var sq=this.SqFromMouseEvent(e);

	if(this.MouseOnBoard(e) && sq>-1 && sq<64) { //MouseOnBoard doesn't appear to be enough
		if(this.CurrentMouseOverSq!=sq) {
			if(this.CurrentMouseOverSq!==null) {
				this.SqMouseOut.fire({
					Sq: this.CurrentMouseOverSq
				});
			}

			this.CurrentMouseOverSq=sq;

			this.SqMouseOver.fire({
				Sq: sq
			});
		}
	}

	else {
		if(this.CurrentMouseOverSq!==null) {
			this.SqMouseOut.fire({
				Sq: this.CurrentMouseOverSq
			});
		}

		this.CurrentMouseOverSq=null;
	}
}

UiBoard.prototype.UpdatePieceOverData=function(e) {
	var sq=this.SqFromMouseEvent(e, true);

	if(this.MoveInfo.InProgress && this.MoveInfo.Mode==UiBoard.MOVE_MODE_DRAG_DROP) {
		if(this.MouseOnBoard(e)) {
			if(this.CurrentPieceOverSq!=sq) {
				if(this.CurrentPieceOverSq!==null) {
					this.SqPieceOut.fire({
						Sq: this.CurrentPieceOverSq
					});
				}

				this.CurrentPieceOverSq=sq;

				this.SqPieceOver.fire({
					Sq: sq
				});
			}
		}

		else {
			if(this.CurrentPieceOverSq!==null) {
				this.SqPieceOut.fire({
					Sq: this.CurrentPieceOverSq
				});
			}

			this.CurrentPieceOverSq=null;
		}
	}

	else {
		if(this.CurrentPieceOverSq!==null) {
			this.SqPieceOut.fire({
				Sq: this.CurrentPieceOverSq
			});
		}

		this.CurrentPieceOverSq=null;
	}
}

UiBoard.prototype.Deselect=function() {
	if(this.MoveInfo.InProgress) {
		this.reset_z_index(this.Squares[this.MoveInfo.From]);
		this.ResetMoveInfo();
	}
}

UiBoard.prototype.setFen=function(fen) {
	Board.prototype.setFen.call(this, fen);
	this.UpdateSquares();
}

UiBoard.prototype.AnimateMove=function(piece, fs, ts, callback) {
	//animate the move

	//console.log("animating "+Fen.getPieceChar(piece)+" "+fs+" "+ts); //DEBUG

	//this will have to be moved into a callback passed to whatever is used for the animation:

	if(is_function(callback)) {
		callback();
	}
}

UiBoard.prototype.get_overall_size=function(dimension) {
	var coord_size=[this.coord_size_r, this.coord_size_f][dimension];

	return (
		this.GetBoardSize()
		+this.border.length*2
		+(this.container_border?coord_size:0)
		+(this.show_coords_padding?coord_size:0)
		+(this.container_border?(this.container_border_border_width*2):0)
	);
}
define(function(require) {
	var LiveTableStandard=require("./widgets/LiveTableStandard/_");
	var g=require("lib/g");

	var tableWidget=new LiveTableStandard(g("table"));



	tableWidget.board.setSquareSize(45);

	var game=new Game();

	tableWidget.board.setBoardArray(game.position.board.getBoardArray());

	var history=tableWidget.history;

	var move=history.createMove();
	var label=new MoveLabel();

	label.piece="N";
	move.setLabel(label);

	history.move(move);
});
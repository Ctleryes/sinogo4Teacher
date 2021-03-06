var canvas;
var offset;
var board_size, board_size_y, board_size_x;
var board_square;
var board_edge;
var stones = [];
var dots_dict = {};
var letters = "abcdefghijklmnopqrstuvwxyz"
var capturesW = 0;
var capturesB = 0;
var captures = 0;
var last_kill_pt = null;
var last_kill_step = 0;

var step = 0;
var steps = [];

var WHITE = 1;
var BLACK = 2;
var EMPTY = 0;

var white_img = null;
var black_img = null;
var board_img = null;

var first = BLACK;
var currentColor = BLACK;
var nextColor = WHITE;

var killBlock = [];

//棋盘size
var board_size = board_size_y = board_size_x = 9
var dots_of_star = ["dd", "dj", "gg", "jd", "jj"];
var stone_radius = 10;

var answer = [] //正确答案
var answers = [];
var cAnswers = [];

var answerCount = 1;

function Position(x, y) {
    this.x = x;
    this.y = y;
    this.name = '';
    this.ptname = '';
    this.ptname2 = '';
    this.qname = '';
}

function Dot(x, y) {
    this.x = x;
    this.y = y;
    this.status = 0;
    this.name = letters[x] + letters[y];
    this.index = 0;
}

//rightSend();
initSGF = function(sgf, el, offset, offel) {
    var question = parseSGF(sgf)
    var as = question.answer;
    answers = [];
    for (var i = 0; i < as.length; i++) {
        var aaa = as[i]
        answers.push([])
        for (var j = 0; j < aaa.length; j++) {
            answers[i].push(aaa[j].name);
        }
    }
    if (answers.length == 1) {
        answer = answers[0]
    }
    first = question.first;
    board_size = board_size_x = board_size_y = question.board_size
        // canvas = $api.byId("canvas")
        // offset = $api.offset($api.byId("container"))
    canvas = el;
    offset = offset;

    var width = offset.w;
    if (width > 750) { //
        width = parseInt(width / 3)
    } else { //
    }
    offel.style.height = width + "px"

    $api.attr(canvas, "width", width);
    $api.attr(canvas, "height", width);

    var ctx = canvas.getContext("2d");

    //board_size * 2 + 1;//19*2+1
    //每格的宽度
    board_square = parseInt(width / (board_size + 1));
    //边缘的大小
    board_edge = board_square - 0.5;
    //
    if (board_size == 19) {
        dots_of_star = ["dd", "dj", "dp", "jd", "jj", "jp", "pd", "pj", "pp"];
    } else if (board_size == 13) {
        dots_of_star = ["dd", "dj", "gg", "jd", "jj"];
    } else if (board_size == 9) {
        dots_of_star = ["cc", "gc", "cg", "gg"];
    }
    stone_radius = parseInt(board_square / 3)

    black_img = new Image;
    black_img.src = "../../image/black.png";
    white_img = new Image;
    white_img.src = "../../image/white.png";
    board_img = new Image;
    board_img.src = "../../image/bg-04.jpg";

    black_img.onload = function() {
        start_draw();
    }
    white_img.onload = function() {
        start_draw();
    }
    board_img.onload = function() {
        start_draw();
    }

    canvasClick(ctx);

    //初始化点
    init_dots();
    //初始化问题点
    init_src_dots(question);






}

var index = 0;

function start_draw() {
    index++;
    if (index < 3) {
        return;
    }
    var ctx = canvas.getContext("2d");
    draw_board(ctx)
}

function canvasClick(ctx) {
    //$("#canvas").unbind();
    $("#canvas").click(function(e) { //点击棋盘
        //获取到点击位置所在的坐标点
        var p = getPosition(e, $(this));
        if (p == undefined) {
            return;
        }
        var ret = 0;
        //判断是否点击在空点上
        ret = check_pos(p, 0) //返回0则为可使用空点,不为0则表示错误点,不布局
        if (ret != 0) {
            return;
        }
        //根据步数与答案,判断所下位置是否正确
        var stone = stones[p.x * board_size + p.y]
            //alert(JSON.stringify(stone))
        if (answers.length > 1) { //多答案
            if (answer.length > 0) { //已确定唯一答案
                playAnswer(stone, p);
            } else { //暂未确定
                //需要先判断是否已经有备选答案
                cAnswers = [];
                for (var i = 0; i < answers.length; i++) {
                    var aa = answers[i]
                    var a = aa[step]
                    if (a == stone.name) { //此答案与所下点数一致
                        cAnswers.push(aa) //在备选中加入次答案
                    }
                }
                if (cAnswers.length == 0) { //没有任何答案加入备选答案,此步错误
                    stone.status = EMPTY;
                    getNextColor();
                    toastAtMiddle("下在这里不对哦~!")
                    return;
                } else if (cAnswers.length == 1) { //唯一备选答案
                    answer = cAnswers[0]
                    playAnswer(stone, p)
                } else { //多个答案
                    answer = cAnswers[0] //先已第一个为准
                    playAnswer(stone, p)
                }
            }
        } else { //只有一个答案
            playAnswer(stone, p);
        }
        draw_board(ctx);
    })
}

function playAnswer(stone, p) {
    var nowAnswer = answer[step];
    if (stone.name != nowAnswer) { //错误棋,返回
        stone.status = EMPTY;
        getNextColor();
        toastAtMiddle("下在这里不对哦~!")
        return;
    } else { //正确棋,自动下白棋.并且将步数+1,步数列表增加一个点
        step++;
        stone.index = step
        steps.push(p)
        if (step != answer.length) {
            autoPlayNext();
        }
    }
    if (step == answer.length) {
        setTimeout("answerRight()", 0)
    }
}

function answerRight() {
    api.sendEvent({
        name: 'wqAnswerRight',
        extra: {
            //
        }
    });
}

function draw_board(ctx) {
    draw_background(ctx)
        //画棋盘
    draw_board_line(ctx);
    //画星点
    draw_star(ctx);
    //画标注
    draw_chess_pos(ctx);
    //画图
    if (stones.length > 0) {
        draw_square(ctx);
    }

}

function draw_board_line(ctx) {
    ctx.beginPath();
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1;
    var step = board_square;
    var startx = 0;
    var endx = board_size;
    var widthhalf = 0;
    //		if (vertline_img != null) {
    //	        widthhalf = vertline_img.width;
    //	    }
    var heighthalf = 0;
    //	    if (hertline_img != null) {
    //	        heighthalf = hertline_img.height;
    //	    }
    for (var x = startx; x < endx; x += 1) {
        var posx = 0.5 + x * board_square + board_edge;
        if (widthhalf == 0) {
            ctx.moveTo(posx, board_edge);
            var toy = board_edge + board_square * (board_size_y - 1)
            ctx.lineTo(posx, toy);
            //		        alert(posx+"--"+board_edge+"--"+toy)
        } else {
            //draw_h_image(ctx, vertline_img, posx - widthhalf / 2, board_edge, widthhalf, board_square * (board_size_y - 1) + 0.5);
        }
    }
    var starty = 0;
    var endy = board_size;
    for (var y = starty; y < endy; y += 1) {
        var posy = 0.5 + y * board_square + board_edge;
        if (heighthalf == 0) {
            ctx.moveTo(board_edge, posy);
            var tox = board_edge + board_square * (board_size_x - 1);
            ctx.lineTo(tox, posy);
        } else {
            //draw_h_image(ctx, hertline_img, board_edge, posy - heighthalf / 2, board_square * (board_size_y - 1) + heighthalf, heighthalf);
        }
    }
    ctx.closePath();
    ctx.stroke();
}

function draw_star(ctx) {
    //此处先判断是几线棋盘,demo以13为例
    for (var i = 0; i < dots_of_star.length; i++) {
        //星点的字母表示
        var dot = dots_of_star[i];
        //获取星点的位置坐标
        var c = get_pos_by_dot(dot);
        //获取星点的具体坐标
        var xys = get_pos_by_position(c.x, c.y)
        var x = xys[0]
        var y = xys[1]
        draw_star_d(ctx, x, y)
    }
}

function draw_star_d(ctx, x, y) {
    ctx.beginPath();
    var s = 20 / 3
    if (s > 3) s = 3;
    if (s < 2) s = 2;
    ctx.arc(x, y, s, 0, Math.PI * 2, false)
    ctx.fillStyle = "#000"
    ctx.fill();
}

var g_charpx = 10;
var letters_up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function draw_chess_pos(ctx) {
    ctx.beginPath();
    ctx.font = "10px 微软雅黑,sans-serif";
    ctx.textAlign = "center"
    ctx.fillStyle = "#000"
    var y = (board_edge + g_charpx) / 2
    for (var i = 0; i < board_size; i++) {
        var num = letters_up[i]
        var posx = board_square * i + board_edge;
        var posy = y;
        ctx.fillText(num, posx, posy)
    }
    for (var j = 0; j < board_size; j++) {
        var num = j + 1
            //x位置需要判断哪边为交接
        var posx = board_edge + (board_size - 1) * board_square + (board_edge + g_charpx) / 2;
        var posy = j * board_square + board_edge + 5;
        ctx.fillText(num, posx, posy)
    }
    ctx.closePath();
}

function draw_square(ctx) {
    ctx.beginPath();
    for (var i = 0; i < board_size; i++) {
        for (var j = 0; j < board_size; j++) {
            var d = stones[i * board_size + j];
            var xys = get_pos_by_position(d.x, d.y)
            var posx = xys[0]
            var posy = xys[1]
                //				ctx.globalAlpha
            if (d.status == WHITE) {
                draw_white(ctx, posx, posy, d.index);
            } else if (d.status == BLACK) {
                draw_black(ctx, posx, posy, d.index);
            } else { //if(d.status==3){//不可放置
                //
            }
        }
    }
    ctx.closePath();
}

/**
 * 线路轨迹回放。
 * Created by Song on 2016/4/5.
 */

(function (g) {
    g.wol = g.wol || {};
    g.wol.xom = g.wol.xom || {};
})(window);

/**
 *  线路轨迹回放。
 *
 *
 * @param options
 *  interval:  轨迹移动一次需要的时间，单位ms，默认20,
 *  speed: 轨迹移动的速度，interval时间内移动的距离；默认0.0003,
 * maxOnSegment: 每个分段线段上最大移动点数，默认100,
 * segmentsOnView: 每个视野范围内的分段的数量，默认10,
 * lineStyle : 线路的样式、未回放线路的样式。 参考ol.style.Style
 * footprintStyle : 已经经过的线路的样式。参考ol.style.Style
 * tracerStyle :回放轨迹点的样式。参考ol.style.Style
 *
 * @constructor
 */
wol.xom.LineTracer = function (options) {
    var DEFAULT_OPTIONS = {
        speed: 0.0003,
        interval: 20,
        maxOnSegment: 100,
        segmentsOnView: 80,
        lineStyle: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [18, 53, 101, 0.8],
                lineDash: [4, 6],
                width: 2
            }),
            zIndex: 2
        }),
        footprintStyle: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [75, 235, 19, 1],
                width: 3
            }),
            zIndex: 10
        }),
        tracerStyle: new ol.style.Style({
            image: new ol.style.Icon(({
                anchor: [0.5, 0.5],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                opacity: 0.9,
                src: ctx + '/js/womow-trail/trace.png',
                scale: 0.7
            })),
            zIndex: 15
        })
    };

    options = jQuery.extend({}, DEFAULT_OPTIONS, options);

    var me = this;
    me.map = options.map;
    me.coords;
    me.line;
    
    /*播放控制*/
    me.speed = options.speed;
    me.interval = options.interval;
    me.maxOnSegment = options.maxOnSegment;
    me.segmentsOnView = 80;

    /*样式*/
    me.lineStyle = options.lineStyle;
    me.footprintStyle = options.footprintStyle;
    me.tracerStyle = options.tracerStyle;
    me.zoomLevel={maxZoom:16};

    /*要素*/
    me.footprintLine;
    me.footprintFeature;
    me.tracer;
    
    /*状态域：是否开始、是否正在播放、是否完成、动画计时器*/
    me.ifStarted=false;
    me.ifPlaying=false;
    me.ifCompleted=true;
    me.intervalKey;

    /*坐标数组与图层*/
    me.pointIndex = 0;
    me.footprintCoordinates = [];
    me.source = new ol.source.Vector({features: new ol.Collection()});
    me.vector = new ol.layer.Vector({source: me.source});

    me.map.addLayer(me.vector);
};

//-----------------------------------------------------
// getter and setters
//-----------------------------------------------------
/**
 * 获取移动的渲染的图层。
 * @returns {ol.layer.Vector|*}
 */
wol.xom.LineTracer.prototype.getLayer = function () {
    return this.vector;
};
/**
 * 设置移动速度。
 * @param speed
 * @returns {wol.xom.LineTracer}
 */
wol.xom.LineTracer.prototype.setSpeed = function (speed) {
    this.speed = speed;
    if(speed==0.00001){//慢速
        this.interval=20;
    	this.maxOnSegment=200;
        this.segmentsOnView=110;
    }
    else if(speed==0.00008){//中速
        this.interval=15;
        this.maxOnSegment=100;
        this.segmentsOnView=80;
    }
    else{//快速
        this.interval=10;
        this.maxOnSegment=50;
        this.segmentsOnView=50;
    }
    return this;
};

/**
 *  初始化
 * @param coords 线路坐标二维数组 Array.<ol.Coordinate>，既 Array.<Array.<number>>
 * @note  如果坐标点数组组织方式不对，可能会引起以下错误： 513ol-debug.js:4290 Uncaught AssertionError: Failure: unsupported stride: undefined
 * @returns {wol.xom.LineTracer}
 */
wol.xom.LineTracer.prototype.init = function (coords) {
    var me = this;
    
    //初始化标志：是否开始、是否正在播放、是否播放 
    me.ifStarted=false;
    me.ifPlaying=false;
    me.ifCompleted=true;
    
    me.pointIndex = 0;

    me.coords = coords;

    me.line = new ol.Feature(new ol.geom.LineString(coords));
    me.line.setStyle(me.lineStyle);
    me.source.addFeature(me.line);

    me.tracer = new ol.Feature({geometry: new ol.geom.Point(coords[0])});
    me.tracer.setStyle(me.tracerStyle);
    me.source.addFeature(me.tracer);

    //me.map.getView().fit(me.line.getGeometry(), me.map.getSize(), me.zoomLevel);
    return this;
};

wol.xom.LineTracer.prototype.play = function () {
    throw new Error("unsurpport method name of play!! ");
};
/**
 * 开始：启动播放
 * @returns {wol.xom.LineTracer} 返回对象自身
 */
wol.xom.LineTracer.prototype.start = function () {
	var me = this;
	
	//如果轨迹播放已完成（初始视为播放已完成）
	if(me.ifCompleted){
		me.ifStarted=true;
		me.ifPlaying=true;
		me.ifCompleted=false;
		
	    me.footprintCoordinates = [];
	    me.footprintLine = new ol.geom.LineString(me.footprintCoordinates);
	    me.footprintFeature = new ol.Feature(me.footprintLine);
	    me.footprintFeature.setStyle(me.footprintStyle);
	    me.source.addFeature(me.footprintFeature);
	
	    me.nextView();    
	}
	return this;
};
/**
 *暂停
 * @returns {wol.xom.LineTracer}
 */
wol.xom.LineTracer.prototype.pause = function () {
    var me = this;
    me.ifPlaying=false;
    if (me.intervalKey) {
        clearInterval(me.intervalKey);
        me.intervalKey = undefined;
    }
    return this;
};
/**
 * 继续
 * */
wol.xom.LineTracer.prototype.resume=function(){
	var me=this;
	me.ifPlaying=true;
	if(!me.intervalKey){
		me.intervalKey=setInterval(animate, me.interval);
	}
	return this;
}
/**
 * 复位,重放
 * @returns {wol.xom.LineTracer} 返回对象自身
 */
wol.xom.LineTracer.prototype.reset = function () { 
    var me = this;
    //标志重置
    me.ifStarted=false;
    me.ifPlaying=false;
    me.ifCompleted=true;
    
    //清除计时器
    if (me.intervalKey) {
        clearInterval(me.intervalKey);
        me.intervalKey = undefined;
    }

    // 清除已经回放的轨迹
    me.footprintCoordinates = [];
    if (me.footprintLine)
        me.footprintLine.setCoordinates(me.footprintCoordinates);

    // 轨迹点放到起始位置
    if (me.tracer)
        me.tracer.getGeometry().setCoordinates(me.coords[0]);

    me.pointIndex = 0;

    // 地图范围复位
    if (me.map && me.line)
        me.map.getView().fit(me.line.getGeometry(), me.map.getSize(), me.zoomLevel);
    return this;   
};
/**
 *停止
 * @returns {wol.xom.LineTracer}
 */
wol.xom.LineTracer.prototype.stop = function () {
    var me = this;
    me.ifPlaying=false;   
    if (me.intervalKey) {
        clearInterval(me.intervalKey);
        me.intervalKey = undefined;
    }
    return this;
};

/**
 * 清除渲染的轨迹，并将数据恢复到初始位置。
 * @returns {wol.xom.LineTracer} 返回对象自身
 */
wol.xom.LineTracer.prototype.clear = function () {
    this.reset();
    this.source.clear(true);
    return this;
};

/**
 * 动画参数对象
 * */
function animParams(index,traceCoords,endpointIndices,fn){
	var params=new Object();
	//设置参数
	params.index=index;
	params.traceCoords=traceCoords;
	params.endpointIndices=endpointIndices;
	params.fn=fn;
	//返回参数对象
    return params;
}
//定义参数对象
var paraObj;
/**
 * 动画函数trace
 */
function animate() {
    var f = paraObj.traceCoords[paraObj.index];
    paraObj.fn.tracer.setGeometry(new ol.geom.Point(f));

    // 如果上一个点不是路线中的线段的端点，则移除
    if (paraObj.index > 1 && !paraObj.endpointIndices[paraObj.index - 1])
    	paraObj.fn.footprintCoordinates.pop();
    /*加入当前点*/
    paraObj.fn.footprintCoordinates.push(f);
    // 修改足迹路线。
    paraObj.fn.footprintLine.setCoordinates(paraObj.fn.footprintCoordinates);
    
    /*判断停止条件*/
    paraObj.index++;
    if (paraObj.index == paraObj.traceCoords.length) {//只是当前分段播放完成
    	
        if (paraObj.fn.intervalKey){
            clearInterval(paraObj.fn.intervalKey);
        }
        if (paraObj.fn.pointIndex < paraObj.fn.coords.length){
        	paraObj.fn.nextView();
        }
        else{//所有分段都已走完则播放完成
        	//播放完成
        	paraObj.fn.ifCompleted=true;
        	clearInterval(paraObj.fn.intervalKey);
        }
    }
}
/**
 * @note  如果坐标点数组不对可能会引起以下错误： 513ol-debug.js:4290 Uncaught AssertionError: Failure: unsupported stride: undefined
 */
wol.xom.LineTracer.prototype.nextView = function () {
    /*暂时根据数量切分，以后改为固定比例尺和范围拆分*/
    var me = this;

    var c = me.coords.slice(me.pointIndex, me.pointIndex + me.segmentsOnView);

    // 当前视野范围内的路线
    var l = new ol.geom.LineString(c);
    var traceCoords = [];
    if (me.pointIndex == 0)
        traceCoords.push([me.coords[0][0], me.coords[0][1]]);

    /*
     *点的数量
     * traceCoords 已经加入一个点
     * 所以从1开始 traceCoords.length
     */
    var traceCount = traceCoords.length;
    // tracer所在点的索引
    var index = 0;
    // 直线上端点坐标的索引
    var endpointIndices = {0: true};

    /*根据速度细分路线*/
    for (var i = 1; i < c.length; i++) {
        var xa = c[i - 1][0];
        var ya = c[i - 1][1];
        var xb = c[i][0];
        var yb = c[i][1];
        var lx = xb - xa;
        var ly = yb - ya;
        var s = Math.sqrt(lx * lx + ly * ly);

        var g = Math.round(s / me.speed);
        if (g < 1) 
        	g = 1;
        if (me.maxOnSegment > 0 && g > me.maxOnSegment) 
        	g = me.maxOnSegment;
        traceCount += g;

        endpointIndices[traceCount - 1] = true;

        for (var j = 1; j <= g; j++) {
            traceCoords.push([xa + j * lx / g, ya + j * ly / g]);
        }
    }

    /* 计算完成后，移动点的索引*/
    me.pointIndex += this.segmentsOnView - 1;
    // 地图范围复位。
    me.map.getView().fit(l, me.map.getSize(), me.zoomLevel);

    //定义参数对象
    paraObj=new animParams(index,traceCoords,endpointIndices,me);
    //切换视图范围后，延迟一下
    me.map.once("postrender", function (event) {
        setTimeout(function () {
            me.intervalKey = setInterval(animate, me.interval);
        }, 200);
    });
};

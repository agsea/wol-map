/**
 * 轨迹播放控件
 * Created by Aegean on 2017/3/17 0017.
 */

;(function(global) {
    global.wol = global.wol || {};

    //预置速度
    var SPEED = {
        'slow': 1,
        'normal': 5,
        'fast': 10
    };

    //当前脚本路径
    var _curJsPath = decodeURI(_currentScriptPath());
    var pathArr = _curJsPath.split('/');
    pathArr.pop();
    pathArr.pop();
    pathArr[1] = '/';
    var newPath = pathArr.join('/');
    var _iconPath = newPath + '/image/drone.gif';

    /**
     * 轨迹对象
     * @constructor
     * @requires wol-util.js
     * @param {wol.MapViewer} mapViewer - wol地图实例
     */
    wol.Tracer = function(mapViewer) {
        var _mapViewer = mapViewer;
        var _traceLayer, _traceLine, _flashLine, _flashPoint, _flashPOverlay;
        //默认配置项
        var _defaultOption = {
            source: null,
            speed: SPEED.normal,
            afterInitialize: function() {},
            afterStart: function() {},
            afterComplete: function() {},
            icon: _iconPath,   //轨迹播放图标
            iconClass: '',  //图标样式
            iconSize: 40,   //图标大小
            iconOpacity: 1, //图标透明度
            ifDynamicTrack: false,
            ifLocate: false
        };

        //轨迹样式
        var _traceStyles = {
            STATIC_LINE: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#374f62',
                    width: 2,
                    lineDash: [6, 4]
                })
            }),
            FLASH_LINE: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#23e6a1',
                    width: 3
                })
            }),
            FLASH_POINT: _getIconStyle({
                src: _iconPath,
                opacity: 0.95
            })
        };

        /**
         * 动画状态
         * @type {object}
         */
        this.status = {
            initialize: false,
            start: false,
            animating: false,
            complete: false
        };

        /**
         * 动画计时器
         * @type {object|null}
         */
        this.timer = null;

        /**
         * 动画参数
         * @type {object}
         */
        this.animateParam = {};
        /**
         * 初始化轨迹播放实例
         * @param {object} option - 初始化配置项
         * @param {ol.Feature} option.src - 轨迹线要素
         * @param {string|number} option.speed - 轨迹播放速度，可选值为'slow'、'normal'、'fast'，也可以是大于0的具体数值，默认为 3
         * @param {function} option.afterInitialize - 轨迹初始化后的回调函数，默认为空函数
         * @param {function} option.afterStart - 轨迹开始播放的回调函数，默认为空函数
         * @param {function} option.afterComplete - 轨迹播放完成的回调函数，默认为空函数
         * @param {boolean} option.ifDynamicTrack - 轨迹播放过程中是否开启动态追踪，默认为 false
         * @param {boolean} option.ifLocate - 轨迹初始化完成后是否定位至轨迹点，默认为 false
         * @param {boolean} option.icon - 轨迹播放图标文件路径，应是相对于该JS文件执行目录（引用该文件的页面所在目录）的路径
         * @param {boolean} option.iconClass - 轨迹播放图标CSS样式，默认为‘’
         * @param {boolean} option.iconSize - 轨迹播放图标大小，默认为40
         * @param {boolean} option.iconOpacity - 轨迹播放图标透明度，默认为1
         */
        this.init = function(option) {
            if(this.status.initialize) {
                console.error('轨迹已初始化');
                return;
            }

            option = wol.util.extend(_defaultOption, option);
            _initTraceParams(option, this);

            _traceLayer = wol.util.createVectorLayer({
                name: 'traceLayer' + new Date().getTime(),
                label: '轨迹图层',
                style: _traceStyles.STATIC,
                features: [_traceLine, _flashLine],
                updateWhileAnimating: true,
                updateWhileInteracting: true,
                zIndex: 25
            });
            mapViewer.addLayer(_traceLayer);
            mapViewer.getMap().addOverlay(_flashPOverlay);

            //设置动画状态
            this.status.initialize = true;
            this.animateParam.afterInitialize();

            if(option.ifLocate) {
                this.getMapViewer().panTo(this.animateParam.tempCoord, 400);
            }
        }

        /**
         * 初始化轨迹参数
         * @private
         * @param option
         * @param self
         */
        function _initTraceParams(option, self) {
            var traceLine = option.source;
            if(traceLine === null || !(traceLine instanceof ol.Feature) || !(traceLine.getGeometry() instanceof ol.geom.LineString)) {
                console.error('参数错误');
                return;
            }

            var speed = option.speed;
            if(speed === 'slow') {
                speed = SPEED.slow;
            }else if(speed === 'normal') {
                speed = SPEED.normal;
            }else if(speed === 'fast') {
                speed = SPEED.fast;
            }else if(isNaN(speed)) {
                speed = 1;
            }else {
                speed = parseFloat(speed);
            }
            option.speed = speed;

            _traceLine = traceLine;
            var coords = traceLine.getGeometry().getCoordinates();
            var newCoords = _createAnimateCoords(coords, option.speed);
            _flashLine = new ol.Feature(new ol.geom.LineString([coords[0]]));
            // _flashPoint = new ol.Feature(new ol.geom.Point(coords[0]));
            _flashPOverlay = new ol.Overlay({
                element: _createPointOverlay({
                    icon: option.icon,
                    clas: option.iconClass,
                    size: option.iconSize,
                    opacity: option.iconOpacity
                }),
                position: coords[0],
                positioning: 'center-center'
            });

            _traceLine.setStyle(_traceStyles.STATIC_LINE);
            _flashLine.setStyle(_traceStyles.FLASH_LINE);
            // _flashPoint.setStyle(_traceStyles.FLASH_POINT);
            self.animateParam.speed = option.speed;
            self.animateParam.srcCoords = newCoords;
            self.animateParam.tempCoord = newCoords[0];
            self.animateParam.coordLen = newCoords.length;
            self.animateParam.flashLineGeom = _flashLine.getGeometry();
            // self.animateParam.flashPointGeom = _flashPoint.getGeometry();
            self.animateParam.flashPointOverlay = _flashPOverlay;
            self.animateParam.afterInitialize = option.afterInitialize;
            self.animateParam.afterStart = option.afterStart;
            self.animateParam.afterComplete = option.afterComplete;
            self.animateParam.ifDynamicTrack = option.ifDynamicTrack;
            _initAnimateParams(self);
        }

        /**
         * 获取wol地图实例
         * @return {wol.MapViewer}
         */
        this.getMapViewer = function() {
            return _mapViewer;
        }

        /**
         * 获取轨迹图层
         * @return {ol.layer.Base}
         */
        this.getTraceLayer = function() {
            return _traceLayer;
        }

        /**
         * 获取轨迹图层数据源
         * @return {ol.source.Source}
         */
        this.getTraceSource = function() {
            return _traceLayer.getSource();
        }

        /**
         * 获取轨迹线要素
         * @return {ol.Feature}
         */
        this.getTraceLine = function() {
            return _traceLine;
        }

        /**
         * 获取动画轨迹线要素
         * @return {ol.Feature}
         */
        this.getFlashLine = function() {
            return _flashLine;
        }

        /**
         * 获取动画轨迹点要素
         * @return {ol.Feature}
         */
        this.getFlashPoint = function() {
            return _flashPoint;
        }
    }

    /**
     * 初始化动画参数
     * @private
     */
    function _initAnimateParams(self) {
        self.animateParam.flashCoords = [self.animateParam.srcCoords[0]];
        self.animateParam.index = 0;
    }

    /**
     * 播放轨迹，你可以在轨迹初始化完成后调用该方法播放轨迹或轨迹暂停播放后调用该方法继续播放
     */
    wol.Tracer.prototype.play = function() {
        var self = this, delay = 0;
        if(!self.status.initialize) {
            console.error('轨迹已销毁或未初始化');
            return;
        }else if(!self.status.start) {
            self.status.start = true;
            self.animateParam.afterStart();

            //未开启动态追踪则调整视图
            if(!self.animateParam.ifDynamicTrack) {
                _switchView(self.getMapViewer().getMap(), self.animateParam.tempCoord, self.animateParam.speed);
                delay = 100;
            }else {
                self.getMapViewer().getMap().getView().setZoom(15);
            }
        }else if(self.status.animating) {
            console.info('动画正在播放');
            return;
        }else if(self.status.complete) {
            console.info('动画已结束');
            return;
        }

        var ifContain;
        setTimeout(function() {
            self.status.animating = true;
            self.timer = setInterval(function() {
                if(self.animateParam.index < self.animateParam.coordLen - 1) {
                    self.animateParam.tempCoord = self.animateParam.srcCoords[self.animateParam.index + 1];
                    self.animateParam.flashCoords.push(self.animateParam.tempCoord);
                    self.animateParam.flashLineGeom.setCoordinates(self.animateParam.flashCoords);
                    // self.animateParam.flashPointGeom.setCoordinates(self.animateParam.tempCoord);
                    self.animateParam.flashPointOverlay.setPosition(self.animateParam.tempCoord);

                    //是否动态追踪
                    if(self.animateParam.ifDynamicTrack) {
                        self.getMapViewer().panTo(self.animateParam.tempCoord, 0);
                    }else {
                        ifContain = _ifContainFlashPoint(self.getMapViewer().getMap(), self.animateParam.tempCoord);
                        if(!ifContain) {
                            _switchView(self.getMapViewer().getMap(), self.animateParam.tempCoord, self.animateParam.speed);
                        }
                    }

                    self.animateParam.index++;
                }else {
                    clearInterval(self.timer);
                    self.status.animating = false;
                    self.status.complete = true;
                    self.animateParam.afterComplete();
                }
            }, 5);
        }, delay);
    }

    /**
     * 暂停轨迹播放
     */
    wol.Tracer.prototype.pause = function() {
        var self = this;
        if(!self.status.animating) {
            console.error('动画未处于播放状态');
            return;
        }else {
            clearInterval(self.timer);
            self.status.animating = false;
        }
    }

    /**
     * 重置轨迹播放
     */
    wol.Tracer.prototype.reset = function() {
        var self = this;
        if(!self.status.initialize) {
            console.error('轨迹已销毁或未初始化');
            return;
        }

        clearInterval(self.timer);
        self.status.start = false;
        self.status.animating = false;
        self.status.complete = false;
        _initAnimateParams(self);

        var coord = self.animateParam.srcCoords[0];
        self.animateParam.flashLineGeom.setCoordinates(self.animateParam.flashCoords);
        // self.animateParam.flashPointGeom.setCoordinates(coord);
        self.animateParam.flashPointOverlay.setPosition(coord);
        self.animateParam.tempCoord = coord;
        self.getMapViewer().panTo(coord, 600);
    }

    /**
     * 清除轨迹，清除之后若要执行轨迹播放你将必须重新初始化轨迹
     */
    wol.Tracer.prototype.clear = function() {
        var self = this;
        if(!self.status.initialize) {
            console.error('轨迹已销毁或未初始化');
            return;
        }

        clearInterval(self.timer);
        self.status.initialize = false;
        self.status.start = false;
        self.status.animating = false;
        self.status.complete = false;
        _initAnimateParams(self);

        var source = self.getTraceSource();
        source.removeFeature(self.getTraceLine());
        source.removeFeature(self.getFlashLine());
        source.removeFeature(self.getFlashPoint());
    }

    /**
     * 平移视图中心点
     * @param {ol.Coordinate} target - 目标坐标点
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    /*wol.Tracer.prototype.panTo = function(target, duration) {
        var self = this;
        var map = self.getMapViewer().getMap();
        var view = map.getView();

        //是否开启动画
        if(duration == undefined || duration == 0) {
            view.setCenter(target);
        }else {
            view.animate({center: target}, {duration: duration});
        }
    }*/

    /**
     * 设置静态轨迹线样式
     * @param {ol.style.Style} style - 样式实例
     */
    wol.Tracer.prototype.setStaticStyle = function(style) {
        var self = this;
        self.getTraceLine().setStyle(style);
    }

    /**
     * 设置动态轨迹线样式
     * @param {ol.style.Style} style - 样式实例
     */
    wol.Tracer.prototype.setFlashStyle = function(style) {
        var self = this;
        self.getFlashLine().setStyle(style);
    }

    /**
     * 设置轨迹图标
     * @param {string} uri - 图标文件地址
    wol.Tracer.prototype.setIcon = function(uri) {
        var iconEle = this.animateParam.flashPointOverlay.getElement();
        iconEle.style.backgroundImage = 'url(' + uri + ') !important';
        console.info(uri);
        console.info(iconEle);
    }*/

    /**
     * 切屏
     * @private
     * @param {ol.Map} map
     * @param {ol.Coordinate} coords
     */
    function _switchView(map, coord, speed) {
        var view = map.getView();
        var durTime = 50;
        if(speed) {
            if(speed <= 5) {
                durTime = 100;
            }else if(speed > 5 && speed <= 9) {
                durTime = 50;
            }else {
                durTime = 0;
            }
        }

        if(speed && durTime > 0) {
            view.animate({center: coord}, {duration: durTime});
        }else {
            view.setZoom(15);
            view.setCenter(coord);
        }
    }

    /**
     * 轨迹点在地图上是否可见
     * @private
     * @param map
     * @param coord
     */
    function _ifContainFlashPoint(map, coord) {
        var view = map.getView();
        var viewExtent = view.calculateExtent(map.getSize());
        var flag = ol.extent.containsCoordinate(viewExtent, coord);
        return flag;
    }

    /**
     * 生成动画坐标点数组
     * @private
     * @param {Array<ol.Coordinate>} origCoords - 原始坐标点数组
     * @param {number} step - 步长（沿线方向）
     * @return {Array<ol.Coordinate>}
     */
    function _createAnimateCoords(origCoords, step) {
        var len = origCoords.length;
        if(len >= 2) {
            var i = 0;
            var newCoords = [], temp;
            for(; i < len - 1; i++) {
                temp = _getInterpolation(origCoords[i], origCoords[i + 1], step);
                newCoords = newCoords.concat(temp);
            }
            return newCoords;
        }else {
            throw new Error('至少包含两个点');
        }
    }

    /**
     * 根据两个坐标点获取插值数组
     * @private
     * @param {ol.Coordinate} point1
     * @param {ol.Coordinate} point2
     * @param {number} step - 步长（沿线方向）
     * @return {Array<Array>}
     */
    function _getInterpolation(point1, point2, step) {
        //参数设置
        var x1 = point1[0], y1 = point1[1],
            x2 = point2[0], y2 = point2[1];
        var targetArray = [point1];
        var tempX, tempY;

        if(y1 === y2) {
            tempX = x1 + step;
            tempY = y1;
            while(tempX < x2) {
                targetArray.push([tempX, tempY]);
                tempX += step;
            }
        }else if(x1 === x2) {
            tempX = x1;
            tempY = y1 + step;
            while(tempY < y2) {
                targetArray.push([tempX, tempY]);
                tempY += step;
            }
        }else {
            //斜率
            var slope = (y2 - y1) / (x2 - x1);
            //根据步长计算x和y方向增量
            var stepX = step / Math.pow((1 + slope * slope), 0.5);
            var stepY = stepX * slope;

            tempX = x1 + stepX;
            tempY = y1 + stepY;
            while(tempX < x2) {
                targetArray.push([tempX, tempY]);
                tempX += stepX;
                tempY += stepY;
            }
        }

        targetArray.push(point2);
        return targetArray;
    }

    /**
     * 获取当前脚本的 URI
     * @private
     * @return  {String}
     */
    function _currentScriptPath() {
        var scripts = document.getElementsByTagName( "script" );
        var script = scripts[ scripts.length - 1 ];
        return script.hasAttribute ? script.src : script.getAttribute( "src");
    }

    /**
     * 获取图标样式
     * @private
     * @param option
     */
    function _getIconStyle(option) {
        var defaults = {
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: _iconPath,
            scale: 1,
            opacity: 1
        };
        option = wol.util.extend(defaults, option);

        return new ol.style.Style({
            image: new ol.style.Icon(({
                anchor: option.anchor,
                anchorXUnits: option.anchorXUnits,
                anchorYUnits: option.anchorYUnits,
                src: option.src,
                scale: option.scale,
                opacity: option.opacity
            }))
        });
    }

    /**
     * 创建点悬浮层
     * @private
     */
    function _createPointOverlay(option) {
        var ele = document.createElement('div');
        ele.style.width = option.size + 'px';
        ele.style.height = option.size + 'px';
        ele.className = option.clas;
        ele.style.background = 'url(' + option.icon + ') no-repeat';
        ele.style.backgroundSize = option.size + 'px';
        ele.style.opacity = option.opacity;
        return ele;
    }
})(window);
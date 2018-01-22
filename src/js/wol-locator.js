/**
 * 地图要素定位
 * Created by Aegean on 2017/3/8 0008.
 */

;(function(global) {
    global.wol = global.wol || {};

    /**
     * 要素定位器
     * @constructor
     * @requires wol-util.js
     * @param {wol.MapViewer} mapViewer - wol地图实例
     */
    wol.Locator = function(mapViewer) {
        var _mapViewer = mapViewer;
        var _locateLayer;
        var _locateStyles = {
            STATIC: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#00afcc',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: '#00e3ff'
                }),
                image: new ol.style.Circle({
                    stroke: new ol.style.Stroke({
                        color: '#8fedce',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: '#00c38a'
                    }),
                    radius: 8
                })
            }),
            FLASH: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#ff93a8',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: '#ff607f'
                }),
                image: new ol.style.Circle({
                    stroke: new ol.style.Stroke({
                        color: '#ff93a8',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: '#ff607f'
                    }),
                    radius: 8
                })
            })
        };

        /**
         * 初始化地图定位实例
         * @private
         */
        function _init() {
            _locateLayer = wol.util.createVectorLayer({
                name: 'locateLayer' + new Date().getTime(),
                label: '定位图层',
                style: _locateStyles.STATIC,
                updateWhileAnimating: true,
                zIndex: 30
            });
            mapViewer.addLayer(_locateLayer);
        }

        /**
         * 获取wol地图实例
         * @return {wol.MapViewer}
         */
        this.getMapViewer = function() {
            return _mapViewer;
        }

        /**
         * 获取定位图层
         * @return {ol.layer.Base}
         */
        this.getLocateLayer = function() {
            return _locateLayer;
        };

        /**
         * 获取定位图层数据源
         * @return {ol.source.Source}
         */
        this.getLocateSource = function() {
            return _locateLayer.getSource();
        };

        /**
         * 获取定位层静态样式
         * @return {ol.style.Style}
         */
        this.getStaticStyle = function() {
            return _locateStyles.STATIC;
        };
        /**
         * 设置定位层静态样式
         * @param {ol.style.Style} style
         */
        this.setStaticStyle = function(style) {
            _locateStyles.STATIC = style;
            this.getLocateLayer().setStyle(style);
        };

        /**
         * 获取定位层动画样式
         * @return {ol.style.Style}
         */
        this.getFlashStyle = function() {
            return _locateStyles.FLASH;
        };
        /**
         * 设置定位层动画样式
         * @param {ol.style.Style} style
         */
        this.setFlashStyle = function(style) {
            _locateStyles.FLASH = style;
        };

        /**
         * 获取点定位描边颜色值
         * @return {string}
         */
        this.getPiStrokeColor = function() {
            var circle = _locateStyles.FLASH.getImage();
            return circle.getStroke().getColor();
        };

        /**
         * 获取点定位填充颜色值
         * @return {string}
         */
        this.getPiFillColor = function() {
            var circle = _locateStyles.FLASH.getImage();
            return circle.getFill().getColor();
        };

        /**
         * 获取点定位半径
         * @return {string}
         */
        this.getPiRadius = function() {
            var circle = _locateStyles.FLASH.getImage();
            return circle.getRadius();
        };

        /**
         * 获取线定位颜色值
         * @return {string}
         */
        this.getLsStrokeColor = function() {
            var style = _locateStyles.FLASH;
            return style.getStroke().getColor();
        };

        /**
         * 获取面定位描边颜色值
         * @return {string}
         */
        this.getPlStrokeColor = function() {
            var style = _locateStyles.FLASH;
            return style.getStroke().getColor();
        };

        /**
         * 获取面定位填充颜色值
         * @return {string}
         */
        this.getPlFillColor = function() {
            var style = _locateStyles.FLASH;
            return style.getFill().getColor();
        };

        //初始化
        _init();
    };

    /**
     * 定位要素
     * @param {ol.Feature} feature - 待定位要素
     * @param {object} option - 参数项
     * @param {number} option.duration - 动画持续时间，可选参数，默认为0
     * @param {number} option.times - 动画循环次数，可选参数，默认为3
     * @param {boolean} option.autoView - 执行定位动画的同时是否自适应视图，默认为true
     */
    wol.Locator.prototype.locate = function(feature, option) {
        //是否正在定位
        if(!feature.get('locating')) {
            feature.set('locating', true);
        }else {
            console.warn('The feature is being located.');
            return;
        }

        //合并配置
        option = wol.util.extend(true, {
            duration: 0,
            times: 3,
            autoView: true
        }, option);
        this.locateProxy(feature, option.duration, option.times, option.autoView);
    };

    /**
     * 定位要素的代理方法，根据要素类型执行不同的定位动画：Point、LineString、Polygon
     * @param {ol.Feature} feature - 待定位要素
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     * @param {number} times - 动画次数，可选参数，默认为3
     * @param {boolean} autoView - 是否移动视图至要素，默认为true
     */
    wol.Locator.prototype.locateProxy = function(feature, duration, times, autoView) {
        if(autoView) {
            this.getMapViewer().getView().fit(feature.getGeometry(), {
                size: mapViewer.getMap().getSize(),
                padding: [50, 50, 50, 50],
                duration: 600
            });
        }

        var self = this;
        var ifMaintain = false;

        var locateFea = feature.clone();
        var locateFun = 'locate' + locateFea.getGeometry().getType();
        var geomType = locateFea.getGeometry().getType();
        if(geomType != 'Point' && geomType != 'LineString' && geomType != 'Polygon') {
            console.error('Unsupported type of feature to locate.');
            return;
        }else if(geomType == 'Point') {
            ifMaintain = false;
            //self.getLocateSource().addFeature(locateFea);
        }

        if(times > 0) {
            var elapseTimes = 0;
            var timer = setInterval(function() {
                elapseTimes++;
                if(elapseTimes > times - 1) {
                    clearInterval(timer);
                    feature.set('locating', false);
                    if(ifMaintain) {
                        self.getLocateSource().removeFeature(locateFea);
                    }
                    return;
                }
                self[locateFun](locateFea, duration);
            }, duration);
            self[locateFun](locateFea, duration);
        }else {
            setTimeout(function() {
                feature.set('locating', false);
                if(ifMaintain) {
                    self.getLocateSource().removeFeature(locateFea);
                }
            }, duration);
        }
    };

    /**
     * 定位点要素
     * @param {ol.Feature} feature - 待定位要素
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    wol.Locator.prototype.locatePoint = function(feature, duration) {
        var self = this;
        var map = self.getMapViewer().getMap();

        var duration = duration;
        var start = new Date().getTime();
        var listenerKey;

        function animate(event) {
            var vectorContext = event.vectorContext;
            var frameState = event.frameState;
            var flashGeom = feature.getGeometry();
            var elapsed = frameState.time - start;
            var elapsedRatio = elapsed / duration;

            var style = self.createPointFlashStyle(elapsedRatio, 5, self.getPiRadius());
            vectorContext.setStyle(style);
            vectorContext.drawGeometry(flashGeom);
            if(elapsed > duration) {
                ol.Observable.unByKey(listenerKey);
                return;
            }
            map.render();
        }

        listenerKey = map.on('postcompose', animate);
        //立即触发动画
        map.render();
    };

    /**
     * 定位线要素
     * @param {ol.Feature} feature - 待定位要素
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    wol.Locator.prototype.locateLineString = function(feature, duration) {
        var self = this;
        var map = self.getMapViewer().getMap();

        var duration = duration;
        var start = new Date().getTime();
        var listenerKey;

        function animate(event) {
            var vectorContext = event.vectorContext;
            var frameState = event.frameState;
            var flashGeom = feature.getGeometry();
            var elapsed = frameState.time - start;
            var elapsedRatio = elapsed / duration;

            var style = self.createLineFlashStyle(elapsedRatio);
            vectorContext.setStyle(style);
            vectorContext.drawGeometry(flashGeom);
            if(elapsed > duration) {
                ol.Observable.unByKey(listenerKey);
                map.render();
                return;
            }
            map.render();
        }

        listenerKey = map.on('postcompose', animate);
        map.render();
    };

    /**
     * 定位面要素
     * @param {ol.Feature} feature - 待定位要素
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    wol.Locator.prototype.locatePolygon = function(feature, duration) {
        var self = this;
        var map = self.getMapViewer().getMap();

        var duration = duration;
        var start = new Date().getTime();
        var listenerKey;

        function animate(event) {
            var vectorContext = event.vectorContext;
            var frameState = event.frameState;
            var flashGeom = feature.getGeometry();
            var elapsed = frameState.time - start;
            var elapsedRatio = elapsed / duration;

            var style = self.createAreaFlashStyle(elapsedRatio);
            vectorContext.setStyle(style);
            vectorContext.drawGeometry(flashGeom);
            if(elapsed > duration) {
                ol.Observable.unByKey(listenerKey);
                map.render();
                return;
            }
            map.render();
        }

        listenerKey = map.on('postcompose', animate);
        map.render();
    };

    /**
     * 创建点定位闪动样式
     * @param {number} elapsedRatio - 动画已执行时间所占比率
     * @param {number} startRadius - 起始圆半径
     * @param {number} endRadius - 结束圆半径
     * @return {ol.style.Style} - 点定位闪动样式
     */
    wol.Locator.prototype.createPointFlashStyle = function(elapsedRatio, startRadius, endRadius) {
        var self = this;

        var curRadius = ol.easing.easeOut(elapsedRatio) * endRadius + startRadius;
        var opacity = ol.easing.easeOut(1 - elapsedRatio);
        var color = wol.util.getColorArray(self.getPiStrokeColor());
        var style = new ol.style.Style({
            image: new ol.style.Circle({
                radius: curRadius,
                snapToPixel: false,
                stroke: new ol.style.Stroke({
                    color: 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + opacity + ')',
                    width: 2.2
                }),
                /*fill: new ol.style.Fill({
                    color: self.getPiFillColor()
                })*/
            })
        });

        return style;
    };

    /**
     * 创建线定位闪动样式
     * @param {number} elapsedRatio - 动画已执行时间所占比率
     * @return {ol.style.Style} - 线定位闪动样式
     */
    wol.Locator.prototype.createLineFlashStyle = function(elapsedRatio) {
        var self = this;

        var opacity = ol.easing.upAndDown(1 - elapsedRatio);
        var color = wol.util.getColorArray(self.getLsStrokeColor());
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + opacity + ')',
                width: 4
            })
        });

        return style;
    };

    /**
     * 创建面定位闪动样式
     * @param {number} elapsedRatio - 动画已执行时间所占比率
     * @return {ol.style.Style} - 面定位闪动样式
     */
    wol.Locator.prototype.createAreaFlashStyle = function(elapsedRatio) {
        var self = this;

        var opacity = ol.easing.upAndDown(elapsedRatio);
        var color1 = wol.util.getColorArray(self.getPlStrokeColor());
        var color2 = wol.util.getColorArray(self.getPlFillColor());
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(' + color1[0] + ', ' + color1[1] + ', ' + color1[2] + ', ' + opacity + ')',
                width: 4
            }),
            fill: new ol.style.Fill({
                color: 'rgba(' + color2[0] + ', ' + color2[1] + ', ' + color2[2] + ', ' + opacity + ')'
            })
        });

        return style;
    };
})(window);
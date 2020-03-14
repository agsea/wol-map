/**
 * 地图浏览
 * Created by Aegean on 2017/3/7 0007.
 */

;(function(global) {
    global.wol = global.wol || {};

    /**
     * wol地图
     * @constructor
     * @requires wol-util.js
     * @param {string} id - DOM元素id
     * @param {object} option - 配置项
     * @param {string} option.projection - 投影坐标系
     * @param {Array} option.center - 视图中心位置，默认为 [13059385.715379057, 4734320.828070238]
     * @param {Array} option.extent - 视图范围
     * @param {Array} option.layers - 图层配置，通过传入一至多个配置项创建图层，每个配置项须包含图层类型(type)，图层名称(name)，地图服务地址(url)等必要参数；图层类型可选值为'Vector'、'Cluster'、'Mask'、'XYZ'、'WMS'，
     * 图层类型为'XYZ'或'WMS'时需指定地图服务地址；配置项中其他参数设置请参见{@link wol.util.createVectorLayer}、{@link wol.util.createClusterLayer}、{@link wol.util.createMaskLayer}、{@link wol.util.createXYZLayer}、{@link wol.util.createWMSLayer}、
     * @param {number|undefined} option.zoom - 当前缩放类型，默认为 undefiend
     * @param {number|undefined} option.minZoom - 地图最小缩放级别，默认为 undefiend
     * @param {number|undefined} option.maxZoom - 地图最大缩放级别，默认为 undefiend
     * @param {object|undefined} option.controls - 地图控件配置
     * @param {boolean|undefined} option.controls.zoom - 是否显示地图缩放控件，默认为 true
     * @param {boolean|undefined} option.controls.scaleLine - 是否显示比例尺控件，默认为 true
     * @param {boolean|undefined} option.controls.overviewMap - 是否显示鹰眼控件，默认为 false
     * @param {boolean|undefined} option.controls.fullScreen - 是否显示全屏控件，默认为 false
     */
    wol.MapViewer = function(id, option) {
        var _map, _curZIndex = 0;

        //默认配置对象
        var defaultOption = {
            projection: 'EPSG:3857',
            center: [13059385.715379057, 4734320.828070238],
            extent: [],
            layers: [],
            zoom: undefined,
            minZoom: undefined,
            maxZoom: undefined,
            controls: {
                zoom: true,
                scaleLine: true,
                overviewMap: false,
                fullScreen: false
            }
        };
        //合并配置
        option = wol.util.extend(true, defaultOption, option);

        /**
         * 初始化地图浏览实例
         * @private
         * @param option
         */
        function _init(option) {
            var view = new ol.View({
                center: option.center,
                projection: option.projection,
                zoom: option.zoom,
                minZoom: option.minZoom,
                maxZoom: option.maxZoom
            });

            _map = new ol.Map({
                target: id,
                logo: false,
                view: view,
                controls: []
            });
        }

        /**
         * 回调函数
         */
        this.callback = {};

        /**
         * 获取地图实例
         * @this wol.MapViewer
         * @return {ol.Map}
         */
        this.getMap = function() {
            return _map;
        }

        /**
         * 获取图层序号值
         * @this wol.MapViewer
         * @return {number}
         */
        this.getCurZIndex = function() {
            return _curZIndex;
        }

        /**
         * 设置图层序号值
         * @this wol.MapViewer
         * @param {number} curZIndex
         */
        this.setCurZIndex = function(curZIndex) {
            _curZIndex = curZIndex;
        }

        //初始化
        _init(option);
        this.addLayers(_initLayers(option.layers));
        _initControls(_map, option.controls);
    }

    /**
     * 事件注册，目前仅支持'addLayer'和'removeLayer'事件
     * @param evtType
     * @param handler
     */
    wol.MapViewer.prototype.register = function(evtType, handler) {
        this.callback[evtType] = (this.callback[evtType]) ? this.callback[evtType] : [];
        this.callback[evtType].push(handler);
    }

    /**
     * 获取视图实例
     * @return {ol.View} - 地图对象
     */
    wol.MapViewer.prototype.getView = function() {
        return this.getMap().getView();
    }

    /**
     * 获取图层集合
     * @return {ol.Collection} - ol集合对象
     */
    wol.MapViewer.prototype.getLayers = function() {
        return this.getMap().getLayers();
    }

    /**
     * 根据图层名称获取图层
     * @param {string} name - 图层名称
     * @return {ol.layer.Base} - 图层对象
     */
    wol.MapViewer.prototype.getLayerByName = function(name) {
        var layers = this.getMap().getLayers();
        var len = layers.getLength();
        var layer = null;
        for(var i = 0; i < len; i++) {
            if(layers.item(i).get('name') === name) {
                layer = layers.item(i);
                break;
            }
        }
        return layer;
    }

    /**
     * 添加图层
     * @param {ol.layer.Base} layer - 图层对象
     */
    wol.MapViewer.prototype.addLayer = function(layer) {
        var zIndex = layer.getZIndex();
        if(!zIndex || zIndex <= 1) {
            var curZIndex = this.getCurZIndex();
            layer.setZIndex(curZIndex);
            this.setCurZIndex(curZIndex + 1);
        }

        this.getMap().addLayer(layer);

        //执行回调
        var callbacks = this.callback['addLayer'] || [];
        for(var i = 0; i < callbacks.length; i++) {
            callbacks[i]();
        }
    }
    /**
     * 添加多个图层
     * @param {Array<ol.layer.Base>} layers - 图层对象数组
     */
    wol.MapViewer.prototype.addLayers = function(layers) {
        for(var i = 0; i < layers.length; i++) {
            this.addLayer(layers[i]);
        }
    }

    /**
     * 删除图层
     * @param {ol.layer.Base} layer - 图层对象
     */
    wol.MapViewer.prototype.removeLayer = function(layer) {
        this.getMap().removeLayer(layer);

        //执行回调
        var callbacks = this.callback['removeLayer'] || [];
        for(var i = 0; i < callbacks.length; i++) {
            callbacks[i]();
        }
    }
    /**
     * 删除多个图层
     * @param {Array<ol.layer.Base>} layers - 图层对象数组
     */
    wol.MapViewer.prototype.removeLayers = function(layers) {
        for(var i = 0; i < layers.length; i++) {
            this.removeLayer(layers[i]);
        }
    }

    /**
     * 根据图层名称删除图层
     * @param {string} name - 图层名称
     */
    wol.MapViewer.prototype.removeLayerByName = function(name) {
        this.getMap().removeLayer(this.getLayerByName(name));
    }

    /**
     * 平移视图中心点至某一坐标点或某一要素
     * @param {ol.Coordinate|ol.Feature} target - 目标坐标点或目标要素
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    wol.MapViewer.prototype.panTo = function(target, duration) {
        var coord;

        //判断是否是要素
        if(target instanceof ol.Feature) {
            coord = ol.extent.getCenter(target.getGeometry().getExtent());
        }else {
            coord = target;
        }

        //是否开启动画
        if(duration === undefined || duration === 0) {
            this.getView().setCenter(coord);
        }else {
            this.getView().animate({center: coord}, {duration: duration});
        }
    }

    /**
     * 缩放视图至指定范围
     * @param {ol.Extent|ol.geom.Geometry} target - 目标视图范围
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     * @param {number | Array} padding - 目标视图周围间距
     */
    wol.MapViewer.prototype.extentAt = function(target, duration, padding) {
        var tarPadding;
        if(padding instanceof Array && padding.length === 4) {
            tarPadding = padding;
        }else if(!isNaN(padding)) {
            tarPadding = [padding, padding, padding, padding];
        }else {
            tarPadding = [50, 50, 50, 50];
        }
        this.getView().fit(target, {
            size: this.getMap().getSize(),
            padding: tarPadding,
            duration: duration
        });
    }

    /**
     * 初始化图层数组
     * @private
     * @param {Array<option<object>>} options
     * @return {Array<ol.layer.Base>}
     */
    function _initLayers(options) {
        var layers = [];
        for(var i = 0; i < options.length; i++) {
            if(options[i].type === 'Vector') {
                layers.push(wol.util.createVectorLayer(options[i]));
            }else if(options[i].type === 'Cluster') {
                layers.push(wol.util.createClusterLayer(options[i]));
            }else if(options[i].type === 'XYZ') {
                layers.push(wol.util.createXYZLayer(options[i]));
            }else if(options[i].type === 'WMS') {
                layers.push(wol.util.createWMSLayer(options[i]));
            }else if(options[i].type === 'Mask') {
                layers.push(wol.util.createMaskLayer(options[i]));
            }else if(options[i].type === 'HeatMap') {
                layers.push(wol.util.createHeatMap(options[i]));
            }else {
                console.warn('Unsupported type of the layer being created.');
            }
        }

        return layers;
    }

    /**
     * 初始化地图控件
     * @private
     * @param {ol.Map} map
     * @param {object} option
     */
    function _initControls(map, option) {
        //创建地图控件：缩放按钮、比例尺、鹰眼、全屏
        if(option.zoom) {
            var zoom = new ol.control.Zoom();
            map.addControl(zoom);
        }
        if(option.scaleLine) {
            var scaline = new ol.control.ScaleLine();
            map.addControl(scaline);

            //防堆叠
            var scalineEle = document.getElementsByClassName('ol-scale-line');
            scalineEle[0].style.left = 11 + 'px';
            scalineEle[0].style.bottom = 8 + 'px';
        }
        if(option.overviewMap) {
            var overview = new ol.control.OverviewMap();
            map.addControl(overview);

            //防堆叠
            var scalineEle = document.getElementsByClassName('ol-scale-line');
            if(scalineEle.length > 0) {
                var overviewEle = document.getElementsByClassName('ol-overviewmap');
                overviewEle[0].style.bottom = 33 + 'px';
            }
        }
        if(option.fullScreen) {
            var fullscreen = new ol.control.FullScreen();
            map.addControl(fullscreen);
        }
    }
})(window);

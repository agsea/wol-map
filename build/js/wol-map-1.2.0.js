/*! WolMao v1.2.0 | (c) aegean | Created on 2017/3/7 */
/*! 基于Openlayers的地图常用功能封装，实现地图的简单快速开发，依赖Openlayers v4.1.1版本 /*
/*! Modified on 2018/01/19 17:35:01 */

(function(global) {
    /**
     * 命名空间
     * @namespace DragHandler
     */
    global.DragHandler = global.DragHandler || {};

    /**
     * 开始拖动
     * @param evt
     */
    DragHandler.startDrag = function(evt, ele) {
        var dragEle = $(ele);
        var container = dragEle.parent();

        //当前鼠标位置
        var mouseX = evt.clientX || evt.pageX || evt.screenX;
        var mouseY = evt.clientY || evt.pageY || evt.screenY;

        //被拖动元素所在容器的左上边距
        var conMarginL = parseFloat(container.css('margin-left'));
        var conMarginT = parseFloat(container.css('margin-top'));

        //被拖动元素的左上边距
        var dragEleMarginL = parseFloat(dragEle.css('margin-left'));
        var dragEleMarginT = parseFloat(dragEle.css('margin-top'));

        //鼠标相对图片左上角的位置
        var mouseOffsetX = mouseX - conMarginL - dragEleMarginL;
        var mouseOffsetY = mouseY - conMarginT - dragEleMarginT;


        dragEle.attr('conMarginL', conMarginL);
        dragEle.attr('conMarginT', conMarginT);
        dragEle.attr('mouseOffsetX', mouseOffsetX);
        dragEle.attr('mouseOffsetY', mouseOffsetY);
    }

    /**
     * 拖动中
     * @param evt
     */
    DragHandler.dragging = function(evt, ele, callback) {
        var dragEle = $(ele);

        //当前鼠标位置
        var mouseX = evt.clientX || evt.pageX || evt.screenX;
        var mouseY = evt.clientY || evt.pageY || evt.screenY;

        //被拖动元素所在容器的左上边距、鼠标相对图片左上角的位置
        var conMarginL = dragEle.attr('conMarginL');
        var conMarginT = dragEle.attr('conMarginT');
        var mouseOffsetX = dragEle.attr('mouseOffsetX');
        var mouseOffsetY = dragEle.attr('mouseOffsetY');

        //图片新的位置
        var tarMarginL = mouseX - conMarginL - mouseOffsetX;
        var tarMarginT = mouseY - conMarginT - mouseOffsetY;
        dragEle.css('margin-left', tarMarginL);
        dragEle.css('margin-top', tarMarginT);

        //执行回调
        if(callback instanceof Function) {
            var params = {
                dragMarginL: tarMarginL,
                dragMarginT: tarMarginT
            };
            callback(dragEle, params);
        }
    }

    /**
     * 拖动结束
     * @param evt
     */
    DragHandler.endDrag = function(evt, ele) {
    }

    /**
     * 允许放置，拖动过程中鼠标样式显示为可拖动状态，一般用于被拖动元素的父容器
     * @param evt
     */
    DragHandler.allowDrop = function(evt) {
        evt.preventDefault();
    }
})(window);;(function(global) {
    global.wol = global.wol || {};

    //图层管理HTML模板
    var templateAll = '<div class="layer-manager-container in-map pos-absolute" draggable="true" ondragstart="DragHandler.startDrag(event, this)"' +
    'ondrag="DragHandler.dragging(event, this)" ondragend="DragHandler.endDrag(event, this)">' +
    '<h4>图层控制</h4>' +
    '<div>' +
    '<ul id="wolLayerTree0" class="ztree"></ul>' +
    '</div>' +
    '</div>';
    var templatePart = '<div class="layer-manager-container normal">' +
        '<div>' +
        '<ul id="wolLayerTree0" class="ztree"></ul>' +
        '</div>' +
        '</div>';

    /**
     * 图层管理对象
     * @constructor
     * @param {wol.MapViewer} mapViewer - wol地图实例
     */
    wol.LayerManager = function(mapViewer) {
        var _map = mapViewer.getMap();
        var _layers;
        var _treeNodeData;
        var defaultOption = {exclude: []};

        /**
         * 初始化图层管理对象
         * @param {object|undefined} option - 过滤图层，传入待过滤图层的名称或图层名称数组，可选
         * @param {string|Array<string>} option.exclude - 过滤图层，传入待过滤图层的名称或图层名称数组
         * @param {string} option.target - 图层树目标容器DOM元素id
         */
        this.init = function(option) {
            defaultOption = wol.util.extend(defaultOption, option);

            var treeContainer;
            if(defaultOption.target === undefined) {
                treeContainer = $(mapViewer.getMap().getTargetElement());
                if(treeContainer.attr('has-tree')) {
                    return;
                }
                treeContainer.append(templateAll);
            }else {
                treeContainer = $('#' + defaultOption.target);
                if(treeContainer.attr('has-tree')) {
                    return;
                }
                treeContainer.append(templatePart);
            }
            treeContainer.attr('has-tree', true);

            _layers = _map.getLayers().getArray();
            var groupData = getGroupData(_layers, defaultOption);
            _treeNodeData = createTreeNodeData(groupData);
            initTree(_treeNodeData);

            //注册更新
            mapViewer.register('addLayer', update);
            mapViewer.register('removeLayer', update);
        }
        
        /**
         * 获取地图实例
         * @return {ol.Map}
         */
        this.getMap = function() {
            return _map;
        }

        /**
         * 获取图层组
         */
        this.getLayers = function() {
            return _layers;
        }

        /**
         * 获取图层树
         * @return {Array}
         */
        this.getTreeData = function() {
            return _treeNodeData;
        }

        /**
         * 初始化树（此处所需HTML结构应内部生成，以体现封装性）
         * @private
         * @param treeNodeData - 节点数据
         * @param mapViewer - wol地图实例
         */
        function initTree(treeNodeData) {
            // 设置选项
            var setting = {
                view : {
                    selectedMulti : false
                },
                edit : {
                    enable : true
                },
                check: {
                    enable: true
                },
                data : {
                    simpleData : {enable: true}
                },
                callback : {
                    beforeEditName : beforeEditName,
                    onClick : onClick,
                    onCheck: onCheck
                }
            }

            /**
             * 编辑节点
             * @param treeId
             * @param treeNode
             * @return {boolean}
             */
            function beforeEditName(treeId, treeNode) {
                var zTree = $.fn.zTree.getZTreeObj('treeDemo');
                zTree.selectNode(treeNode);
                return false;
            }

            /**
             * 节点单击事件
             * @param event
             * @param treeId
             * @param treeNode
             */
            function onClick(event, treeId, treeNode) {
                //移除选中样式
                var selector = '#' + treeNode.tId + '_a';
                $(selector).removeClass('curSelectedNode');
            }

            /**
             * 节点选中事件
             * @param event
             * @param treeId
             * @param treeNode
             */
            function onCheck(event, treeId, treeNode) {
                var layerName = treeNode.layerName;
                var layer = mapViewer.getLayerByName(layerName);
                if(treeNode.checked) {
                    //显示图层
                    layer.setVisible(true);
                }else {
                    //隐藏图层
                    layer.setVisible(false);
                }
            }

            //执行初始化
            $.fn.zTree.init($('#wolLayerTree0'), setting, treeNodeData);
        }

        /**
         * 更新图层树
         * @private
         */
        function update() {
            var groupData = getGroupData(_layers, defaultOption);
            _treeNodeData = createTreeNodeData(groupData);
            initTree(_treeNodeData);
        }
    }

    /**
     * 获取分组数据
     * @private
     * @param {Array<ol.layer.Base>} layers - 图层数组
     * @param {object} option - 参数项
     */
    function getGroupData(layers, option) {
        var layer, group, breakFlag;
        var nodeData = {}, node;

        var filter = option.exclude;
        filter = (filter) ? filter : [];
        filter = (filter instanceof Array) ? filter : [filter];

        for(var i = 0; i < layers.length; i++) {
            layer = layers[i];
            for(var j = 0; j < filter.length; j++) {
                if(layer.get('name') === filter[j]) {
                    breakFlag = true;
                    break;
                }
            }
            if(breakFlag) {
                breakFlag = false;
                continue;
            }

            group = layer.get('group');
            if(nodeData[group] === undefined) {
                nodeData[group] = [];
            }

            node = {
                name: layer.get('name'),
                label: layer.get('label'),
                type: layer.get('type'),
                zIndex: layer.getZIndex(),
                checked: layer.getVisible()
            };
            //node.label = (node.label.length > 6) ? node.label.substring(0, 6) : node.label;
            nodeData[group].push(node);
        }
        return nodeData;
    }

    /**
     * 创建节点数据
     * @param groupData - 分组数据
     */
    function createTreeNodeData(groupData) {
        var treeNodeData = [], treeNode;
        var tempDatas;

        for(var key in groupData) {
            if(key === 'undefined') {
                tempDatas = groupData[key];
                for(var i = 0; i < tempDatas.length; i++) {
                    treeNode = {
                        open: true,
                        checked: tempDatas[i].checked,
                        iconSkin: 'layerIcon',
                        name: tempDatas[i].label,
                        layerName: tempDatas[i].name,
                        type: tempDatas[i].type,
                        zIndex: tempDatas[i].zIndex
                    };
                    treeNodeData.push(treeNode);
                }
            }else {
                tempDatas = groupData[key];
                treeNode = {
                    open: false,
                    nocheck: true,
                    iconSkin: 'layersIcon',
                    name: key,
                    children: []
                };

                for(var i = 0; i < tempDatas.length; i++) {
                    treeNode.children.push({
                        open: true,
                        checked: tempDatas[i].checked,
                        iconSkin: 'layerIcon',
                        name: tempDatas[i].label,
                        layerName: tempDatas[i].name,
                        type: tempDatas[i].type,
                        zIndex: tempDatas[i].zIndex
                    });
                }
                treeNodeData.push(treeNode);
            }
        }

        return treeNodeData;
    }
})(window);;(function(global) {
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
})(window);;(function(global) {
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
})(window);;(function(global) {
    //TODO:ol.source.Vector getExtent()报错，如不能解决则手动计算所有feature的extent
    //TODO:使用ol.extent.boundingExtent

    /**
     * 命名空间
     * @namespace wol
     */
    global.wol = global.wol || {};

    /**
     * 命名空间
     * @namespace wol.util
     */
    global.wol.util = global.wol.util || {};

    /**
     * 通用样式库
     * @property {ol.style.Style} DEFAULT_STYLE - 默认样式
     * @property {ol.style.Style} TEXT_STYLE - 文本样式
     * @property {ol.style.Style} MASK_BLACK - 黑色遮罩样式
     */
    wol.util.styles = {
        DEFAULT_STYLE: new ol.style.Style({
            fill: new ol.style.Fill({
                color : 'rgba(0, 191, 255, 0.5)'
            }),
            image: new ol.style.Circle({
                fill: new ol.style.Fill({
                    color : '#00bfff'
                }),
                stroke: new ol.style.Stroke({
                    color: '#bdecff',
                    width: 2
                }),
                radius: 8
            }),
            stroke: new ol.style.Stroke({
                color: '#00bfff',
                width: 3
            })
        }),
        TEXT_STYLE: new ol.style.Style({
            text: new ol.style.Text({
                text: '',
                offsetY: 18,
                font: '14px 微软雅黑',
                textAlign : 'center',
                fill: new ol.style.Fill({
                    color : '#2d2d2d',
                })
            })
        }),
        MASK_BLACK: new ol.style.Style({
            fill : new ol.style.Fill({
                color : 'rgba(0, 0, 0, 0.5)'
            })
        })
    };

    /**
     * 创建矢量图层
     * @param {object} option - 配置项
     * @param {string|undefined} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {ol.style.Style} option.style - 图层样式，默认为 wol.util.styles.DEFAULT_STYLE
     * @param {Array} option.features - 图层默认要素，默认为 []
     * @param {boolean} option.updateWhileAnimating - 动画执行过程是否实时渲染要素，默认为 true
     * @param {boolean} option.updateWhileInteracting - 交互过程是否实时渲染要素，默认为 false
     * @param {boolean} option.useSpatialIndex - 是否开启空间索引，默认为 false
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 true
     * @param {number|undefined} option.zIndex - 图层序号，默认为 undefined
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Vector} - 矢量图层
     */
    wol.util.createVectorLayer = function(option) {
        var defaults = {
            name: undefined,
            label: '',
            style: wol.util.styles.DEFAULT_STYLE,
            features: [],
            updateWhileAnimating: true,
            updateWhileInteracting: false,
            useSpatialIndex: false,
            opacity: 1,
            visible: true,
            zIndex: undefined,
            group: undefined
        };
        option = wol.util.extend(defaults, option);

        var layer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: option.features,
                useSpatialIndex: option.useSpatialIndex
            }),
            style: option.style,
            updateWhileAnimating: option.updateWhileAnimating,
            updateWhileInteracting: option.updateWhileInteracting,
            opacity: option.opacity,
            visible: option.visible,
            zIndex: option.zIndex
        });
        layer.set('name', option.name);
        layer.set('label', option.label);
        layer.set('group', option.group);
        layer.set('type', 'Vector');

        return layer;
    }

    /**
     * 创建聚合图层
     * @param {object} option - 配置项
     * @param {string|undefined} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {ol.StyleFunction} option.styleFunction - 图层样式函数, 携带feature和resolution两个参数，此函数应返回一个ol.style.Style对象或其数组，由此为单个要素及聚合要素显示不同的样式
     * @param {Array} option.features - 图层默认要素，默认为 []
     * @param {boolean} option.updateWhileAnimating - 动画执行过程是否实时渲染要素，默认为 true
     * @param {boolean} option.updateWhileInteracting - 交互过程是否实时渲染要素，默认为 false
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 true
     * @param {number|undefined} option.zIndex - 图层序号，默认为 undefined
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Vector} - 矢量聚合图层
     */
    wol.util.createClusterLayer = function(option) {
        var styleCache = {};
        var defaults = {
            name: undefined,
            label: '',
            styleFunction: function(feature) {
                var size = feature.get('features').length;
                var style = styleCache[size];
                if (!style) {
                    style = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 10,
                            stroke: new ol.style.Stroke({
                                color: '#fff'
                            }),
                            fill: new ol.style.Fill({
                                color: '#3399CC'
                            })
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            fill: new ol.style.Fill({
                                color: '#fff'
                            })
                        })
                    });
                    styleCache[size] = style;
                }
                return style;
            },
            features: [],
            updateWhileAnimating: true,
            updateWhileInteracting: false,
            opacity: 1,
            visible: true,
            zIndex: undefined,
            group: undefined
        };
        option = wol.util.extend(defaults, option);

        var layer = new ol.layer.Vector({
            source: new ol.source.Cluster({
                distance: 40,
                source: new ol.source.Vector({
                    features: option.features,
                    //useSpatialIndex: option.useSpatialIndex //聚合图层中不能使用空间索引
                })
            }),
            style: function(feature, resolution) {
                return option.styleFunction(feature, resolution);
            },
            updateWhileAnimating: option.updateWhileAnimating,
            updateWhileInteracting: option.updateWhileInteracting,
            opacity: option.opacity,
            visible: option.visible,
            zIndex: option.zIndex
        });
        layer.set('name', option.name);
        layer.set('label', option.label);
        layer.set('group', option.group);
        layer.set('type', 'Cluster');

        return layer;
    }

    /**
     * 创建XYZ图层
     * @param {object} option - 配置项
     * @param {string} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {string} option.url - 切片服务地址
     * @param {string|undefined} option.crossOrigin - 请求类型，'anonymous' 或 undefined，默认为 undefined；设置为'anonymous'时请求类型变为跨域请求，但切片服务器必须进行跨域设置
     * @param {number|undefined} option.minZoom - 图层的最小缩放等级，默认为 undefined
     * @param {number|undefined} option.maxZoom - 图层的最大缩放等级，超过该等级不再请求新的瓦片，默认为 undefined
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 true
     * @param {number} option.zIndex - 图层序号，默认为 undefined
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Tile} - 切片图层
     */
    wol.util.createXYZLayer = function(option) {
        var defaults = {
            name: undefined,
            label: '',
            url: '',
            crossOrigin: undefined,
            minZoom: undefined,
            maxZoom: undefined,
            opacity: 1,
            visible: true,
            zIndex: undefined,
            group: undefined
        };
        option = wol.util.extend(defaults, option);

        var layer = new ol.layer.Tile({
            source : new ol.source.XYZ({
                url : option.url,
                crossOrigin: option.crossOrigin,
                wrapX: option.wrapX,
                minZoom: option.minZoom,
                maxZoom: option.maxZoom
            }),
            opacity: option.opacity,
            visible: option.visible,
            zIndex: option.zIndex
        });
        layer.set('name', option.name);
        layer.set('label', option.label);
        layer.set('group', option.group);
        layer.set('type', 'XYZ');

        return layer;
    }

    /**
     * 创建网络地图图层
     * @param {object} option - 配置项
     * @param {string} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {string} option.url - 网络地图服务地址
     * @param {object} option.params - WMS必须参数，其中必须包含 LAYERS
     * @param {string|undefined} option.serverType - 远程网络地图服务类型，可选值为'carmentaserver', 'geoserver', 'mapserver', 'qgis'，默认为 undefined
     * @param {number} option.maxZoom - 图层的最大缩放等级
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 true
     * @param {number} option.zIndex - 图层序号，默认为 undefined
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Tile} - WMS图层
     */
    wol.util.createWMSLayer = function(option) {
        var defaults = {
            name: undefined,
            label: '',
            url: '',
            params: {},
            serverType: undefined,
            maxZoom: undefined,
            opacity: 1,
            visible: true,
            zIndex: undefined,
            group: undefined
        };
        option = wol.util.extend(defaults, option);

        var layer = new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: option.url,
                params: option.params,
                serverType: option.serverType,
                wrapX: option.wrapX,
                maxZoom: option.maxZoom
            }),
            opacity: option.opacity,
            visible: option.visible,
            zIndex: option.zIndex
        });
        layer.set('name', option.name);
        layer.set('label', option.label);
        layer.set('group', option.group);
        layer.set('type', 'WMS');

        return layer;
    }

    /**
     * 创建遮罩图层
     * @param {object} option - 配置项
     * @param {string} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {ol.style.Style} option.style - 图层样式，默认为 wol.util.styles.MASK_BLACK
     * @param {boolean} option.updateWhileAnimating - 动画执行过程是否实时渲染要素，默认为 true
     * @param {boolean} option.updateWhileInteracting - 交互过程是否实时渲染要素，默认为 true
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 false
     * @param {number} option.zIndex - 图层序号，默认为 1
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Vector} - 矢量图层
     */
    wol.util.createMaskLayer = function(option) {
        //遮罩要素
        var maskFeature = wol.util.createFeatureFromWKT('POLYGON((115.282079820752 41.0624818532467,115.282079820752 36.6007452585101,119.034581570745 36.6007452585101,119.034581570745 41.0624818532467,115.282079820752 41.0624818532467))');
        wol.util.transform(maskFeature, 'EPSG:4326', 'EPSG:3857');

        var defaults = {
            name: undefined,
            label: '',
            features: [maskFeature],
            style: wol.util.styles.MASK_BLACK,
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            opacity: 1,
            visible: false,
            zIndex: 1,
            group: undefined
        };
        option = wol.util.extend(defaults, option);

        var maskLayer = wol.util.createVectorLayer(option);
        maskLayer.set('name', option.name);
        maskLayer.set('label', option.label);
        maskLayer.set('group', option.group);
        maskLayer.set('type', 'Mask');

        return maskLayer;
    }

    /**
     * 创建热力图层
     * @param {object} option - 配置项
     * @param {string|undefined} option.name - 图层名称，默认为 undefined
     * @param {string} option.label - 图层说明，默认为 ''
     * @param {Array} option.feature - 图层默认要素，默认为 []
     * @param {Array} option.gradient - 热力图层的色彩渐层颜色，默认为 ['#0ff', '#00f', '#0f0', '#ff0', '#ff5d3e']
     * @param {number} option.blur - 模糊值，默认为 24
     * @param {number} option.radius - 非聚合状态下最小半径，默认为 10
     * @param {number} option.shadow - 阴影值，默认为 300
     * @param {number} option.opacity - 图层透明度，默认为 1
     * @param {boolean} option.visible - 图层可见性，默认为 true
     * @param {number|undefined} option.zIndex - 图层序号，默认为 undefined
     * @param {string|undefined} option.group - 图层所属图层组，默认为 undefined 即不属于任何组
     * @return {ol.layer.Heatmap} - 热力图层
     */
    wol.util.createHeatMap = function(option) {
        var defaults = {
            name: undefined,
            label: '',
            feature: [],
            gradient : ['#0ff', '#00f', '#0f0', '#ff0', '#ff5d3e'],
            blur : 24,
            radius : 10,
            shadow : 300,
            opacity: 1,
            visible: true,
            zIndex: undefined,
            group: undefined,
        };
        option = wol.util.extend(defaults, option);

        var layer = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features : option.features
            }),
            gradient: option.gradient,
            blur: option.blur,
            radius: option.radius,
            shadow: option.shadow,
            opacity: option.opacity,
            visible: option.visible,
            zIndex: option.zIndex
        });
        layer.set('name', option.name);
        layer.set('label', option.label);
        layer.set('group', option.group);
        layer.set('type', 'HeatMap');

        return layer;
    }

    /**
     * 从WKT字符串中解析要素
     * @param {string} wkt - 要素的wkt描述（关于wkt请参见：{@link http://www.cnblogs.com/tiandi/archive/2012/07/18/2598093.html}）
     * @return {ol.Feature} - 要素对象
     */
    wol.util.createFeatureFromWKT = function(wkt) {
        var format = new ol.format.WKT();
        return format.readFeature(wkt);
    }

    /**
     * 导出要素为WKT字符串
     * @param {ol.Feature} feature - 要素对象
     * @return {string} - 要素的wkt描述
     */
    wol.util.createWKTFromFeature = function(feature) {
        var format = new ol.format.WKT();
        return format.writeFeature(feature);
    }

    /**
     * 对要素进行坐标转化
     * @param {ol.Feature} feature - 待转换要素
     * @param {ol.proj.ProjectionLike} from - 转换前投影坐标系
     * @param {ol.proj.ProjectionLike} to - 转换后投影坐标系
     */
    wol.util.transform = function(feature, from, to) {
        feature.getGeometry().transform(from, to);
    }

    /**
     * 对象扩展（jQuery extend机制）
     * @param {boolean|object} arg - 可变参数，你可以传入任意个参数将它们合并为一个对象；当不传入任何参数或者只有一个参数且类型不是对象，或者该参数为布尔值时将返回空对象；当参数个数大于等于两个时，
     * 若第一个参数类型不是布尔值或为 false ，将返回后续参数的浅拷贝合并，否则返回第一个参数后续参数的深拷贝合并
     * @return {object} - 扩展后的对象
     */
    wol.util.extend = (function fn() {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            length = arguments.length,
            i = 1, deep = false;

        //是否深度拷贝
        if(typeof target === "boolean") {
            deep = target;
            target = arguments[ i ] || {};
            i++;
        }

        if(typeof target !== "object" && !jQuery.isFunction(target)) {
            target = {};
        }

        if(i === length) {
            target = {};
            i--;
        }

        for(; i < length; i++) {
            if((options = arguments[i]) != null) {
                for(name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if(target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if(deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                        if(copyIsArray) {
                            copyIsArray = false;
                            clone = src && jQuery.isArray(src) ? src : [];
                        }else {
                            clone = src && jQuery.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = fn(deep, clone, copy);
                    }else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    });

    /**
     * 获取颜色表示类型
     * @param {string} colorStr - 颜色字符串表示
     * @return {string} - RGB/十六进制
     */
    wol.util.getColorType = function(colorStr) {
        //颜色正则
        var rgbColorReg = /^(rgb[(]|RGB[(]).+([)])$/;
        var hexColorReg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;

        if(rgbColorReg.test(colorStr)) {
            return 'RGB';
        }else if(hexColorReg.test(colorStr)) {
            return 'HEX';
        }else {
            return 'UNKNOWN';
        }
    }

    /**
     * 将rgb颜色值转换为16进制形式
     * @param {string} rgbStr - 颜色RGB字符串表示
     * @return {string} - 颜色16进制字符串表示
     */
    wol.util.toHexColor = function(rgbStr) {
        var colorType = wol.util.getColorType(rgbStr);
        if(colorType == 'RGB') {
            var aColor = rgbStr.replace(/(?:\(|\)|rgb|RGB)*/g, '').split(',');
            var hexStr = '#';
            for(var i = 0; i<aColor.length; i++) {
                var hex = Number(aColor[i]).toString(16);
                if(hex === '0'){
                    hex += hex;
                }
                hexStr += hex;
            }
            if(hexStr.length !== 7){
                hexStr = '#000000';
            }
            return hexStr;
        }else if(colorType == 'HEX') {
            var aNum = rgbStr.replace(/#/, '').split('');
            if(aNum.length === 6) {
                return rgbStr;
            }else if(aNum.length === 3) {
                var numHex = '#';
                for(var i=0; i<aNum.length; i+=1){
                    numHex += (aNum[i]+aNum[i]);
                }
                return numHex;
            }
        }else {
            return '#000000';
        }
    }

    /**
     * 将16进制颜色值转换为rgb形式
     * @param {string} hexStr - 颜色16进制字符串表示
     * @return {string} - 颜色RGB字符串表示
     */
    wol.util.toRGBColor = function(hexStr) {
        var sColor = hexStr.toLowerCase();
        var colorType = wol.util.getColorType(sColor);
        if(sColor && colorType == 'HEX') {
            if(sColor.length === 4){
                var sColorNew = '#';
                for(var i = 1; i < 4; i+=1) {
                    sColorNew += sColor.slice(i,i+1).concat(sColor.slice(i,i+1));
                }
                sColor = sColorNew;
            }
            //处理六位的颜色值
            var sColorChange = [];
            for(var i = 1; i < 7; i+=2) {
                sColorChange.push(parseInt('0x' + sColor.slice(i,i+2)));
            }
            return 'RGB(' + sColorChange.join(',') + ')';
        }else{
            return 'RGB(0, 0, 0)';
        }
    }

    /**
     * 获取颜色值数组
     * @param {string} color - 颜色字符串表示
     * @return {Array} - 颜色RGB数组
     */
    wol.util.getColorArray = function(color) {
        var type = wol.util.getColorType(color);
        if(type == 'HEX') {
            color = wol.util.toRGBColor(color);
        }else if(type != 'RGB') {
            color = 'RGB(0, 0, 0)';
        }

        var temp = color.replace(/(?:\(|\)|rgb|RGB)*/g, '').split(',');
        for(var i = 0; i < temp.length; i++) {
            temp[i] = parseInt(temp[i]);
        }
        return temp;
    }
})(window);;(function(global) {
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
        if(duration == undefined || duration == 0) {
            this.getView().setCenter(coord);
        }else {
            this.getView().animate({center: coord}, {duration: duration});
        }
    }

    /**
     * 缩放视图至指定范围
     * @param {ol.Extent|ol.geom.Geometry} target - 目标视图范围
     * @param {number} duration - 动画持续时间，可选参数，默认为0
     */
    wol.MapViewer.prototype.extentAt = function(target, duration) {
        this.getView().fit(target, {
            size: this.getMap().getSize(),
            padding: [50, 50, 50, 50],
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

/**
 * 图层管理工具
 * Created by Aegean on 2017/3/31 0031.
 */

;(function(global) {
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
})(window);
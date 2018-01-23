/**
 * 地图操作工具类
 * Created by Aegean on 2017/3/8 0008.
 */

;(function(global) {
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
        if(colorType === 'RGB') {
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
        }else if(colorType === 'HEX') {
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
        if(sColor && colorType === 'HEX') {
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
        if(type === 'HEX') {
            color = wol.util.toRGBColor(color);
        }else if(type !== 'RGB') {
            color = 'RGB(0, 0, 0)';
        }

        var temp = color.replace(/(?:\(|\)|rgb|RGB)*/g, '').split(',');
        for(var i = 0; i < temp.length; i++) {
            temp[i] = parseInt(temp[i]);
        }
        return temp;
    }
})(window);
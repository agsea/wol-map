/**
 * 图片拖动事件集
 * Created by Administrator on 2017/4/6 0006.
 */

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
})(window);
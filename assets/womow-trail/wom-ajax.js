/**
 * ajax 封装。
 * Created by Yo on 2016/7/5.
 */


(function (global) {
    global.wom = global.wom || {};

    global.wom.majax = function (url) {
        this.options = {"dataType": "json"};
        if (url)
            this.options.url = url;
    };


 

    /**
     * 通过远程 HTTP GET 请求载入信息
     * 
     * @param data ——可选参数
     */
    global.wom.majax.prototype.get = function (data) {
        this.options.type = "GET";
        if (data)
            this.options.data = data;
        var url = this.options.url;
        return  $.ajax(url, this.options);
    };

    /**
     * 通过远程 HTTP POST 请求载入信息。     *
     * @param data——可选参数
     */
    global.wom.majax.prototype.post = function (data) {
        this.options.type = "POST";
        if (data)
            this.options.data = data;
        var url = this.options.url;
        return $.ajax(url, this.options);  
        
    };

    /**
     * 提交普通表单
     * //TODO 增加提交上传表单
     * @param $form
     */
    global.wom.majax.prototype.submit = function ($form) {
        this.options.type = $form.attr("method");
        this.options.data = $form.serialize();
        var url = $form.attr("action");
       return  $.ajax(url, this.options); 
    };

    /**
     *
     * @param $ele
     */
    global.wom.majax.prototype.loadIn = function ($ele) {
        //TODO implements
        throw new Error("尚未实现的方法。");
    };

    
    /**
     *  显示的忙碌信息, 如何传入false，则不显示忙碌图标，报错时不提示弹出层。
     * @param info String || boolean
     */
    global.wom.majax.prototype.bussy = function (info) {
        this.options.bussy = info;
        return this;
    };

    /**
     * 设置请求参数
     * @param data
     */
    global.wom.majax.prototype.data = function (data) {
        this.options.data = data;
        return this;
    };
    
    /**
     * global选项用于阻止响应注册的回调函数
     * @param global
     */
    global.wom.majax.prototype.global = function (global) {
    	this.options.global = global;
    	return this;
    };
    
    /**
     * 这个对象用于设置Ajax相关回调函数的上下文。
     * @param context
     */
    global.wom.majax.prototype.context = function (context) {
    	this.options.context = context;
    	return this;
    };


    global.wom.majax.prototype.dataType = function (dataType) {
        this.options.dataType = dataType;
        return this;
    };

    /**
     * 当请求之后调用。传入返回后的数据，以及包含成功代码的字符串。
     * @param success Function
     */
    global.wom.majax.prototype.success = function (success) {
        this.options.success = success;
        return this;
    };

 

    global.wom.majax.prototype.complete = function (complete) {
        this.options.complete = complete;
        return this;
    };

    global.wom.majax.prototype.error = function (error) {
        this.options.success = error;
        return this;
    };


    global.wom.majax.prototype.beforeSend = function (beforeSend) {
        this.options.success = beforeSend;
        return this;
    };

    /**
     * 给Ajax返回的原始数据的进行预处理的函数。提供data和type两个参数：data是Ajax返回的原始数据，type是调用jQuery.ajax时提供的dataType参数。函数返回的值将由jQuery进一步处理。
     * function (data, type) {
     * // 对Ajax返回的原始数据进行预处理
     * return data  // 返回处理后的数据
     *  }
     * @param dataFilter Function
     */
    global.wom.majax.prototype.dataFilter = function (dataFilter) {
        this.options.success = dataFilter;
        return this;
    };


    /**
     * 定义全局函数
     */
    if (!global.majax) {
        global.majax = function (url) {
            return new global.wom.majax(url);
        };
    }


    //-------------------------------------------
    // ajax 全局处理函数
    //-------------------------------------------

    /**
     *
     */
    $(document).ajaxSend(function (evt, request, settings) {

        if (settings.bussy === false)
            return;

        var id = layer.load(1, {
            shade: [0.1, '#fff'] //0.1透明度的白色背景
        });
        settings["layerId"] = id;
    });

    /**
     *
     */
    $(document).ajaxComplete(function (event, request, settings) {

        if (settings.bussy === false)
            return;

        layer.close(settings["layerId"]);
    });


    /**
     *
     */
    $(document).ajaxError(function (event, request, settings, thrownError) {

        // TODO 请求超时。

        try {
            var msg = thrownError.message;
            console.info(typeof thrownError);
            var status = request.status;


            if (status == 404) {
                msg = "访问的内容不存在。";
            } else if (status == 400) {
                msg = "访问参数错误，请确认参数。";
            } else if (status > 400 & status < 500) {
                msg = "访问错误请确认。";
            }

            console.error("ajax error when request: " + settings.url, msg, status);

            if (settings.bussy === false)
                return;

            // 返回内容类型
            var contentType = request.getResponseHeader("Content-Type")

            if (contentType && contentType.indexOf("application/json") > -1) {

                var response = request.responseText;

                if (response) {
                    response = JSON.parse(response);
                    if ($.type(response) == "string")
                        msg = response;
                    else
                        msg = response.msg;
                }
            }else{
            	if(settings.dataType=="json"){
            		msg ="无法解析返回结果。"
            	}
            }

            layer.warn(msg, "不开心");

            //TODO  重新登录

        } catch (e) {
            console.error("Error occurs when process ajax error", e);
        }
    });

})(window);
